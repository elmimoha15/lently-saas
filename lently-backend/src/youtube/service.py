"""
YouTube API Service - Fetches video metadata and comments
Optimized to retrieve the most valuable, actionable comments for creators
"""

import logging
import re
import html
from datetime import datetime
from typing import Optional
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from src.config import get_settings
from src.youtube.schemas import (
    VideoMetadata, Comment, FetchCommentsRequest, 
    FetchCommentsResponse, CommentSortOrder
)
from src.youtube.exceptions import (
    YouTubeError, VideoNotFoundError, CommentsDisabledError,
    QuotaExceededError, InvalidVideoIdError, PrivateVideoError
)
from src.youtube.constants import (
    MAX_COMMENTS_PER_REQUEST, SPAM_INDICATORS,
    MAX_COMMENT_LENGTH, MIN_COMMENT_LENGTH
)
from src.billing.schemas import get_plan

logger = logging.getLogger(__name__)
settings = get_settings()


class YouTubeService:
    """
    YouTube Data API v3 service
    
    Focuses on fetching HIGH-VALUE comments:
    - Relevance-sorted (YouTube's algorithm prioritizes engaging comments)
    - Spam-filtered 
    - Engagement-scored (likes + replies)
    - Question/feedback detection
    """
    
    def __init__(self):
        if not settings.youtube_api_key:
            raise ValueError("YouTube API key not configured")
        self.youtube = build('youtube', 'v3', developerKey=settings.youtube_api_key)
    
    def _extract_video_id(self, url_or_id: str) -> str:
        """Extract video ID from various YouTube URL formats"""
        url_or_id = url_or_id.strip()
        
        patterns = [
            r'(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})',
            r'(?:youtu\.be\/)([a-zA-Z0-9_-]{11})',
            r'(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
            r'(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})',
            r'(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url_or_id)
            if match:
                return match.group(1)
        
        # Check if it's already a valid video ID
        if re.match(r'^[a-zA-Z0-9_-]{11}$', url_or_id):
            return url_or_id
        
        raise InvalidVideoIdError(f"Cannot extract video ID from: {url_or_id}")
    
    def _clean_html(self, text: str) -> str:
        """Remove HTML tags and decode entities"""
        # Remove HTML tags
        clean = re.sub(r'<[^>]+>', '', text)
        # Decode HTML entities
        clean = html.unescape(clean)
        return clean.strip()
    
    def _is_spam(self, text: str) -> bool:
        """Detect likely spam comments"""
        text_lower = text.lower()
        
        # Check against spam indicators
        for indicator in SPAM_INDICATORS:
            if indicator in text_lower:
                return True
        
        # Too short or too long
        if len(text) < MIN_COMMENT_LENGTH or len(text) > MAX_COMMENT_LENGTH:
            return True
        
        # Excessive emojis or caps
        emoji_pattern = re.compile("["
            u"\U0001F600-\U0001F64F"
            u"\U0001F300-\U0001F5FF"
            u"\U0001F680-\U0001F6FF"
            u"\U0001F1E0-\U0001F1FF"
            "]+", flags=re.UNICODE)
        
        emoji_count = len(emoji_pattern.findall(text))
        if emoji_count > 10:  # Excessive emojis
            return True
        
        # Mostly uppercase
        if len(text) > 20:
            upper_ratio = sum(1 for c in text if c.isupper()) / len(text)
            if upper_ratio > 0.7:
                return True
        
        return False
    
    def _is_question(self, text: str) -> bool:
        """Detect if comment contains a question"""
        question_patterns = [
            r'\?',
            r'\bhow\b',
            r'\bwhat\b',
            r'\bwhy\b',
            r'\bwhen\b',
            r'\bwhere\b',
            r'\bcan you\b',
            r'\bcould you\b',
            r'\bwould you\b',
            r'\bdo you\b',
            r'\bis there\b',
        ]
        text_lower = text.lower()
        return any(re.search(p, text_lower) for p in question_patterns)
    
    def _is_feedback(self, text: str) -> bool:
        """Detect if comment contains feedback or suggestions"""
        feedback_patterns = [
            r'\bshould\b',
            r'\bcould\b',
            r'\bwould be\b',
            r'\bsuggestion\b',
            r'\bidea\b',
            r'\btry\b.*\bnext\b',
            r'\bmake.*video\b',
            r'\bplease\b.*\bmake\b',
            r'\bloved\b',
            r'\bhated\b',
            r'\bbest\b',
            r'\bworst\b',
            r'\bimprove\b',
            r'\bfeedback\b',
        ]
        text_lower = text.lower()
        return any(re.search(p, text_lower) for p in feedback_patterns)
    
    def _calculate_engagement_score(self, comment: dict) -> float:
        """
        Calculate engagement score for ranking comments
        Higher = more valuable to creator
        """
        likes = comment.get('like_count', 0)
        replies = comment.get('reply_count', 0)
        is_question = comment.get('is_question', False)
        is_feedback = comment.get('is_feedback', False)
        word_count = comment.get('word_count', 0)
        
        # Base score from likes (logarithmic to prevent outliers from dominating)
        score = (likes + 1) ** 0.5 * 10
        
        # Replies indicate discussion value
        score += replies * 5
        
        # Questions are valuable for content ideas
        if is_question:
            score += 15
        
        # Feedback is valuable for improvement
        if is_feedback:
            score += 10
        
        # Longer, substantive comments (but not too long)
        if 30 <= word_count <= 200:
            score += 5
        
        return round(score, 2)
    
    async def get_video_metadata(self, video_id: str) -> VideoMetadata:
        """Fetch video metadata from YouTube"""
        try:
            response = self.youtube.videos().list(
                part='snippet,statistics,contentDetails',
                id=video_id
            ).execute()
            
            if not response.get('items'):
                raise VideoNotFoundError(f"Video not found", video_id=video_id)
            
            video = response['items'][0]
            snippet = video['snippet']
            stats = video['statistics']
            content = video.get('contentDetails', {})
            
            return VideoMetadata(
                video_id=video_id,
                title=snippet['title'],
                description=snippet.get('description', ''),
                channel_title=snippet['channelTitle'],
                channel_id=snippet['channelId'],
                thumbnail_url=snippet['thumbnails'].get('high', {}).get('url', 
                    snippet['thumbnails'].get('default', {}).get('url', '')),
                published_at=snippet['publishedAt'],
                view_count=int(stats.get('viewCount', 0)),
                like_count=int(stats.get('likeCount', 0)) if 'likeCount' in stats else None,
                comment_count=int(stats.get('commentCount', 0)),
                duration=content.get('duration'),
                tags=snippet.get('tags', [])
            )
            
        except HttpError as e:
            self._handle_http_error(e, video_id)
    
    async def fetch_comments(
        self,
        request: FetchCommentsRequest,
        user_plan: str = "free"
    ) -> FetchCommentsResponse:
        """
        Fetch the most valuable comments for a video
        
        Strategy:
        1. Always use 'relevance' order - YouTube's algorithm surfaces best comments
        2. Filter spam and low-quality comments
        3. Score remaining comments by engagement
        4. Return top N comments sorted by value to creator
        """
        video_id = self._extract_video_id(request.video_url_or_id)
        
        # Get plan limit from billing schemas (single source of truth)
        plan = get_plan(user_plan)
        max_allowed = plan.comments_per_video
        max_to_fetch = min(request.max_comments, max_allowed)
        
        # Get video metadata first
        video = await self.get_video_metadata(video_id)
        
        try:
            raw_comments = []
            next_page_token = None
            
            # Fetch more than needed to account for spam filtering
            # For quality selection, we want to see 2-3x the target to pick the best ones
            # But cap at a reasonable limit to avoid excessive API calls
            fetch_target = min(max_to_fetch * 3, 5000)
            
            while len(raw_comments) < fetch_target:
                response = self.youtube.commentThreads().list(
                    part='snippet',
                    videoId=video_id,
                    order=request.order.value,
                    maxResults=min(MAX_COMMENTS_PER_REQUEST, fetch_target - len(raw_comments)),
                    pageToken=next_page_token,
                    textFormat='plainText'
                ).execute()
                
                for item in response.get('items', []):
                    snippet = item['snippet']['topLevelComment']['snippet']
                    text_original = snippet['textDisplay']
                    text_clean = self._clean_html(text_original)
                    
                    # Skip spam if enabled
                    if request.exclude_spam and self._is_spam(text_clean):
                        continue
                    
                    # Skip low-engagement if filter is set
                    like_count = snippet.get('likeCount', 0)
                    if like_count < request.min_likes:
                        continue
                    
                    word_count = len(text_clean.split())
                    is_question = self._is_question(text_clean)
                    is_feedback = self._is_feedback(text_clean)
                    
                    comment_data = {
                        'comment_id': item['id'],
                        'author': snippet['authorDisplayName'],
                        'author_channel_id': snippet.get('authorChannelId', {}).get('value'),
                        'author_profile_image': snippet.get('authorProfileImageUrl'),
                        'text': text_clean,
                        'text_original': text_original,
                        'like_count': like_count,
                        'published_at': snippet['publishedAt'],
                        'updated_at': snippet.get('updatedAt'),
                        'reply_count': item['snippet'].get('totalReplyCount', 0),
                        'is_public': snippet.get('isPublic', True),
                        'word_count': word_count,
                        'is_question': is_question,
                        'is_feedback': is_feedback,
                    }
                    
                    # Calculate engagement score
                    comment_data['engagement_score'] = self._calculate_engagement_score(comment_data)
                    
                    raw_comments.append(Comment(**comment_data))
                
                next_page_token = response.get('nextPageToken')
                if not next_page_token:
                    break
            
            # Sort by engagement score and take top N
            sorted_comments = sorted(
                raw_comments, 
                key=lambda c: c.engagement_score, 
                reverse=True
            )[:max_to_fetch]
            
            # Calculate quality score (average engagement of top comments)
            avg_engagement = sum(c.engagement_score for c in sorted_comments) / len(sorted_comments) if sorted_comments else 0
            quality_score = min(100, avg_engagement * 2)  # Normalize to 0-100
            
            logger.info(
                f"Fetched {len(sorted_comments)} high-value comments for video {video_id} "
                f"(filtered from {len(raw_comments)} raw, quality score: {quality_score:.1f})"
            )
            
            return FetchCommentsResponse(
                video=video,
                comments=sorted_comments,
                total_fetched=len(sorted_comments),
                total_available=video.comment_count,
                has_more=len(sorted_comments) < video.comment_count,
                quality_score=round(quality_score, 1)
            )
            
        except HttpError as e:
            self._handle_http_error(e, video_id)
    
    def _handle_http_error(self, error: HttpError, video_id: str):
        """Handle YouTube API HTTP errors"""
        status = error.resp.status
        error_str = str(error)
        
        if status == 404:
            raise VideoNotFoundError("Video not found or is private", video_id=video_id)
        elif status == 403:
            if 'commentsDisabled' in error_str:
                raise CommentsDisabledError("Comments are disabled for this video", video_id=video_id)
            elif 'quotaExceeded' in error_str:
                raise QuotaExceededError("YouTube API daily quota exceeded")
            elif 'forbidden' in error_str.lower():
                raise PrivateVideoError("Video is private or restricted", video_id=video_id)
        
        logger.error(f"YouTube API error: {error_str}")
        raise YouTubeError(f"YouTube API error: {error_str}", video_id=video_id)


# Singleton instance
_youtube_service: Optional[YouTubeService] = None


def get_youtube_service() -> YouTubeService:
    """Get or create YouTube service singleton"""
    global _youtube_service
    if _youtube_service is None:
        _youtube_service = YouTubeService()
    return _youtube_service
