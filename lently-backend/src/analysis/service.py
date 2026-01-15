"""
Analysis Pipeline Service
Orchestrates the full comment analysis workflow
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Optional

from src.youtube.service import get_youtube_service, YouTubeService
from src.youtube.schemas import FetchCommentsRequest, Comment, VideoMetadata
from src.gemini.client import get_gemini_client, GeminiClient
from src.gemini.prompts.analysis import (
    SENTIMENT_ANALYSIS_PROMPT, CLASSIFICATION_PROMPT,
    INSIGHTS_PROMPT, SUMMARY_PROMPT
)
from src.gemini.exceptions import GeminiError
from src.analysis.schemas import (
    AnalysisRequest, AnalysisResponse, AnalysisStatus,
    SentimentResult, SentimentSummary, CommentSentiment,
    ClassificationResult, ClassificationSummary, CommentClassification,
    InsightsResult, KeyTheme, ContentIdea, AudienceInsight,
    ExecutiveSummary, VideoInfo, StoredComment
)

logger = logging.getLogger(__name__)

# Max comments to send in a single AI request
BATCH_SIZE = 50


class AnalysisService:
    """
    Orchestrates the complete analysis pipeline:
    1. Fetch comments from YouTube
    2. Analyze sentiment
    3. Classify comments
    4. Extract insights
    5. Generate executive summary
    """
    
    def __init__(
        self,
        youtube: YouTubeService = None,
        gemini: GeminiClient = None
    ):
        self.youtube = youtube or get_youtube_service()
        self.gemini = gemini or get_gemini_client()
    
    def _prepare_comments_json(self, comments: list[Comment]) -> str:
        """Convert comments to JSON for prompts"""
        comment_data = []
        for c in comments:
            comment_data.append({
                "id": c.comment_id,
                "author": c.author,
                "text": c.text[:500],  # Truncate long comments
                "likes": c.like_count,
                "replies": c.reply_count
            })
        return json.dumps(comment_data, indent=2)
    
    async def analyze(
        self,
        request: AnalysisRequest,
        user_id: str,
        user_plan: str = "free"
    ) -> AnalysisResponse:
        """
        Run the complete analysis pipeline
        """
        analysis_id = str(uuid.uuid4())
        created_at = datetime.utcnow()
        
        try:
            # Step 1: Fetch comments
            logger.info(f"[{analysis_id}] Fetching comments for {request.video_url_or_id}")
            
            fetch_request = FetchCommentsRequest(
                video_url_or_id=request.video_url_or_id,
                max_comments=request.max_comments,
                order="relevance",
                exclude_spam=True
            )
            
            fetch_result = await self.youtube.fetch_comments(
                request=fetch_request,
                user_plan=user_plan
            )
            
            video = fetch_result.video
            comments = fetch_result.comments
            
            logger.info(f"[{analysis_id}] Fetched {len(comments)} comments")
            
            if len(comments) < 5:
                return AnalysisResponse(
                    analysis_id=analysis_id,
                    video=VideoInfo(
                        video_id=video.video_id,
                        title=video.title,
                        channel_title=video.channel_title,
                        view_count=video.view_count,
                        comment_count=video.comment_count,
                        thumbnail_url=video.thumbnail_url
                    ),
                    status=AnalysisStatus.FAILED,
                    created_at=created_at,
                    error="Not enough comments to analyze (minimum 5 required)"
                )
            
            # Initialize results
            sentiment_result = None
            classification_result = None
            insights_result = None
            summary_result = None
            
            # Step 2: Sentiment Analysis
            if request.include_sentiment:
                logger.info(f"[{analysis_id}] Analyzing sentiment...")
                sentiment_result = await self._analyze_sentiment(
                    comments=comments,
                    video=video
                )
            
            # Step 3: Classification
            if request.include_classification:
                logger.info(f"[{analysis_id}] Classifying comments...")
                classification_result = await self._classify_comments(
                    comments=comments,
                    video=video
                )
            
            # Step 4: Extract Insights
            if request.include_insights:
                logger.info(f"[{analysis_id}] Extracting insights...")
                insights_result = await self._extract_insights(
                    comments=comments,
                    video=video
                )
            
            # Step 5: Generate Summary
            if request.include_summary and sentiment_result and classification_result:
                logger.info(f"[{analysis_id}] Generating summary...")
                summary_result = await self._generate_summary(
                    video=video,
                    comments_count=len(comments),
                    sentiment=sentiment_result,
                    classification=classification_result,
                    insights=insights_result
                )
            
            # Build stored comments for Ask AI
            stored_comments = self._build_stored_comments(
                comments=comments,
                sentiment_result=sentiment_result,
                classification_result=classification_result
            )
            
            logger.info(f"[{analysis_id}] Analysis complete!")
            
            return AnalysisResponse(
                analysis_id=analysis_id,
                video=VideoInfo(
                    video_id=video.video_id,
                    title=video.title,
                    channel_title=video.channel_title,
                    view_count=video.view_count,
                    comment_count=video.comment_count,
                    thumbnail_url=video.thumbnail_url
                ),
                status=AnalysisStatus.COMPLETED,
                created_at=created_at,
                completed_at=datetime.utcnow(),
                comments_analyzed=len(comments),
                sentiment=sentiment_result,
                classification=classification_result,
                insights=insights_result,
                executive_summary=summary_result,
                stored_comments=stored_comments
            )
            
        except Exception as e:
            logger.error(f"[{analysis_id}] Analysis failed: {str(e)}")
            return AnalysisResponse(
                analysis_id=analysis_id,
                video=VideoInfo(
                    video_id="unknown",
                    title="Unknown",
                    channel_title="Unknown",
                    view_count=0,
                    comment_count=0,
                    thumbnail_url=""
                ),
                status=AnalysisStatus.FAILED,
                created_at=created_at,
                error=str(e)
            )
    
    def _build_stored_comments(
        self,
        comments: list[Comment],
        sentiment_result: Optional[SentimentResult],
        classification_result: Optional[ClassificationResult]
    ) -> list[StoredComment]:
        """Build stored comments for Ask AI feature"""
        # Create lookup maps for sentiment and classification
        sentiment_map = {}
        if sentiment_result:
            for cs in sentiment_result.comments:
                sentiment_map[cs.comment_id] = cs.sentiment
        
        classification_map = {}
        if classification_result:
            for cc in classification_result.comments:
                classification_map[cc.comment_id] = cc.primary_category
        
        stored = []
        for comment in comments:
            stored.append(StoredComment(
                comment_id=comment.comment_id,
                author=comment.author,
                text=comment.text[:1000],  # Limit text length
                like_count=comment.like_count,
                reply_count=comment.reply_count,
                sentiment=sentiment_map.get(comment.comment_id),
                category=classification_map.get(comment.comment_id),
                is_question=comment.is_question,
                is_feedback=comment.is_feedback
            ))
        
        return stored
    
    async def _analyze_sentiment(
        self,
        comments: list[Comment],
        video: VideoMetadata
    ) -> SentimentResult:
        """Analyze sentiment of comments"""
        # Process in batches for large comment sets
        all_comment_sentiments = []
        
        for i in range(0, len(comments), BATCH_SIZE):
            batch = comments[i:i + BATCH_SIZE]
            
            prompt = SENTIMENT_ANALYSIS_PROMPT.format(
                video_title=video.title,
                channel_name=video.channel_title,
                comments_json=self._prepare_comments_json(batch)
            )
            
            try:
                result = await self.gemini.generate_json(prompt)
                
                # Parse comment sentiments
                for cs in result.get("comments", []):
                    all_comment_sentiments.append(CommentSentiment(
                        comment_id=cs["comment_id"],
                        sentiment=cs["sentiment"],
                        confidence=cs.get("confidence", 0.8),
                        emotion=cs.get("emotion")
                    ))
                
                # Get summary from last batch
                if i + BATCH_SIZE >= len(comments):
                    summary_data = result.get("summary", {})
                    summary = SentimentSummary(
                        positive_percentage=summary_data.get("positive_percentage", 0),
                        negative_percentage=summary_data.get("negative_percentage", 0),
                        neutral_percentage=summary_data.get("neutral_percentage", 0),
                        mixed_percentage=summary_data.get("mixed_percentage", 0),
                        dominant_sentiment=summary_data.get("dominant_sentiment", "neutral"),
                        top_emotions=summary_data.get("top_emotions", []),
                        sentiment_trend=summary_data.get("sentiment_trend")
                    )
                    
            except GeminiError as e:
                logger.warning(f"Sentiment batch failed: {e}")
                continue
        
        # Calculate summary if not set
        if not all_comment_sentiments:
            summary = SentimentSummary(
                positive_percentage=0,
                negative_percentage=0,
                neutral_percentage=100,
                mixed_percentage=0,
                dominant_sentiment="neutral",
                top_emotions=[],
                sentiment_trend=None
            )
        elif 'summary' not in locals():
            # Calculate from collected sentiments
            total = len(all_comment_sentiments)
            pos = sum(1 for s in all_comment_sentiments if s.sentiment == "positive")
            neg = sum(1 for s in all_comment_sentiments if s.sentiment == "negative")
            neu = sum(1 for s in all_comment_sentiments if s.sentiment == "neutral")
            mix = sum(1 for s in all_comment_sentiments if s.sentiment == "mixed")
            
            summary = SentimentSummary(
                positive_percentage=round(pos / total * 100, 1),
                negative_percentage=round(neg / total * 100, 1),
                neutral_percentage=round(neu / total * 100, 1),
                mixed_percentage=round(mix / total * 100, 1),
                dominant_sentiment=max(
                    [("positive", pos), ("negative", neg), ("neutral", neu), ("mixed", mix)],
                    key=lambda x: x[1]
                )[0],
                top_emotions=[],
                sentiment_trend=None
            )
        
        return SentimentResult(
            comments=all_comment_sentiments,
            summary=summary
        )
    
    async def _classify_comments(
        self,
        comments: list[Comment],
        video: VideoMetadata
    ) -> ClassificationResult:
        """Classify comments into categories"""
        all_classifications = []
        category_counts = {}
        
        for i in range(0, len(comments), BATCH_SIZE):
            batch = comments[i:i + BATCH_SIZE]
            
            prompt = CLASSIFICATION_PROMPT.format(
                video_title=video.title,
                channel_name=video.channel_title,
                comments_json=self._prepare_comments_json(batch)
            )
            
            try:
                result = await self.gemini.generate_json(prompt)
                
                for cc in result.get("comments", []):
                    classification = CommentClassification(
                        comment_id=cc["comment_id"],
                        primary_category=cc["primary_category"],
                        secondary_category=cc.get("secondary_category"),
                        confidence=cc.get("confidence", 0.8)
                    )
                    all_classifications.append(classification)
                    
                    # Count categories
                    cat = cc["primary_category"]
                    category_counts[cat] = category_counts.get(cat, 0) + 1
                    
            except GeminiError as e:
                logger.warning(f"Classification batch failed: {e}")
                continue
        
        # Build summary
        total = len(all_classifications) or 1
        category_percentages = {
            k: round(v / total * 100, 1) 
            for k, v in category_counts.items()
        }
        
        actionable_categories = ["question", "suggestion", "request", "feedback"]
        actionable_count = sum(
            category_counts.get(cat, 0) 
            for cat in actionable_categories
        )
        
        top_category = max(category_counts.items(), key=lambda x: x[1])[0] if category_counts else "other"
        
        return ClassificationResult(
            comments=all_classifications,
            summary=ClassificationSummary(
                category_counts=category_counts,
                category_percentages=category_percentages,
                top_category=top_category,
                actionable_count=actionable_count
            )
        )
    
    async def _extract_insights(
        self,
        comments: list[Comment],
        video: VideoMetadata
    ) -> InsightsResult:
        """Extract themes, content ideas, and audience insights"""
        # Use a sample for insights to stay within token limits
        sample_comments = comments[:min(len(comments), 75)]
        
        prompt = INSIGHTS_PROMPT.format(
            video_title=video.title,
            channel_name=video.channel_title,
            video_description=video.description[:500] if video.description else "",
            comments_json=self._prepare_comments_json(sample_comments)
        )
        
        try:
            result = await self.gemini.generate_json(prompt)
            
            key_themes = [
                KeyTheme(
                    theme=t["theme"],
                    mention_count=t.get("mention_count", 1),
                    sentiment=t.get("sentiment", "neutral"),
                    example_comments=t.get("example_comments", [])
                )
                for t in result.get("key_themes", [])
            ]
            
            content_ideas = [
                ContentIdea(
                    title=ci["title"],
                    description=ci.get("description", ""),
                    source_type=ci.get("source_type", "discussion"),
                    confidence=ci.get("confidence", 0.7),
                    related_comments=ci.get("related_comments", [])
                )
                for ci in result.get("content_ideas", [])
            ]
            
            audience_insights = [
                AudienceInsight(
                    insight=ai["insight"],
                    evidence=ai.get("evidence", ""),
                    action_item=ai.get("action_item")
                )
                for ai in result.get("audience_insights", [])
            ]
            
            return InsightsResult(
                key_themes=key_themes,
                content_ideas=content_ideas,
                audience_insights=audience_insights
            )
            
        except GeminiError as e:
            logger.warning(f"Insights extraction failed: {e}")
            return InsightsResult(
                key_themes=[],
                content_ideas=[],
                audience_insights=[]
            )
    
    async def _generate_summary(
        self,
        video: VideoMetadata,
        comments_count: int,
        sentiment: SentimentResult,
        classification: ClassificationResult,
        insights: Optional[InsightsResult]
    ) -> ExecutiveSummary:
        """Generate executive summary of analysis"""
        prompt = SUMMARY_PROMPT.format(
            video_title=video.title,
            channel_name=video.channel_title,
            view_count=video.view_count,
            total_comments=video.comment_count,
            analyzed_count=comments_count,
            sentiment_json=json.dumps({
                "positive": sentiment.summary.positive_percentage,
                "negative": sentiment.summary.negative_percentage,
                "neutral": sentiment.summary.neutral_percentage,
                "dominant": sentiment.summary.dominant_sentiment,
                "top_emotions": sentiment.summary.top_emotions
            }),
            classification_json=json.dumps({
                "counts": classification.summary.category_counts,
                "top_category": classification.summary.top_category,
                "actionable_count": classification.summary.actionable_count
            }),
            themes_json=json.dumps([
                {"theme": t.theme, "mentions": t.mention_count}
                for t in (insights.key_themes if insights else [])
            ])
        )
        
        try:
            result = await self.gemini.generate_json(prompt)
            
            return ExecutiveSummary(
                summary_text=result.get("executive_summary", "Analysis complete."),
                key_metrics=result.get("key_metrics", {}),
                priority_actions=result.get("priority_actions", [])
            )
            
        except GeminiError as e:
            logger.warning(f"Summary generation failed: {e}")
            return ExecutiveSummary(
                summary_text=f"Analyzed {comments_count} comments. Sentiment is {sentiment.summary.dominant_sentiment}.",
                key_metrics={
                    "comments_analyzed": comments_count,
                    "dominant_sentiment": sentiment.summary.dominant_sentiment
                },
                priority_actions=[]
            )


# Singleton
_analysis_service: Optional[AnalysisService] = None


def get_analysis_service() -> AnalysisService:
    """Get or create analysis service singleton"""
    global _analysis_service
    if _analysis_service is None:
        _analysis_service = AnalysisService()
    return _analysis_service
