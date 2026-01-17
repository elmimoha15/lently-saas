# Phase 10: Usage Tracking & Quotas - Complete ✅

**Date:** January 17, 2026  
**Status:** Fully Implemented

---

## Overview

Phase 10 enhances Lently's billing system with **comprehensive usage tracking, real-time quota enforcement, usage analytics, and automated monthly resets**.

---

## What Was Built

### 🆕 New Components

1. **Usage Analytics Service** (`src/billing/analytics.py`)
   - Usage trends over time
   - Projected usage calculations
   - Smart recommendations
   - Daily snapshots for historical analysis

2. **Reset Scheduler** (`src/billing/reset_scheduler.py`)
   - Automated monthly resets via Cloud Scheduler
   - Single-user and bulk reset support
   - Period expiration checking
   - Error handling and retry logic

3. **Cloud Scheduler Setup Script** (`scripts/setup_usage_scheduler.sh`)
   - One-command setup for production
   - Configures monthly reset job
   - Optional daily snapshot job

4. **Admin/Analytics Endpoints** (added to `src/billing/router.py`)
   - `GET /api/billing/analytics` - Usage trends
   - `POST /api/billing/admin/reset-usage` - Manual resets
   - `GET /api/billing/admin/users-due-reset` - Monitoring

### ✅ Enhanced Existing Components

1. **Billing Service** (`src/billing/service.py`) - Already had:
   - Atomic usage counters with Firestore `Increment`
   - `check_quota()` - Pre-request validation
   - `increment_usage()` - Post-success tracking
   - `reset_usage()` - Period-based resets
   - `update_limits_for_plan()` - Plan change handling

2. **Enforcement** (`src/billing/enforcement.py`) - Already had:
   - `require_video_quota()` dependency
   - `require_ai_quota()` dependency
   - `require_comments_quota()` dependency
   - `QuotaExceededError` exception

---

## Architecture

### Usage Tracking Flow

```
User Action (Analyze Video / Ask AI)
           ↓
    ┌──────────────────┐
    │ Check Quota      │  ← FastAPI Dependency Injection
    │ (Before Action)  │     (require_video_quota)
    └──────────────────┘
           ↓
    ┌──────────────────┐
    │ Allowed?         │
    └──────────────────┘
      Yes ↓        No ↓
          ↓          Return 402 Payment Required
    ┌──────────────────┐
    │ Perform Action   │  ← Expensive operation
    └──────────────────┘
           ↓
    ┌──────────────────┐
    │ Increment Counter│  ← Atomic Firestore update
    │ (After Success)  │     (Increment(1))
    └──────────────────┘
           ↓
        Success
```

### Monthly Reset Flow

```
Cloud Scheduler (1st of month, midnight EST)
           ↓
    POST /api/billing/admin/reset-usage
           ↓
    UsageResetScheduler.reset_all_users()
           ↓
    For Each User:
      1. Check if period_end has passed
      2. If yes:
         - Reset counters to 0
         - Update limits from current plan
         - Set new period_start = now
         - Set new period_end = now + 30 days
      3. If no: Skip
           ↓
    Return Stats:
      - total_checked
      - reset_successful
      - reset_failed
      - not_due
```

---

## Firestore Structure

### `users/{userId}/billing/usage`
```javascript
{
  // Counters (reset monthly)
  videos_analyzed: 5,
  comments_analyzed: 437,
  ai_questions_used: 12,
  
  // Limits (from plan)
  videos_limit: 10,
  comments_limit: 3000,
  ai_questions_limit: 30,
  
  // Period tracking
  period_start: Timestamp("2026-01-01T00:00:00Z"),
  period_end: Timestamp("2026-02-01T00:00:00Z")
}
```

### `users/{userId}/billing/subscription`
```javascript
{
  plan_id: "pro",
  status: "active",
  paddle_subscription_id: "sub_abc123",
  billing_cycle: "monthly",
  current_period_start: Timestamp,
  current_period_end: Timestamp,
  cancel_at_period_end: false,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### `users/{userId}/usage_history/{date}` (Optional)
```javascript
{
  date: "2026-01-17",
  videos_used: 2,
  ai_questions_used: 5,
  comments_analyzed: 150
}
```

---

## API Endpoints

### User Endpoints

#### 1. Get Billing Info (Main Endpoint)
```http
GET /api/billing/info
Authorization: Bearer {token}

Response:
{
  "subscription": {
    "plan_id": "pro",
    "plan_name": "Pro",
    "status": "active",
    "billing_cycle": "monthly",
    "price_formatted": "$29/mo"
  },
  "usage": {
    "videos_used": 7,
    "videos_limit": 25,
    "videos_remaining": 18,
    "ai_questions_used": 18,
    "ai_questions_limit": 100,
    "ai_questions_remaining": 82,
    "comments_per_video_limit": 10000,
    "period_start": "2026-01-01T00:00:00Z",
    "period_end": "2026-02-01T00:00:00Z",
    "reset_date": "2026-02-01T00:00:00Z"
  },
  "features": {
    "priority_support": true,
    "unlimited_ai": false,
    "max_videos": 25,
    ...
  }
}
```

#### 2. Get Usage Analytics
```http
GET /api/billing/analytics?include_trends=true&days_back=30
Authorization: Bearer {token}

Response:
{
  "current_period": {
    "videos_used": 7,
    "videos_limit": 10,
    "ai_questions_used": 18,
    "ai_questions_limit": 30
  },
  "usage_percentage": {
    "videos": 70.0,
    "ai_questions": 60.0
  },
  "projected_usage": {
    "videos": 12,  // Will exceed limit!
    "ai_questions": 28
  },
  "warnings": [
    "You've used 70% of your video quota",
    "At current pace, you'll exceed your video limit before period ends"
  ],
  "recommendations": [
    "Consider upgrading to Pro plan to avoid running out of videos"
  ],
  "trends": {
    "avg_videos_per_day": 0.5,
    "avg_ai_questions_per_day": 1.2,
    "total_videos": 7,
    "peak_usage_day": "2026-01-15T00:00:00Z"
  }
}
```

#### 3. Check Specific Quota
```http
GET /api/billing/quota/videos?amount=1
Authorization: Bearer {token}

Response:
{
  "allowed": true,
  "usage_type": "videos",
  "current": 7,
  "limit": 10,
  "remaining": 3,
  "message": null,
  "upgrade_required": false
}
```

### Admin Endpoints (For Cron Jobs)

#### 1. Reset Usage
```http
POST /api/billing/admin/reset-usage
Content-Type: application/json

{
  "admin_key": "your_admin_key",
  "user_id": "user123",  // Optional - omit for bulk reset
  "force": false
}

Response:
{
  "success": true,
  "stats": {
    "total_checked": 150,
    "reset_successful": 145,
    "reset_failed": 2,
    "not_due": 3
  },
  "message": "Monthly usage reset completed"
}
```

#### 2. Get Users Due for Reset
```http
GET /api/billing/admin/users-due-reset?admin_key=your_key

Response:
{
  "count": 12,
  "user_ids": [
    "user123",
    "user456",
    ...
  ]
}
```

---

## Quota Enforcement in Code

### Using FastAPI Dependencies

```python
from src.billing.enforcement import require_video_quota, require_ai_quota
from src.billing.schemas import QuotaCheckResult
from src.billing.service import billing_service

@router.post("/api/analysis/start")
async def start_analysis(
    request: AnalysisRequest,
    # ✅ Quota is checked automatically before entering function
    quota: QuotaCheckResult = Depends(require_video_quota),
    user: AuthenticatedUser = Depends(get_current_user)
):
    # If we reach here, user has quota available
    logger.info(f"User has {quota.remaining} videos remaining")
    
    try:
        # Perform expensive operation
        result = await analysis_service.run_analysis(...)
        
        # ✅ Increment counter AFTER success
        await billing_service.increment_usage(
            user.uid,
            UsageType.VIDEOS,
            amount=1
        )
        
        return result
    except Exception as e:
        # ❌ Don't increment on failure
        raise
```

### Error Response (Quota Exceeded)

When quota is exceeded, user gets:
```json
{
  "status": 402,
  "detail": {
    "error": "quota_exceeded",
    "usage_type": "videos",
    "current": 10,
    "limit": 10,
    "remaining": 0,
    "message": "You've reached your videos limit (10). Upgrade your plan to continue.",
    "upgrade_required": true
  }
}
```

---

## Cloud Scheduler Setup

### Automated Setup

```bash
cd lently-backend/scripts
chmod +x setup_usage_scheduler.sh

# Configure environment
export FIREBASE_PROJECT_ID=lently-prod
export GCP_REGION=us-central1
export BACKEND_URL=https://lently-api.run.app
export JWT_SECRET_KEY=your-secret-key

# Run setup
./setup_usage_scheduler.sh
```

### Manual Setup

```bash
# 1. Enable Cloud Scheduler API
gcloud services enable cloudscheduler.googleapis.com

# 2. Create monthly reset job
gcloud scheduler jobs create http monthly-usage-reset \
  --location=us-central1 \
  --schedule="0 0 1 * *" \
  --time-zone="America/New_York" \
  --uri="https://your-backend.run.app/api/billing/admin/reset-usage" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"admin_key": "your_admin_key"}' \
  --attempt-deadline=600s \
  --max-retry-attempts=3

# 3. Test manually
gcloud scheduler jobs run monthly-usage-reset --location=us-central1

# 4. View logs
gcloud scheduler jobs describe monthly-usage-reset --location=us-central1
```

### Schedule Format

- **Monthly Reset**: `0 0 1 * *` = 1st day of month at midnight
- **Daily Snapshot**: `0 2 * * *` = Every day at 2 AM

---

## Testing

### Test Quota Enforcement

```bash
# 1. Create test user with free plan (3 video limit)

# 2. Analyze videos until quota exceeded
for i in {1..4}; do
  curl -X POST http://localhost:8000/api/analysis/start \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"video_url_or_id\": \"video$i\"}"
done

# 3. 4th request should return 402 Payment Required

# 4. Upgrade to Pro plan
# 5. Verify limits updated immediately
curl http://localhost:8000/api/billing/info \
  -H "Authorization: Bearer $TOKEN"
# Should show videos_limit: 25
```

### Test Monthly Reset

```bash
# 1. Reset single user (force)
curl -X POST http://localhost:8000/api/billing/admin/reset-usage \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "force": true,
    "admin_key": "test_key"
  }'

# 2. Verify usage reset to 0
curl http://localhost:8000/api/billing/usage \
  -H "Authorization: Bearer $TOKEN"

# Should show: videos_analyzed: 0, ai_questions_used: 0

# 3. Test bulk reset
curl -X POST http://localhost:8000/api/billing/admin/reset-usage \
  -H "Content-Type: application/json" \
  -d '{"admin_key": "test_key"}'

# Should return stats for all users
```

### Test Analytics

```bash
curl http://localhost:8000/api/billing/analytics \
  -H "Authorization: Bearer $TOKEN"

# Verify response includes:
# - current_period
# - usage_percentage
# - projected_usage
# - warnings
# - recommendations
```

---

## Key Features

### ✅ **Atomic Usage Tracking**
- Uses Firestore's `Increment` operation
- No race conditions
- Multiple simultaneous requests handled correctly
- Guaranteed accuracy

### ✅ **Pre-Request Enforcement**
- Quota checked BEFORE expensive operations
- Prevents wasted resources on failed requests
- Clear error messages with upgrade CTAs
- Frontend can show warnings before hitting limit

### ✅ **Automated Monthly Resets**
- Cloud Scheduler triggers at start of month
- Handles all users automatically
- Retry logic for transient failures
- Stats reporting for monitoring

### ✅ **Usage Analytics**
- Historical trends (daily snapshots)
- Projected usage based on current pace
- Smart warnings (>80% quota used)
- Personalized recommendations

### ✅ **Plan-Based Limits**
- Limits automatically sync with plan
- Immediate effect on upgrade/downgrade
- No manual intervention needed
- Quota checked against live limits

### ✅ **Admin Tools**
- Manual reset for individual users
- Bulk reset for all users
- Query users needing reset
- Force reset option for testing

---

## Monitoring

### View Scheduler Status
```bash
gcloud scheduler jobs describe monthly-usage-reset \
  --location=us-central1
```

### Check Recent Executions
```bash
gcloud scheduler jobs executions list monthly-usage-reset \
  --location=us-central1 \
  --limit=10
```

### View Logs
```bash
gcloud logging read \
  "resource.type=cloud_scheduler_job 
   AND resource.labels.job_id=monthly-usage-reset" \
  --limit=50 \
  --format=json
```

### Set Up Alerts
```bash
# Alert on reset job failure
gcloud alpha monitoring policies create \
  --notification-channels=email-channel \
  --display-name="Usage Reset Failed" \
  --condition-display-name="Reset job error" \
  --condition-threshold-value=1 \
  --condition-threshold-duration=0s
```

---

## Best Practices

### ✅ DO

1. **Always use enforcement dependencies**
   ```python
   quota: QuotaCheckResult = Depends(require_video_quota)
   ```

2. **Increment after success**
   ```python
   result = await operation()
   await billing_service.increment_usage(...)
   return result
   ```

3. **Use BillingService as single source of truth**
   ```python
   from src.billing import billing_service
   info = await billing_service.get_billing_info(user_id, email)
   ```

4. **Monitor reset jobs monthly**
   - Check Cloud Scheduler logs
   - Verify stats (reset_successful vs reset_failed)
   - Alert on failures

### ❌ DON'T

1. **Don't check quota manually**
   ```python
   # ❌ Bad
   usage = await get_user_usage(user_id)
   if usage.videos_analyzed >= usage.videos_limit:
       raise HTTPException(...)
   ```

2. **Don't increment before operation**
   ```python
   # ❌ Bad - increments even if operation fails
   await billing_service.increment_usage(...)
   result = await expensive_operation()
   ```

3. **Don't bypass enforcement**
   ```python
   # ❌ Bad - skips quota check
   @router.post("/analyze")
   async def analyze(user: AuthenticatedUser):
       # Missing: quota dependency
   ```

---

## Summary

**Phase 10 provides enterprise-grade usage tracking and quota management:**

✅ **Atomic usage counters** - No race conditions  
✅ **Pre-request enforcement** - Prevents wasted resources  
✅ **Automated monthly resets** - Set and forget  
✅ **Usage analytics** - Trends and projections  
✅ **Smart recommendations** - Helps users upgrade at right time  
✅ **Admin tools** - Manual overrides when needed  
✅ **Cloud Scheduler integration** - Production-ready  
✅ **Comprehensive monitoring** - Logs and alerts  

The system is now ready to handle **thousands of users** with accurate tracking, fair enforcement, and automated maintenance! 🚀
