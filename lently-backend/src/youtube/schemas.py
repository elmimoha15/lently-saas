"""
YouTube API Schemas - Pydantic models for YouTube data
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class CommentSortOrder(str, Enum):
    """YouTube comment sort options"""
    RELEVANCE = "relevance"  # Top/most helpful comments
    TIME = "time"  # Most recent


class VideoMetadata(BaseModel):
    """YouTube video information"""
    video_id: str
    title: str
    description: str = ""
    channel_title: str
    channel_id: str
    thumbnail_url: str
    published_at: datetime
    view_count: int = 0
    like_count: Optional[int] = None  # May be hidden
    comment_count: int = 0
    duration: Optional[str] = None  # ISO 8601 duration
    tags: list[str] = []


class Comment(BaseModel):
    """Single YouTube comment"""
    comment_id: str
    author: str
    author_channel_id: Optional[str] = None
    author_profile_image: Optional[str] = None
    text: str
    text_original: str  # Raw text without HTML
    like_count: int = 0
    published_at: datetime
    updated_at: Optional[datetime] = None
    reply_count: int = 0
    is_public: bool = True
    
    # Computed fields for analysis
    engagement_score: float = 0.0  # Likes + replies weighted
    word_count: int = 0
    is_question: bool = False
    is_feedback: bool = False


class CommentThread(BaseModel):
    """Comment with its replies"""
    top_comment: Comment
    replies: list[Comment] = []
    total_reply_count: int = 0


class FetchCommentsRequest(BaseModel):
    """Request to fetch video comments"""
    video_url_or_id: str = Field(..., description="YouTube video URL or ID")
    max_comments: int = Field(default=100, ge=1, le=10000)
    order: CommentSortOrder = CommentSortOrder.RELEVANCE
    include_replies: bool = False
    min_likes: int = Field(default=0, ge=0, description="Filter comments with minimum likes")
    exclude_spam: bool = True  # Filter out likely spam


class FetchCommentsResponse(BaseModel):
    """Response with fetched comments"""
    video: VideoMetadata
    comments: list[Comment]
    total_fetched: int
    total_available: int
    has_more: bool
    quality_score: float = 0.0  # Overall comment quality indicator


class VideoAnalysisRequest(BaseModel):
    """Request to analyze a video's comments"""
    video_url_or_id: str
    max_comments: int = Field(default=100, ge=1, le=10000)
