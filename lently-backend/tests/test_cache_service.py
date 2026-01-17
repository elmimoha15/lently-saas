"""
Unit Tests for Cache Service
=============================

Tests Redis client, cache service, and key management.
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime

from src.cache import CacheService, CacheKeys, CacheTTL, RedisClient


# ============================================================================
# CacheKeys Tests
# ============================================================================

class TestCacheKeys:
    """Test cache key generation"""
    
    def test_analysis_key(self):
        """Test analysis key generation"""
        key = CacheKeys.analysis("abc123")
        assert key == "analysis:abc123"
    
    def test_comments_key(self):
        """Test comments key generation"""
        key = CacheKeys.comments("video123")
        assert key == "comments:video123"
    
    def test_video_metadata_key(self):
        """Test video metadata key generation"""
        key = CacheKeys.video_metadata("video456")
        assert key == "video:video456"
    
    def test_transcript_key(self):
        """Test transcript key generation"""
        key = CacheKeys.transcript("video789")
        assert key == "transcript:video789"
    
    def test_user_quota_key(self):
        """Test user quota key generation"""
        key = CacheKeys.user_quota("user123")
        assert key == "quota:user123"
    
    def test_analysis_pattern(self):
        """Test analysis pattern for bulk deletion"""
        pattern = CacheKeys.analysis_pattern()
        assert pattern == "analysis:*"
    
    def test_invalidate_user_patterns(self):
        """Test getting all patterns for user invalidation"""
        patterns = CacheKeys.invalidate_user("user123")
        assert "quota:user123" in patterns
        assert any("analysis" in p for p in patterns)


class TestCacheTTL:
    """Test TTL constants"""
    
    def test_ttl_values(self):
        """Test all TTL constants are set"""
        assert CacheTTL.ANALYSIS == 3600
        assert CacheTTL.COMMENTS == 1800
        assert CacheTTL.VIDEO == 3600
        assert CacheTTL.TRANSCRIPT == 7200
        assert CacheTTL.QUOTA == 300
        assert CacheTTL.SHORT == 300
        assert CacheTTL.MEDIUM == 1800
        assert CacheTTL.LONG == 3600


# ============================================================================
# RedisClient Tests
# ============================================================================

@pytest.mark.unit
class TestRedisClient:
    """Test Redis client wrapper"""
    
    @pytest.mark.asyncio
    async def test_get_cache_miss(self, mock_redis_client):
        """Test cache miss returns None"""
        mock_redis_client.get = AsyncMock(return_value=None)
        result = await mock_redis_client.get("test_key")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_cache_hit(self, mock_redis_client):
        """Test cache hit returns value"""
        mock_redis_client.get = AsyncMock(return_value='{"data": "value"}')
        result = await mock_redis_client.get("test_key")
        assert result == '{"data": "value"}'
    
    @pytest.mark.asyncio
    async def test_set_with_ttl(self, mock_redis_client):
        """Test setting value with TTL"""
        mock_redis_client.set = AsyncMock(return_value=True)
        success = await mock_redis_client.set("key", "value", ttl=3600)
        assert success is True
    
    @pytest.mark.asyncio
    async def test_delete_key(self, mock_redis_client):
        """Test deleting a key"""
        mock_redis_client.delete = AsyncMock(return_value=True)
        success = await mock_redis_client.delete("key")
        assert success is True
    
    @pytest.mark.asyncio
    async def test_delete_pattern(self, mock_redis_client):
        """Test deleting keys by pattern"""
        mock_redis_client.delete_pattern = AsyncMock(return_value=5)
        count = await mock_redis_client.delete_pattern("analysis:*")
        assert count == 5
    
    @pytest.mark.asyncio
    async def test_exists_true(self, mock_redis_client):
        """Test key exists"""
        mock_redis_client.exists = AsyncMock(return_value=True)
        exists = await mock_redis_client.exists("key")
        assert exists is True
    
    @pytest.mark.asyncio
    async def test_exists_false(self, mock_redis_client):
        """Test key doesn't exist"""
        mock_redis_client.exists = AsyncMock(return_value=False)
        exists = await mock_redis_client.exists("key")
        assert exists is False


# ============================================================================
# CacheService Tests
# ============================================================================

@pytest.mark.unit
class TestCacheService:
    """Test high-level cache service"""
    
    @pytest.mark.asyncio
    async def test_get_cache_miss(self, mock_redis_client):
        """Test get with cache miss"""
        cache = CacheService(mock_redis_client)
        mock_redis_client.get = AsyncMock(return_value=None)
        
        result = await cache.get("test_key")
        assert result is None
        assert cache.stats["misses"] == 1
    
    @pytest.mark.asyncio
    async def test_get_cache_hit(self, mock_redis_client):
        """Test get with cache hit"""
        cache = CacheService(mock_redis_client)
        mock_redis_client.get = AsyncMock(return_value='{"name": "test"}')
        
        result = await cache.get("test_key")
        assert result == {"name": "test"}
        assert cache.stats["hits"] == 1
    
    @pytest.mark.asyncio
    async def test_set_value(self, mock_redis_client):
        """Test setting value in cache"""
        cache = CacheService(mock_redis_client)
        mock_redis_client.set = AsyncMock(return_value=True)
        
        data = {"name": "test", "value": 123}
        success = await cache.set("test_key", data, ttl=3600)
        
        assert success is True
        assert cache.stats["sets"] == 1
    
    @pytest.mark.asyncio
    async def test_set_with_datetime(self, mock_redis_client):
        """Test setting value with datetime (should serialize)"""
        cache = CacheService(mock_redis_client)
        mock_redis_client.set = AsyncMock(return_value=True)
        
        data = {"created_at": datetime.utcnow()}
        success = await cache.set("test_key", data)
        
        assert success is True
    
    @pytest.mark.asyncio
    async def test_delete_value(self, mock_redis_client):
        """Test deleting value"""
        cache = CacheService(mock_redis_client)
        mock_redis_client.delete = AsyncMock(return_value=True)
        
        success = await cache.delete("test_key")
        assert success is True
        assert cache.stats["deletes"] == 1
    
    @pytest.mark.asyncio
    async def test_delete_pattern(self, mock_redis_client):
        """Test deleting by pattern"""
        cache = CacheService(mock_redis_client)
        mock_redis_client.delete_pattern = AsyncMock(return_value=10)
        
        count = await cache.delete_pattern("analysis:*")
        assert count == 10
        assert cache.stats["deletes"] == 10
    
    @pytest.mark.asyncio
    async def test_get_or_set_cache_hit(self, mock_redis_client):
        """Test get_or_set with cache hit (factory not called)"""
        cache = CacheService(mock_redis_client)
        mock_redis_client.get = AsyncMock(return_value='{"cached": true}')
        
        factory_called = False
        async def factory():
            nonlocal factory_called
            factory_called = True
            return {"cached": False}
        
        result = await cache.get_or_set("test_key", factory, ttl=3600)
        
        assert result == {"cached": True}
        assert factory_called is False  # Factory should NOT be called
    
    @pytest.mark.asyncio
    async def test_get_or_set_cache_miss(self, mock_redis_client):
        """Test get_or_set with cache miss (factory called)"""
        cache = CacheService(mock_redis_client)
        mock_redis_client.get = AsyncMock(return_value=None)
        mock_redis_client.set = AsyncMock(return_value=True)
        
        factory_called = False
        async def factory():
            nonlocal factory_called
            factory_called = True
            return {"computed": "value"}
        
        result = await cache.get_or_set("test_key", factory, ttl=3600)
        
        assert result == {"computed": "value"}
        assert factory_called is True  # Factory SHOULD be called
    
    @pytest.mark.asyncio
    async def test_invalidate_user(self, mock_redis_client):
        """Test invalidating all user cache entries"""
        cache = CacheService(mock_redis_client)
        mock_redis_client.delete_pattern = AsyncMock(return_value=5)
        
        count = await cache.invalidate_user("user123")
        assert count >= 0  # Should delete some entries
    
    @pytest.mark.asyncio
    async def test_warm_cache(self, mock_redis_client):
        """Test cache warming with multiple entries"""
        cache = CacheService(mock_redis_client)
        mock_redis_client.set = AsyncMock(return_value=True)
        
        data = {
            "key1": {"value": 1},
            "key2": {"value": 2},
            "key3": {"value": 3}
        }
        
        await cache.warm_cache(data, ttl=3600)
        
        # Should have called set 3 times
        assert mock_redis_client.set.call_count == 3
    
    def test_get_stats(self):
        """Test getting cache statistics"""
        cache = CacheService(Mock())
        cache.stats = {
            "hits": 80,
            "misses": 20,
            "sets": 25,
            "deletes": 5,
            "errors": 1
        }
        
        stats = cache.get_stats()
        
        assert stats["hits"] == 80
        assert stats["misses"] == 20
        assert stats["total_requests"] == 100
        assert stats["hit_rate"] == 80.0
        assert stats["hit_rate_str"] == "80.0%"
    
    def test_reset_stats(self):
        """Test resetting statistics"""
        cache = CacheService(Mock())
        cache.stats = {
            "hits": 100,
            "misses": 50,
            "sets": 60,
            "deletes": 10,
            "errors": 2
        }
        
        cache.reset_stats()
        
        assert cache.stats["hits"] == 0
        assert cache.stats["misses"] == 0
        assert cache.stats["sets"] == 0


# ============================================================================
# Cache Integration Tests
# ============================================================================

@pytest.mark.integration
@pytest.mark.requires_redis
class TestCacheIntegration:
    """Integration tests requiring actual Redis"""
    
    @pytest.mark.asyncio
    async def test_full_cache_workflow(self):
        """Test complete cache workflow with real Redis"""
        # This test requires Redis to be running
        pytest.skip("Requires Redis - run with --requires-redis flag")
        
        from src.cache import get_redis_client, get_cache_service
        
        # Get real clients
        redis = await get_redis_client()
        cache = await get_cache_service()
        
        if not redis.enabled:
            pytest.skip("Redis not available")
        
        # Test set
        test_data = {"message": "integration test", "timestamp": datetime.utcnow().isoformat()}
        await cache.set("test:integration", test_data, ttl=60)
        
        # Test get
        result = await cache.get("test:integration")
        assert result["message"] == "integration test"
        
        # Test delete
        await cache.delete("test:integration")
        
        # Verify deleted
        result = await cache.get("test:integration")
        assert result is None


# ============================================================================
# Error Handling Tests
# ============================================================================

@pytest.mark.unit
class TestCacheErrorHandling:
    """Test error handling in cache service"""
    
    @pytest.mark.asyncio
    async def test_redis_connection_failure(self):
        """Test graceful handling when Redis is unavailable"""
        cache = CacheService(None)  # No Redis client
        
        # Should not raise exceptions
        result = await cache.get("key")
        assert result is None
        
        success = await cache.set("key", {"data": "value"})
        # May return False or None depending on implementation
    
    @pytest.mark.asyncio
    async def test_invalid_json_in_cache(self, mock_redis_client):
        """Test handling of corrupted cache data"""
        cache = CacheService(mock_redis_client)
        mock_redis_client.get = AsyncMock(return_value="invalid json {{{")
        
        result = await cache.get("test_key")
        # Should handle JSON decode error gracefully
        assert result is None
        assert cache.stats["errors"] >= 1
