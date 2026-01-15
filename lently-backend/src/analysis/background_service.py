"""
Background Analysis Service
Handles async analysis processing with progress updates
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Optional

from src.youtube.service import get_youtube_service, YouTubeService
from src.youtube.schemas import FetchCommentsRequest, Comment, VideoMetadata
from src.youtube.exceptions import (
    VideoNotFoundError, CommentsDisabledError,
    QuotaExceededError, InvalidVideoIdError
)
from src.gemini.client import get_gemini_client, GeminiClient
from src.gemini.prompts.analysis import (
    SENTIMENT_ANALYSIS_PROMPT, CLASSIFICATION_PROMPT,
    INSIGHTS_PROMPT, SUMMARY_PROMPT
)
from src.gemini.exceptions import GeminiError, RateLimitError
from src.analysis.progress import (
    AnalysisStep, AnalysisJob, get_progress_manager
)
from src.analysis.schemas import (
    AnalysisResponse, AnalysisStatus, VideoInfo,
    SentimentResult, SentimentSummary, CommentSentiment,
    ClassificationResult, ClassificationSummary, CommentClassification,
    InsightsResult, KeyTheme, ContentIdea, AudienceInsight,
    ExecutiveSummary, StoredComment
)
from src.firebase_init import get_firestore
from google.cloud.firestore import SERVER_TIMESTAMP

logger = logging.getLogger(__name__)

BATCH_SIZE = 50


class BackgroundAnalysisService:
    """
    Runs analysis in background with progress updates.
    Designed to be called from a background task.
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
                "text": c.text[:500],
                "likes": c.like_count,
                "replies": c.reply_count
            })
        return json.dumps(comment_data, indent=2)
    
    async def run_analysis(
        self,
        job: AnalysisJob,
        video_url: str,
        max_comments: int,
        user_plan: str,
        include_sentiment: bool = True,
        include_classification: bool = True,
        include_insights: bool = True,
        include_summary: bool = True
    ) -> AnalysisResponse:
        """
        Run the complete analysis pipeline with progress updates.
        This method is designed to be run in a background task.
        """
        created_at = datetime.utcnow()
        
        try:
            # Step 1: Connect and fetch video metadata
            job.update_step(AnalysisStep.CONNECTING)
            await asyncio.sleep(0.3)  # Small delay for UI feedback
            
            job.update_step(AnalysisStep.FETCHING_VIDEO)
            
            # Prepare fetch request
            fetch_request = FetchCommentsRequest(
                video_url_or_id=video_url,
                max_comments=max_comments,
                order="relevance",
                exclude_spam=True
            )
            
            # Fetch comments (includes video metadata)
            job.update_step(AnalysisStep.FETCHING_COMMENTS)
            
            try:
                fetch_result = await self.youtube.fetch_comments(
                    request=fetch_request,
                    user_plan=user_plan
                )
            except VideoNotFoundError as e:
                job.update_step(AnalysisStep.FAILED, error=f"Video not found: {e.video_id}")
                return self._create_failed_response(job.analysis_id, created_at, str(e))
            except CommentsDisabledError:
                job.update_step(AnalysisStep.FAILED, error="Comments are disabled for this video")
                return self._create_failed_response(job.analysis_id, created_at, "Comments are disabled")
            except QuotaExceededError:
                job.update_step(AnalysisStep.FAILED, error="YouTube API quota exceeded")
                return self._create_failed_response(job.analysis_id, created_at, "API quota exceeded")
            except InvalidVideoIdError as e:
                job.update_step(AnalysisStep.FAILED, error=str(e.message))
                return self._create_failed_response(job.analysis_id, created_at, e.message)
            
            video = fetch_result.video
            comments = fetch_result.comments
            
            # Update job with video info
            job.update_step(
                AnalysisStep.FETCHING_COMMENTS,
                video_id=video.video_id,
                video_title=video.title,
                video_thumbnail=video.thumbnail_url,
                comments_fetched=len(comments),
                total_comments=video.comment_count
            )
            
            logger.info(f"[{job.analysis_id}] Fetched {len(comments)} comments")
            
            if len(comments) < 5:
                job.update_step(AnalysisStep.FAILED, error="Not enough comments (minimum 5)")
                return AnalysisResponse(
                    analysis_id=job.analysis_id,
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
            if include_sentiment:
                job.update_step(AnalysisStep.ANALYZING_SENTIMENT)
                logger.info(f"[{job.analysis_id}] Analyzing sentiment...")
                sentiment_result = await self._analyze_sentiment(comments, video)
            
            # Step 3: Classification
            if include_classification:
                job.update_step(AnalysisStep.CLASSIFYING)
                logger.info(f"[{job.analysis_id}] Classifying comments...")
                classification_result = await self._classify_comments(comments, video)
            
            # Step 4: Extract Insights
            if include_insights:
                job.update_step(AnalysisStep.EXTRACTING_INSIGHTS)
                logger.info(f"[{job.analysis_id}] Extracting insights...")
                insights_result = await self._extract_insights(comments, video)
            
            # Step 5: Generate Summary
            if include_summary and sentiment_result and classification_result:
                job.update_step(AnalysisStep.GENERATING_SUMMARY)
                logger.info(f"[{job.analysis_id}] Generating summary...")
                summary_result = await self._generate_summary(
                    video, len(comments), sentiment_result, classification_result, insights_result
                )
            
            # Build stored comments
            stored_comments = self._build_stored_comments(
                comments, sentiment_result, classification_result
            )
            
            # Step 6: Save results
            job.update_step(AnalysisStep.SAVING)
            
            response = AnalysisResponse(
                analysis_id=job.analysis_id,
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
            
            # Store in Firestore
            await self._store_analysis(job.user_id, response)
            
            # Mark as complete
            job.update_step(AnalysisStep.COMPLETED)
            logger.info(f"[{job.analysis_id}] Analysis complete!")
            
            return response
            
        except Exception as e:
            logger.error(f"[{job.analysis_id}] Analysis failed: {str(e)}")
            job.update_step(AnalysisStep.FAILED, error=str(e))
            return self._create_failed_response(job.analysis_id, created_at, str(e))
    
    def _create_failed_response(
        self, analysis_id: str, created_at: datetime, error: str
    ) -> AnalysisResponse:
        """Create a failed analysis response"""
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
            error=error
        )
    
    async def _store_analysis(self, user_id: str, analysis: AnalysisResponse):
        """Store analysis result in Firestore"""
        try:
            db = get_firestore()
            
            # Convert to dict
            analysis_dict = analysis.model_dump(mode="json")
            analysis_dict["user_id"] = user_id
            analysis_dict["stored_at"] = SERVER_TIMESTAMP
            
            # Store in analyses collection
            db.collection("analyses").document(analysis.analysis_id).set(analysis_dict)
            
            # Add to user's analysis history
            db.collection("users").document(user_id).collection("analyses").document(
                analysis.analysis_id
            ).set({
                "analysis_id": analysis.analysis_id,
                "video_id": analysis.video.video_id,
                "video_title": analysis.video.title,
                "video_thumbnail": analysis.video.thumbnail_url,
                "channel_title": analysis.video.channel_title,
                "status": analysis.status.value,
                "created_at": analysis_dict["created_at"],
                "completed_at": analysis_dict.get("completed_at"),
                "comments_analyzed": analysis.comments_analyzed,
                "sentiment_summary": {
                    "positive": analysis.sentiment.summary.positive_percentage if analysis.sentiment else 0,
                    "negative": analysis.sentiment.summary.negative_percentage if analysis.sentiment else 0,
                    "neutral": analysis.sentiment.summary.neutral_percentage if analysis.sentiment else 0,
                } if analysis.sentiment else None
            })
            
            # Increment user usage
            user_ref = db.collection("users").document(user_id)
            user_doc = user_ref.get()
            if user_doc.exists:
                current_usage = user_doc.to_dict().get("usage", {})
                videos_analyzed = current_usage.get("videosAnalyzedThisMonth", 0) + 1
                user_ref.update({
                    "usage.videosAnalyzedThisMonth": videos_analyzed,
                    "updatedAt": SERVER_TIMESTAMP
                })
            
            logger.info(f"Stored analysis {analysis.analysis_id} for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to store analysis: {e}")
            # Don't fail the whole analysis if storage fails
    
    def _build_stored_comments(
        self,
        comments: list[Comment],
        sentiment_result: Optional[SentimentResult],
        classification_result: Optional[ClassificationResult]
    ) -> list[StoredComment]:
        """Build stored comments for Ask AI"""
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
                text=comment.text[:1000],
                like_count=comment.like_count,
                reply_count=comment.reply_count,
                sentiment=sentiment_map.get(comment.comment_id),
                category=classification_map.get(comment.comment_id),
                is_question=comment.is_question,
                is_feedback=comment.is_feedback
            ))
        
        return stored
    
    async def _analyze_sentiment(
        self, comments: list[Comment], video: VideoMetadata
    ) -> SentimentResult:
        """Analyze sentiment of comments"""
        all_comment_sentiments = []
        summary = None
        
        for i in range(0, len(comments), BATCH_SIZE):
            batch = comments[i:i + BATCH_SIZE]
            
            prompt = SENTIMENT_ANALYSIS_PROMPT.format(
                video_title=video.title,
                channel_name=video.channel_title,
                comments_json=self._prepare_comments_json(batch)
            )
            
            try:
                result = await self.gemini.generate_json(prompt)
                
                for cs in result.get("comments", []):
                    all_comment_sentiments.append(CommentSentiment(
                        comment_id=cs["comment_id"],
                        sentiment=cs["sentiment"],
                        confidence=cs.get("confidence", 0.8),
                        emotion=cs.get("emotion")
                    ))
                
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
        
        if summary is None:
            if all_comment_sentiments:
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
            else:
                summary = SentimentSummary(
                    positive_percentage=0,
                    negative_percentage=0,
                    neutral_percentage=100,
                    mixed_percentage=0,
                    dominant_sentiment="neutral",
                    top_emotions=[],
                    sentiment_trend=None
                )
        
        return SentimentResult(comments=all_comment_sentiments, summary=summary)
    
    async def _classify_comments(
        self, comments: list[Comment], video: VideoMetadata
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
                    
                    cat = cc["primary_category"]
                    category_counts[cat] = category_counts.get(cat, 0) + 1
            except GeminiError as e:
                logger.warning(f"Classification batch failed: {e}")
                continue
        
        total = len(all_classifications) or 1
        category_percentages = {k: round(v / total * 100, 1) for k, v in category_counts.items()}
        
        actionable_categories = ["question", "suggestion", "request", "feedback"]
        actionable_count = sum(category_counts.get(cat, 0) for cat in actionable_categories)
        
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
        self, comments: list[Comment], video: VideoMetadata
    ) -> InsightsResult:
        """Extract themes, content ideas, and audience insights"""
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
            return InsightsResult(key_themes=[], content_ideas=[], audience_insights=[])
    
    async def _generate_summary(
        self,
        video: VideoMetadata,
        comments_count: int,
        sentiment: SentimentResult,
        classification: ClassificationResult,
        insights: Optional[InsightsResult]
    ) -> ExecutiveSummary:
        """Generate executive summary"""
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
                key_metrics={"comments_analyzed": comments_count},
                priority_actions=[]
            )


# Singleton
_background_service: Optional[BackgroundAnalysisService] = None


def get_background_analysis_service() -> BackgroundAnalysisService:
    """Get or create background analysis service"""
    global _background_service
    if _background_service is None:
        _background_service = BackgroundAnalysisService()
    return _background_service
