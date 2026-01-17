"""
Usage Enforcement Dependencies

These dependencies MUST be used by feature endpoints to enforce hard limits.
They check quota BEFORE allowing an action and return proper error responses.
"""

from fastapi import HTTPException, Depends, status
from typing import Callable, Awaitable

from src.middleware.auth import get_current_user, get_current_user_with_plan, AuthenticatedUser
from src.billing.schemas import UsageType, QuotaCheckResult
from src.billing.service import billing_service


class QuotaExceededError(HTTPException):
    """Exception raised when user exceeds their quota"""
    
    def __init__(self, result: QuotaCheckResult):
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "quota_exceeded",
                "usage_type": result.usage_type.value,
                "current": result.current,
                "limit": result.limit,
                "remaining": result.remaining,
                "message": result.message,
                "upgrade_required": result.upgrade_required,
            }
        )


async def require_video_quota(
    user: AuthenticatedUser = Depends(get_current_user)
) -> QuotaCheckResult:
    """
    Dependency that checks if user can analyze another video.
    Use this in video analysis endpoints.
    
    Usage:
        @router.post("/analyze")
        async def analyze_video(
            quota: QuotaCheckResult = Depends(require_video_quota),
            user: AuthenticatedUser = Depends(get_current_user)
        ):
            # If we get here, user has quota
            ...
    """
    result = await billing_service.check_quota(user.uid, UsageType.VIDEOS)
    
    if not result.allowed:
        raise QuotaExceededError(result)
    
    return result


async def require_ai_question_quota(
    user: AuthenticatedUser = Depends(get_current_user)
) -> QuotaCheckResult:
    """
    Dependency that checks if user can ask another AI question.
    Use this in Ask AI endpoints.
    """
    result = await billing_service.check_quota(user.uid, UsageType.AI_QUESTIONS)
    
    if not result.allowed:
        raise QuotaExceededError(result)
    
    return result


def require_comment_quota(max_comments: int):
    """
    Factory function that creates a dependency for comment quota.
    Takes the number of comments in the video.
    
    Usage:
        @router.post("/analyze")
        async def analyze_video(
            video_data: VideoData,
            user: AuthenticatedUser = Depends(get_current_user)
        ):
            # Check comment quota for this specific video
            quota = await require_comment_quota(video_data.comment_count)(user)
            ...
    """
    async def checker(
        user: AuthenticatedUser = Depends(get_current_user)
    ) -> QuotaCheckResult:
        result = await billing_service.check_quota(
            user.uid, 
            UsageType.COMMENTS, 
            amount=max_comments
        )
        
        if not result.allowed:
            raise QuotaExceededError(result)
        
        return result
    
    return checker


async def increment_video_usage(user_id: str) -> None:
    """Call after successfully analyzing a video"""
    await billing_service.increment_usage(user_id, UsageType.VIDEOS)


async def increment_ai_question_usage(user_id: str) -> None:
    """Call after successfully answering an AI question"""
    await billing_service.increment_usage(user_id, UsageType.AI_QUESTIONS)


async def increment_comments_usage(user_id: str, amount: int) -> None:
    """Call after successfully processing comments"""
    await billing_service.increment_usage(user_id, UsageType.COMMENTS, amount)
