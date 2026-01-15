"""
YouTube API Exceptions
"""

class YouTubeError(Exception):
    """Base YouTube exception"""
    def __init__(self, message: str, video_id: str = None):
        self.message = message
        self.video_id = video_id
        super().__init__(self.message)


class VideoNotFoundError(YouTubeError):
    """Video not found or private"""
    pass


class CommentsDisabledError(YouTubeError):
    """Comments are disabled for this video"""
    pass


class QuotaExceededError(YouTubeError):
    """YouTube API quota exceeded - daily limit reached"""
    pass


class InvalidVideoIdError(YouTubeError):
    """Invalid YouTube video ID format"""
    pass


class PrivateVideoError(YouTubeError):
    """Video is private and cannot be accessed"""
    pass
