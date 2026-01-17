"""
Cache Management Router
=======================

Admin endpoints for cache management and monitoring.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import Optional

from ..cache import get_cache_service, CacheService, CacheKeys
from ..config import get_settings

router = APIRouter(prefix="/api/cache", tags=["Cache Management"])
logger = logging.getLogger(__name__)
settings = get_settings()


async def verify_admin_key(x_admin_key: str = Header(...)):
    """Verify admin API key"""
    # In production, use a secure admin key
    expected_key = getattr(settings, "admin_api_key", "admin-secret-key")
    if x_admin_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin API key"
        )


@router.get("/stats")
async def get_cache_stats(
    cache: CacheService = Depends(get_cache_service)
):
    """
    Get cache statistics.
    
    Returns:
        - hits: Number of cache hits
        - misses: Number of cache misses
        - hit_rate: Percentage of requests served from cache
        - sets: Number of cache writes
        - deletes: Number of cache deletions
        - errors: Number of cache errors
    """
    stats = cache.get_stats()
    return {
        "success": True,
        "stats": stats
    }


@router.post("/stats/reset", dependencies=[Depends(verify_admin_key)])
async def reset_cache_stats(
    cache: CacheService = Depends(get_cache_service)
):
    """
    Reset cache statistics.
    
    Requires admin API key.
    """
    cache.reset_stats()
    return {
        "success": True,
        "message": "Cache statistics reset"
    }


@router.delete("/analysis/{analysis_id}", dependencies=[Depends(verify_admin_key)])
async def invalidate_analysis(
    analysis_id: str,
    cache: CacheService = Depends(get_cache_service)
):
    """
    Invalidate cached analysis.
    
    Args:
        analysis_id: Analysis ID to invalidate
    
    Requires admin API key.
    """
    cache_key = CacheKeys.analysis(analysis_id)
    deleted = await cache.delete(cache_key)
    
    return {
        "success": True,
        "deleted": deleted,
        "cache_key": cache_key
    }


@router.delete("/video/{video_id}", dependencies=[Depends(verify_admin_key)])
async def invalidate_video(
    video_id: str,
    cache: CacheService = Depends(get_cache_service)
):
    """
    Invalidate all cached data for a video.
    
    Args:
        video_id: YouTube video ID
    
    Includes:
    - Comments
    - Video metadata
    - Transcripts
    
    Requires admin API key.
    """
    patterns = [
        f"{CacheKeys.PREFIX_COMMENTS}:{video_id}:*",
        CacheKeys.video_metadata(video_id),
        CacheKeys.transcript(video_id),
    ]
    
    total_deleted = 0
    for pattern in patterns:
        deleted = await cache.delete_pattern(pattern)
        total_deleted += deleted
    
    return {
        "success": True,
        "video_id": video_id,
        "deleted_keys": total_deleted
    }


@router.delete("/user/{user_id}", dependencies=[Depends(verify_admin_key)])
async def invalidate_user(
    user_id: str,
    cache: CacheService = Depends(get_cache_service)
):
    """
    Invalidate all cached data for a user.
    
    Args:
        user_id: Firebase user ID
    
    Includes all user-specific cache entries.
    
    Requires admin API key.
    """
    deleted = await cache.invalidate_user(user_id)
    
    return {
        "success": True,
        "user_id": user_id,
        "deleted_keys": deleted
    }


@router.delete("/all", dependencies=[Depends(verify_admin_key)])
async def flush_all_cache(
    confirm: str = "",
    cache: CacheService = Depends(get_cache_service)
):
    """
    Flush ALL cache data.
    
    ⚠️ WARNING: This deletes ALL cached data!
    
    Args:
        confirm: Must be "CONFIRM_FLUSH" to execute
    
    Requires admin API key.
    """
    if confirm != "CONFIRM_FLUSH":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide confirm=CONFIRM_FLUSH to flush all cache"
        )
    
    client = await cache._get_client()
    success = await client.flush_all()
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to flush cache"
        )
    
    return {
        "success": True,
        "message": "All cache data flushed",
        "warning": "Cache is empty - performance may be impacted until cache is rebuilt"
    }


@router.delete("/pattern", dependencies=[Depends(verify_admin_key)])
async def invalidate_pattern(
    pattern: str,
    cache: CacheService = Depends(get_cache_service)
):
    """
    Invalidate all cache entries matching a pattern.
    
    Args:
        pattern: Redis pattern (e.g., "analysis:*", "comments:*")
    
    Examples:
    - "analysis:*" - All analyses
    - "comments:*" - All comments
    - "video:*" - All video metadata
    
    Requires admin API key.
    """
    deleted = await cache.delete_pattern(pattern)
    
    return {
        "success": True,
        "pattern": pattern,
        "deleted_keys": deleted
    }


@router.post("/warm", dependencies=[Depends(verify_admin_key)])
async def warm_cache(
    keys_values: dict[str, dict],
    ttl: int = 3600,
    cache: CacheService = Depends(get_cache_service)
):
    """
    Pre-populate cache with multiple entries.
    
    Args:
        keys_values: Dict mapping cache keys to values
        ttl: Time to live for all entries (seconds)
    
    Example:
    ```json
    {
        "analysis:abc123": {...analysis data...},
        "video:xyz789": {...video data...}
    }
    ```
    
    Requires admin API key.
    """
    await cache.warm_cache(keys_values, ttl=ttl)
    
    return {
        "success": True,
        "warmed_keys": len(keys_values),
        "ttl": ttl
    }
