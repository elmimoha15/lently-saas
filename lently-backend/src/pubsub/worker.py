"""
Analysis Worker
===============

Worker service that pulls jobs from Pub/Sub and processes them.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Callable, Optional

from google.cloud import pubsub_v1
from firebase_admin import firestore

from ..config import get_settings
from ..analysis.service import AnalysisService
from .schemas import AnalysisJob, AnalysisJobStatus, AnalysisJobResult

logger = logging.getLogger(__name__)
settings = get_settings()


class AnalysisWorker:
    """
    Worker that processes analysis jobs from Pub/Sub.
    
    Pulls messages from subscription, runs analysis, and stores results.
    """
    
    def __init__(self):
        """Initialize worker with Pub/Sub subscriber"""
        self.project_id = settings.FIREBASE_PROJECT_ID
        self.subscription_name = settings.PUBSUB_ANALYSIS_SUBSCRIPTION
        
        # Initialize subscriber client
        try:
            self.subscriber = pubsub_v1.SubscriberClient()
            self.subscription_path = self.subscriber.subscription_path(
                self.project_id,
                self.subscription_name
            )
            logger.info(f"✅ Pub/Sub worker initialized for: {self.subscription_name}")
        except Exception as e:
            logger.warning(f"⚠️ Pub/Sub not available: {e}")
            self.subscriber = None
            self.subscription_path = None
        
        # Services
        self.analysis_service = AnalysisService()
        self.db = firestore.client()
        
        # Worker state
        self.is_running = False
    
    def start(self, callback: Optional[Callable] = None):
        """
        Start the worker to listen for jobs.
        
        Args:
            callback: Optional callback for handling messages
        """
        if not self.subscriber or not self.subscription_path:
            logger.error("❌ Cannot start worker: Pub/Sub not configured")
            return
        
        self.is_running = True
        logger.info(f"🚀 Starting analysis worker...")
        
        # Use provided callback or default
        message_callback = callback or self._default_callback
        
        # Start streaming pull
        streaming_pull_future = self.subscriber.subscribe(
            self.subscription_path,
            callback=message_callback
        )
        
        logger.info(f"✅ Worker listening on {self.subscription_path}")
        
        try:
            # Keep worker running
            streaming_pull_future.result()
        except KeyboardInterrupt:
            logger.info("⏹️ Worker stopped by user")
            streaming_pull_future.cancel()
        except Exception as e:
            logger.error(f"❌ Worker error: {e}")
            streaming_pull_future.cancel()
        finally:
            self.is_running = False
    
    def _default_callback(self, message: pubsub_v1.subscriber.message.Message):
        """
        Default callback for processing Pub/Sub messages.
        
        Args:
            message: Pub/Sub message containing job data
        """
        try:
            # Parse job from message
            job_data = json.loads(message.data.decode('utf-8'))
            job = AnalysisJob(**job_data)
            
            logger.info(f"📥 Received job {job.job_id} for video {job.video_id}")
            
            # Process job asynchronously
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self._process_job(job))
            loop.close()
            
            if result.status == AnalysisJobStatus.COMPLETED:
                logger.info(f"✅ Job {job.job_id} completed successfully")
                message.ack()
            else:
                logger.error(f"❌ Job {job.job_id} failed: {result.error_message}")
                # Nack with delay for retry
                message.nack()
        
        except Exception as e:
            logger.error(f"❌ Error processing message: {e}")
            message.nack()
    
    async def _process_job(self, job: AnalysisJob) -> AnalysisJobResult:
        """
        Process an analysis job.
        
        Args:
            job: The analysis job to process
        
        Returns:
            Job result with status and analysis ID
        """
        start_time = datetime.utcnow()
        
        try:
            # Update status to processing
            await self._update_job_status(
                job.job_id,
                AnalysisJobStatus.PROCESSING,
                progress=0.0,
                current_step="Starting analysis"
            )
            
            # Run analysis with progress tracking
            analysis_result = await self._run_analysis_with_progress(job)
            
            # Update status to completed
            end_time = datetime.utcnow()
            processing_time = (end_time - start_time).total_seconds()
            
            await self._update_job_status(
                job.job_id,
                AnalysisJobStatus.COMPLETED,
                progress=1.0,
                current_step="Completed",
                analysis_id=analysis_result['analysis_id']
            )
            
            return AnalysisJobResult(
                job_id=job.job_id,
                analysis_id=analysis_result['analysis_id'],
                status=AnalysisJobStatus.COMPLETED,
                comments_analyzed=analysis_result.get('comments_analyzed', 0),
                processing_time_seconds=processing_time,
                started_at=start_time,
                completed_at=end_time
            )
        
        except Exception as e:
            logger.error(f"❌ Job {job.job_id} failed: {e}")
            
            # Update status to failed
            await self._update_job_status(
                job.job_id,
                AnalysisJobStatus.FAILED,
                progress=0.0,
                error_message=str(e)
            )
            
            return AnalysisJobResult(
                job_id=job.job_id,
                analysis_id="",
                status=AnalysisJobStatus.FAILED,
                error_message=str(e),
                error_type=type(e).__name__,
                started_at=start_time,
                completed_at=datetime.utcnow()
            )
    
    async def _run_analysis_with_progress(self, job: AnalysisJob) -> dict:
        """
        Run analysis and report progress.
        
        Args:
            job: Analysis job with options
        
        Returns:
            Analysis result dict with analysis_id
        """
        # Step 1: Fetch comments (20% of progress)
        await self._update_job_status(
            job.job_id,
            AnalysisJobStatus.PROCESSING,
            progress=0.1,
            current_step="Fetching comments from YouTube"
        )
        
        # Step 2: Run sentiment analysis (40% of progress)
        if job.include_sentiment:
            await self._update_job_status(
                job.job_id,
                AnalysisJobStatus.PROCESSING,
                progress=0.3,
                current_step="Analyzing sentiment"
            )
        
        # Step 3: Run classification (60% of progress)
        if job.include_classification:
            await self._update_job_status(
                job.job_id,
                AnalysisJobStatus.PROCESSING,
                progress=0.5,
                current_step="Classifying comments"
            )
        
        # Step 4: Extract insights (80% of progress)
        if job.include_insights:
            await self._update_job_status(
                job.job_id,
                AnalysisJobStatus.PROCESSING,
                progress=0.7,
                current_step="Extracting insights"
            )
        
        # Step 5: Generate summary (90% of progress)
        if job.include_summary:
            await self._update_job_status(
                job.job_id,
                AnalysisJobStatus.PROCESSING,
                progress=0.9,
                current_step="Generating summary"
            )
        
        # Actually run the analysis
        analysis_result = await self.analysis_service.run_analysis(
            user_id=job.user_id,
            video_url_or_id=job.video_id,
            max_comments=job.max_comments,
            include_sentiment=job.include_sentiment,
            include_classification=job.include_classification,
            include_insights=job.include_insights,
            include_summary=job.include_summary
        )
        
        return analysis_result
    
    async def _update_job_status(
        self,
        job_id: str,
        status: AnalysisJobStatus,
        progress: float = None,
        current_step: str = None,
        error_message: str = None,
        analysis_id: str = None
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
        
        if analysis_id:
            update_data['analysis_id'] = analysis_id
        
        doc_ref.update(update_data)
    
    def stop(self):
        """Stop the worker gracefully"""
        logger.info("⏹️ Stopping worker...")
        self.is_running = False


# Entry point for running worker as standalone service
if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    worker = AnalysisWorker()
    worker.start()
