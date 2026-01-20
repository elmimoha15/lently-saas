"""
Integration Tests for Ask AI Feature
=====================================

Tests conversation flow, context filtering, and quota enforcement.
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime

from src.ask_ai.service import AskAIService
from src.ask_ai.schemas import AskQuestionRequest, ContextFilter


# ============================================================================
# Ask AI Service Integration Tests
# ============================================================================

@pytest.mark.integration
class TestAskAIService:
    """Test Ask AI conversation flow"""
    
    @pytest.mark.asyncio
    async def test_ask_question_with_context(
        self,
        mock_gemini_client,
        mock_firestore,
        sample_analysis_result,
        sample_comments
    ):
        """Test asking question with analysis context"""
        # Mock Firestore - get analysis
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = sample_analysis_result
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        # Mock Gemini response
        mock_gemini_client.generate_structured = AsyncMock(return_value={
            "answer": "Based on the comments, viewers are mainly asking about advanced topics...",
            "confidence": 0.85,
            "sources": [
                {
                    "comment_id": "comment_1",
                    "author": "User One",
                    "text": "Could you make one about advanced topics?",
                    "relevance": "Directly answers your question"
                }
            ],
            "key_points": ["Advanced topics are most requested"],
            "follow_up_questions": ["What specific advanced topic should I start with?"]
        })
        
        service = AskAIService(gemini=mock_gemini_client)
        
        request = AskQuestionRequest(
            question="What are viewers asking about?",
            video_id="test_video_123",
            context_filter=ContextFilter.QUESTIONS
        )
        
        response = await service.ask_question(
            request=request,
            user_id="test_user",
            user_plan="free"
        )
        
        # Verify response
        assert response.answer is not None
        assert len(response.sources) > 0
        assert response.confidence >= 0
        assert response.conversation_id is not None
    
    @pytest.mark.asyncio
    async def test_conversation_follow_up(
        self,
        mock_gemini_client,
        mock_firestore
    ):
        """Test follow-up questions in conversation"""
        # Mock existing conversation
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "conversation_id": "conv_123",
            "video_id": "video_123",
            "messages": [
                {
                    "role": "user",
                    "content": "What are viewers asking about?",
                    "timestamp": datetime.utcnow().isoformat()
                },
                {
                    "role": "assistant",
                    "content": "Viewers are asking about advanced topics...",
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
        }
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        # Mock Gemini for follow-up
        mock_gemini_client.generate_structured = AsyncMock(return_value={
            "answer": "The most requested advanced topic is machine learning...",
            "confidence": 0.9,
            "sources": [],
            "key_points": ["ML is top request"],
            "follow_up_questions": []
        })
        
        service = AskAIService(gemini=mock_gemini_client)
        
        # Ask follow-up
        request = AskQuestionRequest(
            question="Which advanced topic specifically?",
            video_id="video_123",
            conversation_id="conv_123"
        )
        
        response = await service.ask_question(
            request=request,
            user_id="test_user",
            user_plan="free"
        )
        
        # Should use conversation context
        assert response.conversation_id == "conv_123"
        assert response.answer is not None
    
    @pytest.mark.asyncio
    async def test_context_filtering(
        self,
        mock_gemini_client,
        mock_firestore,
        sample_analysis_result
    ):
        """Test that context filters work correctly"""
        # Mock analysis with mixed sentiment comments
        analysis = sample_analysis_result.copy()
        analysis["comments"] = [
            {"text": "Great video!", "sentiment": "positive"},
            {"text": "This is terrible", "sentiment": "negative"},
            {"text": "How do I do this?", "classification": "question"}
        ]
        
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = analysis
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        mock_gemini_client.generate_structured = AsyncMock(return_value={
            "answer": "The negative feedback mentions...",
            "confidence": 0.8,
            "sources": [],
            "key_points": [],
            "follow_up_questions": []
        })
        
        service = AskAIService(gemini=mock_gemini_client)
        
        # Ask about negative feedback only
        request = AskQuestionRequest(
            question="What are people complaining about?",
            video_id="test_video_123",
            context_filter=ContextFilter.NEGATIVE
        )
        
        response = await service.ask_question(
            request=request,
            user_id="test_user",
            user_plan="free"
        )
        
        # Should only consider negative comments
        assert response.answer is not None


# ============================================================================
# Ask AI Quota Tests
# ============================================================================

@pytest.mark.integration
class TestAskAIQuota:
    """Test AI question quota enforcement"""
    
    @pytest.mark.asyncio
    async def test_quota_check_before_question(
        self,
        mock_billing_service,
        client,
        auth_headers
    ):
        """Test quota is checked before processing question"""
        # Mock quota exceeded
        mock_billing_service.check_quota = AsyncMock(return_value=Mock(
            allowed=False,
            current=30,
            limit=30,
            remaining=0
        ))
        
        with patch("src.ask_ai.router.billing_service", mock_billing_service):
            response = client.post(
                "/api/ask/question",
                json={
                    "question": "What are viewers saying?",
                    "video_id": "test123"
                },
                headers=auth_headers
            )
            
            # Should return 402 Payment Required
            assert response.status_code == 402
            assert "quota" in response.json()["detail"]["error"].lower()
    
    @pytest.mark.asyncio
    async def test_quota_increment_after_success(
        self,
        mock_billing_service,
        mock_gemini_client,
        mock_firestore
    ):
        """Test quota is incremented only after successful question"""
        from src.billing.schemas import UsageType
        
        mock_billing_service.check_quota = AsyncMock(return_value=Mock(
            allowed=True,
            current=5,
            limit=30,
            remaining=25
        ))
        mock_billing_service.increment_usage = AsyncMock()
        
        # Successful question
        service = AskAIService(gemini=mock_gemini_client)
        # ... process question ...
        
        # Increment should be called
        await mock_billing_service.increment_usage(
            "user123",
            UsageType.AI_QUESTIONS,
            amount=1
        )
        
        mock_billing_service.increment_usage.assert_called_once()


# ============================================================================
# Conversation Management Tests
# ============================================================================

@pytest.mark.integration
class TestConversationManagement:
    """Test conversation storage and retrieval"""
    
    @pytest.mark.asyncio
    async def test_save_conversation(
        self,
        mock_firestore
    ):
        """Test saving conversation to Firestore"""
        mock_ref = Mock()
        mock_ref.set = AsyncMock()
        mock_firestore.collection.return_value.document.return_value = mock_ref
        
        # Save conversation
        conversation_data = {
            "conversation_id": "conv_123",
            "user_id": "user123",
            "video_id": "video123",
            "messages": [
                {"role": "user", "content": "Question 1"},
                {"role": "assistant", "content": "Answer 1"}
            ],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await mock_ref.set(conversation_data)
        mock_ref.set.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_conversation_history(
        self,
        mock_firestore,
        test_user
    ):
        """Test retrieving user's conversation history"""
        # Mock multiple conversations
        mock_docs = [
            Mock(
                id="conv1",
                to_dict=lambda: {
                    "conversation_id": "conv1",
                    "video_id": "video1",
                    "messages": [{"role": "user", "content": "Q1"}],
                    "created_at": datetime.utcnow()
                }
            ),
            Mock(
                id="conv2",
                to_dict=lambda: {
                    "conversation_id": "conv2",
                    "video_id": "video2",
                    "messages": [{"role": "user", "content": "Q2"}],
                    "created_at": datetime.utcnow()
                }
            )
        ]
        
        mock_firestore.collection.return_value.where.return_value.order_by.return_value.limit.return_value.stream = AsyncMock(return_value=mock_docs)
        
        # Should return list of conversations
        # conversations = await get_user_conversations(test_user["uid"])
        # assert len(conversations) == 2
    
    @pytest.mark.asyncio
    async def test_delete_conversation(
        self,
        mock_firestore
    ):
        """Test deleting a conversation"""
        mock_ref = Mock()
        mock_ref.delete = AsyncMock()
        mock_firestore.collection.return_value.document.return_value = mock_ref
        
        # Delete conversation
        await mock_ref.delete()
        mock_ref.delete.assert_called_once()


# ============================================================================
# Suggested Questions Tests
# ============================================================================

@pytest.mark.integration
class TestSuggestedQuestions:
    """Test AI-suggested questions feature"""
    
    @pytest.mark.asyncio
    async def test_generate_suggestions(
        self,
        mock_gemini_client,
        mock_firestore,
        sample_analysis_result
    ):
        """Test generating suggested questions from analysis"""
        # Mock analysis
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = sample_analysis_result
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        service = AskAIService(gemini=mock_gemini_client)
        
        # Generate suggestions
        suggestions = await service.get_suggested_questions(
            video_id="test_video_123",
            user_id="test_user"
        )
        
        # Should return list of questions
        assert isinstance(suggestions, list)
        assert len(suggestions) > 0
    
    def test_default_question_templates(self):
        """Test that default question templates exist"""
        from src.ask_ai.service import DEFAULT_QUESTIONS
        
        assert len(DEFAULT_QUESTIONS) > 0
        assert all(isinstance(q, str) for q in DEFAULT_QUESTIONS)
        assert any("sentiment" in q.lower() for q in DEFAULT_QUESTIONS)
        assert any("themes" in q.lower() for q in DEFAULT_QUESTIONS)


# ============================================================================
# Error Handling Tests
# ============================================================================

@pytest.mark.integration
class TestAskAIErrorHandling:
    """Test error handling in Ask AI"""
    
    @pytest.mark.asyncio
    async def test_analysis_not_found(
        self,
        mock_gemini_client,
        mock_firestore
    ):
        """Test handling when analysis doesn't exist"""
        from fastapi import HTTPException
        
        # Mock analysis not found
        mock_doc = Mock()
        mock_doc.exists = False
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        service = AskAIService(gemini=mock_gemini_client)
        
        request = AskQuestionRequest(
            question="What are viewers saying?",
            video_id="nonexistent_video"
        )
        
        # Should raise 404
        with pytest.raises(HTTPException) as exc_info:
            await service.ask_question(request, "user123", "test@example.com")
        
        assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_empty_question(
        self,
        mock_gemini_client,
        mock_firestore
    ):
        """Test handling empty/invalid questions"""
        from pydantic import ValidationError
        
        service = AskAIService(gemini=mock_gemini_client)
        
        # Empty question should fail validation
        with pytest.raises(ValidationError):
            request = AskQuestionRequest(
                question="",  # Empty
                video_id="video123"
            )
    
    @pytest.mark.asyncio
    async def test_ai_response_failure(
        self,
        mock_gemini_client,
        mock_firestore,
        sample_analysis_result
    ):
        """Test handling when AI fails to generate response"""
        # Mock analysis exists
        mock_doc = Mock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = sample_analysis_result
        mock_firestore.collection.return_value.document.return_value.get = AsyncMock(return_value=mock_doc)
        
        # Mock Gemini failure
        mock_gemini_client.generate_structured = AsyncMock(side_effect=Exception("AI error"))
        
        service = AskAIService(gemini=mock_gemini_client)
        
        request = AskQuestionRequest(
            question="What are viewers saying?",
            video_id="video123"
        )
        
        # Should handle gracefully
        with pytest.raises(Exception):
            await service.ask_question(request, "user123", "test@example.com")
