"""
Billing Module - Complete Subscription & Usage Management
==========================================================

This module provides comprehensive billing functionality:

1. **Subscription Management** (service.py)
   - Plan lookups
   - Subscription CRUD
   - Paddle webhook handling

2. **Usage Tracking** (service.py)
   - Atomic usage counters
   - Real-time quota checking
   - Usage limits enforcement

3. **Quota Enforcement** (enforcement.py)
   - Dependency injection for FastAPI
   - Pre-request quota validation
   - Proper error responses

4. **Usage Analytics** (analytics.py)
   - Usage trends and projections
   - Daily snapshots
   - Recommendations

5. **Monthly Resets** (reset_scheduler.py)
   - Automated usage resets
   - Cloud Scheduler integration
   - Per-user and bulk resets

All features must use BillingService as the single source of truth.
"""

from .schemas import (
    PlanId,
    Plan,
    PLANS,
    get_plan,
    Subscription,
    Usage,
    UsageType,
    BillingInfo,
    QuotaCheckResult,
)
from .service import BillingService, billing_service
from .enforcement import (
    QuotaExceededError,
    require_video_quota,
    require_ai_quota,
    require_comments_quota,
)
from .analytics import UsageAnalyticsService, usage_analytics_service
from .reset_scheduler import UsageResetScheduler, usage_reset_scheduler
from .router import router

__all__ = [
    "PlanId",
    "Plan",
    "PLANS",
    "get_plan",
    "Subscription",
    "Usage",
    "UsageType",
    "BillingService",
    "billing_service",
    "BillingInfo",
    "QuotaCheckResult",
    "QuotaExceededError",
    "require_video_quota",
    "require_ai_quota",
    "require_comments_quota",
    "UsageAnalyticsService",
    "usage_analytics_service",
    "UsageResetScheduler",
    "usage_reset_scheduler",
    "router",
]

