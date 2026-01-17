"""
Job Publisher Service
=====================

Publishes analysis jobs to Cloud Pub/Sub for async processing.
"""

import json
import logging
from datetime import datetime
from typing import Optional
from uuid import uuid4

from google.cloud import pubsub_v1
from firebase_admin import firestore

from ..config import get_settings
from .schemas import AnalysisJob, AnalysisJobStatus, JobStatusUpdate

logger = logging.getLogger(__name__)
settings = get_settings()


class JobPublisher:
    """
    Publisher for analysis jobs.
    
    Publishes jobs to Cloud Pub/Sub and tracks status in Firestore.
    """
    
    def __init__(self):
        """Initialize Pub/Sub publisher client"""
        self.project_id = settings.FIREBASE_PROJECT_ID
        self.topic_name = settings.PUBSUB_ANALYSIS_TOPIC
        
        # Initialize publisher client
        try:
            self.publisher = pubsub_v1.PublisherClient()
            self.topic_path = self.publisher.topic_path(self.project_id, self.topic_name)
            logger.info(f"✅ Pub/Sub publisher initialized for topic: {self.topic_name}")
        except Exception as e:
            logger.warning(f"⚠️ Pub/Sub not available: {e}")
            self.publisher = None
            self.topic_path = None
        
        # Firestore client
        self.db = firestore.client()
    
    async def publish_analysis_job(
        self,
        user_id: str,
        video_id: str,
        max_comments: int = 100,
        include_sentiment: bool = True,
        include_classification: bool = True,
        include_insights: bool = True,
        include_summary: bool = True,
        priority: int = 5
    ) -> str:
        """
        Publish an analysis job to Pub/Sub.
        
        Args:
            user_id: Firebase user ID
            video_id: YouTube video ID
            max_comments: Maximum comments to analyze
            include_sentiment: Whether to run sentiment analysis
            include_classification: Whether to run classification
            include_insights: Whether to extract insights
            include_summary: Whether to generate summary
            priority: Job priority (1=highest, 10=lowest)
        
        Returns:
            Job ID for tracking
        """
        # Generate job ID
        job_id = str(uuid4())
        
        # Create job object
        job = AnalysisJob(
            job_id=job_id,
            user_id=user_id,
            video_id=video_id,
            max_comments=max_comments,
            include_sentiment=include_sentiment,
            include_classification=include_classification,
            include_insights=include_insights,
            include_summary=include_summary,
            priority=priority,
            created_at=datetime.utcnow()
        )
        
        # Create initial status in Firestore
        await self._create_job_status(job)
        
        # Publish to Pub/Sub if available
        if self.publisher and self.topic_path:
            try:
                message_data = job.model_dump_json().encode('utf-8')
                future = self.publisher.publish(
                    self.topic_path,
                    message_data,
                    job_id=job_id,
                    user_id=user_id,
                    priority=str(priority)
                )
                message_id = future.result(timeout=10)
                logger.info(f"✅ Published job {job_id} to Pub/Sub: {message_id}")
                
                # Update status to queued
                await self._update_job_status(job_id, AnalysisJobStatus.QUEUED)
            except Exception as e:
                logger.error(f"❌ Failed to publish job {job_id}: {e}")
                await self._update_job_status(
                    job_id,
                    AnalysisJobStatus.FAILED,
                    error_message=f"Failed to queue job: {str(e)}"
                )
                raise
        else:
            # Pub/Sub not available - mark as pending for manual processing
            logger.warning(f"⚠️ Pub/Sub not available, job {job_id} marked as pending")
            await self._update_job_status(
                job_id,
                AnalysisJobStatus.PENDING,
                error_message="Pub/Sub not configured"
            )
        
        return job_id
    
    async def _create_job_status(self, job: AnalysisJob) -> None:
        """Create initial job status document in Firestore"""
        doc_ref = self.db.collection('analysis_jobs').document(job.job_id)
        
        job_data = {
            'job_id': job.job_id,
            'user_id': job.user_id,
            'video_id': job.video_id,
            'status': AnalysisJobStatus.PENDING.value,
            'progress': 0.0,
            'created_at': job.created_at,
            'updated_at': job.created_at,
            'priority': job.priority,
            'options': {
                'max_comments': job.max_comments,
                'include_sentiment': job.include_sentiment,
                'include_classification': job.include_classification,
                'include_insights': job.include_insights,
                'include_summary': job.include_summary,
            }
        }
        
        doc_ref.set(job_data)
        logger.info(f"Created job status document for {job.job_id}")
    
    async def _update_job_status(
        self,
        job_id: str,
        status: AnalysisJobStatus,
        progress: float = None,
        current_step: str = None,
        error_message: str = None
    ) -> None:
        """Update job status in Firestore"""
        doc_ref = self.db.collection('analysis_jobs').document(job_id)
        
        update_data = {
            'status': status.value,
            'updated_at': datetime.utcnow(),
        }
        
        if progress is not None:
            update_data['progress'] = progress
        
        if current_step:
            update_data['current_step'] = current_step
        
        if error_message:
            update_data['error_message'] = error_message
        
        doc_ref.update(update_data)
    
    async def get_job_status(self, job_id: str) -> Optional[dict]:
        """
        Get current job status from Firestore.
        
        Args:
            job_id: Job ID to check
        
        Returns:
            Job status dict or None if not found
        """
        doc_ref = self.db.collection('analysis_jobs').document(job_id)
        doc = doc_ref.get()
        
        if doc.exists:
            return doc.to_dict()
        return None
    
    async def cancel_job(self, job_id: str, user_id: str) -> bool:
        """
        Cancel a pending/queued job.
        
        Args:
            job_id: Job ID to cancel
            user_id: User ID (for authorization)
        
        Returns:
            True if cancelled, False if not found or already processing
        """
        status = await self.get_job_status(job_id)
        
        if not status:
            return False
        
        # Verify user owns this job
        if status.get('user_id') != user_id:
            return False
        
        # Can only cancel pending/queued jobs
        current_status = status.get('status')
        if current_status not in [AnalysisJobStatus.PENDING.value, AnalysisJobStatus.QUEUED.value]:
            return False
        
        # Mark as cancelled
        await self._update_job_status(job_id, AnalysisJobStatus.CANCELLED)
        logger.info(f"Cancelled job {job_id}")
        return True
