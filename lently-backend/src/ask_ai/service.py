"""
Ask AI Service
Handles conversational AI for answering creator questions about their comments
"""

import json
import logging
import uuid
import re
from datetime import datetime
from typing import Optional

from src.firebase_init import get_firestore
from src.gemini.client import get_gemini_client, GeminiClient
from src.gemini.prompts.ask_ai import ASK_AI_PROMPT, ASK_AI_CONTEXT_PROMPTS
from src.gemini.prompts.system import LENTLY_SYSTEM_INSTRUCTION
from src.gemini.exceptions import GeminiError
from src.ask_ai.schemas import (
    AskQuestionRequest, AskQuestionResponse,
    ConversationContext, ConversationMessage, ConversationHistory,
    SourceComment, ContextFilter, MessageRole
)

logger = logging.getLogger(__name__)

# Maximum messages to include in conversation context
MAX_CONVERSATION_HISTORY = 10

# Maximum comments to include in prompt
MAX_COMMENTS_IN_PROMPT = 50


class AskAIService:
    """
    Service for the Ask AI feature
    
    Allows creators to have a conversation about their video's comments.
    Maintains conversation history and provides contextual answers.
    Filters out spam and low-value comments automatically.
    """
    
    def __init__(self, gemini: GeminiClient = None):
        self.gemini = gemini or get_gemini_client()
        self.db = get_firestore()
    
    def _anonymize_usernames(self, text: str) -> str:
        """
        Remove YouTube usernames from text and replace with anonymous references.
        
        Replaces patterns like:
        - @username -> "a viewer"
        - @JohnDoe123 -> "someone"
        - Multiple @mentions in a list -> "several viewers"
        
        Args:
            text: The text to anonymize
            
        Returns:
            Text with usernames removed
        """
        # Count username mentions
        username_pattern = r'@[A-Za-z0-9_-]+'
        usernames = re.findall(username_pattern, text)
        
        if not usernames:
            return text
        
        # Replace each unique username
        anonymized = text
        for username in set(usernames):
            # Replace with generic reference
            anonymized = re.sub(
                re.escape(username) + r'(?=[,\s\.\?!]|$)',
                "a viewer",
                anonymized
            )
        
        return anonymized
    
    def _filter_spam_and_low_value(self, comments: list[dict]) -> list[dict]:
        """
        Remove comments that don't provide strategic value.
        
        ALWAYS IGNORE:
        - Generic praise ("great video!", "nice!", "first!")
        - Obvious spam/bots
        - Promotional spam
        - Pure trolling with no feedback
        
        ALWAYS KEEP:
        - Specific questions
        - Detailed feedback (positive or negative)
        - Content requests
        - Constructive criticism
        - Timestamp references
        
        Args:
            comments: List of comment dictionaries
            
        Returns:
            Filtered list of valuable comments
        """
        spam_patterns = [
            r"^(first|second|third)!?$",
            r"^(nice|great|awesome|amazing|good|love) video!?$",
            r"^(love it|loved this|nice one)!?$",
            r"(check out my channel|subscribe to me|sub[s]? to my)",
            r"^[❤️🔥👍💯✨🙏😍😊👌💪🎉]+$",  # Only emojis
            r"^\d+$",  # Only numbers
        ]
        
        min_word_count = 5  # Comments must have substance
        
        valuable = []
        for comment in comments:
            text = comment.get("text", "").strip()
            text_lower = text.lower()
            
            # Skip if too short
            if len(text.split()) < min_word_count:
                continue
            
            # Skip if matches spam patterns
            is_spam = any(re.match(pattern, text_lower, re.IGNORECASE) for pattern in spam_patterns)
            if is_spam:
                continue
            
            # Keep comments with substance
            valuable.append(comment)
        
        logger.info(f"Filtered {len(comments)} comments down to {len(valuable)} valuable comments")
        return valuable
    
    def _group_similar_questions(self, comments: list[dict]) -> list[dict]:
        """
        Group similar questions to show demand patterns.
        
        Returns list of question groups with:
        - question_theme: Representative question
        - count: How many times asked
        - examples: Sample questions
        - demand_level: high/medium/low
        
        Args:
            comments: List of comment dictionaries
            
        Returns:
            List of grouped questions sorted by frequency
        """
        # Filter to question-type comments
        questions = []
        for c in comments:
            text = c.get("text", "")
            if c.get("is_question") or "?" in text:
                questions.append(c)
        
        if not questions:
            return []
        
        # Simple keyword-based grouping
        # For better results, could use embeddings or Gemini
        groups = {}
        
        for comment in questions:
            text = comment.get("text", "").lower()
            
            # Extract key topics (simplified approach)
            # Remove common words and extract meaningful keywords
            common_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'how', 'why', 
                          'when', 'where', 'who', 'which', 'do', 'does', 'did', 'can', 'could',
                          'would', 'should', 'your', 'you', 'this', 'that', 'these', 'those'}
            
            words = re.findall(r'\b\w+\b', text)
            keywords = [w for w in words if w not in common_words and len(w) > 3][:5]
            
            # Group by similar keywords (simplified)
            group_key = tuple(sorted(keywords[:3])) if keywords else ("general",)
            
            if group_key not in groups:
                groups[group_key] = {
                    "examples": [],
                    "count": 0,
                    "full_texts": []
                }
            
            groups[group_key]["examples"].append(text[:150])  # Limit length
            groups[group_key]["full_texts"].append(comment.get("text", ""))
            groups[group_key]["count"] += 1
        
        # Format output
        result = []
        for keywords, data in sorted(groups.items(), key=lambda x: x[1]["count"], reverse=True):
            if data["count"] >= 2:  # Minimum 2 similar questions
                result.append({
                    "question_theme": data["full_texts"][0][:200],  # Use first as representative
                    "count": data["count"],
                    "examples": data["examples"][:3],
                    "demand_level": "high" if data["count"] >= 10 else "medium" if data["count"] >= 5 else "low"
                })
        
        return result[:10]  # Top 10 question groups
    
    def _identify_superfans(self, comments: list[dict]) -> list[dict]:
        """
        Identify community members who add value and deserve recognition.
        
        Superfan criteria:
        - Multiple thoughtful comments (not just "nice!")
        - Asks constructive questions
        - Provides detailed feedback
        - High engagement (likes, replies)
        
        Args:
            comments: List of comment dictionaries
            
        Returns:
            List of top superfans with engagement scores
        """
        # Group by author
        author_stats = {}
        
        for comment in comments:
            author = comment.get("author", "Unknown")
            text = comment.get("text", "")
            word_count = len(text.split())
            
            if author == "Unknown" or author == "Viewer":
                continue
            
            if author not in author_stats:
                author_stats[author] = {
                    "author": author,
                    "comment_count": 0,
                    "total_words": 0,
                    "total_likes": 0,
                    "has_questions": False,
                    "has_feedback": False,
                    "comments": []
                }
            
            author_stats[author]["comment_count"] += 1
            author_stats[author]["total_words"] += word_count
            author_stats[author]["total_likes"] += comment.get("like_count", 0)
            author_stats[author]["comments"].append(text[:200])
            
            if "?" in text:
                author_stats[author]["has_questions"] = True
            if comment.get("is_feedback") or comment.get("category") in ["feedback", "suggestion"]:
                author_stats[author]["has_feedback"] = True
        
        # Calculate engagement scores
        superfans = []
        for author, stats in author_stats.items():
            if stats["comment_count"] < 2:  # Must comment at least twice
                continue
            
            # Scoring algorithm
            score = (
                stats["comment_count"] * 10 +  # Multiple comments = engaged
                min(stats["total_words"], 500) / 10 +  # Thoughtful but not spam
                stats["total_likes"] * 2 +  # Community values their input
                (20 if stats["has_questions"] else 0) +  # Asks questions
                (20 if stats["has_feedback"] else 0)  # Provides feedback
            )
            
            superfans.append({
                "author": author,
                "engagement_score": int(score),
                "comment_count": stats["comment_count"],
                "total_likes": stats["total_likes"],
                "latest_comment": stats["comments"][-1],
                "reason": self._get_superfan_reason(stats)
            })
        
        # Sort by engagement score
        superfans.sort(key=lambda x: x["engagement_score"], reverse=True)
        return superfans[:10]  # Top 10
    
    def _get_superfan_reason(self, stats: dict) -> str:
        """Generate reason why this person is a superfan"""
        reasons = []
        if stats["comment_count"] >= 3:
            reasons.append("Frequent commenter")
        if stats["total_likes"] >= 20:
            reasons.append("High community engagement")
        if stats["has_questions"]:
            reasons.append("Asks thoughtful questions")
        if stats["has_feedback"]:
            reasons.append("Provides valuable feedback")
        
        return ", ".join(reasons) if reasons else "Engaged community member"
    
    def _extract_content_requests(self, comments: list[dict]) -> list[dict]:
        """
        Find what viewers want next - video ideas from comment requests.
        
        Patterns detected:
        - "Can you make a video about..."
        - "I'd love to see..."
        - "Please do a tutorial on..."
        - "Next video should be..."
        
        Args:
            comments: List of comment dictionaries
            
        Returns:
            Ranked list of content ideas by demand
        """
        request_patterns = [
            r"make\s+(?:a\s+)?video\s+(?:about|on|for)\s+(.+?)(?:\?|$|\.)",
            r"(?:would|could)\s+you\s+(?:do|make|create)\s+(.+?)(?:\?|$|\.)",
            r"tutorial\s+(?:on|about|for)\s+(.+?)(?:\?|$|\.)",
            r"(?:i'd|i\s+would)\s+love\s+to\s+see\s+(.+?)(?:\?|$|\.)",
            r"please\s+(?:cover|do|make|show)\s+(.+?)(?:\?|$|\.)",
            r"next\s+video\s+(?:should|could)\s+be\s+(?:about\s+)?(.+?)(?:\?|$|\.)",
            r"can\s+you\s+(?:explain|show|teach)\s+(?:us\s+)?(?:how\s+to\s+)?(.+?)(?:\?|$|\.)",
        ]
        
        requests = {}
        request_examples = {}
        
        for comment in comments:
            text = comment.get("text", "")
            text_lower = text.lower()
            
            for pattern in request_patterns:
                matches = re.findall(pattern, text_lower, re.IGNORECASE)
                for match in matches:
                    # Clean up the matched topic
                    topic = match.strip()
                    
                    # Remove trailing punctuation
                    topic = re.sub(r'[.,!?]+$', '', topic)
                    
                    # Skip if too short or too long
                    if len(topic) < 5 or len(topic) > 100:
                        continue
                    
                    # Normalize similar requests
                    topic_key = topic[:50].lower()
                    
                    if topic_key not in requests:
                        requests[topic_key] = 0
                        request_examples[topic_key] = {
                            "topic": topic[:80],
                            "example_comment": text[:200]
                        }
                    
                    requests[topic_key] += 1
        
        # Format and rank
        result = []
        for topic_key, count in sorted(requests.items(), key=lambda x: x[1], reverse=True):
            info = request_examples[topic_key]
            result.append({
                "topic": info["topic"],
                "demand": count,
                "example_comment": info["example_comment"],
                "priority": "high" if count >= 5 else "medium" if count >= 3 else "low",
                "video_title_suggestion": f"Complete Guide to {info['topic'].title()}"
            })
        
        return result[:10]  # Top 10
    
    def _preprocess_comments_for_strategy(self, comments: list[dict]) -> dict:
        """
        Preprocess comments to extract strategic insights BEFORE sending to AI.
        
        This reduces token usage and makes AI responses more strategic.
        
        Args:
            comments: List of comment dictionaries
            
        Returns:
            Dictionary with grouped insights:
            - valuable_comments: Filtered valuable comments
            - question_groups: Grouped questions with frequency
            - superfans: Top community members
            - content_requests: Video ideas by demand
        """
        # Filter spam first
        valuable_comments = self._filter_spam_and_low_value(comments)
        
        # Extract strategic insights
        question_groups = self._group_similar_questions(valuable_comments)
        superfans = self._identify_superfans(valuable_comments)
        content_requests = self._extract_content_requests(valuable_comments)
        
        logger.info(
            f"Strategic preprocessing: {len(valuable_comments)} valuable comments, "
            f"{len(question_groups)} question groups, "
            f"{len(superfans)} superfans, "
            f"{len(content_requests)} content requests"
        )
        
        return {
            "valuable_comments": valuable_comments,
            "question_groups": question_groups,
            "superfans": superfans,
            "content_requests": content_requests
        }
    
    async def ask_question(
        self,
        request: AskQuestionRequest,
        user_id: str,
        user_plan: str = "free"
    ) -> AskQuestionResponse:
        """
        Answer a question about a video's comments
        
        Args:
            request: The question and context
            user_id: The authenticated user's ID
            user_plan: User's subscription plan
            
        Returns:
            AI response with answer, sources, and follow-ups
        """
        # Get or create conversation
        if request.conversation_id:
            conversation = await self._get_conversation(
                request.conversation_id, 
                user_id
            )
            if not conversation:
                raise ValueError("Conversation not found or access denied")
        else:
            conversation = await self._create_conversation(
                video_id=request.video_id,
                user_id=user_id
            )
        
        # Get video analysis and comments
        analysis_data = await self._get_analysis_data(request.video_id, user_id)
        if not analysis_data:
            raise ValueError(
                "No analysis found for this video. Please analyze the video first."
            )
        
        # Build context from analysis
        context = await self._build_context(
            analysis_data=analysis_data,
            context_filter=request.context_filter
        )
        
        # Get relevant comments for the question
        relevant_comments = await self._get_relevant_comments(
            analysis_data=analysis_data,
            question=request.question,
            context_filter=request.context_filter
        )
        
        # Extract strategic insights from ALL comments (not just relevant ones)
        # This gives the AI richer context for strategic questions
        all_comments = analysis_data.get("comments", [])
        strategic_data = self._preprocess_comments_for_strategy(all_comments)
        
        # Build the prompt with context filter for focused answers
        prompt = self._build_prompt(
            question=request.question,
            context=context,
            comments=relevant_comments,
            strategic_data=strategic_data,
            conversation_history=conversation.messages[-MAX_CONVERSATION_HISTORY:],
            context_filter=request.context_filter
        )
        
        # Get AI response
        try:
            result = await self.gemini.generate_json(
                prompt=prompt,
                system_instruction=LENTLY_SYSTEM_INSTRUCTION
            )
        except GeminiError as e:
            logger.error(f"Gemini error in ask_ai: {e}")
            raise
        
        # Parse response
        answer = result.get("answer", "I couldn't generate an answer. Please try rephrasing your question.")
        confidence = result.get("confidence", 0.7)
        key_points = result.get("key_points", [])
        follow_ups = result.get("follow_up_questions", [])
        
        # Anonymize any usernames that may have slipped through
        answer = self._anonymize_usernames(answer)
        key_points = [self._anonymize_usernames(kp) for kp in key_points]
        
        # Build source comments
        sources = []
        source_ids = result.get("sources", [])
        for comment in relevant_comments[:5]:  # Top 5 most relevant
            if comment.get("id") in source_ids or len(sources) < 3:
                sources.append(SourceComment(
                    comment_id=comment.get("id", ""),
                    author=comment.get("author", "Unknown"),
                    text=comment.get("text", "")[:200],
                    relevance="Directly related to your question"
                ))
        
        # Prepare simplified sources for storage (no complex objects)
        sources_data = [
            {"author": s.author, "text": s.text}
            for s in sources
        ]
        
        # Update conversation history
        conversation.messages.append(ConversationMessage(
            role=MessageRole.USER,
            content=request.question
        ))
        conversation.messages.append(ConversationMessage(
            role=MessageRole.ASSISTANT,
            content=answer,
            key_points=key_points,
            follow_up_questions=follow_ups,
            sources=sources_data
        ))
        conversation.question_count += 1
        conversation.updated_at = datetime.utcnow()
        
        await self._save_conversation(conversation)
        
        # Get remaining quota
        questions_remaining = await self._get_remaining_questions(user_id, user_plan)
        
        # Increment usage
        await self._increment_question_usage(user_id)
        
        return AskQuestionResponse(
            answer=answer,
            confidence=confidence,
            sources=sources,
            key_points=key_points,
            follow_up_questions=follow_ups,
            conversation_id=conversation.conversation_id,
            questions_remaining=questions_remaining - 1
        )
    
    async def _get_analysis_data(
        self, 
        video_id: str, 
        user_id: str
    ) -> Optional[dict]:
        """Get the most recent analysis for a video"""
        try:
            # Query for the user's analysis of this video
            analyses = (
                self.db.collection("analyses")
                .where("user_id", "==", user_id)
                .where("video.video_id", "==", video_id)
                .order_by("created_at", direction="DESCENDING")
                .limit(1)
                .stream()
            )
            
            for doc in analyses:
                return doc.to_dict()
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching analysis: {e}")
            return None
    
    async def _build_context(
        self,
        analysis_data: dict,
        context_filter: ContextFilter
    ) -> ConversationContext:
        """Build conversation context from analysis data"""
        video = analysis_data.get("video", {})
        sentiment = analysis_data.get("sentiment", {})
        classification = analysis_data.get("classification", {})
        insights = analysis_data.get("insights", {})
        
        # Build sentiment summary string
        sentiment_summary = None
        if sentiment and sentiment.get("summary"):
            s = sentiment["summary"]
            sentiment_summary = (
                f"{s.get('dominant_sentiment', 'neutral')} overall "
                f"({s.get('positive_percentage', 0):.0f}% positive, "
                f"{s.get('negative_percentage', 0):.0f}% negative)"
            )
        
        # Get top categories
        top_categories = []
        if classification and classification.get("summary"):
            counts = classification["summary"].get("category_counts", {})
            sorted_cats = sorted(counts.items(), key=lambda x: x[1], reverse=True)
            top_categories = [cat for cat, _ in sorted_cats[:3]]
        
        # Get key themes
        key_themes = []
        if insights and insights.get("key_themes"):
            key_themes = [t.get("theme", "") for t in insights["key_themes"][:5]]
        
        return ConversationContext(
            video_id=video.get("video_id", ""),
            video_title=video.get("title", "Unknown"),
            channel_name=video.get("channel_title", "Unknown"),
            total_comments=video.get("comment_count", 0),
            comments_analyzed=analysis_data.get("comments_analyzed", 0),
            sentiment_summary=sentiment_summary,
            top_categories=top_categories,
            key_themes=key_themes
        )
    
    async def _get_relevant_comments(
        self,
        analysis_data: dict,
        question: str,
        context_filter: ContextFilter
    ) -> list[dict]:
        """
        Get comments most relevant to the question
        
        Filters out spam/low-value comments, then filters based on context_filter
        """
        # Get stored comments from analysis
        stored_comments = analysis_data.get("stored_comments", [])
        
        if not stored_comments:
            # Fallback to using sentiment/classification data
            sentiment_data = analysis_data.get("sentiment", {})
            classification_data = analysis_data.get("classification", {})
            
            sentiment_comments = {
                c.get("comment_id"): c 
                for c in sentiment_data.get("comments", [])
            }
            classification_comments = {
                c.get("comment_id"): c 
                for c in classification_data.get("comments", [])
            }
            
            # Build from classification/sentiment data
            for comment_id, class_data in classification_comments.items():
                sent_data = sentiment_comments.get(comment_id, {})
                stored_comments.append({
                    "comment_id": comment_id,
                    "author": "Viewer",
                    "text": f"Comment about {class_data.get('primary_category', 'topic')}",
                    "sentiment": sent_data.get("sentiment", "neutral"),
                    "category": class_data.get("primary_category", "other"),
                    "is_question": class_data.get("primary_category") == "question",
                    "is_feedback": class_data.get("primary_category") in ["feedback", "suggestion"]
                })
        
        # FIRST: Filter out spam and low-value comments
        stored_comments = self._filter_spam_and_low_value(stored_comments)
        
        relevant_comments = []
        
        for comment in stored_comments:
            sentiment = comment.get("sentiment", "neutral")
            category = comment.get("category", "other")
            is_question = comment.get("is_question", False)
            is_feedback = comment.get("is_feedback", False)
            
            # Apply context filter
            if context_filter == ContextFilter.POSITIVE and sentiment != "positive":
                continue
            elif context_filter == ContextFilter.NEGATIVE and sentiment != "negative":
                continue
            elif context_filter == ContextFilter.QUESTIONS and category != "question" and not is_question:
                continue
            elif context_filter == ContextFilter.FEEDBACK and category not in ["feedback", "suggestion", "criticism"] and not is_feedback:
                continue
            
            relevant_comments.append({
                "id": comment.get("comment_id", ""),
                "author": comment.get("author", "Viewer"),
                "text": comment.get("text", ""),
                "sentiment": sentiment,
                "category": category,
                "likes": comment.get("like_count", 0),
                "is_question": is_question,
                "is_feedback": is_feedback
            })
        
        # Sort by engagement (likes) and limit
        relevant_comments.sort(key=lambda x: x.get("likes", 0), reverse=True)
        
        return relevant_comments[:MAX_COMMENTS_IN_PROMPT]
    
    def _format_strategic_insights(self, strategic_data: dict) -> str:
        """
        Format strategic preprocessing results into readable text for AI.
        
        Args:
            strategic_data: Output from _preprocess_comments_for_strategy()
            
        Returns:
            Formatted string with insights
        """
        insights = []
        
        # Question groups
        question_groups = strategic_data.get("question_groups", [])
        if question_groups:
            insights.append("### POPULAR QUESTIONS (Grouped by Theme)")
            for group in question_groups[:5]:
                insights.append(
                    f"- {group['count']} viewers asked about: \"{group['question_theme']}\""
                )
                if group.get('examples'):
                    insights.append(f"  Examples: {group['examples'][0]}")
        
        # Content requests
        content_requests = strategic_data.get("content_requests", [])
        if content_requests:
            insights.append("\n### VIDEO IDEAS REQUESTED BY VIEWERS")
            for req in content_requests[:5]:
                insights.append(
                    f"- {req['demand']} viewer{'s' if req['demand'] > 1 else ''} "
                    f"requested: \"{req['topic']}\" ({req['priority']} priority)"
                )
        
        # Superfans
        superfans = strategic_data.get("superfans", [])
        if superfans:
            insights.append("\n### TOP COMMUNITY MEMBERS")
            for fan in superfans[:5]:
                insights.append(
                    f"- {fan['author']}: {fan['comment_count']} comments, "
                    f"{fan['total_likes']} likes ({fan['reason']})"
                )
        
        return "\n".join(insights) if insights else ""
    
    def _build_prompt(
        self,
        question: str,
        context: ConversationContext,
        comments: list[dict],
        strategic_data: dict,
        conversation_history: list[ConversationMessage],
        context_filter: ContextFilter = ContextFilter.ALL
    ) -> str:
        """Build the complete prompt for Gemini with strategic insights"""
        # Format conversation history
        history_text = ""
        if conversation_history:
            history_text = "\n## PREVIOUS CONVERSATION\n"
            for msg in conversation_history[-6:]:  # Last 6 messages (3 exchanges)
                role = "Creator" if msg.role == MessageRole.USER else "Lently AI"
                history_text += f"{role}: {msg.content}\n"
        
        # Format comments
        comments_json = json.dumps(comments[:MAX_COMMENTS_IN_PROMPT], indent=2)
        
        # Format strategic insights
        strategic_context = self._format_strategic_insights(strategic_data)
        
        # Build summary strings
        sentiment_summary = context.sentiment_summary or "Not analyzed"
        top_categories = ", ".join(context.top_categories) if context.top_categories else "Not analyzed"
        
        # Get context-specific instructions
        context_instruction = ASK_AI_CONTEXT_PROMPTS.get(
            context_filter.value, 
            ASK_AI_CONTEXT_PROMPTS["all"]
        )
        
        prompt = ASK_AI_PROMPT.format(
            video_title=context.video_title,
            channel_name=context.channel_name,
            total_comments=context.total_comments,
            sentiment_summary=sentiment_summary,
            top_categories=top_categories,
            comments_json=comments_json,
            question=question
        )
        
        # Append strategic insights
        if strategic_context:
            prompt += f"\n\n## STRATEGIC INSIGHTS (Pre-analyzed)\n{strategic_context}"
        
        # Add context filter instruction at the top of the prompt
        prompt = f"{context_instruction}\n\n{prompt}"
        
        if history_text:
            prompt = prompt.replace(
                "## CREATOR'S QUESTION",
                f"{history_text}\n## CREATOR'S QUESTION"
            )
        
        return prompt
    
    async def _get_conversation(
        self,
        conversation_id: str,
        user_id: str
    ) -> Optional[ConversationHistory]:
        """Get an existing conversation"""
        try:
            doc = self.db.collection("conversations").document(conversation_id).get()
            if not doc.exists:
                return None
            
            data = doc.to_dict()
            
            # Verify ownership
            if data.get("user_id") != user_id:
                return None
            
            # Parse messages
            messages = [
                ConversationMessage(
                    role=MessageRole(m["role"]),
                    content=m["content"],
                    timestamp=m.get("timestamp", datetime.utcnow())
                )
                for m in data.get("messages", [])
            ]
            
            return ConversationHistory(
                conversation_id=conversation_id,
                video_id=data.get("video_id", ""),
                user_id=user_id,
                messages=messages,
                created_at=data.get("created_at", datetime.utcnow()),
                updated_at=data.get("updated_at", datetime.utcnow()),
                question_count=data.get("question_count", 0)
            )
            
        except Exception as e:
            logger.error(f"Error fetching conversation: {e}")
            return None
    
    async def _create_conversation(
        self,
        video_id: str,
        user_id: str
    ) -> ConversationHistory:
        """Create a new conversation"""
        conversation_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        return ConversationHistory(
            conversation_id=conversation_id,
            video_id=video_id,
            user_id=user_id,
            messages=[],
            created_at=now,
            updated_at=now,
            question_count=0
        )
    
    async def _save_conversation(self, conversation: ConversationHistory):
        """Save conversation to Firestore"""
        try:
            data = {
                "conversation_id": conversation.conversation_id,
                "video_id": conversation.video_id,
                "user_id": conversation.user_id,
                "messages": [
                    {
                        "role": m.role.value,
                        "content": m.content,
                        "timestamp": m.timestamp
                    }
                    for m in conversation.messages
                ],
                "created_at": conversation.created_at,
                "updated_at": conversation.updated_at,
                "question_count": conversation.question_count
            }
            
            self.db.collection("conversations").document(
                conversation.conversation_id
            ).set(data)
            
        except Exception as e:
            logger.error(f"Error saving conversation: {e}")
    
    async def _get_remaining_questions(
        self,
        user_id: str,
        user_plan: str
    ) -> int:
        """Get remaining question quota for user"""
        try:
            user_doc = self.db.collection("users").document(user_id).get()
            if not user_doc.exists:
                return 0
            
            usage = user_doc.to_dict().get("usage", {})
            used = usage.get("questionsUsed", 0)
            limit = usage.get("questionsLimit", 9)  # Free plan default
            
            return max(0, limit - used)
            
        except Exception as e:
            logger.error(f"Error getting quota: {e}")
            return 0
    
    async def _increment_question_usage(self, user_id: str):
        """Increment question usage count"""
        try:
            user_ref = self.db.collection("users").document(user_id)
            user_doc = user_ref.get()
            
            if user_doc.exists:
                current_usage = user_doc.to_dict().get("usage", {})
                current_questions = current_usage.get("questionsUsed", 0)
                
                user_ref.update({
                    "usage.questionsUsed": current_questions + 1
                })
                
        except Exception as e:
            logger.error(f"Error incrementing usage: {e}")
    
    async def get_conversation_history(
        self,
        conversation_id: str,
        user_id: str
    ) -> Optional[ConversationHistory]:
        """Get full conversation history"""
        return await self._get_conversation(conversation_id, user_id)
    
    async def get_user_conversations(
        self,
        user_id: str,
        limit: int = 10
    ) -> list[dict]:
        """Get user's recent conversations"""
        try:
            conversations = (
                self.db.collection("conversations")
                .where("user_id", "==", user_id)
                .order_by("updated_at", direction="DESCENDING")
                .limit(limit)
                .stream()
            )
            
            result = []
            for doc in conversations:
                data = doc.to_dict()
                messages = data.get("messages", [])
                last_message = messages[-1].get("content", "")[:150] if messages else ""
                
                # Ensure dates are properly serialized
                created_at = data.get("created_at")
                updated_at = data.get("updated_at")
                
                result.append({
                    "conversation_id": data.get("conversation_id"),
                    "video_id": data.get("video_id"),
                    "question_count": data.get("question_count", 0),
                    "created_at": created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at),
                    "updated_at": updated_at.isoformat() if hasattr(updated_at, 'isoformat') else str(updated_at),
                    "last_message": last_message
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching conversations: {e}")
            return []
    
    async def delete_conversation(
        self,
        conversation_id: str,
        user_id: str
    ) -> bool:
        """
        Delete a conversation
        
        Args:
            conversation_id: The conversation to delete
            user_id: The user requesting deletion (for permission check)
            
        Returns:
            True if deleted successfully, False if not found or permission denied
        """
        try:
            # Check if conversation exists and belongs to user
            conversation = await self._get_conversation(conversation_id, user_id)
            if not conversation:
                logger.warning(f"Conversation {conversation_id} not found or doesn't belong to user {user_id}")
                return False
            
            # Delete the conversation document
            self.db.collection("conversations").document(conversation_id).delete()
            logger.info(f"Deleted conversation {conversation_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting conversation {conversation_id}: {e}")
            return False


# Singleton
_ask_ai_service: Optional[AskAIService] = None


def get_ask_ai_service() -> AskAIService:
    """Get or create Ask AI service singleton"""
    global _ask_ai_service
    if _ask_ai_service is None:
        _ask_ai_service = AskAIService()
    return _ask_ai_service
