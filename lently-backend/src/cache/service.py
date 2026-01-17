"""
Cache Service
=============

High-level caching operations with JSON serialization.
"""

import json
import logging
from typing import Any, Optional, TypeVar, Generic
from datetime import datetime

from .client import RedisClient, get_redis_client
from .keys import CacheKeys, CacheTTL

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CacheService(Generic[T]):
    """
    Generic cache service with JSON serialization.
    
    Provides high-level caching operations that handle JSON
    serialization/deserialization automatically.
    """
    
    def __init__(self, redis_client: Optional[RedisClient] = None):
        """
        Initialize cache service.
        
        Args:
            redis_client: Redis client instance (optional)
        """
        self.redis_client = redis_client
        self.stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0,
            "errors": 0
        }
    
    async def _get_client(self) -> RedisClient:
        """Get Redis client"""
        if self.redis_client is None:
            self.redis_client = await get_redis_client()
        return self.redis_client
    
    async def get(self, key: str) -> Optional[dict]:
        """
        Get and deserialize value from cache.
        
        Args:
            key: Cache key
        
        Returns:
            Deserialized dict if found, None otherwise
        """
        try:
            client = await self._get_client()
            value = await client.get(key)
            
            if value:
                self.stats["hits"] += 1
                return json.loads(value)
            else:
                self.stats["misses"] += 1
                return None
                
        except json.JSONDecodeError as e:
            logger.error(f"Cache JSON decode error for {key}: {e}")
            self.stats["errors"] += 1
            return None
        except Exception as e:
            logger.error(f"Cache GET error for {key}: {e}")
            self.stats["errors"] += 1
            return None
    
    async def set(
        self,
        key: str,
        value: dict,
        ttl: int = CacheTTL.MEDIUM
    ) -> bool:
        """
        Serialize and store value in cache.
        
        Args:
            key: Cache key
            value: Value to cache (must be JSON-serializable)
            ttl: Time to live in seconds
        
        Returns:
            True if cached successfully
        """
        try:
            client = await self._get_client()
            serialized = json.dumps(value, default=str)  # default=str handles datetime
            success = await client.set(key, serialized, ttl=ttl)
            
            if success:
                self.stats["sets"] += 1
            return success
            
        except (TypeError, ValueError) as e:
            logger.error(f"Cache JSON encode error for {key}: {e}")
            self.stats["errors"] += 1
            return False
        except Exception as e:
            logger.error(f"Cache SET error for {key}: {e}")
            self.stats["errors"] += 1
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete key from cache.
        
        Args:
            key: Cache key
        
        Returns:
            True if deleted
        """
        try:
            client = await self._get_client()
            success = await client.delete(key)
            if success:
                self.stats["deletes"] += 1
            return success
        except Exception as e:
            logger.error(f"Cache DELETE error for {key}: {e}")
            self.stats["errors"] += 1
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern.
        
        Args:
            pattern: Pattern to match
        
        Returns:
            Number of keys deleted
        """
        try:
            client = await self._get_client()
            count = await client.delete_pattern(pattern)
            self.stats["deletes"] += count
            return count
        except Exception as e:
            logger.error(f"Cache DELETE pattern error for {pattern}: {e}")
            self.stats["errors"] += 1
            return 0
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            client = await self._get_client()
            return await client.exists(key)
        except Exception as e:
            logger.error(f"Cache EXISTS error for {key}: {e}")
            return False
    
    async def get_or_set(
        self,
        key: str,
        factory_fn,
        ttl: int = CacheTTL.MEDIUM
    ) -> Optional[dict]:
        """
        Get from cache or compute and store if not found.
        
        Args:
            key: Cache key
            factory_fn: Async function to compute value if cache miss
            ttl: Time to live for new values
        
        Returns:
            Cached or computed value
        """
        # Try to get from cache first
        cached = await self.get(key)
        if cached is not None:
            return cached
        
        # Cache miss - compute value
        try:
            value = await factory_fn()
            if value is not None:
                await self.set(key, value, ttl=ttl)
            return value
        except Exception as e:
            logger.error(f"Factory function error for {key}: {e}")
            return None
    
    async def invalidate_user(self, user_id: str) -> int:
        """
        Invalidate all cache entries for a user.
        
        Args:
            user_id: Firebase user ID
        
        Returns:
            Number of keys deleted
        """
        patterns = CacheKeys.invalidate_user(user_id)
        total = 0
        for pattern in patterns:
            count = await self.delete_pattern(pattern)
            total += count
        logger.info(f"Invalidated {total} cache entries for user {user_id}")
        return total
    
    async def warm_cache(self, keys_and_values: dict[str, dict], ttl: int = CacheTTL.LONG):
        """
        Pre-populate cache with multiple entries.
        
        Args:
            keys_and_values: Dict mapping cache keys to values
            ttl: Time to live for all entries
        """
        count = 0
        for key, value in keys_and_values.items():
            if await self.set(key, value, ttl=ttl):
                count += 1
        logger.info(f"Warmed cache with {count}/{len(keys_and_values)} entries")
    
    def get_stats(self) -> dict:
        """
        Get cache statistics.
        
        Returns:
            Dict with hits, misses, hit rate, etc.
        """
        total_requests = self.stats["hits"] + self.stats["misses"]
        hit_rate = (
            self.stats["hits"] / total_requests * 100
            if total_requests > 0
            else 0
        )
        
        return {
            **self.stats,
            "total_requests": total_requests,
            "hit_rate": round(hit_rate, 2),
            "hit_rate_str": f"{hit_rate:.1f}%"
        }
    
    def reset_stats(self):
        """Reset cache statistics"""
        self.stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0,
            "errors": 0
        }


# Global cache service instance
_cache_service: Optional[CacheService] = None


async def get_cache_service() -> CacheService:
    """
    Get or create cache service singleton.
    
    Returns:
        CacheService instance
    """
    global _cache_service
    
    if _cache_service is None:
        redis_client = await get_redis_client()
        _cache_service = CacheService(redis_client)
    
    return _cache_service
