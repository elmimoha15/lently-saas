"""
Billing Schemas - SINGLE SOURCE OF TRUTH for plans, usage limits, and subscription data.

ALL plan definitions and usage limits are defined here.
This module is the authoritative source for:
- Plan names and IDs
- Usage limits per plan (videos, comments, AI questions)
- Subscription status and metadata
- Usage tracking structures
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict
from datetime import datetime
from enum import Enum


# =============================================================================
# Plan Definitions - SINGLE SOURCE OF TRUTH
# =============================================================================

class PlanId(str, Enum):
    """Valid plan identifiers - used across the entire application"""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    BUSINESS = "business"


class Plan(BaseModel):
    """
    Plan configuration with all limits.
    This is the authoritative definition of what each plan includes.
    """
    id: PlanId
    name: str
    price_monthly: int  # Price in cents/USD
    price_yearly: int   # Price in cents/USD (annual)
    
    # Usage limits - HARD LIMITS enforced by backend
    videos_per_month: int
    comments_per_video: int
    ai_questions_per_month: int
    
    # Feature flags
    priority_support: bool = False
    custom_integrations: bool = False
    unlimited_ai: bool = False
    
    # Paddle product/price IDs (set in production)
    paddle_product_id: Optional[str] = None
    paddle_price_id_monthly: Optional[str] = None
    paddle_price_id_yearly: Optional[str] = None


# =============================================================================
# PLAN DEFINITIONS - THE SINGLE SOURCE OF TRUTH
# =============================================================================

# Paddle Product ID (shared across all plans)
PADDLE_PRODUCT_ID = "pro_01kf39qhdhcs0bn4ebkej9smz1"

PLANS: Dict[PlanId, Plan] = {
    PlanId.FREE: Plan(
        id=PlanId.FREE,
        name="Free",
        price_monthly=0,
        price_yearly=0,
        videos_per_month=1,
        comments_per_video=100,
        ai_questions_per_month=2,
        priority_support=False,
        custom_integrations=False,
        unlimited_ai=False,
    ),
    PlanId.STARTER: Plan(
        id=PlanId.STARTER,
        name="Starter",
        price_monthly=1900,  # $19.00
        price_yearly=0,
        videos_per_month=10,
        comments_per_video=1000,
        ai_questions_per_month=30,
        priority_support=False,
        custom_integrations=False,
        unlimited_ai=False,
        paddle_product_id=PADDLE_PRODUCT_ID,
        paddle_price_id_monthly="pri_01kf39teej9gdfagqayr5sfg9n",
        paddle_price_id_yearly=None,
    ),
    PlanId.PRO: Plan(
        id=PlanId.PRO,
        name="Pro",
        price_monthly=3900,  # $39.00
        price_yearly=0,
        videos_per_month=20,
        comments_per_video=3000,
        ai_questions_per_month=75,
        priority_support=True,
        custom_integrations=False,
        unlimited_ai=False,
        paddle_product_id=PADDLE_PRODUCT_ID,
        paddle_price_id_monthly="pri_01kfedypx5bebb3frsbbpwctsm",
        paddle_price_id_yearly=None,
    ),
    PlanId.BUSINESS: Plan(
        id=PlanId.BUSINESS,
        name="Business",
        price_monthly=7900,  # $79.00
        price_yearly=0,
        videos_per_month=50,
        comments_per_video=10000,
        ai_questions_per_month=999999,  # Unlimited
        priority_support=True,
        custom_integrations=True,
        unlimited_ai=True,
        paddle_product_id=PADDLE_PRODUCT_ID,
        paddle_price_id_monthly="pri_01kf39w2f25tg4qeb5zja3ngdk",
        paddle_price_id_yearly=None,
    ),
}


def get_plan(plan_id: str | PlanId) -> Plan:
    """
    Get plan configuration by ID.
    Returns FREE plan if invalid ID provided.
    """
    if isinstance(plan_id, str):
        try:
            plan_id = PlanId(plan_id.lower())
        except ValueError:
            plan_id = PlanId.FREE
    return PLANS.get(plan_id, PLANS[PlanId.FREE])


# =============================================================================
# Usage Tracking
# =============================================================================

class UsageType(str, Enum):
    """Types of usage that are tracked and limited"""
    VIDEOS = "videos"
    COMMENTS = "comments"
    AI_QUESTIONS = "ai_questions"


class Usage(BaseModel):
    """
    User's current usage for the billing period.
    This is stored in Firestore and is the source of truth for usage.
    """
    # Current counts
    videos_analyzed: int = 0
    comments_analyzed: int = 0
    ai_questions_used: int = 0
    
    # Limits (derived from plan, stored for quick access)
    videos_limit: int = 3
    comments_limit: int = 300  # Per video
    ai_questions_limit: int = 9
    
    # Billing period
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    
    def get_remaining(self, usage_type: UsageType) -> int:
        """Get remaining credits for a usage type"""
        if usage_type == UsageType.VIDEOS:
            return max(0, self.videos_limit - self.videos_analyzed)
        elif usage_type == UsageType.AI_QUESTIONS:
            return max(0, self.ai_questions_limit - self.ai_questions_used)
        elif usage_type == UsageType.COMMENTS:
            return self.comments_limit  # This is per-video, not cumulative
        return 0
    
    def can_use(self, usage_type: UsageType, amount: int = 1) -> bool:
        """Check if user has enough credits for an action"""
        if usage_type == UsageType.VIDEOS:
            return self.videos_analyzed + amount <= self.videos_limit
        elif usage_type == UsageType.AI_QUESTIONS:
            return self.ai_questions_used + amount <= self.ai_questions_limit
        elif usage_type == UsageType.COMMENTS:
            return amount <= self.comments_limit
        return False


# =============================================================================
# Subscription
# =============================================================================

class SubscriptionStatus(str, Enum):
    """Paddle subscription statuses"""
    ACTIVE = "active"
    TRIALING = "trialing"
    PAST_DUE = "past_due"
    PAUSED = "paused"
    CANCELED = "canceled"
    NONE = "none"  # No subscription (free plan)


class Subscription(BaseModel):
    """
    User's subscription data from Paddle.
    Stored in Firestore under users/{uid}/subscription
    """
    # Paddle identifiers
    paddle_subscription_id: Optional[str] = None
    paddle_customer_id: Optional[str] = None
    paddle_price_id: Optional[str] = None
    
    # Plan info
    plan_id: PlanId = PlanId.FREE
    status: SubscriptionStatus = SubscriptionStatus.NONE
    
    # Billing details
    billing_cycle: Literal["monthly", "yearly", "none"] = "none"
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    
    # Cancel/pause info
    scheduled_change: Optional[dict] = None  # Plan change at end of period
    cancel_at_period_end: bool = False
    paused_at: Optional[datetime] = None
    
    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# =============================================================================
# API Response Models
# =============================================================================

class UsageResponse(BaseModel):
    """Usage data returned to frontend - consistent everywhere"""
    # Videos
    videos_used: int
    videos_limit: int
    videos_remaining: int
    
    # AI Questions
    ai_questions_used: int
    ai_questions_limit: int
    ai_questions_remaining: int
    
    # Comments (per video limit)
    comments_per_video_limit: int
    
    # Period info
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    reset_date: Optional[str] = None
    
    # Plan context
    plan_id: str
    plan_name: str


class SubscriptionResponse(BaseModel):
    """Subscription info returned to frontend"""
    plan_id: str
    plan_name: str
    status: str
    billing_cycle: str
    price_formatted: str
    current_period_end: Optional[str] = None
    cancel_at_period_end: bool = False
    scheduled_change: Optional[dict] = None
    update_payment_url: Optional[str] = None
    cancel_url: Optional[str] = None


class BillingInfo(BaseModel):
    """Complete billing info for frontend - SINGLE API CALL"""
    # Subscription
    subscription: SubscriptionResponse
    
    # Usage - same data shown everywhere
    usage: UsageResponse
    
    # Available plans for upgrade/downgrade
    available_plans: list[dict]
    
    # Feature flags based on plan
    features: dict


class CheckoutRequest(BaseModel):
    """Request to create a checkout session"""
    plan_id: PlanId
    billing_cycle: Literal["monthly", "yearly"] = "monthly"
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutResponse(BaseModel):
    """Checkout session response"""
    checkout_url: Optional[str] = None
    transaction_id: Optional[str] = None
    client_token: Optional[str] = None
    # For Paddle.js inline checkout
    price_id: str
    customer_email: str


# =============================================================================
# Webhook Event Models
# =============================================================================

class PaddleWebhookEvent(BaseModel):
    """Base Paddle webhook event structure"""
    event_id: str
    event_type: str
    occurred_at: str
    notification_id: str
    data: dict


class QuotaCheckResult(BaseModel):
    """Result of a quota check"""
    allowed: bool
    usage_type: UsageType
    current: int
    limit: int
    remaining: int
    message: Optional[str] = None
    upgrade_required: bool = False
