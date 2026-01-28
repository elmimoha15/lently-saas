"""
Billing Service - SINGLE SOURCE OF TRUTH for all billing operations.

This service handles:
- Subscription management (create, update, cancel)
- Usage tracking and enforcement
- Plan lookups and validation
- Paddle webhook processing

ALL billing-related logic goes through this service to ensure consistency.
"""

import logging
import hashlib
import hmac
import time
from datetime import datetime, timedelta
from typing import Optional, Tuple
import httpx

from src.firebase_init import get_firestore
from src.config import get_settings
from .schemas import (
    PlanId,
    Plan,
    PLANS,
    get_plan,
    Usage,
    UsageType,
    Subscription,
    SubscriptionStatus,
    UsageResponse,
    SubscriptionResponse,
    BillingInfo,
    QuotaCheckResult,
)

logger = logging.getLogger(__name__)
settings = get_settings()


class BillingService:
    """
    Centralized billing service - THE source of truth for plans and usage.
    
    All components (Dashboard, Billing Page, Ask AI, Analysis) must use
    this service to get plan/usage information.
    """
    
    PADDLE_API_URL = "https://sandbox-api.paddle.com" if settings.paddle_environment == "sandbox" else "https://api.paddle.com"
    
    # ==========================================================================
    # Plan Information (Static - from PLANS constant)
    # ==========================================================================
    
    @staticmethod
    def get_plan(plan_id: str | PlanId) -> Plan:
        """Get plan configuration by ID"""
        return get_plan(plan_id)
    
    @staticmethod
    def get_all_plans() -> list[dict]:
        """Get all available plans for display"""
        return [
            {
                "id": plan.id.value,
                "name": plan.name,
                "price_monthly": plan.price_monthly,
                "price_monthly_formatted": f"${plan.price_monthly / 100:.0f}",
                "videos_per_month": plan.videos_per_month,
                "comments_per_video": plan.comments_per_video,
                "ai_questions_per_month": plan.ai_questions_per_month,
                "priority_support": plan.priority_support,
                "custom_integrations": plan.custom_integrations,
                "unlimited_ai": plan.unlimited_ai,
                "paddle_price_id_monthly": plan.paddle_price_id_monthly,
            }
            for plan in PLANS.values()
        ]
    
    # ==========================================================================
    # User Subscription & Usage (From Firestore)
    # ==========================================================================
    
    async def get_user_subscription(self, user_id: str) -> Subscription:
        """
        Get user's current subscription from Firestore.
        Returns a FREE subscription if none exists.
        """
        try:
            db = get_firestore()
            sub_ref = db.collection("users").document(user_id).collection("billing").document("subscription")
            sub_doc = sub_ref.get()
            
            if sub_doc.exists:
                data = sub_doc.to_dict()
                # Convert datetime fields
                for field in ["current_period_start", "current_period_end", "created_at", "updated_at", "paused_at"]:
                    if field in data and data[field]:
                        if hasattr(data[field], 'isoformat'):
                            pass  # Already datetime
                        elif isinstance(data[field], str):
                            data[field] = datetime.fromisoformat(data[field].replace('Z', '+00:00'))
                return Subscription(**data)
            
            # No subscription - return free plan
            return Subscription(
                plan_id=PlanId.FREE,
                status=SubscriptionStatus.NONE,
                billing_cycle="none"
            )
        except Exception as e:
            logger.error(f"Error getting subscription for user {user_id}: {e}")
            return Subscription(plan_id=PlanId.FREE, status=SubscriptionStatus.NONE)
    
    async def get_user_usage(self, user_id: str) -> Usage:
        """
        Get user's current usage from Firestore.
        AUTO-SYNCS video count from analyses collection if counter is 0.
        """
        try:
            db = get_firestore()
            usage_ref = db.collection("users").document(user_id).collection("billing").document("usage")
            usage_doc = usage_ref.get()
            
            if usage_doc.exists:
                data = usage_doc.to_dict()
                # Convert datetime fields
                for field in ["period_start", "period_end"]:
                    if field in data and data[field]:
                        if hasattr(data[field], 'isoformat'):
                            pass
                        elif isinstance(data[field], str):
                            data[field] = datetime.fromisoformat(data[field].replace('Z', '+00:00'))
                
                usage = Usage(**data)
                
                # AUTO-SYNC: If videos_analyzed is 0 but user has videos, sync it
                if usage.videos_analyzed == 0:
                    actual_count = await self._count_user_videos(user_id)
                    if actual_count > 0:
                        logger.info(f"🔄 Auto-syncing videos for user {user_id}: {actual_count} videos found")
                        from google.cloud.firestore import Increment
                        usage_ref.update({"videos_analyzed": Increment(actual_count)})
                        usage.videos_analyzed = actual_count
                
                return usage
            
            # No usage record - create default based on free plan
            plan = PLANS[PlanId.FREE]
            now = datetime.utcnow()
            
            # Check actual video count
            actual_count = await self._count_user_videos(user_id)
            
            usage = Usage(
                videos_analyzed=actual_count,  # Use actual count
                comments_analyzed=0,
                ai_questions_used=0,
                videos_limit=plan.videos_per_month,
                comments_limit=plan.comments_per_video,
                ai_questions_limit=plan.ai_questions_per_month,
                period_start=now,
                period_end=now + timedelta(days=30)
            )
            
            if actual_count > 0:
                logger.info(f"📊 New usage record for user {user_id} with {actual_count} existing videos")
            
            # Save default usage
            usage_ref.set(self._usage_to_dict(usage))
            return usage
            
        except Exception as e:
            logger.error(f"Error getting usage for user {user_id}: {e}")
            plan = PLANS[PlanId.FREE]
            return Usage(
                videos_limit=plan.videos_per_month,
                comments_limit=plan.comments_per_video,
                ai_questions_limit=plan.ai_questions_per_month
            )
    
    async def _count_user_videos(self, user_id: str) -> int:
        """
        Fast count of actual videos in user's analyses collection.
        This is the centralized source of truth for video count.
        """
        try:
            db = get_firestore()
            analyses_ref = db.collection("users").document(user_id).collection("analyses")
            
            # Fast count - only fetches document IDs, not full documents
            docs = analyses_ref.stream()
            count = sum(1 for _ in docs)
            
            return count
        except Exception as e:
            logger.error(f"Error counting videos for user {user_id}: {e}")
            return 0
    
    async def get_billing_info(self, user_id: str, email: str) -> BillingInfo:
        """
        Get complete billing info for a user - SINGLE API CALL.
        This is the main method used by frontend to get all billing data.
        """
        subscription = await self.get_user_subscription(user_id)
        usage = await self.get_user_usage(user_id)
        plan = self.get_plan(subscription.plan_id)
        
        # Build usage response
        usage_response = UsageResponse(
            videos_used=usage.videos_analyzed,
            videos_limit=usage.videos_limit,
            videos_remaining=max(0, usage.videos_limit - usage.videos_analyzed),
            ai_questions_used=usage.ai_questions_used,
            ai_questions_limit=usage.ai_questions_limit,
            ai_questions_remaining=max(0, usage.ai_questions_limit - usage.ai_questions_used),
            comments_per_video_limit=usage.comments_limit,
            period_start=usage.period_start.isoformat() if usage.period_start else None,
            period_end=usage.period_end.isoformat() if usage.period_end else None,
            reset_date=usage.period_end.isoformat() if usage.period_end else None,
            plan_id=subscription.plan_id.value,
            plan_name=plan.name
        )
        
        # Build subscription response
        price_formatted = "Free" if plan.price_monthly == 0 else f"${plan.price_monthly / 100:.0f}/mo"
        if subscription.billing_cycle == "yearly" and plan.price_yearly > 0:
            price_formatted = f"${plan.price_yearly / 100:.0f}/yr"
        
        subscription_response = SubscriptionResponse(
            plan_id=subscription.plan_id.value,
            plan_name=plan.name,
            status=subscription.status.value if isinstance(subscription.status, SubscriptionStatus) else subscription.status,
            billing_cycle=subscription.billing_cycle,
            price_formatted=price_formatted,
            current_period_end=subscription.current_period_end.isoformat() if subscription.current_period_end else None,
            cancel_at_period_end=subscription.cancel_at_period_end,
            scheduled_change=subscription.scheduled_change,
            update_payment_url=None,  # Will be set by Paddle
            cancel_url=None
        )
        
        # Feature flags based on plan
        features = {
            "priority_support": plan.priority_support,
            "custom_integrations": plan.custom_integrations,
            "unlimited_ai": plan.unlimited_ai,
            "max_videos": plan.videos_per_month,
            "max_comments_per_video": plan.comments_per_video,
            "max_ai_questions": plan.ai_questions_per_month,
        }
        
        return BillingInfo(
            subscription=subscription_response,
            usage=usage_response,
            available_plans=self.get_all_plans(),
            features=features
        )
    
    # ==========================================================================
    # Usage Tracking & Enforcement
    # ==========================================================================
    
    async def check_quota(
        self, 
        user_id: str, 
        usage_type: UsageType, 
        amount: int = 1
    ) -> QuotaCheckResult:
        """
        Check if user has quota available for an action.
        This is the ENFORCEMENT point - all features must call this.
        """
        usage = await self.get_user_usage(user_id)
        
        if usage_type == UsageType.VIDEOS:
            current = usage.videos_analyzed
            limit = usage.videos_limit
        elif usage_type == UsageType.AI_QUESTIONS:
            current = usage.ai_questions_used
            limit = usage.ai_questions_limit
        elif usage_type == UsageType.COMMENTS:
            current = 0  # Comments are per-video, not cumulative
            limit = usage.comments_limit
        else:
            return QuotaCheckResult(
                allowed=False,
                usage_type=usage_type,
                current=0,
                limit=0,
                remaining=0,
                message="Unknown usage type",
                upgrade_required=True
            )
        
        remaining = max(0, limit - current)
        allowed = current + amount <= limit
        
        if not allowed:
            message = f"You've reached your {usage_type.value} limit ({limit}). Upgrade your plan to continue."
            if usage_type == UsageType.COMMENTS:
                message = f"This video has more than {limit} comments. Upgrade to analyze more."
        else:
            message = None
        
        return QuotaCheckResult(
            allowed=allowed,
            usage_type=usage_type,
            current=current,
            limit=limit,
            remaining=remaining,
            message=message,
            upgrade_required=not allowed
        )
    
    async def increment_usage(
        self, 
        user_id: str, 
        usage_type: UsageType, 
        amount: int = 1
    ) -> Usage:
        """
        Increment usage counter after a successful action.
        Called AFTER the action completes, not before.
        """
        try:
            db = get_firestore()
            usage_ref = db.collection("users").document(user_id).collection("billing").document("usage")
            
            field_map = {
                UsageType.VIDEOS: "videos_analyzed",
                UsageType.AI_QUESTIONS: "ai_questions_used",
                UsageType.COMMENTS: "comments_analyzed",
            }
            
            field = field_map.get(usage_type)
            if field:
                from google.cloud.firestore import Increment
                usage_ref.update({field: Increment(amount)})
                logger.info(f"Incremented {field} by {amount} for user {user_id}")
            
            return await self.get_user_usage(user_id)
            
        except Exception as e:
            logger.error(f"Error incrementing usage for user {user_id}: {e}")
            raise
    
    async def reset_usage(self, user_id: str) -> Usage:
        """
        Reset usage counters for a new billing period.
        Called by subscription webhook on renewal.
        """
        try:
            subscription = await self.get_user_subscription(user_id)
            plan = self.get_plan(subscription.plan_id)
            
            now = datetime.utcnow()
            usage = Usage(
                videos_analyzed=0,
                comments_analyzed=0,
                ai_questions_used=0,
                videos_limit=plan.videos_per_month,
                comments_limit=plan.comments_per_video,
                ai_questions_limit=plan.ai_questions_per_month,
                period_start=now,
                period_end=now + timedelta(days=30)
            )
            
            db = get_firestore()
            usage_ref = db.collection("users").document(user_id).collection("billing").document("usage")
            usage_ref.set(self._usage_to_dict(usage))
            
            logger.info(f"Reset usage for user {user_id}")
            return usage
            
        except Exception as e:
            logger.error(f"Error resetting usage for user {user_id}: {e}")
            raise
    
    async def update_limits_for_plan(self, user_id: str, plan_id: PlanId) -> Usage:
        """
        Update usage limits when plan changes.
        Called on upgrade/downgrade.
        
        IMPORTANT: This updates LIMITS only, NOT usage counts.
        Existing usage (videos_analyzed, ai_questions_used) is preserved.
        
        Example scenarios:
        - User upgrades from Free (used 0/1 videos) to Pro:
          -> Sets limit to 20, keeps usage at 0 -> Result: 0/20 videos
        - User downgrades from Pro (used 5/20 videos) to Free:
          -> Sets limit to 1, keeps usage at 5 -> Result: 5/1 videos (over limit)
        - User downgrades from Pro (used 0/20 videos) to Free:
          -> Sets limit to 1, keeps usage at 0 -> Result: 0/1 videos (can use free quota)
        """
        try:
            plan = self.get_plan(plan_id)
            usage = await self.get_user_usage(user_id)
            
            # Log current state before update
            logger.info(f"Updating limits for user {user_id} from plan to {plan_id.value}:")
            logger.info(f"  Current usage: {usage.videos_analyzed}/{usage.videos_limit} videos, "
                       f"{usage.ai_questions_used}/{usage.ai_questions_limit} AI questions")
            
            # Update limits but keep current usage counts (PRESERVE USAGE)
            usage.videos_limit = plan.videos_per_month
            usage.comments_limit = plan.comments_per_video
            usage.ai_questions_limit = plan.ai_questions_per_month
            
            db = get_firestore()
            usage_ref = db.collection("users").document(user_id).collection("billing").document("usage")
            usage_ref.update({
                "videos_limit": usage.videos_limit,
                "comments_limit": usage.comments_limit,
                "ai_questions_limit": usage.ai_questions_limit,
            })
            
            # Log new state after update
            logger.info(f"  New limits: {usage.videos_analyzed}/{usage.videos_limit} videos, "
                       f"{usage.ai_questions_used}/{usage.ai_questions_limit} AI questions")
            logger.info(f"  Usage counts preserved: videos_analyzed={usage.videos_analyzed}, "
                       f"ai_questions_used={usage.ai_questions_used}")
            
            return usage
            
        except Exception as e:
            logger.error(f"Error updating limits for user {user_id}: {e}")
            raise
    
    # ==========================================================================
    # Subscription Management
    # ==========================================================================
    
    async def update_subscription(
        self,
        user_id: str,
        subscription_data: dict
    ) -> Subscription:
        """
        Update subscription in Firestore.
        Called by webhook handlers.
        """
        try:
            db = get_firestore()
            sub_ref = db.collection("users").document(user_id).collection("billing").document("subscription")
            
            # Convert enums to values
            if "plan_id" in subscription_data and isinstance(subscription_data["plan_id"], PlanId):
                subscription_data["plan_id"] = subscription_data["plan_id"].value
            if "status" in subscription_data and isinstance(subscription_data["status"], SubscriptionStatus):
                subscription_data["status"] = subscription_data["status"].value
            
            subscription_data["updated_at"] = datetime.utcnow().isoformat()
            
            sub_ref.set(subscription_data, merge=True)
            logger.info(f"Updated subscription for user {user_id}")
            
            return await self.get_user_subscription(user_id)
            
        except Exception as e:
            logger.error(f"Error updating subscription for user {user_id}: {e}")
            raise
    
    async def cancel_subscription(self, user_id: str, at_period_end: bool = True) -> Subscription:
        """
        Cancel user's subscription.
        
        Default behavior (at_period_end=True):
        - Sets subscription to cancel at end of billing period
        - User keeps full access until period ends
        - Auto-renew is turned off
        - Downgrade happens when Paddle webhook fires at period end
        
        Immediate cancellation (at_period_end=False):
        - Cancels and downgrades immediately (for admin/support use)
        """
        subscription = await self.get_user_subscription(user_id)
        
        if not subscription.paddle_subscription_id:
            raise ValueError("No active subscription to cancel")
        
        # Call Paddle API to cancel (skip for sandbox/test subscriptions)
        # In sandbox, we just update local state without calling Paddle
        should_call_paddle = (
            settings.paddle_environment == "production" and 
            subscription.paddle_subscription_id and
            not subscription.paddle_subscription_id.startswith("sub_test_")
        )
        
        if should_call_paddle:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.PADDLE_API_URL}/subscriptions/{subscription.paddle_subscription_id}/cancel",
                    headers={
                        "Authorization": f"Bearer {settings.paddle_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "effective_from": "next_billing_period" if at_period_end else "immediately"
                    }
                )
                
                if response.status_code not in [200, 202]:
                    logger.error(f"Paddle cancel failed: {response.text}")
                    raise ValueError(f"Failed to cancel subscription: {response.text}")
        else:
            logger.info(f"Skipping Paddle API call for sandbox/test subscription: {subscription.paddle_subscription_id}")
        
        # Update local subscription state
        if at_period_end:
            # CANCEL AT PERIOD END - Keep access until billing period ends
            subscription.cancel_at_period_end = True
            subscription.status = SubscriptionStatus.ACTIVE  # Still active!
            await self.update_subscription(user_id, subscription.dict())
            
            logger.info(f"User {user_id} subscription will cancel at period end: {subscription.current_period_end}")
            logger.info(f"User retains {subscription.plan_id} plan access until: {subscription.current_period_end}")
        else:
            # IMMEDIATE CANCELLATION - Downgrade now (admin/support only)
            subscription.status = SubscriptionStatus.CANCELED
            subscription.plan_id = PlanId.FREE.value
            subscription.paddle_subscription_id = None
            subscription.paddle_price_id = None
            await self.update_subscription(user_id, subscription.dict())
            
            # Update limits to Free plan but preserve existing usage
            await self.update_limits_for_plan(user_id, PlanId.FREE)
            
            logger.info(f"User {user_id} immediately cancelled and downgraded to Free plan")
        
        return await self.get_user_subscription(user_id)
    
    # ==========================================================================
    # Webhook Signature Verification
    # ==========================================================================
    
    def verify_webhook_signature(
        self, 
        raw_body: bytes, 
        signature_header: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify Paddle webhook signature.
        Returns (is_valid, error_message)
        """
        try:
            # Parse signature header: ts=1671552777;h1=signature
            parts = {}
            for part in signature_header.split(";"):
                key, value = part.split("=", 1)
                parts[key] = value
            
            timestamp = parts.get("ts")
            signature = parts.get("h1")
            
            if not timestamp or not signature:
                return False, "Missing timestamp or signature"
            
            # Check timestamp freshness (prevent replay attacks)
            ts = int(timestamp)
            now = int(time.time())
            if abs(now - ts) > 300:  # 5 minute tolerance
                return False, "Webhook timestamp too old"
            
            # Build signed payload: ts:body
            signed_payload = f"{timestamp}:{raw_body.decode('utf-8')}"
            
            # Compute HMAC
            expected_signature = hmac.new(
                settings.paddle_webhook_secret.encode("utf-8"),
                signed_payload.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures
            if not hmac.compare_digest(signature, expected_signature):
                return False, "Signature mismatch"
            
            return True, None
            
        except Exception as e:
            logger.error(f"Signature verification error: {e}")
            return False, str(e)
    
    # ==========================================================================
    # Helpers
    # ==========================================================================
    
    def _usage_to_dict(self, usage: Usage) -> dict:
        """Convert Usage to Firestore-compatible dict"""
        return {
            "videos_analyzed": usage.videos_analyzed,
            "comments_analyzed": usage.comments_analyzed,
            "ai_questions_used": usage.ai_questions_used,
            "videos_limit": usage.videos_limit,
            "comments_limit": usage.comments_limit,
            "ai_questions_limit": usage.ai_questions_limit,
            "period_start": usage.period_start.isoformat() if usage.period_start else None,
            "period_end": usage.period_end.isoformat() if usage.period_end else None,
        }


# Singleton instance
billing_service = BillingService()
