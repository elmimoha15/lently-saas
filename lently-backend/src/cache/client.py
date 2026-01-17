"""
Redis Client Wrapper
====================

Manages Redis connection with automatic reconnection and error handling.
"""

import logging
import redis.asyncio as redis
from typing import Optional
from contextlib import asynccontextmanager

from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class RedisClient:
    """
    Redis client wrapper with connection pooling and error handling.
    
    Provides async Redis operations with automatic reconnection.
    """
    
    def __init__(self):
        """Initialize Redis client"""
        self.redis: Optional[redis.Redis] = None
        self._pool: Optional[redis.ConnectionPool] = None
        self.enabled = True
        
    async def connect(self) -> bool:
        """
        Connect to Redis server.
        
        Returns:
            True if connected successfully, False otherwise
        """
        try:
            # Create connection pool
            self._pool = redis.ConnectionPool(
                host=settings.redis_host,
                port=settings.redis_port,
                password=settings.redis_password if settings.redis_password else None,
                decode_responses=True,  # Auto-decode bytes to strings
                max_connections=20,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            
            # Create Redis client
            self.redis = redis.Redis(connection_pool=self._pool)
            
            # Test connection
            await self.redis.ping()
            logger.info(f"✅ Redis connected: {settings.redis_host}:{settings.redis_port}")
            self.enabled = True
            return True
            
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e}")
            logger.warning("Cache will be disabled")
            self.enabled = False
            self.redis = None
            return False
    
    async def disconnect(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()
            logger.info("Redis connection closed")
    
    async def get(self, key: str) -> Optional[str]:
        """
        Get value from Redis.
        
        Args:
            key: Cache key
        
        Returns:
            Value if found, None otherwise
        """
        if not self.enabled or not self.redis:
            return None
        
        try:
            value = await self.redis.get(key)
            if value:
                logger.debug(f"Cache HIT: {key}")
            else:
                logger.debug(f"Cache MISS: {key}")
            return value
        except Exception as e:
            logger.warning(f"Redis GET error for {key}: {e}")
            return None
    
    async def set(
        self,
        key: str,
        value: str,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set value in Redis with optional TTL.
        
        Args:
            key: Cache key
            value: Value to store
            ttl: Time to live in seconds (None = no expiration)
        
        Returns:
            True if set successfully
        """
        if not self.enabled or not self.redis:
            return False
        
        try:
            if ttl:
                await self.redis.setex(key, ttl, value)
            else:
                await self.redis.set(key, value)
            logger.debug(f"Cache SET: {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.warning(f"Redis SET error for {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete key from Redis.
        
        Args:
            key: Cache key to delete
        
        Returns:
            True if deleted
        """
        if not self.enabled or not self.redis:
            return False
        
        try:
            await self.redis.delete(key)
            logger.debug(f"Cache DELETE: {key}")
            return True
        except Exception as e:
            logger.warning(f"Redis DELETE error for {key}: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern.
        
        Args:
            pattern: Pattern to match (e.g., "analysis:*")
        
        Returns:
            Number of keys deleted
        """
        if not self.enabled or not self.redis:
            return 0
        
        try:
            keys = []
            async for key in self.redis.scan_iter(match=pattern):
                keys.append(key)
            
            if keys:
                deleted = await self.redis.delete(*keys)
                logger.info(f"Cache DELETE pattern '{pattern}': {deleted} keys")
                return deleted
            return 0
        except Exception as e:
            logger.warning(f"Redis DELETE pattern error for {pattern}: {e}")
            return 0
    
    async def exists(self, key: str) -> bool:
        """
        Check if key exists.
        
        Args:
            key: Cache key
        
        Returns:
            True if exists
        """
        if not self.enabled or not self.redis:
            return False
        
        try:
            return await self.redis.exists(key) > 0
        except Exception as e:
            logger.warning(f"Redis EXISTS error for {key}: {e}")
            return False
    
    async def ttl(self, key: str) -> int:
        """
        Get remaining TTL for key.
        
        Args:
            key: Cache key
        
        Returns:
            Remaining seconds (-1 = no expiration, -2 = doesn't exist)
        """
        if not self.enabled or not self.redis:
            return -2
        
        try:
            return await self.redis.ttl(key)
        except Exception as e:
            logger.warning(f"Redis TTL error for {key}: {e}")
            return -2
    
    async def flush_all(self) -> bool:
        """
        Flush all keys (use with caution!).
        
        Returns:
            True if flushed successfully
        """
        if not self.enabled or not self.redis:
            return False
        
        try:
            await self.redis.flushdb()
            logger.warning("⚠️ Redis FLUSHDB executed - all keys deleted!")
            return True
        except Exception as e:
            logger.error(f"Redis FLUSHDB error: {e}")
            return False


# Global Redis client instance
_redis_client: Optional[RedisClient] = None


async def get_redis_client() -> RedisClient:
    """
    Get or create Redis client singleton.
    
    Returns:
        RedisClient instance
    """
    global _redis_client
    
    if _redis_client is None:
        _redis_client = RedisClient()
        await _redis_client.connect()
    
    return _redis_client


@asynccontextmanager
async def redis_context():
    """
    Context manager for Redis client.
    
    Usage:
        async with redis_context() as client:
            await client.set("key", "value")
    """
    client = await get_redis_client()
    try:
        yield client
    finally:
        pass  # Connection pooling handles cleanup
