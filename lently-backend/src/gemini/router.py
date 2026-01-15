"""
Gemini AI Router - Test endpoints for AI functionality
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from src.gemini.client import get_gemini_client, GeminiClient
from src.gemini.exceptions import (
    GeminiError, ContentFilteredError, RateLimitError
)
from src.gemini.prompts.replies import REPLY_GENERATION_PROMPT, TONE_DESCRIPTIONS, CTA_INSTRUCTIONS
from src.gemini.schemas import (
    GenerateReplyRequest, GenerateReplyResponse, GeneratedReply, ReplyTone
)
from src.middleware.auth import get_current_user
from src.middleware.schemas import UserResponse

router = APIRouter(prefix="/api/ai", tags=["AI"])


class TestPromptRequest(BaseModel):
    """Test prompt request"""
    prompt: str = Field(..., min_length=5, max_length=2000)


class TestPromptResponse(BaseModel):
    """Test prompt response"""
    response: str
    token_estimate: int


@router.post("/test", response_model=TestPromptResponse)
async def test_ai(
    request: TestPromptRequest,
    current_user: UserResponse = Depends(get_current_user),
    gemini: GeminiClient = Depends(get_gemini_client)
):
    """
    Test the Gemini AI integration
    
    Send a simple prompt and get a response.
    For development/testing only.
    """
    try:
        response = await gemini.generate(request.prompt)
        token_count = await gemini.count_tokens(request.prompt + response)
        
        return TestPromptResponse(
            response=response,
            token_estimate=token_count
        )
        
    except ContentFilteredError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content was filtered: {e.message}"
        )
    except RateLimitError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI rate limit exceeded. Please try again later."
        )
    except GeminiError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI error: {e.message}"
        )


@router.post("/generate-reply", response_model=GenerateReplyResponse)
async def generate_reply(
    request: GenerateReplyRequest,
    current_user: UserResponse = Depends(get_current_user),
    gemini: GeminiClient = Depends(get_gemini_client)
):
    """
    Generate reply options for a YouTube comment
    
    Provide the comment text, author, and desired tone.
    Returns 3 reply variations.
    """
    try:
        # Build the prompt
        prompt = REPLY_GENERATION_PROMPT.format(
            video_title="Sample Video",  # Would come from actual context
            channel_name=current_user.display_name or "Creator",
            comment_author=request.comment_author,
            comment_text=request.comment_text,
            like_count=0,
            tone_description=TONE_DESCRIPTIONS.get(request.tone.value, "Friendly and warm"),
            max_length=request.max_length,
            cta_instruction=CTA_INSTRUCTIONS.get(request.include_cta, CTA_INSTRUCTIONS[False]),
            tone=request.tone.value
        )
        
        result = await gemini.generate_json(prompt)
        
        # Parse replies
        replies = []
        for r in result.get("replies", []):
            replies.append(GeneratedReply(
                text=r["text"],
                tone=request.tone,
                word_count=len(r["text"].split()),
                has_cta=r.get("has_cta", request.include_cta)
            ))
        
        return GenerateReplyResponse(
            original_comment=request.comment_text,
            replies=replies
        )
        
    except ContentFilteredError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment content could not be processed safely"
        )
    except RateLimitError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI rate limit exceeded. Please try again later."
        )
    except GeminiError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI error: {e.message}"
        )


@router.get("/health")
async def ai_health():
    """Check if Gemini AI is configured and working"""
    try:
        gemini = get_gemini_client()
        # Quick test
        response = await gemini.generate("Reply with only the word 'OK'")
        return {
            "status": "healthy",
            "model": "gemini-2.0-flash-lite",
            "test_response": response[:50]
        }
    except ValueError as e:
        return {
            "status": "not_configured",
            "error": str(e)
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }
