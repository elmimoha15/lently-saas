"""
Gemini AI Response Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class SentimentType(str, Enum):
    """Comment sentiment categories"""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    MIXED = "mixed"


class CommentCategory(str, Enum):
    """Comment classification categories"""
    QUESTION = "question"
    FEEDBACK = "feedback"
    APPRECIATION = "appreciation"
    CRITICISM = "criticism"
    SUGGESTION = "suggestion"
    REQUEST = "request"
    DISCUSSION = "discussion"
    SPAM = "spam"
    OTHER = "other"


# --- Sentiment Analysis Schemas ---

class SentimentResult(BaseModel):
    """Sentiment analysis for a single comment"""
    comment_id: str
    sentiment: SentimentType
    confidence: float = Field(ge=0, le=1)
    emotion: Optional[str] = None  # e.g., "excited", "frustrated", "curious"


class SentimentSummary(BaseModel):
    """Overall sentiment summary for a video"""
    positive_percentage: float
    negative_percentage: float
    neutral_percentage: float
    mixed_percentage: float
    dominant_sentiment: SentimentType
    top_emotions: list[str] = []
    sentiment_trend: Optional[str] = None  # "improving", "declining", "stable"


# --- Classification Schemas ---

class ClassificationResult(BaseModel):
    """Classification for a single comment"""
    comment_id: str
    primary_category: CommentCategory
    secondary_category: Optional[CommentCategory] = None
    confidence: float = Field(ge=0, le=1)


class ClassificationSummary(BaseModel):
    """Category distribution summary"""
    category_counts: dict[str, int]
    category_percentages: dict[str, float]
    top_category: CommentCategory
    actionable_count: int  # questions + suggestions + requests


# --- Insights Schemas ---

class KeyTheme(BaseModel):
    """A key theme extracted from comments"""
    theme: str
    mention_count: int
    sentiment: SentimentType
    example_comments: list[str] = []


class ContentIdea(BaseModel):
    """A content idea derived from comments"""
    title: str
    description: str
    source_type: str  # "question", "request", "trend"
    confidence: float = Field(ge=0, le=1)
    related_comments: list[str] = []


class AudienceInsight(BaseModel):
    """Insight about the audience"""
    insight: str
    evidence: str
    action_item: Optional[str] = None


class AnalysisSummary(BaseModel):
    """Complete analysis summary"""
    video_title: str
    total_comments_analyzed: int
    sentiment: SentimentSummary
    classification: ClassificationSummary
    key_themes: list[KeyTheme] = []
    content_ideas: list[ContentIdea] = []
    audience_insights: list[AudienceInsight] = []
    executive_summary: str


# --- Ask AI Schemas ---

class AskAIRequest(BaseModel):
    """Request to ask AI about comments"""
    question: str = Field(..., min_length=5, max_length=500)
    video_id: str
    context_type: str = "all"  # "all", "positive", "negative", "questions"


class AskAIResponse(BaseModel):
    """AI response to a question"""
    answer: str
    confidence: float = Field(ge=0, le=1)
    sources: list[str] = []  # Comment IDs used as sources
    follow_up_questions: list[str] = []


# --- Reply Generation Schemas ---

class ReplyTone(str, Enum):
    """Available reply tones"""
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    CASUAL = "casual"
    GRATEFUL = "grateful"
    HELPFUL = "helpful"


class GenerateReplyRequest(BaseModel):
    """Request to generate a reply"""
    comment_text: str
    comment_author: str
    tone: ReplyTone = ReplyTone.FRIENDLY
    include_cta: bool = False  # Include call-to-action
    max_length: int = Field(default=280, ge=50, le=500)


class GeneratedReply(BaseModel):
    """A generated reply option"""
    text: str
    tone: ReplyTone
    word_count: int
    has_cta: bool


class GenerateReplyResponse(BaseModel):
    """Response with multiple reply options"""
    original_comment: str
    replies: list[GeneratedReply]
