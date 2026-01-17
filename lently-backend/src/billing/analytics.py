"""
Usage Analytics Service
=======================

Provides detailed usage statistics, trends, and insights for users.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pydantic import BaseModel

from ..firebase_init import get_firestore
from ..billing.service import BillingService
from ..billing.schemas import UsageType

logger = logging.getLogger(__name__)


class UsageSnapshot(BaseModel):
    """Snapshot of usage at a point in time"""
    date: datetime
    videos_used: int
    ai_questions_used: int
    comments_analyzed: int


class UsageTrends(BaseModel):
    """Usage trends over time"""
    daily_snapshots: List[UsageSnapshot]
    avg_videos_per_day: float
    avg_ai_questions_per_day: float
    peak_usage_day: Optional[datetime] = None
    total_videos: int
    total_ai_questions: int
    total_comments: int


class UsageAnalytics(BaseModel):
    """Complete usage analytics for a user"""
    current_period: Dict[str, int]
    trends: Optional[UsageTrends] = None
    usage_percentage: Dict[str, float]
    projected_usage: Dict[str, int]
    warnings: List[str]
    recommendations: List[str]


class UsageAnalyticsService:
    """Service for generating usage analytics and insights"""
    
    def __init__(self):
        """Initialize analytics service"""
        self.db = get_firestore()
        self.billing_service = BillingService()
    
    async def get_usage_analytics(
        self,
        user_id: str,
        include_trends: bool = True,
        days_back: int = 30
    ) -> UsageAnalytics:
        """
        Get comprehensive usage analytics for a user.
        
        Args:
            user_id: Firebase user ID
            include_trends: Whether to include historical trends
            days_back: How many days of history to analyze
        
        Returns:
            Complete usage analytics
        """
        # Get current usage
        usage = await self.billing_service.get_user_usage(user_id)
        
        current_period = {
            "videos_used": usage.videos_analyzed,
            "videos_limit": usage.videos_limit,
            "ai_questions_used": usage.ai_questions_used,
            "ai_questions_limit": usage.ai_questions_limit,
            "comments_analyzed": usage.comments_analyzed,
            "comments_limit": usage.comments_limit,
        }
        
        # Calculate usage percentage
        usage_percentage = {
            "videos": (usage.videos_analyzed / usage.videos_limit * 100) if usage.videos_limit > 0 else 0,
            "ai_questions": (usage.ai_questions_used / usage.ai_questions_limit * 100) if usage.ai_questions_limit > 0 else 0,
        }
        
        # Project usage based on current pace
        projected_usage = await self._calculate_projected_usage(user_id, usage)
        
        # Generate warnings
        warnings = []
        if usage_percentage["videos"] > 80:
            warnings.append(f"You've used {usage_percentage['videos']:.0f}% of your video quota")
        if usage_percentage["ai_questions"] > 80:
            warnings.append(f"You've used {usage_percentage['ai_questions']:.0f}% of your AI question quota")
        if projected_usage["videos"] > usage.videos_limit:
            warnings.append("At current pace, you'll exceed your video limit before period ends")
        
        # Generate recommendations
        recommendations = []
        if projected_usage["videos"] > usage.videos_limit:
            recommendations.append("Consider upgrading your plan to avoid running out of videos")
        if usage.videos_analyzed == 0 and usage.ai_questions_used == 0:
            recommendations.append("Start by analyzing your first video to see what Lently can do!")
        elif usage.ai_questions_used < 3 and usage.videos_analyzed > 0:
            recommendations.append("Try asking AI questions about your comments for deeper insights")
        
        # Get trends if requested
        trends = None
        if include_trends:
            trends = await self._get_usage_trends(user_id, days_back)
        
        return UsageAnalytics(
            current_period=current_period,
            trends=trends,
            usage_percentage=usage_percentage,
            projected_usage=projected_usage,
            warnings=warnings,
            recommendations=recommendations
        )
    
    async def _calculate_projected_usage(
        self,
        user_id: str,
        usage
    ) -> Dict[str, int]:
        """
        Project usage for the rest of the billing period.
        
        Based on current usage rate, estimates final usage.
        """
        if not usage.period_start or not usage.period_end:
            return {
                "videos": usage.videos_analyzed,
                "ai_questions": usage.ai_questions_used,
            }
        
        now = datetime.utcnow()
        period_duration = (usage.period_end - usage.period_start).total_seconds() / 86400  # days
        elapsed = (now - usage.period_start).total_seconds() / 86400  # days
        
        if elapsed <= 0:
            return {
                "videos": usage.videos_analyzed,
                "ai_questions": usage.ai_questions_used,
            }
        
        # Calculate daily rate
        daily_videos = usage.videos_analyzed / max(elapsed, 1)
        daily_ai = usage.ai_questions_used / max(elapsed, 1)
        
        # Project to end of period
        projected_videos = int(daily_videos * period_duration)
        projected_ai = int(daily_ai * period_duration)
        
        return {
            "videos": projected_videos,
            "ai_questions": projected_ai,
        }
    
    async def _get_usage_trends(
        self,
        user_id: str,
        days_back: int
    ) -> Optional[UsageTrends]:
        """
        Get historical usage trends.
        
        Note: This requires storing daily snapshots.
        If not available, returns None.
        """
        try:
            # Query usage_history collection
            history_ref = self.db.collection("users").document(user_id) \
                .collection("usage_history") \
                .order_by("date", direction=firestore.Query.DESCENDING) \
                .limit(days_back)
            
            docs = history_ref.stream()
            snapshots = []
            
            for doc in docs:
                data = doc.to_dict()
                snapshot = UsageSnapshot(
                    date=data.get("date"),
                    videos_used=data.get("videos_used", 0),
                    ai_questions_used=data.get("ai_questions_used", 0),
                    comments_analyzed=data.get("comments_analyzed", 0)
                )
                snapshots.append(snapshot)
            
            if not snapshots:
                return None
            
            # Calculate trends
            total_videos = sum(s.videos_used for s in snapshots)
            total_ai = sum(s.ai_questions_used for s in snapshots)
            total_comments = sum(s.comments_analyzed for s in snapshots)
            
            avg_videos = total_videos / len(snapshots)
            avg_ai = total_ai / len(snapshots)
            
            # Find peak usage day
            peak_day = max(snapshots, key=lambda s: s.videos_used + s.ai_questions_used)
            
            return UsageTrends(
                daily_snapshots=snapshots,
                avg_videos_per_day=avg_videos,
                avg_ai_questions_per_day=avg_ai,
                peak_usage_day=peak_day.date,
                total_videos=total_videos,
                total_ai_questions=total_ai,
                total_comments=total_comments
            )
            
        except Exception as e:
            logger.warning(f"Could not get usage trends: {e}")
            return None
    
    async def record_daily_snapshot(self, user_id: str) -> None:
        """
        Record a daily usage snapshot for trend analysis.
        
        This should be called by a daily cron job.
        """
        try:
            usage = await self.billing_service.get_user_usage(user_id)
            
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            
            snapshot_ref = self.db.collection("users").document(user_id) \
                .collection("usage_history").document(today.isoformat())
            
            snapshot_ref.set({
                "date": today,
                "videos_used": usage.videos_analyzed,
                "ai_questions_used": usage.ai_questions_used,
                "comments_analyzed": usage.comments_analyzed,
            })
            
            logger.info(f"Recorded usage snapshot for {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to record snapshot for {user_id}: {e}")


# Singleton instance
usage_analytics_service = UsageAnalyticsService()


async def get_usage_analytics_service() -> UsageAnalyticsService:
    """Dependency injection for FastAPI"""
    return usage_analytics_service
