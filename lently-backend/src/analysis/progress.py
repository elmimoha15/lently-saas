"""
Analysis Progress Manager
Handles real-time progress tracking for analysis jobs
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Callable, Awaitable
from enum import Enum
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class AnalysisStep(str, Enum):
    """Analysis pipeline steps"""
    QUEUED = "queued"
    CONNECTING = "connecting"
    FETCHING_VIDEO = "fetching_video"
    FETCHING_COMMENTS = "fetching_comments"
    ANALYZING_SENTIMENT = "analyzing_sentiment"
    CLASSIFYING = "classifying"
    EXTRACTING_INSIGHTS = "extracting_insights"
    GENERATING_SUMMARY = "generating_summary"
    SAVING = "saving"
    COMPLETED = "completed"
    FAILED = "failed"


# Step weights for progress calculation
STEP_WEIGHTS = {
    AnalysisStep.QUEUED: 0,
    AnalysisStep.CONNECTING: 2,
    AnalysisStep.FETCHING_VIDEO: 5,
    AnalysisStep.FETCHING_COMMENTS: 15,
    AnalysisStep.ANALYZING_SENTIMENT: 25,
    AnalysisStep.CLASSIFYING: 20,
    AnalysisStep.EXTRACTING_INSIGHTS: 15,
    AnalysisStep.GENERATING_SUMMARY: 10,
    AnalysisStep.SAVING: 5,
    AnalysisStep.COMPLETED: 3,
}


class ProgressUpdate(BaseModel):
    """Progress update data"""
    analysis_id: str
    status: str
    step: str
    step_label: str
    progress: int  # 0-100
    comments_fetched: int = 0
    total_comments: int = 0
    video_id: Optional[str] = None
    video_title: Optional[str] = None
    video_thumbnail: Optional[str] = None
    error: Optional[str] = None
    completed_at: Optional[datetime] = None


class AnalysisJob:
    """Represents an in-progress analysis job"""
    
    def __init__(self, analysis_id: str, user_id: str, video_url: str):
        self.analysis_id = analysis_id
        self.user_id = user_id
        self.video_url = video_url
        self.status = "processing"
        self.step = AnalysisStep.QUEUED
        self.progress = 0
        self.comments_fetched = 0
        self.total_comments = 0
        self.video_id: Optional[str] = None
        self.video_title: Optional[str] = None
        self.video_thumbnail: Optional[str] = None
        self.error: Optional[str] = None
        self.created_at = datetime.utcnow()
        self.completed_at: Optional[datetime] = None
        self._subscribers: list[asyncio.Queue] = []
    
    def get_step_label(self) -> str:
        """Get human-readable step label"""
        labels = {
            AnalysisStep.QUEUED: "Queued",
            AnalysisStep.CONNECTING: "Connecting to YouTube",
            AnalysisStep.FETCHING_VIDEO: "Fetching video metadata",
            AnalysisStep.FETCHING_COMMENTS: "Selecting quality comments",
            AnalysisStep.ANALYZING_SENTIMENT: "Analyzing sentiment",
            AnalysisStep.CLASSIFYING: "Categorizing comments",
            AnalysisStep.EXTRACTING_INSIGHTS: "Extracting insights",
            AnalysisStep.GENERATING_SUMMARY: "Generating summary",
            AnalysisStep.SAVING: "Saving results",
            AnalysisStep.COMPLETED: "Analysis complete",
            AnalysisStep.FAILED: "Analysis failed",
        }
        return labels.get(self.step, "Processing")
    
    def calculate_progress(self) -> int:
        """Calculate overall progress percentage"""
        if self.step == AnalysisStep.FAILED:
            return self.progress
        if self.step == AnalysisStep.COMPLETED:
            return 100
        
        # Sum weights of completed steps
        completed_weight = 0
        for step, weight in STEP_WEIGHTS.items():
            if list(AnalysisStep).index(step) < list(AnalysisStep).index(self.step):
                completed_weight += weight
        
        return min(completed_weight, 97)  # Never show 100 until truly complete
    
    def update_step(
        self,
        step: AnalysisStep,
        comments_fetched: int = None,
        total_comments: int = None,
        video_id: str = None,
        video_title: str = None,
        video_thumbnail: str = None,
        error: str = None
    ):
        """Update job step and notify subscribers"""
        self.step = step
        
        if comments_fetched is not None:
            self.comments_fetched = comments_fetched
        if total_comments is not None:
            self.total_comments = total_comments
        if video_id is not None:
            self.video_id = video_id
        if video_title is not None:
            self.video_title = video_title
        if video_thumbnail is not None:
            self.video_thumbnail = video_thumbnail
        if error is not None:
            self.error = error
            self.status = "failed"
        
        if step == AnalysisStep.COMPLETED:
            self.status = "completed"
            self.completed_at = datetime.utcnow()
        elif step == AnalysisStep.FAILED:
            self.status = "failed"
        
        self.progress = self.calculate_progress()
        
        # Notify all subscribers
        update = self.get_progress()
        for queue in self._subscribers:
            try:
                queue.put_nowait(update)
            except asyncio.QueueFull:
                pass
    
    def get_progress(self) -> ProgressUpdate:
        """Get current progress update"""
        return ProgressUpdate(
            analysis_id=self.analysis_id,
            status=self.status,
            step=self.step.value,
            step_label=self.get_step_label(),
            progress=self.progress,
            comments_fetched=self.comments_fetched,
            total_comments=self.total_comments,
            video_id=self.video_id,
            video_title=self.video_title,
            video_thumbnail=self.video_thumbnail,
            error=self.error,
            completed_at=self.completed_at
        )
    
    def get_current_update(self) -> ProgressUpdate:
        """Alias for get_progress for compatibility"""
        return self.get_progress()
    
    def is_cancelled(self) -> bool:
        """Check if the job has been cancelled"""
        return self.status == "failed" and self.step == AnalysisStep.FAILED
    
    def subscribe(self) -> asyncio.Queue:
        """Subscribe to progress updates"""
        queue = asyncio.Queue(maxsize=50)
        self._subscribers.append(queue)
        return queue
    
    def unsubscribe(self, queue: asyncio.Queue):
        """Unsubscribe from progress updates"""
        if queue in self._subscribers:
            self._subscribers.remove(queue)


class ProgressManager:
    """
    Manages analysis jobs and progress tracking.
    Singleton that stores active jobs in memory.
    """
    
    def __init__(self):
        self._jobs: dict[str, AnalysisJob] = {}
        self._user_jobs: dict[str, list[str]] = {}  # user_id -> [analysis_ids]
        self._cleanup_task: Optional[asyncio.Task] = None
    
    def create_job(self, analysis_id: str, user_id: str, video_url: str) -> AnalysisJob:
        """Create a new analysis job"""
        job = AnalysisJob(analysis_id, user_id, video_url)
        self._jobs[analysis_id] = job
        
        # Track by user
        if user_id not in self._user_jobs:
            self._user_jobs[user_id] = []
        self._user_jobs[user_id].append(analysis_id)
        
        logger.info(f"Created job {analysis_id} for user {user_id}")
        return job
    
    def get_job(self, analysis_id: str) -> Optional[AnalysisJob]:
        """Get job by ID"""
        return self._jobs.get(analysis_id)
    
    def get_user_jobs(self, user_id: str) -> list[AnalysisJob]:
        """Get all active jobs for a user"""
        job_ids = self._user_jobs.get(user_id, [])
        return [self._jobs[jid] for jid in job_ids if jid in self._jobs]
    
    def get_active_job_for_user(self, user_id: str) -> Optional[AnalysisJob]:
        """Get the most recent active job for a user"""
        jobs = self.get_user_jobs(user_id)
        active = [j for j in jobs if j.status == "processing"]
        if active:
            return max(active, key=lambda j: j.created_at)
        return None
    
    def cleanup_old_jobs(self, max_age_minutes: int = 30):
        """Remove completed/failed jobs older than max_age"""
        cutoff = datetime.utcnow() - timedelta(minutes=max_age_minutes)
        to_remove = []
        
        for job_id, job in self._jobs.items():
            if job.status in ("completed", "failed") and job.created_at < cutoff:
                to_remove.append(job_id)
        
        for job_id in to_remove:
            job = self._jobs.pop(job_id, None)
            if job and job.user_id in self._user_jobs:
                self._user_jobs[job.user_id] = [
                    jid for jid in self._user_jobs[job.user_id] if jid != job_id
                ]
        
        if to_remove:
            logger.info(f"Cleaned up {len(to_remove)} old analysis jobs")
    
    async def start_cleanup_loop(self):
        """Start background cleanup loop"""
        while True:
            await asyncio.sleep(300)  # Every 5 minutes
            self.cleanup_old_jobs()


# Singleton instance
_progress_manager: Optional[ProgressManager] = None


def get_progress_manager() -> ProgressManager:
    """Get or create progress manager singleton"""
    global _progress_manager
    if _progress_manager is None:
        _progress_manager = ProgressManager()
    return _progress_manager
