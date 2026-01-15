"""
YouTube API Router - Endpoints for fetching video data and comments
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional

from src.youtube.service import get_youtube_service, YouTubeService
from src.youtube.schemas import (
    FetchCommentsRequest, FetchCommentsResponse, 
    VideoMetadata, CommentSortOrder
)
from src.youtube.exceptions import (
    YouTubeError, VideoNotFoundError, CommentsDisabledError,
    QuotaExceededError, InvalidVideoIdError
)
from src.middleware.auth import get_current_user, get_current_user_with_plan
from src.middleware.schemas import UserResponse

router = APIRouter(prefix="/api/youtube", tags=["YouTube"])


@router.get("/video/{video_id}", response_model=VideoMetadata)
async def get_video_metadata(
    video_id: str,
    current_user: UserResponse = Depends(get_current_user),
    youtube: YouTubeService = Depends(get_youtube_service)
):
    """
    Get metadata for a YouTube video
    
    Returns video title, description, channel info, view/like/comment counts
    """
    try:
        return await youtube.get_video_metadata(video_id)
    except VideoNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video not found: {e.video_id}"
        )
    except YouTubeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e.message)
        )


@router.post("/comments", response_model=FetchCommentsResponse)
async def fetch_comments(
    request: FetchCommentsRequest,
    current_user: UserResponse = Depends(get_current_user),
    youtube: YouTubeService = Depends(get_youtube_service)
):
    """
    Fetch high-value comments from a YouTube video
    
    This endpoint fetches and filters comments to surface the most valuable ones:
    - Uses YouTube's relevance ranking (top comments first)
    - Filters out spam and low-quality comments
    - Scores comments by engagement (likes, replies)
    - Detects questions and feedback for content ideas
    
    **Rate Limits by Plan:**
    - Free: 100 comments/video
    - Starter: 3,000 comments/video
    - Pro: 10,000 comments/video
    - Business: 50,000 comments/video
    """
    try:
        response = await youtube.fetch_comments(
            request=request,
            user_plan=current_user.plan
        )
        
        return response
        
    except VideoNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video not found: {e.video_id}"
        )
    except CommentsDisabledError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Comments are disabled for this video: {e.video_id}"
        )
    except QuotaExceededError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="YouTube API quota exceeded. Please try again tomorrow."
        )
    except InvalidVideoIdError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.message)
        )
    except YouTubeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e.message)
        )


@router.get("/validate/{video_url_or_id}")
async def validate_video(
    video_url_or_id: str,
    current_user: UserResponse = Depends(get_current_user),
    youtube: YouTubeService = Depends(get_youtube_service)
):
    """
    Validate a YouTube video URL or ID and return basic info
    
    Use this endpoint to check if a video exists and has comments enabled
    before starting an analysis.
    """
    try:
        # Extract video ID
        video_id = youtube._extract_video_id(video_url_or_id)
        
        # Get metadata to verify video exists
        video = await youtube.get_video_metadata(video_id)
        
        return {
            "valid": True,
            "video_id": video.video_id,
            "title": video.title,
            "channel": video.channel_title,
            "comment_count": video.comment_count,
            "comments_enabled": video.comment_count > 0
        }
        
    except InvalidVideoIdError:
        return {
            "valid": False,
            "error": "Invalid YouTube video URL or ID"
        }
    except VideoNotFoundError:
        return {
            "valid": False,
            "error": "Video not found or is private"
        }
    except YouTubeError as e:
        return {
            "valid": False,
            "error": str(e.message)
        }
