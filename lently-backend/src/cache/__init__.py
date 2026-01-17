"""
Redis Cache Module
==================

Provides Redis-based caching for expensive operations:
- Analysis results
- YouTube comments
- Video metadata
- AI responses (optional)

Reduces API calls and improves response times.
"""

from .client import get_redis_client, RedisClient
from .service import CacheService, get_cache_service
from .keys import CacheKeys, CacheTTL

__all__ = [
    "get_redis_client",
    "RedisClient",
    "CacheService",
    "get_cache_service",
    "CacheKeys",
    "CacheTTL",
]
