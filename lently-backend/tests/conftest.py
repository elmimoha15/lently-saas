"""
Pytest Configuration and Shared Fixtures
=========================================

Provides reusable fixtures for all tests.
"""

import pytest
import asyncio
from typing import Generator, AsyncGenerator
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta

# FastAPI test client
from fastapi.testclient import TestClient
from httpx import AsyncClient

from src.main import app
from src.config import get_settings


# ============================================================================
# Session Fixtures
# ============================================================================

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def test_settings():
    """Override settings for testing"""
    settings = get_settings()
    settings.environment = "test"
    settings.pubsub_enabled = False  # Disable Pub/Sub in tests
    return settings


# ============================================================================
# Test Client Fixtures
# ============================================================================

@pytest.fixture
def client() -> Generator:
    """Synchronous test client"""
    with TestClient(app) as c:
        yield c


@pytest.fixture
async def async_client() -> AsyncGenerator:
    """Async test client for testing async endpoints"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


# ============================================================================
# Mock Firebase Fixtures
# ============================================================================

@pytest.fixture
def mock_firestore():
    """Mock Firestore client"""
    with patch("src.firebase_init.get_firestore") as mock:
        mock_db = Mock()
        
        # Mock collection/document methods
        mock_collection = Mock()
        mock_document = Mock()
        mock_ref = Mock()
        
        # Set up return values
        mock_db.collection.return_value = mock_collection
        mock_collection.document.return_value = mock_document
        mock_document.get = AsyncMock(return_value=Mock(exists=True, to_dict=lambda: {}))
        mock_document.set = AsyncMock()
        mock_document.update = AsyncMock()
        mock_document.delete = AsyncMock()
        
        mock.return_value = mock_db
        yield mock_db


@pytest.fixture
def mock_firebase_auth():
    """Mock Firebase Auth verification"""
    with patch("firebase_admin.auth.verify_id_token") as mock:
        mock.return_value = {
            "uid": "test_user_123",
            "email": "test@example.com",
            "name": "Test User"
        }
        yield mock


# ============================================================================
# Test User Fixtures
# ============================================================================

@pytest.fixture
def test_user():
    """Test user data"""
    return {
        "uid": "test_user_123",
        "email": "test@example.com",
        "display_name": "Test User",
        "plan": "free"
    }


@pytest.fixture
def test_user_pro():
    """Test user with Pro plan"""
    return {
        "uid": "test_user_pro_456",
        "email": "pro@example.com",
        "display_name": "Pro User",
        "plan": "pro"
    }


@pytest.fixture
def test_auth_token():
    """Mock JWT token for testing"""
    return "mock_jwt_token_for_testing"


@pytest.fixture
def auth_headers(test_auth_token):
    """Authentication headers for requests"""
    return {
        "Authorization": f"Bearer {test_auth_token}"
    }


# ============================================================================
# Mock Service Fixtures
# ============================================================================

@pytest.fixture
def mock_youtube_service():
    """Mock YouTube service"""
    with patch("src.youtube.service.YouTubeService") as mock:
        instance = mock.return_value
        
        # Mock fetch_comments
        instance.fetch_comments = AsyncMock(return_value={
            "video": {
                "video_id": "test123",
                "title": "Test Video",
                "channel_title": "Test Channel",
                "view_count": 1000,
                "comment_count": 50
            },
            "comments": [
                {
                    "comment_id": "comment1",
                    "author": "User1",
                    "text": "Great video!",
                    "like_count": 10
                }
            ]
        })
        
        yield instance


@pytest.fixture
def mock_gemini_client():
    """Mock Gemini AI client"""
    with patch("src.gemini.client.GeminiClient") as mock:
        instance = mock.return_value
        
        # Mock generate method
        instance.generate = AsyncMock(return_value={
            "result": "This is a test response from Gemini"
        })
        
        # Mock structured generation
        instance.generate_structured = AsyncMock(return_value={
            "sentiment": "positive",
            "confidence": 0.95
        })
        
        yield instance


@pytest.fixture
def mock_redis_client():
    """Mock Redis client"""
    with patch("src.cache.client.RedisClient") as mock:
        instance = mock.return_value
        instance.enabled = True
        instance.get = AsyncMock(return_value=None)  # Cache miss by default
        instance.set = AsyncMock(return_value=True)
        instance.delete = AsyncMock(return_value=True)
        instance.delete_pattern = AsyncMock(return_value=5)
        instance.exists = AsyncMock(return_value=False)
        
        yield instance


@pytest.fixture
def mock_billing_service():
    """Mock Billing service"""
    with patch("src.billing.service.BillingService") as mock:
        instance = mock.return_value
        
        # Mock check_quota
        instance.check_quota = AsyncMock(return_value={
            "allowed": True,
            "current": 2,
            "limit": 10,
            "remaining": 8
        })
        
        # Mock increment_usage
        instance.increment_usage = AsyncMock()
        
        # Mock get_user_usage
        instance.get_user_usage = AsyncMock(return_value={
            "videos_analyzed": 2,
            "videos_limit": 10,
            "ai_questions_used": 5,
            "ai_questions_limit": 30
        })
        
        yield instance


# ============================================================================
# Test Data Fixtures
# ============================================================================

@pytest.fixture
def sample_video_metadata():
    """Sample YouTube video metadata"""
    return {
        "video_id": "test_video_123",
        "title": "Test Video Title",
        "description": "Test video description",
        "channel_title": "Test Channel",
        "channel_id": "UC_test_channel",
        "published_at": datetime.utcnow().isoformat(),
        "view_count": 10000,
        "like_count": 500,
        "comment_count": 150,
        "thumbnail_url": "https://i.ytimg.com/vi/test_video_123/default.jpg"
    }


@pytest.fixture
def sample_comments():
    """Sample YouTube comments"""
    return [
        {
            "comment_id": "comment_1",
            "author": "User One",
            "text": "This is an amazing tutorial! Could you make one about advanced topics?",
            "like_count": 25,
            "reply_count": 3,
            "published_at": datetime.utcnow().isoformat()
        },
        {
            "comment_id": "comment_2",
            "author": "User Two",
            "text": "I disagree with your approach. There's a better way to do this.",
            "like_count": 10,
            "reply_count": 5,
            "published_at": datetime.utcnow().isoformat()
        },
        {
            "comment_id": "comment_3",
            "author": "User Three",
            "text": "Thanks for sharing! This helped me a lot.",
            "like_count": 15,
            "reply_count": 0,
            "published_at": datetime.utcnow().isoformat()
        }
    ]


@pytest.fixture
def sample_analysis_result():
    """Sample complete analysis result"""
    return {
        "analysis_id": "analysis_123",
        "video": {
            "video_id": "test_video_123",
            "title": "Test Video",
            "channel_title": "Test Channel"
        },
        "status": "completed",
        "comments_analyzed": 50,
        "sentiment": {
            "summary": {
                "positive_percentage": 70.0,
                "negative_percentage": 15.0,
                "neutral_percentage": 15.0,
                "dominant_sentiment": "positive"
            }
        },
        "classification": {
            "summary": {
                "category_counts": {
                    "question": 10,
                    "appreciation": 25,
                    "feedback": 8
                }
            }
        },
        "insights": {
            "key_themes": [
                {
                    "theme": "Tutorial Quality",
                    "frequency": 15,
                    "sentiment": "positive"
                }
            ]
        }
    }


@pytest.fixture
def sample_usage_data():
    """Sample usage data"""
    return {
        "videos_analyzed": 5,
        "videos_limit": 10,
        "comments_analyzed": 437,
        "comments_limit": 3000,
        "ai_questions_used": 12,
        "ai_questions_limit": 30,
        "period_start": datetime.utcnow() - timedelta(days=15),
        "period_end": datetime.utcnow() + timedelta(days=15)
    }


# ============================================================================
# Cleanup Fixtures
# ============================================================================

@pytest.fixture(autouse=True)
def reset_mocks():
    """Reset all mocks after each test"""
    yield
    # Cleanup happens automatically with patch context managers


# ============================================================================
# Parametrize Helpers
# ============================================================================

# Subscription plans for parametrized tests
SUBSCRIPTION_PLANS = ["free", "starter", "pro", "business"]

# Video IDs for parametrized tests
SAMPLE_VIDEO_IDS = [
    "dQw4w9WgXcQ",
    "jNQXAC9IVRw",
    "9bZkp7q19f0"
]
