"""
Analysis Pipeline Router
Endpoints for analyzing YouTube video comments
Includes SSE streaming for real-time progress updates
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Optional

from src.analysis.service import get_analysis_service, AnalysisService
from src.analysis.schemas import (
    AnalysisRequest, AnalysisResponse, AnalysisStatus
)
from src.analysis.progress import get_progress_manager, AnalysisStep
from src.analysis.background_service import get_background_analysis_service
from src.middleware.auth import get_current_user, get_current_user_with_plan
from src.middleware.schemas import UserResponse
from src.youtube.exceptions import (
    VideoNotFoundError, CommentsDisabledError, 
    QuotaExceededError, InvalidVideoIdError
)
from src.gemini.exceptions import RateLimitError, GeminiError
from src.firebase_init import get_firestore
from src.billing.service import BillingService
from src.billing.schemas import UsageType
from google.cloud.firestore import SERVER_TIMESTAMP

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])
logger = logging.getLogger(__name__)


async def _increment_video_usage(user_id: str, comments_analyzed: int = 0):
    """Increment video analysis count using billing service"""
    try:
        billing = BillingService()
        await billing.increment_usage(user_id, UsageType.VIDEOS, 1)
        if comments_analyzed > 0:
            await billing.increment_usage(user_id, UsageType.COMMENTS, comments_analyzed)
    except Exception as e:
        logger.warning(f"Failed to increment usage: {e}")


@router.post("/start")
async def start_analysis(
    request: AnalysisRequest,
    user_data: dict = Depends(get_current_user_with_plan)
):
    """
    Start a background analysis and return analysis_id for progress tracking.
    
    Use this endpoint to start an analysis without waiting for completion.
    Then use GET /progress/{analysis_id} to stream progress updates via SSE.
    
    Returns immediately with an analysis_id that can be used to track progress.
    """
    user_id = user_data["uid"]
    
    # Get plan from billing service (single source of truth)
    billing = BillingService()
    subscription = await billing.get_user_subscription(user_id)
    user_plan = subscription.plan_id.value  # Use billing subscription, not user doc
    
    # Check video quota using billing service
    quota_check = await billing.check_quota(user_id, UsageType.VIDEOS, 1)
    
    if not quota_check.allowed:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "quota_exceeded",
                "message": f"You've used all {quota_check.limit} video analyses this month",
                "current": quota_check.current,
                "limit": quota_check.limit,
                "action": "upgrade"
            }
        )
    
    # Enforce plan limit on max_comments
    plan = billing.get_plan(user_plan)
    plan_comment_limit = plan.comments_per_video
    
    # Use the minimum of requested comments and plan limit
    effective_max_comments = min(request.max_comments, plan_comment_limit)
    
    logger.info(f"User {user_id} on {user_plan} plan - requested {request.max_comments} comments, enforcing {effective_max_comments} (plan limit: {plan_comment_limit})")
    
    # Create a new analysis job
    analysis_id = str(uuid.uuid4())
    
    progress_manager = get_progress_manager()
    job = progress_manager.create_job(analysis_id, user_id, request.video_url_or_id)
    
    # Start background analysis task
    async def run_analysis():
        try:
            service = get_background_analysis_service()
            await service.run_analysis(
                job=job,
                video_url=request.video_url_or_id,
                max_comments=effective_max_comments,
                user_plan=user_plan,
                include_sentiment=request.include_sentiment,
                include_classification=request.include_classification,
                include_insights=request.include_insights,
                include_summary=request.include_summary
            )
        except Exception as e:
            logger.error(f"Background analysis failed: {e}")
            job.update_step(AnalysisStep.FAILED, error=str(e))
    
    # Schedule the background task
    asyncio.create_task(run_analysis())
    
    return {
        "analysis_id": analysis_id,
        "status": "started",
        "message": "Analysis started. Use GET /progress/{analysis_id} to track progress."
    }



@router.get("/progress/{analysis_id}")
async def stream_progress(
    analysis_id: str,
    user_data: dict = Depends(get_current_user_with_plan)
):
    """
    Stream analysis progress via Server-Sent Events (SSE).
    
    Connect to this endpoint to receive real-time progress updates.
    Each event contains step, progress percentage, and any metadata.
    
    Events are sent as JSON with format:
    {
        "step": "analyzing_sentiment",
        "progress": 45,
        "video_id": "...",
        "video_title": "...",
        "message": "Step description..."
    }
    """
    user_id = user_data["uid"]
    progress_manager = get_progress_manager()
    
    job = progress_manager.get_job(analysis_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis job not found"
        )
    
    # Verify ownership
    if job.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    async def event_generator():
        queue = job.subscribe()
        
        try:
            # Send current state immediately
            current_update = job.get_current_update()
            if current_update:
                yield f"data: {current_update.model_dump_json()}\n\n"
            
            # Stream updates
            while True:
                try:
                    # Wait for updates with timeout
                    update = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {update.model_dump_json()}\n\n"
                    
                    # End stream when complete or failed
                    if update.step in [AnalysisStep.COMPLETED.value, AnalysisStep.FAILED.value]:
                        break
                        
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield f": keepalive\n\n"
                    
        except asyncio.CancelledError:
            pass
        finally:
            job.unsubscribe(queue)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/job/{analysis_id}")
async def get_job_status(
    analysis_id: str,
    user_data: dict = Depends(get_current_user_with_plan)
):
    """
    Get current status of an analysis job without streaming.
    
    Useful for checking status after page refresh or reconnect.
    """
    user_id = user_data["uid"]
    progress_manager = get_progress_manager()
    
    job = progress_manager.get_job(analysis_id)
    if not job:
        # Job might be complete, check Firestore
        try:
            db = get_firestore()
            doc = db.collection("analyses").document(analysis_id).get()
            if doc.exists:
                data = doc.to_dict()
                if data.get("user_id") == user_id:
                    return {
                        "analysis_id": analysis_id,
                        "step": "completed",
                        "progress": 100,
                        "status": data.get("status", "completed"),
                        "video_id": data.get("video", {}).get("video_id"),
                        "video_title": data.get("video", {}).get("title")
                    }
        except Exception as e:
            logger.warning(f"Failed to check Firestore for job: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis job not found"
        )
    
    if job.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    current = job.get_current_update()
    return current.model_dump() if current else {
        "analysis_id": analysis_id,
        "step": "queued",
        "progress": 0
    }


@router.post("/", response_model=AnalysisResponse)
async def analyze_video(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    user_data: dict = Depends(get_current_user_with_plan),
    analysis_service: AnalysisService = Depends(get_analysis_service)
):
    """
    Analyze a YouTube video's comments
    
    This endpoint performs a comprehensive analysis including:
    - **Sentiment Analysis**: Classify each comment as positive/negative/neutral/mixed
    - **Classification**: Categorize comments (questions, feedback, appreciation, etc.)
    - **Insights**: Extract key themes, content ideas, and audience insights
    - **Executive Summary**: Generate an actionable summary
    
    **Rate Limits by Plan:**
    - Free: 3 videos/month
    - Starter: 10 videos/month
    - Pro: 25 videos/month
    - Business: 100 videos/month
    """
    user_id = user_data["uid"]
    
    # Get plan from billing service (single source of truth)
    billing = BillingService()
    subscription = await billing.get_user_subscription(user_id)
    user_plan = subscription.plan_id.value
    
    # Check video quota using billing service
    quota_check = await billing.check_quota(user_id, UsageType.VIDEOS, 1)
    
    if not quota_check.allowed:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "quota_exceeded",
                "message": f"You've used all {quota_check.limit} video analyses this month",
                "current": quota_check.current,
                "limit": quota_check.limit,
                "action": "upgrade"
            }
        )
    
    # Enforce plan limit on max_comments
    plan = billing.get_plan(user_plan)
    plan_comment_limit = plan.comments_per_video
    
    # Use the minimum of requested comments and plan limit
    effective_max_comments = min(request.max_comments, plan_comment_limit)
    request.max_comments = effective_max_comments
    
    logger.info(f"User {user_id} on {user_plan} plan - enforcing {effective_max_comments} comments (plan limit: {plan_comment_limit})")
    
    try:
        result = await analysis_service.analyze(
            request=request,
            user_id=user_id,
            user_plan=user_plan
        )
        
        # Increment usage in background
        if result.status == AnalysisStatus.COMPLETED:
            comments_count = len(result.comments) if result.comments else 0
            background_tasks.add_task(_increment_video_usage, user_id, comments_count)
        
        # Store analysis in Firestore for history
        background_tasks.add_task(
            _store_analysis,
            user_id=user_id,
            analysis=result
        )
        
        return result
        
    except VideoNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video not found: {e.video_id}"
        )
    except CommentsDisabledError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Comments are disabled for this video"
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
    except RateLimitError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI rate limit exceeded. Please try again in a moment."
        )
    except GeminiError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI analysis error: {e.message}"
        )


async def _store_analysis(user_id: str, analysis: AnalysisResponse):
    """Store analysis result in Firestore"""
    try:
        db = get_firestore()
        
        # Convert to dict for storage
        analysis_dict = analysis.model_dump(mode="json")
        analysis_dict["user_id"] = user_id
        analysis_dict["stored_at"] = SERVER_TIMESTAMP
        
        # Store in analyses collection
        db.collection("analyses").document(analysis.analysis_id).set(analysis_dict)
        
        # Also add to user's analysis history
        db.collection("users").document(user_id).collection("analyses").document(
            analysis.analysis_id
        ).set({
            "analysis_id": analysis.analysis_id,
            "video_id": analysis.video.video_id,
            "video_title": analysis.video.title,
            "status": analysis.status.value,
            "created_at": analysis_dict["created_at"],
            "comments_analyzed": analysis.comments_analyzed
        })
        
    except Exception as e:
        import logging
        logging.error(f"Failed to store analysis: {e}")


@router.get("/history")
async def get_analysis_history(
    limit: int = 10,
    user_data: dict = Depends(get_current_user_with_plan)
):
    """
    Get user's analysis history including in-progress analyses
    
    Returns a list of previous analyses with basic info, plus any currently processing videos.
    """
    user_id = user_data["uid"]
    
    try:
        db = get_firestore()
        analyses_ref = (
            db.collection("users")
            .document(user_id)
            .collection("analyses")
            .order_by("created_at", direction="DESCENDING")
            .limit(limit)
        )
        
        analyses = []
        for doc in analyses_ref.stream():
            analyses.append(doc.to_dict())
        
        # Add currently processing videos from progress manager
        progress_mgr = get_progress_manager()
        active_jobs = progress_mgr.get_user_jobs(user_id)
        
        for job in active_jobs:
            # Only include if not yet completed or failed
            if job.step not in [AnalysisStep.COMPLETED.value, AnalysisStep.FAILED.value]:
                current_update = job.get_current_update()
                if current_update:
                    # Create a processing entry
                    processing_entry = {
                        "analysis_id": job.analysis_id,
                        "video_id": current_update.video_id or "",
                        "video_title": current_update.video_title or "Processing...",
                        "video_thumbnail": current_update.video_thumbnail or "",
                        "status": "processing",
                        "progress": current_update.progress,
                        "step": current_update.step,
                        "step_label": current_update.step_label,
                        "created_at": datetime.utcnow().isoformat(),
                        "comments_analyzed": current_update.comments_fetched or 0,
                    }
                    analyses.insert(0, processing_entry)  # Add at the top
        
        return {"analyses": analyses, "count": len(analyses)}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch history: {str(e)}"
        )


@router.post("/async", status_code=status.HTTP_202_ACCEPTED)
async def submit_async_analysis(
    request: AnalysisRequest,
    user_data: dict = Depends(get_current_user_with_plan)
):
    """
    Submit an analysis job for asynchronous processing via Pub/Sub.
    
    This endpoint queues the analysis job and returns immediately with a job_id.
    Use GET /job/{job_id} to check the status of the job.
    
    Requires Cloud Pub/Sub to be configured. If Pub/Sub is not available,
    use POST /start instead for in-memory background processing.
    
    Returns:
        - job_id: Unique identifier for the job
        - status: Job status (queued)
        - message: Instructions for tracking progress
    """
    from src.pubsub.publisher import JobPublisher
    
    user_id = user_data["uid"]
    
    # Get plan from billing service (single source of truth)
    billing = BillingService()
    subscription = await billing.get_user_subscription(user_id)
    user_plan = subscription.plan_id.value
    
    # Check video quota using billing service
    quota_check = await billing.check_quota(user_id, UsageType.VIDEOS, 1)
    
    if not quota_check.allowed:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "quota_exceeded",
                "message": f"You've used all {quota_check.limit} video analyses this month",
                "current": quota_check.current,
                "limit": quota_check.limit,
                "action": "upgrade"
            }
        )
    
    # Enforce plan limit on max_comments
    plan = billing.get_plan(user_plan)
    plan_comment_limit = plan.comments_per_video
    
    # Use the minimum of requested comments and plan limit
    effective_max_comments = min(request.max_comments, plan_comment_limit)
    
    logger.info(f"User {user_id} on {user_plan} plan - enforcing {effective_max_comments} comments for async job (plan limit: {plan_comment_limit})")
    
    # Publish job to Pub/Sub
    try:
        publisher = JobPublisher()
        job_id = await publisher.publish_analysis_job(
            user_id=user_id,
            video_id=request.video_url_or_id,
            max_comments=effective_max_comments,
            include_sentiment=request.include_sentiment,
            include_classification=request.include_classification,
            include_insights=request.include_insights,
            include_summary=request.include_summary,
            priority=5  # Default priority
        )
        
        return {
            "job_id": job_id,
            "status": "queued",
            "message": "Analysis job queued. Use GET /job/{job_id} to check status."
        }
    except Exception as e:
        logger.error(f"Failed to submit async analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue analysis job: {str(e)}"
        )


@router.get("/job/{job_id}")
async def get_job_status(
    job_id: str,
    user_data: dict = Depends(get_current_user_with_plan)
):
    """
    Get the status of an async analysis job.
    
    Returns:
        - job_id: Job identifier
        - status: pending/queued/processing/completed/failed
        - progress: Current progress (0.0-1.0)
        - current_step: Current processing step
        - analysis_id: Analysis document ID (when completed)
        - error_message: Error details (if failed)
    """
    from src.pubsub.publisher import JobPublisher
    
    user_id = user_data["uid"]
    
    try:
        publisher = JobPublisher()
        job_status = await publisher.get_job_status(job_id)
        
        if not job_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        # Verify ownership
        if job_status.get('user_id') != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        return job_status
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get job status: {str(e)}"
        )


@router.delete("/job/{job_id}")
async def cancel_job(
    job_id: str,
    user_data: dict = Depends(get_current_user_with_plan)
):
    """
    Cancel a pending or queued analysis job.
    
    Can only cancel jobs that haven't started processing yet.
    """
    from src.pubsub.publisher import JobPublisher
    
    user_id = user_data["uid"]
    
    try:
        publisher = JobPublisher()
        cancelled = await publisher.cancel_job(job_id, user_id)
        
        if not cancelled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job cannot be cancelled (not found, already processing, or already completed)"
            )
        
        return {
            "job_id": job_id,
            "status": "cancelled",
            "message": "Job cancelled successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel job: {str(e)}"
        )


@router.post("/{analysis_id}/cancel")
async def cancel_active_analysis(
    analysis_id: str,
    user_data: dict = Depends(get_current_user_with_plan)
):
    """
    Cancel an active analysis that is currently processing.
    
    This marks the analysis as cancelled in the progress manager.
    The analysis will stop at the next checkpoint.
    """
    user_id = user_data["uid"]
    progress_manager = get_progress_manager()
    
    try:
        # Get the job from progress manager
        job = progress_manager.get_job(analysis_id)
        
        if not job:
            # Try to cancel via pub/sub (if it's queued)
            from src.pubsub.publisher import JobPublisher
            publisher = JobPublisher()
            cancelled = await publisher.cancel_job(analysis_id, user_id)
            
            if cancelled:
                return {
                    "analysis_id": analysis_id,
                    "status": "cancelled",
                    "message": "Queued job cancelled successfully"
                }
            
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found or already completed"
            )
        
        # Verify ownership
        if job.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Mark as failed/cancelled in progress manager
        job.update_step(AnalysisStep.FAILED, error="Analysis cancelled by user")
        
        # Also delete from Firestore to clean up
        try:
            db = get_firestore()
            
            # Delete from global analyses collection
            global_doc_ref = db.collection("analyses").document(analysis_id)
            if global_doc_ref.get().exists:
                global_doc_ref.delete()
            
            # Delete from user's analyses subcollection
            user_doc_ref = db.collection("users") \
                .document(user_id) \
                .collection("analyses") \
                .document(analysis_id)
            if user_doc_ref.get().exists:
                user_doc_ref.delete()
        except Exception as cleanup_error:
            logger.warning(f"Failed to clean up cancelled analysis: {cleanup_error}")
        
        return {
            "analysis_id": analysis_id,
            "status": "cancelled",
            "message": "Active analysis cancelled successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel analysis: {str(e)}"
        )


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: str,
    user_data: dict = Depends(get_current_user_with_plan)
):
    """
    Get a specific analysis by ID
    
    Only returns analyses belonging to the authenticated user.
    """
    user_id = user_data["uid"]
    
    try:
        db = get_firestore()

        # First try the full analysis document in the global 'analyses' collection
        global_doc = db.collection("analyses").document(analysis_id).get()
        if global_doc.exists:
            analysis_data = global_doc.to_dict()
            # Verify ownership
            if analysis_data.get("user_id") != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
            return AnalysisResponse(**analysis_data)

        # Fallback to the user's summary document under users/{user_id}/analyses/{analysis_id}
        doc = db.collection("users") \
            .document(user_id) \
            .collection("analyses") \
            .document(analysis_id).get()

        if not doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found"
            )

        summary = doc.to_dict()

        # Build a minimal AnalysisResponse from the summary doc so pydantic validation passes
        created_at = summary.get("created_at")
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at)
            except Exception:
                created_at = datetime.utcnow()

        minimal = {
            "analysis_id": analysis_id,
            "video": {
                "video_id": summary.get("video_id") or "",
                "title": summary.get("video_title") or "",
                "channel_title": summary.get("channel_title") or "",
                "view_count": summary.get("view_count") or 0,
                "comment_count": summary.get("comments_analyzed") or 0,
                "thumbnail_url": summary.get("video_thumbnail") or "",
            },
            "status": summary.get("status") or "completed",
            "created_at": created_at,
            "completed_at": summary.get("completed_at"),
            "comments_analyzed": summary.get("comments_analyzed") or 0,
        }

        return AnalysisResponse(**minimal)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch analysis: {str(e)}"
        )


@router.delete("/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    user_data: dict = Depends(get_current_user_with_plan)
):
    """
    Delete an analysis by ID
    
    Only allows deletion of analyses belonging to the authenticated user.
    Deletes both the global analysis document, user's summary document, and all associated conversations.
    
    Note: This does NOT decrement usage counters. Usage reflects actual API usage, not current data.
    """
    user_id = user_data["uid"]
    
    try:
        db = get_firestore()

        # First check if the analysis exists and belongs to the user
        global_doc_ref = db.collection("analyses").document(analysis_id)
        global_doc = global_doc_ref.get()
        
        video_id = None
        if global_doc.exists:
            analysis_data = global_doc.to_dict()
            # Verify ownership
            if analysis_data.get("user_id") != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
            
            video_id = analysis_data.get("video_id")
            
            # Delete the global analysis document
            global_doc_ref.delete()
        
        # Delete the user's summary document
        user_doc_ref = db.collection("users") \
            .document(user_id) \
            .collection("analyses") \
            .document(analysis_id)
        
        user_doc = user_doc_ref.get()
        if user_doc.exists:
            user_doc_ref.delete()
        
        # Delete all conversations associated with this video
        if video_id:
            conversations_ref = db.collection("conversations")
            query = conversations_ref.where("video_id", "==", video_id).where("user_id", "==", user_id)
            conversations = query.get()
            
            deleted_count = 0
            for conv_doc in conversations:
                conv_doc.reference.delete()
                deleted_count += 1
            
            if deleted_count > 0:
                logger.info(f"Deleted {deleted_count} conversation(s) associated with video {video_id}")
        
        # If neither document existed, return 404
        if not global_doc.exists and not user_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found"
            )

        return {
            "success": True,
            "message": "Analysis deleted successfully",
            "conversations_deleted": deleted_count if video_id else 0
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete analysis: {str(e)}"
        )

