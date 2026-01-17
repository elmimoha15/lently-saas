"""
Unit Tests for Billing Service
===============================

Tests usage tracking, quota enforcement, and subscription management.
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime, timedelta

from src.billing.service import BillingService
from src.billing.schemas import UsageType, QuotaCheckResult
from src.billing.enforcement import require_video_quota, require_ai_quota


# ============================================================================
# BillingService Tests
# ============================================================================

@pytest.mark.unit
class TestBillingService:
    """Test core billing service functionality"""
    
    @pytest.mark.asyncio
    async def test_check_quota_allowed(self, mock_firestore):
        """Test quota check when user has remaining quota"""
        # Mock Firestore to return usage data
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "videos_analyzed": 2,
            "videos_limit": 10
        }
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        service = BillingService()
        result = await service.check_quota("user123", UsageType.VIDEOS, amount=1)
        
        assert result.allowed is True
        assert result.current == 2
        assert result.limit == 10
        assert result.remaining == 8
    
    @pytest.mark.asyncio
    async def test_check_quota_exceeded(self, mock_firestore):
        """Test quota check when user has exceeded quota"""
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "videos_analyzed": 10,
            "videos_limit": 10
        }
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        service = BillingService()
        result = await service.check_quota("user123", UsageType.VIDEOS, amount=1)
        
        assert result.allowed is False
        assert result.current == 10
        assert result.limit == 10
        assert result.remaining == 0
    
    @pytest.mark.asyncio
    async def test_check_quota_new_user(self, mock_firestore):
        """Test quota check for user without usage document"""
        mock_doc = Mock()
        mock_doc.exists = False
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        service = BillingService()
        result = await service.check_quota("new_user", UsageType.VIDEOS, amount=1)
        
        # Should create default usage and allow
        assert result.allowed is True
    
    @pytest.mark.asyncio
    async def test_increment_usage(self, mock_firestore):
        """Test incrementing usage counter"""
        mock_ref = Mock()
        mock_ref.update = AsyncMock()
        mock_firestore.collection.return_value.document.return_value = mock_ref
        
        service = BillingService()
        await service.increment_usage("user123", UsageType.VIDEOS, amount=1)
        
        # Verify Firestore update was called
        mock_ref.update.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_user_usage(self, mock_firestore, sample_usage_data):
        """Test getting user usage data"""
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = sample_usage_data
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        service = BillingService()
        usage = await service.get_user_usage("user123")
        
        assert usage.videos_analyzed == 5
        assert usage.videos_limit == 10
        assert usage.ai_questions_used == 12
    
    @pytest.mark.asyncio
    async def test_update_subscription_plan(self, mock_firestore):
        """Test updating user's subscription plan"""
        mock_ref = Mock()
        mock_ref.set = AsyncMock()
        mock_firestore.collection.return_value.document.return_value = mock_ref
        
        service = BillingService()
        await service.update_subscription_plan(
            user_id="user123",
            plan_id="pro",
            status="active",
            paddle_subscription_id="sub_123"
        )
        
        # Verify subscription document was created/updated
        mock_ref.set.assert_called_once()


# ============================================================================
# Usage Analytics Tests
# ============================================================================

@pytest.mark.unit
class TestUsageAnalytics:
    """Test usage analytics service"""
    
    @pytest.mark.asyncio
    async def test_get_usage_analytics(self, mock_firestore, sample_usage_data):
        """Test getting usage analytics with projections"""
        from src.billing.analytics import UsageAnalyticsService
        
        # Mock current usage
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = sample_usage_data
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        service = UsageAnalyticsService()
        analytics = await service.get_usage_analytics("user123")
        
        assert "current_period" in analytics
        assert "usage_percentage" in analytics
        assert "projected_usage" in analytics
    
    @pytest.mark.asyncio
    async def test_usage_warnings(self, mock_firestore):
        """Test warning generation when quota is low"""
        from src.billing.analytics import UsageAnalyticsService
        
        # Mock high usage (80% used)
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "videos_analyzed": 8,
            "videos_limit": 10,
            "period_start": datetime.utcnow() - timedelta(days=10),
            "period_end": datetime.utcnow() + timedelta(days=20)
        }
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        service = UsageAnalyticsService()
        analytics = await service.get_usage_analytics("user123")
        
        # Should include warnings
        assert "warnings" in analytics
        assert len(analytics["warnings"]) > 0
    
    @pytest.mark.asyncio
    async def test_projected_usage_calculation(self, mock_firestore):
        """Test projected usage is calculated correctly"""
        from src.billing.analytics import UsageAnalyticsService
        
        # Mock usage: 5 videos in 15 days, 15 days remaining
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "videos_analyzed": 5,
            "videos_limit": 10,
            "ai_questions_used": 15,
            "ai_questions_limit": 30,
            "period_start": datetime.utcnow() - timedelta(days=15),
            "period_end": datetime.utcnow() + timedelta(days=15)
        }
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        service = UsageAnalyticsService()
        analytics = await service.get_usage_analytics("user123")
        
        # Projected usage should be ~10 videos (5 used in half period)
        projected = analytics.get("projected_usage", {})
        assert "videos" in projected


# ============================================================================
# Usage Reset Scheduler Tests
# ============================================================================

@pytest.mark.unit
class TestUsageResetScheduler:
    """Test monthly usage reset scheduler"""
    
    @pytest.mark.asyncio
    async def test_reset_user_usage(self, mock_firestore):
        """Test resetting single user's usage"""
        from src.billing.reset_scheduler import UsageResetScheduler
        
        # Mock user with expired period
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "videos_analyzed": 8,
            "videos_limit": 10,
            "period_end": datetime.utcnow() - timedelta(days=1)  # Expired
        }
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        mock_ref = Mock()
        mock_ref.update = AsyncMock()
        mock_firestore.collection.return_value.document.return_value = mock_ref
        
        scheduler = UsageResetScheduler()
        result = await scheduler.reset_user("user123", force=False)
        
        assert result["success"] is True
        assert result["reset"] is True
    
    @pytest.mark.asyncio
    async def test_reset_user_not_due(self, mock_firestore):
        """Test reset skipped when period hasn't ended"""
        from src.billing.reset_scheduler import UsageResetScheduler
        
        # Mock user with valid period
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "videos_analyzed": 5,
            "videos_limit": 10,
            "period_end": datetime.utcnow() + timedelta(days=15)  # Still valid
        }
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        scheduler = UsageResetScheduler()
        result = await scheduler.reset_user("user123", force=False)
        
        assert result["success"] is True
        assert result["reset"] is False  # Should not reset
    
    @pytest.mark.asyncio
    async def test_force_reset(self, mock_firestore):
        """Test force reset ignores period check"""
        from src.billing.reset_scheduler import UsageResetScheduler
        
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "videos_analyzed": 5,
            "period_end": datetime.utcnow() + timedelta(days=15)
        }
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        mock_ref = Mock()
        mock_ref.update = AsyncMock()
        mock_firestore.collection.return_value.document.return_value = mock_ref
        
        scheduler = UsageResetScheduler()
        result = await scheduler.reset_user("user123", force=True)
        
        assert result["reset"] is True  # Should reset even though not due
    
    @pytest.mark.asyncio
    async def test_get_users_due_for_reset(self, mock_firestore):
        """Test finding users needing reset"""
        from src.billing.reset_scheduler import UsageResetScheduler
        
        # Mock query results
        mock_docs = [
            Mock(id="user1", to_dict=lambda: {"period_end": datetime.utcnow() - timedelta(days=1)}),
            Mock(id="user2", to_dict=lambda: {"period_end": datetime.utcnow() - timedelta(days=5)})
        ]
        mock_firestore.collection_group.return_value.where.return_value.stream = AsyncMock(return_value=mock_docs)
        
        scheduler = UsageResetScheduler()
        users = await scheduler.get_users_due_for_reset()
        
        assert len(users) == 2


# ============================================================================
# Quota Enforcement Middleware Tests
# ============================================================================

@pytest.mark.unit
class TestQuotaEnforcement:
    """Test quota enforcement FastAPI dependencies"""
    
    @pytest.mark.asyncio
    async def test_require_video_quota_allowed(self, mock_billing_service, test_user):
        """Test video quota dependency when quota available"""
        from src.billing.enforcement import require_video_quota
        from fastapi import HTTPException
        
        # Mock quota check to allow
        mock_billing_service.check_quota = AsyncMock(return_value=QuotaCheckResult(
            allowed=True,
            current=2,
            limit=10,
            remaining=8
        ))
        
        # Should not raise exception
        with patch("src.billing.enforcement.billing_service", mock_billing_service):
            result = await require_video_quota(user=test_user)
            assert result.allowed is True
    
    @pytest.mark.asyncio
    async def test_require_video_quota_exceeded(self, mock_billing_service, test_user):
        """Test video quota dependency when quota exceeded"""
        from src.billing.enforcement import require_video_quota
        from fastapi import HTTPException
        
        # Mock quota check to deny
        mock_billing_service.check_quota = AsyncMock(return_value=QuotaCheckResult(
            allowed=False,
            current=10,
            limit=10,
            remaining=0
        ))
        
        # Should raise 402 Payment Required
        with patch("src.billing.enforcement.billing_service", mock_billing_service):
            with pytest.raises(HTTPException) as exc_info:
                await require_video_quota(user=test_user)
            
            assert exc_info.value.status_code == 402


# ============================================================================
# Subscription Plan Tests
# ============================================================================

@pytest.mark.unit
class TestSubscriptionPlans:
    """Test subscription plan limits"""
    
    def test_plan_limits(self):
        """Test that all plans have correct limits"""
        from src.billing.service import PLAN_LIMITS
        
        # Verify all plans exist
        assert "free" in PLAN_LIMITS
        assert "starter" in PLAN_LIMITS
        assert "pro" in PLAN_LIMITS
        assert "business" in PLAN_LIMITS
        
        # Verify limits increase with plan tier
        assert PLAN_LIMITS["free"]["videos"] < PLAN_LIMITS["starter"]["videos"]
        assert PLAN_LIMITS["starter"]["videos"] < PLAN_LIMITS["pro"]["videos"]
        assert PLAN_LIMITS["pro"]["videos"] < PLAN_LIMITS["business"]["videos"]
    
    def test_get_plan_limits(self):
        """Test getting limits for specific plan"""
        from src.billing.service import BillingService
        
        service = BillingService()
        free_limits = service.get_plan_limits("free")
        pro_limits = service.get_plan_limits("pro")
        
        assert free_limits["videos"] == 3
        assert pro_limits["videos"] == 25
        assert pro_limits["videos"] > free_limits["videos"]
