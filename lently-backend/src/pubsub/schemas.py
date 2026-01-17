"""
Pub/Sub Job Schemas
===================

Pydantic models for analysis jobs and results.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AnalysisJobStatus(str, Enum):
    """Status of an analysis job"""
    PENDING = "pending"  # Job created, waiting to start
    QUEUED = "queued"  # Job published to Pub/Sub
    PROCESSING = "processing"  # Worker is processing
    COMPLETED = "completed"  # Successfully completed
    FAILED = "failed"  # Failed with error
    CANCELLED = "cancelled"  # Cancelled by user


class AnalysisJob(BaseModel):
    """Analysis job to be processed by worker"""
    job_id: str = Field(..., description="Unique job identifier")
    user_id: str = Field(..., description="Firebase user ID")
    video_id: str = Field(..., description="YouTube video ID")
    
    # Analysis options
    max_comments: int = Field(default=100, ge=1, le=1000)
    include_sentiment: bool = Field(default=True)
    include_classification: bool = Field(default=True)
    include_insights: bool = Field(default=True)
    include_summary: bool = Field(default=True)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    priority: int = Field(default=5, ge=1, le=10, description="1=highest, 10=lowest")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class JobStatusUpdate(BaseModel):
    """Progress update for a job"""
    job_id: str
    status: AnalysisJobStatus
    progress: float = Field(0.0, ge=0.0, le=1.0, description="0.0 to 1.0")
    current_step: Optional[str] = None
    total_steps: Optional[int] = None
    completed_steps: Optional[int] = None
    error_message: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AnalysisJobResult(BaseModel):
    """Result of a completed analysis job"""
    job_id: str
    analysis_id: str = Field(..., description="Firestore document ID of analysis")
    status: AnalysisJobStatus
    
    # Summary stats
    comments_analyzed: Optional[int] = None
    processing_time_seconds: Optional[float] = None
    
    # Error details (if failed)
    error_message: Optional[str] = None
    error_type: Optional[str] = None
    
    # Timestamps
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class JobMetrics(BaseModel):
    """Metrics for job processing"""
    total_jobs: int = 0
    pending_jobs: int = 0
    processing_jobs: int = 0
    completed_jobs: int = 0
    failed_jobs: int = 0
    average_processing_time: Optional[float] = None
    queue_depth: int = 0
