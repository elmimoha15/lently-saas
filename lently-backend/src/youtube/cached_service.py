"""
YouTube Comment Caching Service
================================

Caches YouTube API responses to reduce quota usage.
"""

import logging
from typing import Optional

from ..youtube.service import YouTubeService, get_youtube_service
from ..youtube.schemas import FetchCommentsRequest, FetchCommentsResponse
from ..cache import CacheService, get_cache_service, CacheKeys, CacheTTL

logger = logging.getLogger(__name__)


class CachedYouTubeService:
    """
    YouTube service with Redis caching.
    
    Caches:
    - Video metadata
    - Comment lists
    - Transcripts
    
    Reduces YouTube API quota consumption significantly.
    """
    
    def __init__(
        self,
        youtube_service: Optional[YouTubeService] = None,
        cache_service: Optional[CacheService] = None
    ):
        """
        Initialize cached YouTube service.
        
        Args:
            youtube_service: Core YouTube service
            cache_service: Redis cache service
        """
        self.youtube = youtube_service
        self.cache = cache_service
    
    async def _get_services(self):
        """Lazy initialize services"""
        if self.youtube is None:
            self.youtube = await get_youtube_service()
        if self.cache is None:
            self.cache = await get_cache_service()
    
    async def fetch_comments_cached(
        self,
        request: FetchCommentsRequest,
        user_plan: str = "free"
    ) -> FetchCommentsResponse:
        """
        Fetch comments with caching.
        
        Checks cache first, fetches from YouTube API only on cache miss.
        
        Args:
            request: Comment fetch request
            user_plan: User's subscription plan
        
        Returns:
            FetchCommentsResponse (from cache or API)
        """
        await self._get_services()
        
        # Extract video ID from URL or use directly
        video_id = self._extract_video_id(request.video_url_or_id)
        
        # Build cache key including params
        cache_key = CacheKeys.comments(video_id)
        cache_key += f":max_{request.max_comments}:order_{request.order}"
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached:
            logger.info(f"✅ Cache HIT: Comments for {video_id}")
            # Convert dict back to Pydantic model
            return FetchCommentsResponse(**cached)
        
        # Cache miss - fetch from YouTube API
        logger.info(f"❌ Cache MISS: Fetching comments for {video_id} from YouTube")
        result = await self.youtube.fetch_comments(request, user_plan)
        
        # Cache the result
        result_dict = result.model_dump()
        await self.cache.set(
            cache_key,
            result_dict,
            ttl=CacheTTL.COMMENTS
        )
        
        logger.info(f"📦 Cached comments for {video_id} (TTL: {CacheTTL.COMMENTS}s)")
        
        return result
    
    async def get_video_metadata_cached(
        self,
        video_id: str
    ) -> Optional[dict]:
        """
        Get video metadata with caching.
        
        Args:
            video_id: YouTube video ID
        
        Returns:
            Video metadata dict or None
        """
        await self._get_services()
        
        cache_key = CacheKeys.video_metadata(video_id)
        
        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached:
            logger.info(f"✅ Cache HIT: Video metadata for {video_id}")
            return cached
        
        # Cache miss - fetch from YouTube
        logger.info(f"❌ Cache MISS: Fetching metadata for {video_id}")
        metadata = await self.youtube.get_video_metadata(video_id)
        
        if metadata:
            metadata_dict = metadata.model_dump()
            await self.cache.set(
                cache_key,
                metadata_dict,
                ttl=CacheTTL.VIDEO
            )
            logger.info(f"📦 Cached video metadata for {video_id}")
            return metadata_dict
        
        return None
    
    async def invalidate_video(
        self,
        video_id: str
    ) -> int:
        """
        Invalidate all cache entries for a video.
        
        Args:
            video_id: YouTube video ID
        
        Returns:
            Number of cache entries deleted
        """
        await self._get_services()
        
        patterns = [
            f"{CacheKeys.PREFIX_COMMENTS}:{video_id}:*",
            CacheKeys.video_metadata(video_id),
            CacheKeys.transcript(video_id),
        ]
        
        total = 0
        for pattern in patterns:
            count = await self.cache.delete_pattern(pattern)
            total += count
        
        logger.info(f"Invalidated {total} cache entries for video {video_id}")
        return total
    
    def _extract_video_id(self, video_url_or_id: str) -> str:
        """
        Extract video ID from URL or return as-is if already an ID.
        
        Args:
            video_url_or_id: YouTube URL or video ID
        
        Returns:
            Video ID
        """
        # If it looks like a URL, extract ID
        if "youtube.com" in video_url_or_id or "youtu.be" in video_url_or_id:
            if "v=" in video_url_or_id:
                return video_url_or_id.split("v=")[1].split("&")[0]
            elif "youtu.be/" in video_url_or_id:
                return video_url_or_id.split("youtu.be/")[1].split("?")[0]
        
        # Already a video ID
        return video_url_or_id


# Singleton instance
_cached_youtube_service: Optional[CachedYouTubeService] = None


async def get_cached_youtube_service() -> CachedYouTubeService:
    """
    Get cached YouTube service singleton.
    
    Returns:
        CachedYouTubeService instance
    """
    global _cached_youtube_service
    
    if _cached_youtube_service is None:
        youtube_service = await get_youtube_service()
        cache_service = await get_cache_service()
        _cached_youtube_service = CachedYouTubeService(
            youtube_service,
            cache_service
        )
    
    return _cached_youtube_service
