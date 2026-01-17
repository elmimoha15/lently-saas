"""
Ask AI Router
Endpoints for the conversational AI feature
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional

from src.ask_ai.service import get_ask_ai_service, AskAIService
from src.ask_ai.schemas import (
    AskQuestionRequest, AskQuestionResponse,
    StartConversationRequest, StartConversationResponse,
    ConversationHistory
)
from src.middleware.auth import get_current_user_with_plan
from src.gemini.exceptions import GeminiError, RateLimitError, ContentFilteredError
from src.billing.service import BillingService
from src.billing.schemas import UsageType

router = APIRouter(prefix="/api/ask", tags=["Ask AI"])


@router.post("/question", response_model=AskQuestionResponse)
async def ask_question(
    request: AskQuestionRequest,
    user_data: dict = Depends(get_current_user_with_plan),
    ask_ai: AskAIService = Depends(get_ask_ai_service)
):
    """
    Ask a question about a video's comments
    
    This endpoint allows creators to have a conversation about their video's
    comments. The AI will analyze the comments and provide insights based
    on the question.
    
    **Features:**
    - Context-aware answers based on actual comment data
    - Follow-up questions for deeper exploration
    - Source citations showing which comments informed the answer
    - Conversation history for follow-up questions
    
    **Context Filters:**
    - `all`: Consider all comments
    - `positive`: Focus on positive comments only
    - `negative`: Focus on negative comments only
    - `questions`: Focus on questions from viewers
    - `feedback`: Focus on feedback and suggestions
    
    **Rate Limits by Plan:**
    - Free: 9 questions total/month
    - Starter: 60 questions per month
    - Pro: 150 questions per month
    - Business: 500 questions per month
    
    **Example Questions:**
    - "What are viewers asking about most?"
    - "Why are some viewers unhappy?"
    - "What video ideas can I get from these comments?"
    - "How do viewers feel about the tutorial pacing?"
    """
    user_id = user_data["uid"]
    user_plan = user_data.get("plan", "free")
    
    # Check question quota using billing service (single source of truth)
    billing = BillingService()
    quota_check = await billing.check_quota(user_id, UsageType.AI_QUESTIONS, 1)
    
    if not quota_check.allowed:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "quota_exceeded",
                "message": f"You've used all {quota_check.limit} AI questions this month",
                "current": quota_check.current,
                "limit": quota_check.limit,
                "action": "upgrade"
            }
        )
    
    try:
        response = await ask_ai.ask_question(
            request=request,
            user_id=user_id,
            user_plan=user_plan
        )
        
        # Increment usage after successful question
        await billing.increment_usage(user_id, UsageType.AI_QUESTIONS, 1)
        
        return response
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ContentFilteredError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your question could not be processed. Please rephrase it."
        )
    except RateLimitError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI is temporarily busy. Please try again in a moment."
        )
    except GeminiError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI error: {e.message}"
        )


@router.get("/conversations")
async def get_conversations(
    limit: int = 10,
    user_data: dict = Depends(get_current_user_with_plan),
    ask_ai: AskAIService = Depends(get_ask_ai_service)
):
    """
    Get user's recent conversations
    
    Returns a list of the user's past conversations with basic info.
    """
    user_id = user_data["uid"]
    
    conversations = await ask_ai.get_user_conversations(
        user_id=user_id,
        limit=limit
    )
    
    return {
        "conversations": conversations,
        "count": len(conversations)
    }


@router.get("/conversation/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    user_data: dict = Depends(get_current_user_with_plan),
    ask_ai: AskAIService = Depends(get_ask_ai_service)
):
    """
    Get a specific conversation's full history
    
    Returns all messages in the conversation.
    """
    user_id = user_data["uid"]
    
    conversation = await ask_ai.get_conversation_history(
        conversation_id=conversation_id,
        user_id=user_id
    )
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return {
        "conversation_id": conversation.conversation_id,
        "video_id": conversation.video_id,
        "messages": [
            {
                "role": m.role.value,
                "content": m.content,
                "timestamp": m.timestamp.isoformat()
            }
            for m in conversation.messages
        ],
        "question_count": conversation.question_count,
        "created_at": conversation.created_at.isoformat(),
        "updated_at": conversation.updated_at.isoformat()
    }


@router.get("/suggestions/{video_id}")
async def get_question_suggestions(
    video_id: str,
    user_data: dict = Depends(get_current_user_with_plan),
    ask_ai: AskAIService = Depends(get_ask_ai_service)
):
    """
    Get suggested questions for a video
    
    Returns ACTIONABLE questions that creators actually want answered:
    - What video should I make next?
    - What did viewers love/hate?
    - What confused people?
    - Which comments should I reply to?
    
    Questions are prioritized based on the video's analysis data.
    """
    user_id = user_data["uid"]
    
    # Get analysis data to generate suggestions
    analysis_data = await ask_ai._get_analysis_data(video_id, user_id)
    
    if not analysis_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No analysis found for this video. Analyze the video first."
        )
    
    # Start with the most valuable question - what to make next
    suggestions = ["What video should I make next based on these comments?"]
    
    # Get analysis insights
    sentiment = analysis_data.get("sentiment", {}).get("summary", {})
    classification = analysis_data.get("classification", {}).get("summary", {})
    category_counts = classification.get("category_counts", {})
    
    # Add questions based on what the data shows
    
    # If there are questions from viewers - this is high-value
    question_count = category_counts.get("question", 0)
    if question_count > 3:
        suggestions.append(f"What questions could I turn into a video? ({question_count} viewer questions found)")
    
    # If there's negative feedback - creators need to know
    negative_pct = sentiment.get("negative_percentage", 0)
    if negative_pct > 15:
        suggestions.append("What confused or frustrated viewers?")
        suggestions.append("What should I do differently next time?")
    
    # If positive - help them understand what worked
    positive_pct = sentiment.get("positive_percentage", 0)
    if positive_pct > 40:
        suggestions.append("What did viewers love that I should keep doing?")
    
    # If there are suggestions/requests - content gold
    suggestion_count = category_counts.get("suggestion", 0) + category_counts.get("request", 0)
    if suggestion_count > 3:
        suggestions.append(f"What topics are viewers requesting? ({suggestion_count} suggestions found)")
    
    # Always useful - engagement
    suggestions.append("Which comments should I reply to?")
    
    # Add based on themes if available
    insights = analysis_data.get("insights", {})
    themes = insights.get("key_themes", [])
    if themes and len(themes) > 0:
        top_theme = themes[0].get("theme", "") if isinstance(themes[0], dict) else str(themes[0])
        if top_theme:
            suggestions.append(f"What are viewers saying about {top_theme}?")
    
    # Ensure we have enough suggestions
    fallback_questions = [
        "What does my audience care about most?",
        "What assumptions did I make that confused people?",
        "Who is watching this video?",
    ]
    
    for q in fallback_questions:
        if len(suggestions) < 6 and q not in suggestions:
            suggestions.append(q)
    
    # Deduplicate and limit to 6 (optimal for UI)
    unique_suggestions = list(dict.fromkeys(suggestions))[:6]
    
    return {
        "video_id": video_id,
        "suggestions": unique_suggestions,
        "analysis_summary": {
            "comments_analyzed": analysis_data.get("comments_analyzed", 0),
            "positive_percentage": positive_pct,
            "negative_percentage": negative_pct,
            "questions_found": question_count,
            "suggestions_found": suggestion_count
        }
    }


@router.get("/quota")
async def get_question_quota(
    user_data: dict = Depends(get_current_user_with_plan)
):
    """
    Get user's question quota status
    
    Returns how many questions the user has used and their limit.
    """
    usage = user_data.get("usage", {})
    
    return {
        "questions_used": usage.get("questionsUsed", 0),
        "questions_limit": usage.get("questionsLimit", 9),
        "questions_remaining": max(
            0, 
            usage.get("questionsLimit", 9) - usage.get("questionsUsed", 0)
        ),
        "plan": user_data.get("plan", "free")
    }
