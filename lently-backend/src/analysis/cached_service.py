"""
Analysis Service with Redis Caching
====================================

Wraps analysis service to provide caching for analysis results.
"""

import logging
from typing import Optional
from datetime import datetime

from .service import AnalysisService, get_analysis_service
from .schemas import AnalysisRequest, AnalysisResponse, AnalysisStatus
from ..cache import CacheService, get_cache_service, CacheKeys, CacheTTL

logger = logging.getLogger(__name__)


class CachedAnalysisService:
    """
    Analysis service with Redis caching.
    
    Caches complete analysis results to reduce:
    - YouTube API calls
    - Gemini API calls
    - Processing time
    """
    
    def __init__(
        self,
        analysis_service: Optional[AnalysisService] = None,
        cache_service: Optional[CacheService] = None
    ):
        """
        Initialize cached analysis service.
        
        Args:
            analysis_service: Core analysis service
            cache_service: Redis cache service
        """
        self.analysis = analysis_service
        self.cache = cache_service
    
    async def _get_services(self):
        """Lazy initialize services"""
        if self.analysis is None:
            self.analysis = await get_analysis_service()
        if self.cache is None:
            self.cache = await get_cache_service()
    
    async def get_cached_analysis(
        self,
        analysis_id: str
    ) -> Optional[dict]:
        """
        Get analysis from cache.
        
        Args:
            analysis_id: Analysis ID
        
        Returns:
            Cached analysis dict or None
        """
        await self._get_services()
        
        cache_key = CacheKeys.analysis(analysis_id)
        cached = await self.cache.get(cache_key)
        
        if cached:
            logger.info(f"✅ Cache HIT: Analysis {analysis_id}")
        else:
            logger.info(f"❌ Cache MISS: Analysis {analysis_id}")
        
        return cached
    
    async def cache_analysis(
        self,
        analysis_id: str,
        analysis_data: dict,
        ttl: int = CacheTTL.ANALYSIS
    ) -> bool:
        """
        Store analysis in cache.
        
        Args:
            analysis_id: Analysis ID
            analysis_data: Complete analysis response dict
            ttl: Time to live (default: 1 hour)
        
        Returns:
            True if cached successfully
        """
        await self._get_services()
        
        cache_key = CacheKeys.analysis(analysis_id)
        success = await self.cache.set(cache_key, analysis_data, ttl=ttl)
        
        if success:
            logger.info(f"📦 Cached analysis {analysis_id} (TTL: {ttl}s)")
        
        return success
    
    async def invalidate_analysis(
        self,
        analysis_id: str
    ) -> bool:
        """
        Invalidate cached analysis.
        
        Args:
            analysis_id: Analysis ID
        
        Returns:
            True if deleted
        """
        await self._get_services()
        
        cache_key = CacheKeys.analysis(analysis_id)
        return await self.cache.delete(cache_key)
    
    async def invalidate_user_analyses(
        self,
        user_id: str
    ) -> int:
        """
        Invalidate all cached analyses for a user.
        
        Args:
            user_id: Firebase user ID
        
        Returns:
            Number of cache entries deleted
        """
        await self._get_services()
        
        return await self.cache.invalidate_user(user_id)


# Singleton instance
_cached_analysis_service: Optional[CachedAnalysisService] = None


async def get_cached_analysis_service() -> CachedAnalysisService:
    """
    Get cached analysis service singleton.
    
    Returns:
        CachedAnalysisService instance
    """
    global _cached_analysis_service
    
    if _cached_analysis_service is None:
        analysis_service = await get_analysis_service()
        cache_service = await get_cache_service()
        _cached_analysis_service = CachedAnalysisService(
            analysis_service,
            cache_service
        )
    
    return _cached_analysis_service
