"""
Billing API Router - All billing and subscription endpoints.

Handles:
- Get billing info (single source of truth for frontend)
- Checkout session creation
- Subscription management
- Paddle webhooks
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status, Body
from pydantic import BaseModel

from src.middleware.auth import get_current_user, AuthenticatedUser
from .schemas import (
    PlanId,
    PLANS,
    get_plan,
    UsageType,
    SubscriptionStatus,
    BillingInfo,
    CheckoutRequest,
    CheckoutResponse,
    UsageResponse,
    QuotaCheckResult,
)
from .service import billing_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["Billing"])


# =============================================================================
# Main Billing Info Endpoint - SINGLE SOURCE OF TRUTH
# =============================================================================

@router.get("/info", response_model=BillingInfo)
async def get_billing_info(user: AuthenticatedUser = Depends(get_current_user)):
    """
    Get complete billing info for the current user.
    
    This is THE source of truth for:
    - Current plan
    - Usage (videos, comments, AI questions)
    - Subscription status
    - Available plans
    - Feature flags
    
    Frontend should call this endpoint and cache the response.
    Use this data EVERYWHERE (dashboard, billing page, ask AI, etc.)
    """
    try:
        return await billing_service.get_billing_info(user.uid, user.email)
    except Exception as e:
        logger.error(f"Error getting billing info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get billing info"
        )


@router.get("/usage", response_model=UsageResponse)
async def get_usage(user: AuthenticatedUser = Depends(get_current_user)):
    """
    Get current usage statistics.
    Use /billing/info for complete billing data.
    """
    try:
        billing_info = await billing_service.get_billing_info(user.uid, user.email)
        return billing_info.usage
    except Exception as e:
        logger.error(f"Error getting usage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get usage"
        )


@router.get("/plans")
async def get_plans():
    """
    Get all available plans with pricing and features.
    Public endpoint - no auth required.
    """
    return billing_service.get_all_plans()


# =============================================================================
# Quota Checking - For Feature Enforcement
# =============================================================================

@router.get("/quota/{usage_type}", response_model=QuotaCheckResult)
async def check_quota(
    usage_type: UsageType,
    amount: int = 1,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Check if user has quota available for an action.
    
    Used by frontend before starting an action to show proper UI.
    Backend enforcement happens in the actual feature endpoints.
    """
    try:
        return await billing_service.check_quota(user.uid, usage_type, amount)
    except Exception as e:
        logger.error(f"Error checking quota: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check quota"
        )


# =============================================================================
# Checkout & Subscription Management
# =============================================================================

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    request: CheckoutRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Create a checkout session for a plan.
    
    Returns data needed for Paddle.js inline checkout.
    For redirect checkout, use the checkout_url.
    """
    try:
        plan = get_plan(request.plan_id)
        
        if plan.id == PlanId.FREE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot checkout for free plan"
            )
        
        # Get the appropriate Paddle price ID
        price_id = (
            plan.paddle_price_id_yearly 
            if request.billing_cycle == "yearly" 
            else plan.paddle_price_id_monthly
        )
        
        if not price_id:
            # Return placeholder for development
            # TODO: Set real Paddle price IDs in schemas.py
            logger.warning(f"No Paddle price ID set for {plan.id} ({request.billing_cycle})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No price ID configured for {plan.name} plan"
            )
        
        logger.info(f"Creating checkout for user {user.email}, plan {plan.id}, price_id: {price_id}")
        
        return CheckoutResponse(
            checkout_url=None,
            transaction_id=None,
            client_token=None,
            price_id=price_id,
            customer_email=user.email
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating checkout: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout"
        )


@router.post("/cancel")
async def cancel_subscription(
    at_period_end: bool = True,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Cancel the current subscription.
    
    By default, cancels at end of billing period (at_period_end=true).
    Set at_period_end=false to cancel immediately.
    """
    try:
        subscription = await billing_service.cancel_subscription(user.uid, at_period_end)
        return {
            "success": True,
            "message": "Subscription cancelled" + (" at end of period" if at_period_end else " immediately"),
            "subscription": subscription
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error cancelling subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )


# =============================================================================
# Manual Subscription Sync (Fallback when webhooks aren't available)
# =============================================================================

class ManualUpgradeRequest(BaseModel):
    plan_id: str
    transaction_id: Optional[str] = None


@router.post("/sync-subscription")
async def sync_subscription(
    request: ManualUpgradeRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Manually sync/upgrade subscription after checkout.
    
    This endpoint is called by the frontend after Paddle checkout completes.
    It updates the user's subscription in Firestore.
    
    In production, this should verify the transaction with Paddle's API.
    For now (sandbox/development), it trusts the frontend.
    """
    try:
        # Validate plan exists
        plan_id = PlanId(request.plan_id)
        plan = get_plan(plan_id)
        
        if plan_id == PlanId.FREE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot upgrade to free plan via this endpoint"
            )
        
        logger.info(f"Manual subscription sync for user {user.uid} to plan {plan_id.value}")
        
        # Update subscription in Firestore
        subscription_data = {
            "plan_id": plan_id.value,
            "status": SubscriptionStatus.ACTIVE.value,
            "paddle_transaction_id": request.transaction_id,
            "current_period_start": datetime.utcnow().isoformat(),
            "current_period_end": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "billing_cycle": "monthly",
            "synced_at": datetime.utcnow().isoformat(),
        }
        
        await billing_service.update_subscription(user.uid, subscription_data)
        
        # Update usage limits for new plan
        await billing_service.update_limits_for_plan(user.uid, plan_id)
        
        logger.info(f"User {user.uid} successfully upgraded to {plan_id.value}")
        
        # Return updated billing info
        return await billing_service.get_billing_info(user.uid, user.email)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan: {request.plan_id}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync subscription"
        )


# =============================================================================
# Paddle Webhooks
# =============================================================================

@router.post("/webhook")
async def paddle_webhook(request: Request):
    """
    Handle Paddle webhook events.
    
    Paddle sends webhooks for:
    - subscription.created
    - subscription.updated
    - subscription.activated
    - subscription.past_due
    - subscription.paused
    - subscription.resumed
    - subscription.canceled
    - transaction.completed
    - transaction.updated
    """
    try:
        # Get raw body for signature verification
        raw_body = await request.body()
        signature = request.headers.get("Paddle-Signature", "")
        
        # Verify signature
        is_valid, error = billing_service.verify_webhook_signature(raw_body, signature)
        if not is_valid:
            logger.warning(f"Webhook signature verification failed: {error}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid signature: {error}"
            )
        
        # Parse event
        event = json.loads(raw_body)
        event_type = event.get("event_type")
        event_id = event.get("event_id")
        data = event.get("data", {})
        
        logger.info(f"Received Paddle webhook: {event_type} (ID: {event_id})")
        
        # Route to appropriate handler
        handlers = {
            "subscription.created": handle_subscription_created,
            "subscription.updated": handle_subscription_updated,
            "subscription.activated": handle_subscription_activated,
            "subscription.past_due": handle_subscription_past_due,
            "subscription.paused": handle_subscription_paused,
            "subscription.resumed": handle_subscription_resumed,
            "subscription.canceled": handle_subscription_canceled,
            "transaction.completed": handle_transaction_completed,
        }
        
        handler = handlers.get(event_type)
        if handler:
            await handler(data, event_id)
        else:
            logger.info(f"Unhandled webhook event type: {event_type}")
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )


# =============================================================================
# Webhook Event Handlers
# =============================================================================

async def get_user_id_from_webhook_data(data: dict) -> Optional[str]:
    """
    Get Firebase user ID from webhook data.
    
    First checks custom_data.userId (passed from checkout).
    Falls back to looking up by paddle_customer_id.
    """
    try:
        from src.firebase_init import get_firestore
        db = get_firestore()
        
        # Method 1: Check custom_data.userId (set during checkout)
        custom_data = data.get("custom_data") or {}
        user_id = custom_data.get("userId")
        if user_id:
            logger.info(f"Found userId from custom_data: {user_id}")
            return user_id
        
        # Method 2: Look up by paddle_customer_id
        customer_id = data.get("customer_id")
        if customer_id:
            users_ref = db.collection("users")
            query = users_ref.where("paddle_customer_id", "==", customer_id).limit(1)
            docs = query.get()
            
            for doc in docs:
                logger.info(f"Found user {doc.id} from paddle_customer_id: {customer_id}")
                return doc.id
        
        logger.warning(f"Could not find user - no custom_data.userId and no customer mapping")
        return None
    except Exception as e:
        logger.error(f"Error looking up user from webhook data: {e}")
        return None


async def store_paddle_customer_mapping(user_id: str, customer_id: str):
    """Store the Paddle customer ID on the user document for future lookups"""
    try:
        from src.firebase_init import get_firestore
        db = get_firestore()
        
        user_ref = db.collection("users").document(user_id)
        user_ref.update({"paddle_customer_id": customer_id})
        logger.info(f"Stored paddle_customer_id {customer_id} for user {user_id}")
    except Exception as e:
        logger.error(f"Error storing paddle customer mapping: {e}")


async def handle_subscription_created(data: dict, event_id: str):
    """Handle subscription.created event"""
    subscription_id = data.get("id")
    customer_id = data.get("customer_id")
    status_value = data.get("status")
    
    logger.info(f"Subscription created: {subscription_id} for customer {customer_id}")
    logger.info(f"Webhook data keys: {list(data.keys())}")
    logger.info(f"Custom data: {data.get('custom_data')}")
    
    user_id = await get_user_id_from_webhook_data(data)
    if not user_id:
        logger.error(f"Could not find user for Paddle customer {customer_id}")
        return
    
    # Store the customer mapping for future webhooks
    if customer_id:
        await store_paddle_customer_mapping(user_id, customer_id)
    
    # Determine plan from price
    items = data.get("items", [])
    price_id = items[0].get("price", {}).get("id") if items else None
    plan_id = await get_plan_from_price_id(price_id)
    
    # Update subscription
    subscription_data = {
        "paddle_subscription_id": subscription_id,
        "paddle_customer_id": customer_id,
        "paddle_price_id": price_id,
        "plan_id": plan_id.value,
        "status": status_value,
        "billing_cycle": get_billing_cycle_from_price(data),
        "current_period_start": parse_paddle_date(data.get("current_billing_period", {}).get("starts_at")),
        "current_period_end": parse_paddle_date(data.get("current_billing_period", {}).get("ends_at")),
        "created_at": datetime.utcnow().isoformat(),
    }
    
    await billing_service.update_subscription(user_id, subscription_data)
    
    # Update usage limits for new plan
    await billing_service.update_limits_for_plan(user_id, plan_id)
    
    logger.info(f"User {user_id} subscribed to {plan_id}")


async def handle_subscription_updated(data: dict, event_id: str):
    """Handle subscription.updated event (plan changes, etc.)"""
    subscription_id = data.get("id")
    customer_id = data.get("customer_id")
    
    logger.info(f"Subscription updated: {subscription_id}")
    
    user_id = await get_user_id_from_webhook_data(data)
    if not user_id:
        return
    
    # Get new plan
    items = data.get("items", [])
    price_id = items[0].get("price", {}).get("id") if items else None
    plan_id = await get_plan_from_price_id(price_id)
    
    # Check for scheduled changes
    scheduled_change = data.get("scheduled_change")
    
    subscription_data = {
        "paddle_price_id": price_id,
        "plan_id": plan_id.value,
        "status": data.get("status"),
        "current_period_start": parse_paddle_date(data.get("current_billing_period", {}).get("starts_at")),
        "current_period_end": parse_paddle_date(data.get("current_billing_period", {}).get("ends_at")),
        "scheduled_change": scheduled_change,
    }
    
    await billing_service.update_subscription(user_id, subscription_data)
    await billing_service.update_limits_for_plan(user_id, plan_id)


async def handle_subscription_activated(data: dict, event_id: str):
    """Handle subscription.activated event (subscription becomes active)"""
    await handle_subscription_updated(data, event_id)


async def handle_subscription_past_due(data: dict, event_id: str):
    """Handle subscription.past_due event"""
    subscription_id = data.get("id")
    customer_id = data.get("customer_id")
    
    logger.warning(f"Subscription past due: {subscription_id}")
    
    user_id = await get_user_id_from_webhook_data(data)
    if not user_id:
        return
    
    await billing_service.update_subscription(user_id, {
        "status": SubscriptionStatus.PAST_DUE.value
    })


async def handle_subscription_paused(data: dict, event_id: str):
    """Handle subscription.paused event"""
    subscription_id = data.get("id")
    customer_id = data.get("customer_id")
    
    logger.info(f"Subscription paused: {subscription_id}")
    
    user_id = await get_user_id_from_webhook_data(data)
    if not user_id:
        return
    
    await billing_service.update_subscription(user_id, {
        "status": SubscriptionStatus.PAUSED.value,
        "paused_at": datetime.utcnow().isoformat()
    })


async def handle_subscription_resumed(data: dict, event_id: str):
    """Handle subscription.resumed event"""
    subscription_id = data.get("id")
    customer_id = data.get("customer_id")
    
    logger.info(f"Subscription resumed: {subscription_id}")
    
    user_id = await get_user_id_from_webhook_data(data)
    if not user_id:
        return
    
    await billing_service.update_subscription(user_id, {
        "status": SubscriptionStatus.ACTIVE.value,
        "paused_at": None
    })


async def handle_subscription_canceled(data: dict, event_id: str):
    """Handle subscription.canceled event"""
    subscription_id = data.get("id")
    customer_id = data.get("customer_id")
    
    logger.info(f"Subscription canceled: {subscription_id}")
    
    user_id = await get_user_id_from_webhook_data(data)
    if not user_id:
        return
    
    # Downgrade to free plan
    await billing_service.update_subscription(user_id, {
        "status": SubscriptionStatus.CANCELED.value,
        "plan_id": PlanId.FREE.value,
        "paddle_subscription_id": None,
        "paddle_price_id": None,
    })
    
    # Update limits to free plan
    await billing_service.update_limits_for_plan(user_id, PlanId.FREE)


async def handle_transaction_completed(data: dict, event_id: str):
    """
    Handle transaction.completed event.
    This confirms payment was successful.
    For renewals, reset usage counters.
    """
    transaction_id = data.get("id")
    customer_id = data.get("customer_id")
    subscription_id = data.get("subscription_id")
    origin = data.get("origin")  # "subscription_recurring" for renewals
    
    logger.info(f"Transaction completed: {transaction_id} (origin: {origin})")
    logger.info(f"Transaction data keys: {list(data.keys())}")
    logger.info(f"Transaction custom_data: {data.get('custom_data')}")
    
    user_id = await get_user_id_from_webhook_data(data)
    if not user_id:
        logger.error(f"Could not find user for transaction {transaction_id}")
        return
    
    # Store customer mapping for future lookups
    if customer_id:
        await store_paddle_customer_mapping(user_id, customer_id)
    
    # For recurring payments (renewals), reset usage
    if origin == "subscription_recurring":
        logger.info(f"Resetting usage for user {user_id} (subscription renewal)")
        await billing_service.reset_usage(user_id)


# =============================================================================
# Helper Functions
# =============================================================================

async def get_plan_from_price_id(price_id: Optional[str]) -> PlanId:
    """Map Paddle price ID to plan ID"""
    if not price_id:
        return PlanId.FREE
    
    # Check each plan for matching price ID
    for plan_id, plan in PLANS.items():
        if price_id in [plan.paddle_price_id_monthly, plan.paddle_price_id_yearly]:
            return plan_id
    
    logger.warning(f"Unknown Paddle price ID: {price_id}")
    return PlanId.FREE


def get_billing_cycle_from_price(data: dict) -> str:
    """Determine billing cycle from Paddle data"""
    items = data.get("items", [])
    if not items:
        return "none"
    
    billing_cycle = items[0].get("price", {}).get("billing_cycle", {})
    interval = billing_cycle.get("interval", "month")
    
    return "yearly" if interval == "year" else "monthly"


def parse_paddle_date(date_str: Optional[str]) -> Optional[str]:
    """Parse Paddle date string to ISO format"""
    if not date_str:
        return None
    
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.isoformat()
    except:
        return date_str


# =============================================================================
# Customer Management (for linking Paddle customers to users)
# =============================================================================

class LinkCustomerRequest(BaseModel):
    paddle_customer_id: str


@router.post("/link-customer")
async def link_paddle_customer(
    request: LinkCustomerRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Link a Paddle customer ID to a user.
    Called after Paddle checkout is initiated.
    """
    try:
        from src.firebase_init import get_firestore
        db = get_firestore()
        
        user_ref = db.collection("users").document(user.uid)
        user_ref.update({
            "paddle_customer_id": request.paddle_customer_id
        })
        
        logger.info(f"Linked Paddle customer {request.paddle_customer_id} to user {user.uid}")
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Error linking customer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to link customer"
        )
