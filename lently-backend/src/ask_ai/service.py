"""
Ask AI Service
Handles conversational AI for answering creator questions about their comments
"""

import json
import logging
import uuid
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
    """
    
    def __init__(self, gemini: GeminiClient = None):
        self.gemini = gemini or get_gemini_client()
        self.db = get_firestore()
    
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
        
        # Build the prompt with context filter for focused answers
        prompt = self._build_prompt(
            question=request.question,
            context=context,
            comments=relevant_comments,
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
        
        # Update conversation history
        conversation.messages.append(ConversationMessage(
            role=MessageRole.USER,
            content=request.question
        ))
        conversation.messages.append(ConversationMessage(
            role=MessageRole.ASSISTANT,
            content=answer
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
        
        Filters based on context_filter and returns formatted comments
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
        
        relevant_comments = []
        
        for comment in stored_comments:
            sentiment = comment.get("sentiment", "neutral")
            category = comment.get("category", "other")
            is_question = comment.get("is_question", False)
            is_feedback = comment.get("is_feedback", False)
            
            # Apply filter
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
    
    def _build_prompt(
        self,
        question: str,
        context: ConversationContext,
        comments: list[dict],
        conversation_history: list[ConversationMessage],
        context_filter: ContextFilter = ContextFilter.ALL
    ) -> str:
        """Build the complete prompt for Gemini"""
        # Format conversation history
        history_text = ""
        if conversation_history:
            history_text = "\n## PREVIOUS CONVERSATION\n"
            for msg in conversation_history[-6:]:  # Last 6 messages (3 exchanges)
                role = "Creator" if msg.role == MessageRole.USER else "Lently AI"
                history_text += f"{role}: {msg.content}\n"
        
        # Format comments
        comments_json = json.dumps(comments[:MAX_COMMENTS_IN_PROMPT], indent=2)
        
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
                result.append({
                    "conversation_id": data.get("conversation_id"),
                    "video_id": data.get("video_id"),
                    "question_count": data.get("question_count", 0),
                    "created_at": data.get("created_at"),
                    "updated_at": data.get("updated_at"),
                    "last_message": data.get("messages", [{}])[-1].get("content", "")[:100] if data.get("messages") else ""
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching conversations: {e}")
            return []


# Singleton
_ask_ai_service: Optional[AskAIService] = None


def get_ask_ai_service() -> AskAIService:
    """Get or create Ask AI service singleton"""
    global _ask_ai_service
    if _ask_ai_service is None:
        _ask_ai_service = AskAIService()
    return _ask_ai_service
