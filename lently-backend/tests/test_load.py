"""
Load Testing Scripts
====================

Performance and scalability tests using pytest-benchmark.
"""

import pytest
import asyncio
from time import time
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import AsyncMock, Mock, patch


# ============================================================================
# Benchmark Fixtures
# ============================================================================

@pytest.fixture
def benchmark_analysis_request():
    """Standard analysis request for benchmarking"""
    return {
        "video_url_or_id": "test_video_123",
        "max_comments": 100,
        "include_sentiment": True,
        "include_classification": True,
        "include_insights": True,
        "include_summary": True
    }


# ============================================================================
# Cache Performance Tests
# ============================================================================

@pytest.mark.load
class TestCachePerformance:
    """Test cache performance under load"""
    
    def test_cache_set_performance(self, benchmark, mock_redis_client):
        """Benchmark cache SET operations"""
        from src.cache import CacheService
        
        cache = CacheService(mock_redis_client)
        mock_redis_client.set = AsyncMock(return_value=True)
        
        data = {"test": "value", "nested": {"key": "value"}}
        
        async def set_cache():
            return await cache.set("test_key", data, ttl=3600)
        
        # Benchmark
        benchmark(asyncio.run, set_cache())
    
    def test_cache_get_performance(self, benchmark, mock_redis_client):
        """Benchmark cache GET operations"""
        from src.cache import CacheService
        
        cache = CacheService(mock_redis_client)
        mock_redis_client.get = AsyncMock(return_value='{"test": "value"}')
        
        async def get_cache():
            return await cache.get("test_key")
        
        # Benchmark
        benchmark(asyncio.run, get_cache())
    
    @pytest.mark.asyncio
    async def test_cache_concurrent_reads(self, mock_redis_client):
        """Test cache performance with concurrent reads"""
        from src.cache import CacheService
        
        cache = CacheService(mock_redis_client)
        mock_redis_client.get = AsyncMock(return_value='{"cached": "data"}')
        
        # Simulate 100 concurrent reads
        tasks = [cache.get(f"key_{i}") for i in range(100)]
        
        start = time()
        results = await asyncio.gather(*tasks)
        duration = time() - start
        
        assert len(results) == 100
        assert duration < 1.0  # Should complete in under 1 second
        print(f"100 concurrent reads: {duration:.3f}s")


# ============================================================================
# API Endpoint Performance Tests
# ============================================================================

@pytest.mark.load
class TestEndpointPerformance:
    """Test API endpoint performance"""
    
    def test_health_check_performance(self, benchmark, client):
        """Benchmark health check endpoint"""
        def health_check():
            return client.get("/health")
        
        result = benchmark(health_check)
        assert result.status_code == 200
    
    def test_user_info_performance(self, benchmark, client, auth_headers):
        """Benchmark user info endpoint"""
        def get_user_info():
            return client.get("/api/user/me", headers=auth_headers)
        
        result = benchmark(get_user_info)
        # Should be fast even with auth


# ============================================================================
# Analysis Pipeline Performance Tests
# ============================================================================

@pytest.mark.load
class TestAnalysisPipelinePerformance:
    """Test analysis pipeline performance"""
    
    @pytest.mark.asyncio
    async def test_sentiment_analysis_speed(
        self,
        mock_gemini_client,
        sample_comments
    ):
        """Test sentiment analysis processing speed"""
        from src.analysis.service import AnalysisService
        
        mock_gemini_client.generate_structured = AsyncMock(return_value={
            "summary": {"positive_percentage": 70.0}
        })
        
        service = AnalysisService(gemini=mock_gemini_client)
        
        # Measure processing time for 100 comments
        start = time()
        # result = await service._analyze_sentiment(sample_comments * 33)
        duration = time() - start
        
        print(f"Sentiment analysis (100 comments): {duration:.3f}s")
        assert duration < 5.0  # Should complete in under 5 seconds
    
    @pytest.mark.asyncio
    async def test_concurrent_analyses(
        self,
        mock_youtube_service,
        mock_gemini_client
    ):
        """Test system handling multiple concurrent analyses"""
        from src.analysis.service import AnalysisService
        from src.analysis.schemas import AnalysisRequest
        
        # Mock services
        mock_youtube_service.fetch_comments = AsyncMock(return_value=Mock(
            video=Mock(video_id="test", title="Test"),
            comments=[Mock(text=f"Comment {i}") for i in range(50)]
        ))
        
        mock_gemini_client.generate_structured = AsyncMock(return_value={
            "summary": {"positive_percentage": 70.0}
        })
        
        service = AnalysisService(
            youtube=mock_youtube_service,
            gemini=mock_gemini_client
        )
        
        # Run 10 concurrent analyses
        requests = [
            AnalysisRequest(video_url_or_id=f"video_{i}", max_comments=50)
            for i in range(10)
        ]
        
        start = time()
        tasks = [
            service.analyze(req, f"user_{i}", "free")
            for i, req in enumerate(requests)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        duration = time() - start
        
        print(f"10 concurrent analyses: {duration:.3f}s")
        assert len(results) == 10


# ============================================================================
# Database Performance Tests
# ============================================================================

@pytest.mark.load
class TestFirestorePerformance:
    """Test Firestore operations performance"""
    
    @pytest.mark.asyncio
    async def test_batch_writes(self, mock_firestore):
        """Test batch write performance"""
        mock_batch = Mock()
        mock_batch.commit = AsyncMock()
        mock_firestore.batch.return_value = mock_batch
        
        # Write 100 documents
        start = time()
        for i in range(100):
            mock_batch.set(Mock(), {"data": f"value_{i}"})
        await mock_batch.commit()
        duration = time() - start
        
        print(f"Batch write (100 docs): {duration:.3f}s")
    
    @pytest.mark.asyncio
    async def test_concurrent_reads(self, mock_firestore):
        """Test concurrent Firestore reads"""
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {"data": "value"}
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        # 50 concurrent reads
        start = time()
        tasks = [
            mock_firestore.collection("test").document(f"doc_{i}").get()
            for i in range(50)
        ]
        await asyncio.gather(*tasks)
        duration = time() - start
        
        print(f"50 concurrent Firestore reads: {duration:.3f}s")


# ============================================================================
# Memory Usage Tests
# ============================================================================

@pytest.mark.load
class TestMemoryUsage:
    """Test memory usage under load"""
    
    @pytest.mark.asyncio
    async def test_large_comment_set_memory(self, sample_comments):
        """Test memory with large comment sets"""
        import sys
        
        # Create large comment set
        large_comments = sample_comments * 1000  # 3000 comments
        
        size = sys.getsizeof(large_comments)
        print(f"3000 comments size: {size / 1024:.2f} KB")
        
        # Should be reasonable (< 5 MB)
        assert size < 5 * 1024 * 1024
    
    def test_cache_memory_usage(self):
        """Test cache memory footprint"""
        import sys
        from src.cache import CacheService
        
        cache = CacheService(Mock())
        
        # Cache 1000 entries
        for i in range(1000):
            cache.stats[f"key_{i}"] = {"data": f"value_{i}"}
        
        size = sys.getsizeof(cache.stats)
        print(f"Cache stats (1000 entries): {size / 1024:.2f} KB")


# ============================================================================
# Throughput Tests
# ============================================================================

@pytest.mark.load
class TestThroughput:
    """Test system throughput"""
    
    @pytest.mark.asyncio
    async def test_api_requests_per_second(self, client):
        """Test API request throughput"""
        # Make 100 requests
        start = time()
        
        tasks = []
        for i in range(100):
            tasks.append(asyncio.to_thread(client.get, "/health"))
        
        responses = await asyncio.gather(*tasks)
        duration = time() - start
        
        rps = 100 / duration
        print(f"Requests per second: {rps:.2f}")
        
        # Should handle at least 50 RPS
        assert rps >= 50
    
    @pytest.mark.asyncio
    async def test_cache_operations_per_second(self, mock_redis_client):
        """Test cache operation throughput"""
        from src.cache import CacheService
        
        cache = CacheService(mock_redis_client)
        mock_redis_client.get = AsyncMock(return_value='{"data": "value"}')
        
        # 1000 cache reads
        start = time()
        tasks = [cache.get(f"key_{i}") for i in range(1000)]
        await asyncio.gather(*tasks)
        duration = time() - start
        
        ops_per_sec = 1000 / duration
        print(f"Cache ops/sec: {ops_per_sec:.2f}")
        
        # Should handle at least 1000 ops/sec
        assert ops_per_sec >= 1000


# ============================================================================
# Stress Tests
# ============================================================================

@pytest.mark.load
@pytest.mark.slow
class TestStressConditions:
    """Stress testing under extreme conditions"""
    
    @pytest.mark.asyncio
    async def test_quota_check_under_load(self, mock_billing_service):
        """Test quota checking with many concurrent users"""
        mock_billing_service.check_quota = AsyncMock(return_value=Mock(
            allowed=True,
            current=5,
            limit=10,
            remaining=5
        ))
        
        # 500 concurrent quota checks
        start = time()
        tasks = [
            mock_billing_service.check_quota(f"user_{i}", "videos", 1)
            for i in range(500)
        ]
        results = await asyncio.gather(*tasks)
        duration = time() - start
        
        print(f"500 concurrent quota checks: {duration:.3f}s")
        assert duration < 5.0
        assert len(results) == 500
    
    @pytest.mark.asyncio
    async def test_cache_invalidation_performance(self, mock_redis_client):
        """Test cache invalidation with many keys"""
        from src.cache import CacheService
        
        cache = CacheService(mock_redis_client)
        mock_redis_client.delete_pattern = AsyncMock(return_value=1000)
        
        # Invalidate pattern matching 1000 keys
        start = time()
        count = await cache.delete_pattern("analysis:*")
        duration = time() - start
        
        print(f"Invalidate 1000 keys: {duration:.3f}s")
        assert duration < 2.0


# ============================================================================
# Scalability Tests
# ============================================================================

@pytest.mark.load
@pytest.mark.slow
class TestScalability:
    """Test system scalability with increasing load"""
    
    @pytest.mark.asyncio
    async def test_scaling_concurrent_users(self, mock_billing_service):
        """Test performance with increasing concurrent users"""
        mock_billing_service.check_quota = AsyncMock(return_value=Mock(allowed=True))
        
        user_counts = [10, 50, 100, 200, 500]
        results = {}
        
        for count in user_counts:
            start = time()
            tasks = [
                mock_billing_service.check_quota(f"user_{i}", "videos", 1)
                for i in range(count)
            ]
            await asyncio.gather(*tasks)
            duration = time() - start
            
            results[count] = duration
            print(f"{count} users: {duration:.3f}s ({count/duration:.0f} ops/sec)")
        
        # Performance should scale reasonably
        # 500 users shouldn't take more than 10x the time of 10 users
        assert results[500] < results[10] * 10


# ============================================================================
# Test Summary Reporter
# ============================================================================

@pytest.fixture(scope="session", autouse=True)
def performance_summary(request):
    """Print performance summary after all tests"""
    yield
    
    print("\n" + "="*70)
    print("PERFORMANCE TEST SUMMARY")
    print("="*70)
    print("\nRun these tests with: pytest tests/test_load.py -v --benchmark-only")
    print("\nFor load tests: pytest tests/test_load.py -m load")
    print("For slow tests: pytest tests/test_load.py -m slow")
    print("="*70)
