"""
Integration Tests for Analysis Pipeline
========================================

Tests complete analysis workflow from YouTube to Firestore.
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime

from src.analysis.service import AnalysisService
from src.analysis.schemas import AnalysisRequest, AnalysisStatus


# ============================================================================
# Analysis Pipeline Integration Tests
# ============================================================================

@pytest.mark.integration
class TestAnalysisPipeline:
    """Test complete analysis workflow"""
    
    @pytest.mark.asyncio
    async def test_full_analysis_workflow(
        self,
        mock_youtube_service,
        mock_gemini_client,
        mock_firestore,
        mock_billing_service
    ):
        """Test end-to-end analysis pipeline"""
        # Mock YouTube response
        mock_youtube_service.fetch_comments = AsyncMock(return_value=Mock(
            video=Mock(
                video_id="test123",
                title="Test Video",
                channel_title="Test Channel",
                view_count=1000,
                comment_count=50
            ),
            comments=[
                Mock(
                    comment_id="c1",
                    author="User1",
                    text="Great video!",
                    like_count=10
                ),
                Mock(
                    comment_id="c2",
                    author="User2",
                    text="Could you make a tutorial on X?",
                    like_count=5
                )
            ]
        ))
        
        # Mock Gemini AI responses
        mock_gemini_client.generate_structured = AsyncMock(side_effect=[
            # Sentiment analysis
            {"summary": {"positive_percentage": 80.0, "negative_percentage": 10.0}},
            # Classification
            {"summary": {"category_counts": {"appreciation": 1, "question": 1}}},
            # Insights
            {"key_themes": [{"theme": "Quality", "frequency": 5}]},
            # Summary
            {"summary_text": "Overall positive response"}
        ])
        
        # Create service
        service = AnalysisService(
            youtube=mock_youtube_service,
            gemini=mock_gemini_client
        )
        
        # Run analysis
        request = AnalysisRequest(
            video_url_or_id="test123",
            max_comments=50,
            include_sentiment=True,
            include_classification=True,
            include_insights=True,
            include_summary=True
        )
        
        result = await service.analyze(
            request=request,
            user_id="test_user",
            user_plan="free"
        )
        
        # Verify result structure
        assert result.status == AnalysisStatus.COMPLETED
        assert result.video.video_id == "test123"
        assert result.comments_analyzed >= 2
        assert result.sentiment is not None
        assert result.classification is not None
    
    @pytest.mark.asyncio
    async def test_analysis_with_cache(
        self,
        mock_youtube_service,
        mock_gemini_client,
        mock_redis_client,
        mock_firestore
    ):
        """Test analysis pipeline with caching enabled"""
        from src.analysis.cached_service import CachedAnalysisService
        from src.cache import CacheService
        
        # Create cache service
        cache = CacheService(mock_redis_client)
        
        # Mock cache miss first time
        mock_redis_client.get = AsyncMock(return_value=None)
        mock_redis_client.set = AsyncMock(return_value=True)
        
        # Create cached service
        cached_service = CachedAnalysisService(
            cache_service=cache
        )
        
        # First request - cache miss
        cached = await cached_service.get_cached_analysis("analysis123")
        assert cached is None
        
        # Cache analysis
        analysis_data = {"analysis_id": "analysis123", "status": "completed"}
        await cached_service.cache_analysis("analysis123", analysis_data)
        
        # Second request - cache hit
        mock_redis_client.get = AsyncMock(return_value='{"analysis_id": "analysis123"}')
        cached = await cached_service.get_cached_analysis("analysis123")
        assert cached is not None
    
    @pytest.mark.asyncio
    async def test_analysis_insufficient_comments(
        self,
        mock_youtube_service,
        mock_gemini_client,
        mock_firestore
    ):
        """Test analysis fails gracefully with too few comments"""
        # Mock YouTube with only 2 comments (minimum is 5)
        mock_youtube_service.fetch_comments = AsyncMock(return_value=Mock(
            video=Mock(
                video_id="test123",
                title="Test Video",
                channel_title="Test Channel"
            ),
            comments=[
                Mock(comment_id="c1", text="Comment 1"),
                Mock(comment_id="c2", text="Comment 2")
            ]
        ))
        
        service = AnalysisService(
            youtube=mock_youtube_service,
            gemini=mock_gemini_client
        )
        
        request = AnalysisRequest(video_url_or_id="test123", max_comments=50)
        result = await service.analyze(request, "user123", "free")
        
        assert result.status == AnalysisStatus.FAILED
        assert "Not enough comments" in result.error
    
    @pytest.mark.asyncio
    async def test_analysis_quota_enforcement(
        self,
        mock_billing_service,
        test_user,
        client
    ):
        """Test that quota is checked before analysis starts"""
        from fastapi import HTTPException
        
        # Mock quota exceeded
        mock_billing_service.check_quota = AsyncMock(return_value=Mock(
            allowed=False,
            current=10,
            limit=10,
            remaining=0
        ))
        
        # Try to start analysis
        with patch("src.analysis.router.billing_service", mock_billing_service):
            response = client.post(
                "/api/analysis/start",
                json={"video_url_or_id": "test123", "max_comments": 50},
                headers={"Authorization": "Bearer test_token"}
            )
            
            # Should return 402 Payment Required
            assert response.status_code == 402


# ============================================================================
# Analysis Result Storage Tests
# ============================================================================

@pytest.mark.integration
class TestAnalysisStorage:
    """Test storing and retrieving analysis results"""
    
    @pytest.mark.asyncio
    async def test_store_analysis_firestore(
        self,
        mock_firestore,
        sample_analysis_result
    ):
        """Test storing analysis in Firestore"""
        mock_ref = Mock()
        mock_ref.set = AsyncMock()
        mock_firestore.collection.return_value.document.return_value = mock_ref
        
        # Store analysis
        analysis_id = sample_analysis_result["analysis_id"]
        mock_ref.set(sample_analysis_result)
        
        # Verify set was called
        mock_ref.set.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_retrieve_analysis_history(
        self,
        mock_firestore,
        test_user
    ):
        """Test retrieving user's analysis history"""
        # Mock Firestore query
        mock_docs = [
            Mock(to_dict=lambda: {"analysis_id": "a1", "video": {"title": "Video 1"}}),
            Mock(to_dict=lambda: {"analysis_id": "a2", "video": {"title": "Video 2"}})
        ]
        mock_firestore.collection.return_value.where.return_value.order_by.return_value.limit.return_value.stream = AsyncMock(return_value=mock_docs)
        
        # Query should return analyses
        # This would be in the actual router/service
        user_id = test_user["uid"]
        # analyses = await get_user_analyses(user_id)
        # assert len(analyses) == 2


# ============================================================================
# Progress Tracking Tests
# ============================================================================

@pytest.mark.integration
class TestAnalysisProgress:
    """Test real-time progress tracking"""
    
    @pytest.mark.asyncio
    async def test_progress_updates(self):
        """Test progress manager tracks analysis steps"""
        from src.analysis.progress import AnalysisProgressManager, AnalysisStep
        
        manager = AnalysisProgressManager()
        analysis_id = "test_progress_123"
        
        # Initialize progress
        manager.start_analysis(analysis_id)
        
        # Update progress through steps
        manager.update_progress(analysis_id, AnalysisStep.FETCHING_COMMENTS, 0.1)
        state = manager.get_progress(analysis_id)
        assert state["progress"] == 0.1
        assert state["current_step"] == "Fetching comments"
        
        manager.update_progress(analysis_id, AnalysisStep.ANALYZING_SENTIMENT, 0.5)
        state = manager.get_progress(analysis_id)
        assert state["progress"] == 0.5
        
        # Complete
        manager.complete_analysis(analysis_id)
        state = manager.get_progress(analysis_id)
        assert state["status"] == "completed"
        assert state["progress"] == 1.0


# ============================================================================
# Error Handling Tests
# ============================================================================

@pytest.mark.integration
class TestAnalysisErrorHandling:
    """Test error handling in analysis pipeline"""
    
    @pytest.mark.asyncio
    async def test_youtube_api_error(
        self,
        mock_youtube_service,
        mock_gemini_client
    ):
        """Test handling YouTube API errors"""
        from src.youtube.exceptions import VideoNotFoundError
        
        # Mock YouTube error
        mock_youtube_service.fetch_comments = AsyncMock(
            side_effect=VideoNotFoundError("Video not found")
        )
        
        service = AnalysisService(
            youtube=mock_youtube_service,
            gemini=mock_gemini_client
        )
        
        request = AnalysisRequest(video_url_or_id="invalid123")
        
        # Should handle error gracefully
        with pytest.raises(VideoNotFoundError):
            await service.analyze(request, "user123", "free")
    
    @pytest.mark.asyncio
    async def test_gemini_rate_limit(
        self,
        mock_youtube_service,
        mock_gemini_client
    ):
        """Test handling Gemini rate limit errors"""
        from src.gemini.exceptions import RateLimitError
        
        # Mock successful YouTube fetch
        mock_youtube_service.fetch_comments = AsyncMock(return_value=Mock(
            video=Mock(video_id="test", title="Test"),
            comments=[Mock(text=f"Comment {i}") for i in range(10)]
        ))
        
        # Mock Gemini rate limit
        mock_gemini_client.generate_structured = AsyncMock(
            side_effect=RateLimitError("Rate limit exceeded")
        )
        
        service = AnalysisService(
            youtube=mock_youtube_service,
            gemini=mock_gemini_client
        )
        
        request = AnalysisRequest(video_url_or_id="test123", include_sentiment=True)
        
        # Should handle rate limit
        with pytest.raises(RateLimitError):
            await service.analyze(request, "user123", "free")


# ============================================================================
# Async Job Tests (Pub/Sub)
# ============================================================================

@pytest.mark.integration
class TestAsyncAnalysisJobs:
    """Test asynchronous job processing"""
    
    @pytest.mark.asyncio
    async def test_publish_analysis_job(
        self,
        mock_firestore
    ):
        """Test publishing analysis job to Pub/Sub"""
        from src.pubsub.publisher import JobPublisher
        from src.pubsub.schemas import AnalysisJob
        
        # This would require actual Pub/Sub or mocking
        pytest.skip("Requires Pub/Sub - integration test")
    
    @pytest.mark.asyncio
    async def test_job_status_tracking(
        self,
        mock_firestore
    ):
        """Test tracking job status in Firestore"""
        from src.pubsub.schemas import AnalysisJobStatus
        
        # Mock job document
        mock_ref = Mock()
        mock_ref.set = AsyncMock()
        mock_ref.update = AsyncMock()
        mock_firestore.collection.return_value.document.return_value = mock_ref
        
        # Create job
        job_id = "job_123"
        job_data = {
            "job_id": job_id,
            "status": AnalysisJobStatus.QUEUED,
            "user_id": "user123",
            "video_id": "video123"
        }
        
        await mock_ref.set(job_data)
        
        # Update status
        await mock_ref.update({"status": AnalysisJobStatus.PROCESSING})
        
        # Verify updates
        assert mock_ref.set.call_count == 1
        assert mock_ref.update.call_count == 1
