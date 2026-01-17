"""
Cache Key Management
====================

Standardized cache key generation for consistent caching patterns.
"""


class CacheKeys:
    """
    Centralized cache key management.
    
    Provides consistent key patterns for all cached entities.
    """
    
    # Key prefixes
    PREFIX_ANALYSIS = "analysis"
    PREFIX_COMMENTS = "comments"
    PREFIX_VIDEO = "video"
    PREFIX_USER = "user"
    PREFIX_QUOTA = "quota"
    PREFIX_TRANSCRIPT = "transcript"
    
    @staticmethod
    def analysis(analysis_id: str) -> str:
        """
        Cache key for complete analysis results.
        
        Args:
            analysis_id: Analysis document ID
        
        Returns:
            Cache key (e.g., "analysis:abc123")
        """
        return f"{CacheKeys.PREFIX_ANALYSIS}:{analysis_id}"
    
    @staticmethod
    def analysis_pattern() -> str:
        """Pattern to match all analysis cache keys"""
        return f"{CacheKeys.PREFIX_ANALYSIS}:*"
    
    @staticmethod
    def comments(video_id: str) -> str:
        """
        Cache key for YouTube video comments.
        
        Args:
            video_id: YouTube video ID
        
        Returns:
            Cache key (e.g., "comments:dQw4w9WgXcQ")
        """
        return f"{CacheKeys.PREFIX_COMMENTS}:{video_id}"
    
    @staticmethod
    def comments_pattern() -> str:
        """Pattern to match all comments cache keys"""
        return f"{CacheKeys.PREFIX_COMMENTS}:*"
    
    @staticmethod
    def video_metadata(video_id: str) -> str:
        """
        Cache key for YouTube video metadata.
        
        Args:
            video_id: YouTube video ID
        
        Returns:
            Cache key (e.g., "video:dQw4w9WgXcQ")
        """
        return f"{CacheKeys.PREFIX_VIDEO}:{video_id}"
    
    @staticmethod
    def video_pattern() -> str:
        """Pattern to match all video cache keys"""
        return f"{CacheKeys.PREFIX_VIDEO}:*"
    
    @staticmethod
    def transcript(video_id: str) -> str:
        """
        Cache key for video transcript.
        
        Args:
            video_id: YouTube video ID
        
        Returns:
            Cache key (e.g., "transcript:dQw4w9WgXcQ")
        """
        return f"{CacheKeys.PREFIX_TRANSCRIPT}:{video_id}"
    
    @staticmethod
    def transcript_pattern() -> str:
        """Pattern to match all transcript cache keys"""
        return f"{CacheKeys.PREFIX_TRANSCRIPT}:*"
    
    @staticmethod
    def user_quota(user_id: str) -> str:
        """
        Cache key for user quota info.
        
        Args:
            user_id: Firebase user ID
        
        Returns:
            Cache key (e.g., "quota:user123")
        """
        return f"{CacheKeys.PREFIX_QUOTA}:{user_id}"
    
    @staticmethod
    def user_pattern(user_id: str) -> str:
        """
        Pattern to match all cache keys for a specific user.
        
        Args:
            user_id: Firebase user ID
        
        Returns:
            Pattern (e.g., "*:user123")
        """
        return f"*:{user_id}"
    
    @staticmethod
    def invalidate_user(user_id: str) -> list[str]:
        """
        Get all patterns to invalidate for a user.
        
        Args:
            user_id: Firebase user ID
        
        Returns:
            List of patterns to delete
        """
        return [
            CacheKeys.user_quota(user_id),
            f"{CacheKeys.PREFIX_ANALYSIS}:*:{user_id}",
        ]


# TTL constants (in seconds)
class CacheTTL:
    """Standard TTL values for different cache types"""
    
    # Analysis results - 1 hour (expensive to compute)
    ANALYSIS = 3600
    
    # Comments - 30 minutes (YouTube data changes slowly)
    COMMENTS = 1800
    
    # Video metadata - 1 hour
    VIDEO = 3600
    
    # Transcript - 2 hours (rarely changes)
    TRANSCRIPT = 7200
    
    # User quota - 5 minutes (changes frequently)
    QUOTA = 300
    
    # Short-lived cache - 5 minutes
    SHORT = 300
    
    # Medium-lived cache - 30 minutes
    MEDIUM = 1800
    
    # Long-lived cache - 1 hour
    LONG = 3600
    
    # Very long cache - 24 hours
    VERY_LONG = 86400
