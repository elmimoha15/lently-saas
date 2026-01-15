"""
Ask AI Schemas
Models for the conversational AI feature
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ContextFilter(str, Enum):
    """Filter for which comments to focus on"""
    ALL = "all"
    POSITIVE = "positive"
    NEGATIVE = "negative"
    QUESTIONS = "questions"
    FEEDBACK = "feedback"
    RECENT = "recent"


class MessageRole(str, Enum):
    """Role in the conversation"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ConversationMessage(BaseModel):
    """A single message in the conversation"""
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ConversationContext(BaseModel):
    """Context for the conversation - what the AI knows about"""
    video_id: str
    video_title: str
    channel_name: str
    total_comments: int
    comments_analyzed: int
    
    # Summary stats for context
    sentiment_summary: Optional[str] = None
    top_categories: Optional[list[str]] = None
    key_themes: Optional[list[str]] = None
    
    # The actual comments for reference
    sample_comments: list[dict] = []


class AskQuestionRequest(BaseModel):
    """Request to ask a question about comments"""
    question: str = Field(
        ..., 
        min_length=3, 
        max_length=1000,
        description="The question to ask about the video's comments"
    )
    video_id: str = Field(
        ...,
        description="The video ID to ask about (must have been analyzed)"
    )
    context_filter: ContextFilter = Field(
        default=ContextFilter.ALL,
        description="Filter to focus on specific types of comments"
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Continue an existing conversation (for follow-up questions)"
    )


class SourceComment(BaseModel):
    """A comment used as source for the answer"""
    comment_id: str
    author: str
    text: str
    relevance: str  # Why this comment was relevant


class AskQuestionResponse(BaseModel):
    """Response to a question about comments"""
    answer: str = Field(
        ...,
        description="The AI's answer to the question"
    )
    confidence: float = Field(
        ge=0, le=1,
        description="How confident the AI is in the answer"
    )
    sources: list[SourceComment] = Field(
        default=[],
        description="Comments that informed this answer"
    )
    key_points: list[str] = Field(
        default=[],
        description="Key takeaways from the answer"
    )
    follow_up_questions: list[str] = Field(
        default=[],
        description="Suggested follow-up questions"
    )
    conversation_id: str = Field(
        ...,
        description="ID to continue this conversation"
    )
    questions_remaining: int = Field(
        ...,
        description="How many questions left in user's quota"
    )


class ConversationHistory(BaseModel):
    """Full conversation history"""
    conversation_id: str
    video_id: str
    user_id: str
    messages: list[ConversationMessage] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    question_count: int = 0


class StartConversationRequest(BaseModel):
    """Request to start a new conversation about a video"""
    video_id: str
    initial_question: Optional[str] = None


class StartConversationResponse(BaseModel):
    """Response when starting a new conversation"""
    conversation_id: str
    video_title: str
    comments_available: int
    context_summary: str
    initial_answer: Optional[AskQuestionResponse] = None
