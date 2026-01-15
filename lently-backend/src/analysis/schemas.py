"""
Analysis Pipeline Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class AnalysisStatus(str, Enum):
    """Analysis job status"""
    PENDING = "pending"
    FETCHING_COMMENTS = "fetching_comments"
    ANALYZING_SENTIMENT = "analyzing_sentiment"
    CLASSIFYING = "classifying"
    EXTRACTING_INSIGHTS = "extracting_insights"
    GENERATING_SUMMARY = "generating_summary"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisRequest(BaseModel):
    """Request to analyze a video's comments"""
    video_url_or_id: str = Field(..., description="YouTube video URL or ID")
    max_comments: int = Field(default=100, ge=10, le=10000)
    include_sentiment: bool = True
    include_classification: bool = True
    include_insights: bool = True
    include_summary: bool = True


class CommentSentiment(BaseModel):
    """Sentiment for a single comment"""
    comment_id: str
    sentiment: str  # positive, negative, neutral, mixed
    confidence: float
    emotion: Optional[str] = None


class SentimentSummary(BaseModel):
    """Overall sentiment breakdown"""
    positive_percentage: float
    negative_percentage: float
    neutral_percentage: float
    mixed_percentage: float
    dominant_sentiment: str
    top_emotions: list[str] = []
    sentiment_trend: Optional[str] = None


class SentimentResult(BaseModel):
    """Complete sentiment analysis result"""
    comments: list[CommentSentiment] = []
    summary: SentimentSummary


class CommentClassification(BaseModel):
    """Classification for a single comment"""
    comment_id: str
    primary_category: str
    secondary_category: Optional[str] = None
    confidence: float


class ClassificationSummary(BaseModel):
    """Category distribution"""
    category_counts: dict[str, int]
    category_percentages: dict[str, float]
    top_category: str
    actionable_count: int


class ClassificationResult(BaseModel):
    """Complete classification result"""
    comments: list[CommentClassification] = []
    summary: ClassificationSummary


class KeyTheme(BaseModel):
    """A key theme from comments"""
    theme: str
    mention_count: int
    sentiment: str
    example_comments: list[str] = []


class ContentIdea(BaseModel):
    """Content idea derived from comments"""
    title: str
    description: str
    source_type: str
    confidence: float
    related_comments: list[str] = []


class AudienceInsight(BaseModel):
    """Insight about the audience"""
    insight: str
    evidence: str
    action_item: Optional[str] = None


class InsightsResult(BaseModel):
    """Complete insights extraction result"""
    key_themes: list[KeyTheme] = []
    content_ideas: list[ContentIdea] = []
    audience_insights: list[AudienceInsight] = []


class ExecutiveSummary(BaseModel):
    """Executive summary of analysis"""
    summary_text: str
    key_metrics: dict[str, str | int | float] = {}
    priority_actions: list[str] = []


class VideoInfo(BaseModel):
    """Video metadata included in analysis"""
    video_id: str
    title: str
    channel_title: str
    view_count: int
    comment_count: int
    thumbnail_url: str


class StoredComment(BaseModel):
    """Comment stored with analysis for Ask AI"""
    comment_id: str
    author: str
    text: str
    like_count: int = 0
    reply_count: int = 0
    sentiment: Optional[str] = None
    category: Optional[str] = None
    is_question: bool = False
    is_feedback: bool = False


class AnalysisResponse(BaseModel):
    """Complete analysis response"""
    analysis_id: str
    video: VideoInfo
    status: AnalysisStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    # Analysis results
    comments_analyzed: int = 0
    sentiment: Optional[SentimentResult] = None
    classification: Optional[ClassificationResult] = None
    insights: Optional[InsightsResult] = None
    executive_summary: Optional[ExecutiveSummary] = None
    
    # Stored comments for Ask AI (not returned in API, but stored in DB)
    stored_comments: Optional[list[StoredComment]] = None
    
    # Error info
    error: Optional[str] = None


class AnalysisProgress(BaseModel):
    """Progress update during analysis"""
    analysis_id: str
    status: AnalysisStatus
    progress_percentage: int = 0
    current_step: str = ""
    comments_processed: int = 0
    total_comments: int = 0
