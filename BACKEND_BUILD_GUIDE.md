# Lently Backend - Complete Build Guide

**Last Updated:** January 14, 2026  
**Architecture:** Unified FastAPI Backend with Firebase Integration  
**Stack:** FastAPI, Firebase Admin SDK, Gemini AI, Paddle Billing

---

## Overview

This guide provides step-by-step instructions to build the Lently backend from scratch. Each phase must be completed, tested, and verified before moving to the next.

### Project Structure
```
/home/elmi/Documents/Projects/Lently/
└── lently-backend/          # Unified FastAPI Backend
    ├── src/                 # Application source code
    ├── .env                 # Environment variables
    ├── requirements.txt     # Python dependencies
    └── main.py             # Application entry point
```

**Architecture:** Single FastAPI application integrating Firebase Auth, Firestore, YouTube API, Gemini AI, and Paddle webhooks.

## Phase 1: Project Setup & Basic Infrastructure

### Objectives
- ✅ Initialize backend project
- ✅ Set up environment variables
- ✅ Configure FastAPI with Firebase Admin SDK
- ✅ Test basic connectivity

### 1.1 Create lently-backend

```bash
cd /home/elmi/Documents/Projects/Lently
# Project already exists, navigate to it
cd lently-backend
```

**Ensure virtual environment is activated:**
```bash
source venv/bin/activate
```

### 1.2 Update requirements.txt with Firebase Admin SDK

**Add Firebase Admin SDK to requirements.txt:**
```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-dotenv==1.0.0
pydantic==2.5.3
pydantic-settings==2.1.0
google-generativeai==0.3.2
google-auth==2.27.0
google-cloud-pubsub==2.19.0
google-cloud-secret-manager==2.18.0
firebase-admin==6.4.0
redis==5.0.1
httpx==0.26.0
python-jose[cryptography]==3.3.0
slowapi==0.1.9
pytest==7.4.4
pytest-asyncio==0.23.3
```

### 1.2 Firebase Setup

**Step 1: Create Firebase Project (if not already created)**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Enable Firestore Database (Native mode)
4. Enable Authentication > Sign-in method > Email/Password

**Step 2: Download Service Account**

1. Go to Project Settings > Service Accounts
2. Click "Generate New Private Key"
3. Save the file as `firebase-service-account.json` in `/home/elmi/Documents/Projects/Lently/lently-backend/`
4. **Important**: Add this file to `.gitignore` (never commit it!)

```bash
# Add to .gitignore
echo "firebase-service-account.json" >> .gitignore
```

**Step 3: Update .env with your Firebase Project ID**

```bash
# Open .env and update:
FIREBASE_PROJECT_ID=your-actual-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

### 1.3 Test Firebase Integration

**Restart the FastAPI server:**

```bash
# Stop current server (Ctrl+C in terminal)
# Restart it:
cd /home/elmi/Documents/Projects/Lently/lently-backend
source venv/bin/activate
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
🚀 Starting Lently Backend - Environment: development
✅ Firebase initialized for project: your-project-id
✅ Firebase initialized successfully
```

**Test endpoints:**

```bash
# Health check
curl http://localhost:8000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "environment": "development",
  "features": {
    "youtube_api": false,
    "gemini_ai": false,
    "firebase": true,
    "redis": true,
    "paddle": false
  }
}
```

### ✅ Phase 1 Complete

You should now have:
- ✅ FastAPI backend running on port 8000
- ✅ Firebase Admin SDK integrated
- ✅ Environment variables configured
- ✅ Health check endpoints working
- ✅ CORS configured for frontend

---

## Phase 2: Authentication & User Management

### Objectives
- ✅ Implement Firebase token verification
- ✅ Create user management endpoints
- ✅ Build authentication middleware
- ✅ Add usage tracking and quota enforcement

### 2.1 Files Implemented

**Phase 2 has been fully implemented with these components:**

1. **[src/middleware/auth.py](src/middleware/auth.py)** - Authentication middleware
2. **[src/middleware/schemas.py](src/middleware/schemas.py)** - User data models
3. **[src/middleware/router.py](src/middleware/router.py)** - User API endpoints
4. **[src/firebase_init.py](src/firebase_init.py)** - Firebase Admin SDK initialization

### 2.2 API Endpoints

All endpoints available at `/api/user/*`:

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/protected` | GET | ✅ | Test authentication |
| `/api/user/me` | GET | ✅ | Get current user profile |
| `/api/user/profile` | PUT | ✅ | Update display name, photo |
| `/api/user/settings` | PUT | ✅ | Update preferences |
| `/api/user/usage` | GET | ✅ | Get usage statistics |
| `/api/user/account` | DELETE | ✅ | Delete account |

### 2.3 Testing Authentication

**See [PHASE2_COMPLETE.md](PHASE2_COMPLETE.md) for detailed testing instructions.**

**Quick Test:**

1. Create a test user in Firebase Console → Authentication
2. Get Firebase Web API Key from Project Settings
3. Use this Python script to get an ID token:

```python
import requests

API_KEY = "your-firebase-web-api-key"
response = requests.post(
    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
    json={"email": "test@example.com", "password": "password", "returnSecureToken": True}
)
id_token = response.json()["idToken"]

# Test protected endpoint
headers = {"Authorization": f"Bearer {id_token}"}
test = requests.get("http://localhost:8000/api/protected", headers=headers)
print(test.json())
```

### 2.4 Subscription Plans

| Plan | Videos/month | AI Questions | Comments/video |
|------|--------------|--------------|----------------|
| **Free** | 3 | 9 total | 300 |
| **Starter** | 10 | 30/video | 3,000 |
| **Pro** | 25 | 100/video | 10,000 |
| **Business** | 100 | Unlimited | 50,000 |

### ✅ Phase 2 Complete

- [x] Firebase token verification working
- [x] User documents auto-created in Firestore
- [x] Protected endpoints functional
- [x] Usage tracking implemented
- [x] Quota enforcement active

**Next:** Phase 3 - YouTube API Integration

---

## Phase 3: YouTube Integration

### Objectives
- ✅ Implement YouTube Data API client
- ✅ Fetch video metadata
- ✅ Fetch comments with relevance sorting
- ✅ Smart spam filtering and engagement scoring
- ✅ Question/feedback detection for content ideas

### 3.1 Implementation Complete

**Phase 3 has been fully implemented. See [lently-backend/PHASE3_COMPLETE.md](lently-backend/PHASE3_COMPLETE.md) for details.**

**Files Created:**
- `src/youtube/__init__.py` - Module exports
- `src/youtube/constants.py` - API limits, spam filters, plan limits
- `src/youtube/exceptions.py` - Custom error classes
- `src/youtube/schemas.py` - Video/Comment Pydantic models
- `src/youtube/service.py` - YouTube Data API client with smart filtering
- `src/youtube/router.py` - API endpoints

### 3.2 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/youtube/video/{video_id}` | GET | Get video metadata |
| `/api/youtube/comments` | POST | Fetch high-value comments |
| `/api/youtube/validate/{url_or_id}` | GET | Validate video and check comments |

### 3.3 Smart Comment Fetching

The YouTube service doesn't just fetch all comments - it surfaces the **most valuable** ones:

1. **Relevance-First**: Uses YouTube's ranking algorithm
2. **Spam Filtering**: Removes "sub4sub", short comments, excessive emojis
3. **Engagement Scoring**: Ranks by likes + replies + content type
4. **Content Detection**: Flags questions and feedback for content ideas

### 3.4 Testing

```bash
# Start server
cd /home/elmi/Documents/Projects/Lently/lently-backend
source venv/bin/activate
python -m uvicorn src.main:app --reload --port 8000

# Test endpoints (see PHASE3_COMPLETE.md for full examples)
curl http://localhost:8000/api/youtube/validate/VIDEO_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### ✅ Phase 3 Complete

- [x] YouTube API client working
- [x] Video metadata fetching
- [x] Comment fetching with smart filtering
- [x] Spam detection and removal
- [x] Engagement scoring
- [x] Question/feedback detection
- [x] Plan-based comment limits

**Next:** Phase 4 - Gemini AI Integration

---

## Phase 4: Gemini AI Integration

### Objectives
- ✅ Set up Gemini API client with retry logic
- ✅ Implement structured JSON output
- ✅ Create comprehensive prompt templates
- ✅ Build response schemas for all AI features
- ✅ Add safety filter handling

### 4.1 Implementation Complete

**Phase 4 has been fully implemented with these components:**

**Files Created:**
- `src/gemini/__init__.py` - Module exports
- `src/gemini/config.py` - Model settings, safety config, token limits
- `src/gemini/exceptions.py` - Custom error classes (6 types)
- `src/gemini/schemas.py` - Pydantic models for all AI responses
- `src/gemini/client.py` - Main Gemini client with async support
- `src/gemini/router.py` - Test endpoints

**Prompt Templates:**
- `src/gemini/prompts/system.py` - Lently AI personality
- `src/gemini/prompts/analysis.py` - Sentiment, classification, insights, summary
- `src/gemini/prompts/ask_ai.py` - Q&A about comments
- `src/gemini/prompts/replies.py` - Reply generation with tones

### 4.2 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/test` | POST | Test AI with a custom prompt |
| `/api/ai/generate-reply` | POST | Generate reply options for a comment |
| `/api/ai/health` | GET | Check Gemini API status |

### 4.3 Key Features

1. **Async Client**: All AI calls are non-blocking
2. **Retry Logic**: Automatic retries with exponential backoff
3. **JSON Parsing**: Handles markdown code blocks in responses
4. **Safety Handling**: Graceful handling of content filters
5. **Token Counting**: Built-in token estimation

### 4.4 Prompt System

The AI uses specialized prompts for different tasks:

| Prompt | Purpose |
|--------|---------|
| `SENTIMENT_ANALYSIS_PROMPT` | Classify sentiment + emotions |
| `CLASSIFICATION_PROMPT` | Categorize comments (question, feedback, etc.) |
| `INSIGHTS_PROMPT` | Extract themes, content ideas, audience insights |
| `SUMMARY_PROMPT` | Generate executive summary |
| `ASK_AI_PROMPT` | Answer creator questions about comments |
| `REPLY_GENERATION_PROMPT` | Generate replies in different tones |

### 4.5 Testing

```bash
# Start server
cd /home/elmi/Documents/Projects/Lently/lently-backend
source venv/bin/activate
python -m uvicorn src.main:app --reload --port 8000

# Test AI health
curl http://localhost:8000/api/ai/health

# Test with auth (replace TOKEN)
curl -X POST http://localhost:8000/api/ai/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What makes YouTube comments valuable for creators?"}'

# Test reply generation
curl -X POST http://localhost:8000/api/ai/generate-reply \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment_text": "Love this video! Can you make one about Python?",
    "comment_author": "PythonFan",
    "tone": "friendly"
  }'
```

### ✅ Phase 4 Complete

- [x] Gemini client with async support
- [x] Structured JSON output parsing
- [x] Comprehensive prompt templates
- [x] Response schemas (sentiment, classification, insights)
- [x] Reply generation with 5 tone options
- [x] Safety filter handling
- [x] Retry logic with exponential backoff

**Next:** Phase 5 - Analysis Pipeline

---

## Phase 5: Analysis Pipeline

### Objectives
- ✅ Build complete analysis orchestrator
- ✅ Implement sentiment analysis with batching
- ✅ Implement comment classification
- ✅ Extract insights (themes, content ideas, audience insights)
- ✅ Generate executive summaries
- ✅ Store analyses in Firestore

### 5.1 Implementation Complete

**Files Created:**
- `src/analysis/__init__.py` - Module exports
- `src/analysis/schemas.py` - Pydantic models for all analysis results
- `src/analysis/service.py` - Analysis orchestrator service
- `src/analysis/router.py` - API endpoints

### 5.2 Analysis Pipeline Flow

```
1. Fetch Comments → YouTube API (relevance-sorted, spam-filtered)
       ↓
2. Sentiment Analysis → Gemini AI (positive/negative/neutral/mixed + emotions)
       ↓
3. Classification → Gemini AI (question/feedback/appreciation/criticism/etc)
       ↓
4. Insights Extraction → Gemini AI (themes, content ideas, audience insights)
       ↓
5. Executive Summary → Gemini AI (actionable summary with priority actions)
       ↓
6. Store in Firestore → Analysis history for user
```

### 5.3 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analysis/` | POST | Run full analysis on a video |
| `/api/analysis/history` | GET | Get user's analysis history |
| `/api/analysis/{id}` | GET | Get specific analysis by ID |

### 5.4 Analysis Response Structure

```json
{
  "analysis_id": "uuid",
  "video": {
    "video_id": "...",
    "title": "...",
    "channel_title": "...",
    "view_count": 1000000,
    "comment_count": 25000
  },
  "status": "completed",
  "comments_analyzed": 100,
  "sentiment": {
    "summary": {
      "positive_percentage": 65.0,
      "negative_percentage": 15.0,
      "neutral_percentage": 15.0,
      "dominant_sentiment": "positive",
      "top_emotions": ["excited", "curious", "grateful"]
    }
  },
  "classification": {
    "summary": {
      "category_counts": {"question": 15, "appreciation": 40, ...},
      "top_category": "appreciation",
      "actionable_count": 25
    }
  },
  "insights": {
    "key_themes": [...],
    "content_ideas": [...],
    "audience_insights": [...]
  },
  "executive_summary": {
    "summary_text": "Your video received an overwhelmingly positive response...",
    "priority_actions": ["Address the 15 questions about...", "Consider making..."]
  }
}
```

### 5.5 Testing

```bash
# Start server
cd /home/elmi/Documents/Projects/Lently/lently-backend
source venv/bin/activate
python -m uvicorn src.main:app --reload --port 8000

# Run analysis (replace TOKEN and VIDEO_ID)
curl -X POST http://localhost:8000/api/analysis/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "video_url_or_id": "VIDEO_ID",
    "max_comments": 50,
    "include_sentiment": true,
    "include_classification": true,
    "include_insights": true,
    "include_summary": true
  }'

# Get analysis history
curl http://localhost:8000/api/analysis/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### ✅ Phase 5 Complete

- [x] Analysis orchestrator with batched processing
- [x] Sentiment analysis (per-comment + summary)
- [x] Comment classification (9 categories)
- [x] Insights extraction (themes, ideas, audience)
- [x] Executive summary generation
- [x] Firestore storage for history
- [x] Usage quota enforcement

**Next:** Phase 6 - Ask AI Feature

---

## Phase 6: Ask AI Feature

### Objectives
- ✅ Build conversational AI for creator questions
- ✅ Implement context-aware answers using comment data
- ✅ Create conversation history management
- ✅ Add context filtering (positive, negative, questions, feedback)
- ✅ Track question usage quotas

### 6.1 Implementation Complete

**Files Created:**
- `src/ask_ai/__init__.py` - Module exports
- `src/ask_ai/schemas.py` - Conversation and response models
- `src/ask_ai/service.py` - Core Ask AI service with context building
- `src/ask_ai/router.py` - API endpoints

**Also Updated:**
- `src/analysis/schemas.py` - Added `StoredComment` model
- `src/analysis/service.py` - Now stores comments for Ask AI

### 6.2 How It Works

```
1. Creator asks: "What are viewers complaining about?"
       ↓
2. Load Analysis → Get stored comments + sentiment/classification data
       ↓
3. Apply Filter → Filter to negative/criticism comments if relevant
       ↓
4. Build Context → Video info, sentiment summary, comment data
       ↓
5. Include History → Previous Q&A for follow-up context
       ↓
6. Generate Answer → Gemini AI with Lently personality
       ↓
7. Return Response → Answer + sources + follow-up questions
```

### 6.3 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ask/question` | POST | Ask a question about comments |
| `/api/ask/conversations` | GET | Get user's conversation history |
| `/api/ask/conversation/{id}` | GET | Get specific conversation |
| `/api/ask/suggestions/{video_id}` | GET | Get suggested questions |
| `/api/ask/quota` | GET | Check remaining question quota |

### 6.4 Context Filters

| Filter | Description |
|--------|-------------|
| `all` | Consider all comments |
| `positive` | Focus on positive sentiment only |
| `negative` | Focus on negative sentiment only |
| `questions` | Focus on viewer questions |
| `feedback` | Focus on feedback/suggestions |

### 6.5 Example Request/Response

**Request:**
```json
POST /api/ask/question
{
  "question": "What video ideas are viewers suggesting?",
  "video_id": "dQw4w9WgXcQ",
  "context_filter": "feedback"
}
```

**Response:**
```json
{
  "answer": "Based on 23 feedback comments, viewers are suggesting several video ideas:\n\n1. **Deep dive on the chorus** - 8 viewers asked for a breakdown...",
  "confidence": 0.87,
  "sources": [
    {
      "comment_id": "Ugw...",
      "author": "MusicFan",
      "text": "Please do a video breaking down the production!",
      "relevance": "Directly related to your question"
    }
  ],
  "key_points": [
    "Production breakdown is the top request",
    "Behind-the-scenes content is highly wanted",
    "Reaction videos to covers are suggested"
  ],
  "follow_up_questions": [
    "What specific aspects of production should I cover?",
    "How do viewers feel about my existing tutorials?"
  ],
  "conversation_id": "uuid-for-follow-ups",
  "questions_remaining": 8
}
```

### 6.6 Testing

```bash
# Start server
cd /home/elmi/Documents/Projects/Lently/lently-backend
source venv/bin/activate
python -m uvicorn src.main:app --reload --port 8000

# Check quota
curl http://localhost:8000/api/ask/quota \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get suggested questions for a video
curl http://localhost:8000/api/ask/suggestions/VIDEO_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Ask a question
curl -X POST http://localhost:8000/api/ask/question \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are viewers asking about most?",
    "video_id": "VIDEO_ID",
    "context_filter": "questions"
  }'

# Continue conversation
curl -X POST http://localhost:8000/api/ask/question \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Can you give me more details on the first topic?",
    "video_id": "VIDEO_ID",
    "conversation_id": "CONVERSATION_ID_FROM_PREVIOUS"
  }'
```

### ✅ Phase 6 Complete

- [x] Conversational AI with context awareness
- [x] Context filtering (positive/negative/questions/feedback)
- [x] Conversation history with follow-up support
- [x] Source citations from actual comments
- [x] Follow-up question suggestions
- [x] Question quota tracking
- [x] Firestore storage for conversations
- [x] Suggested questions based on analysis
- [x] **Conversation History UI** - View and continue past conversations
- [x] **Backend conversation endpoints** - Persist, fetch, and link conversations to users

**Frontend Features:**
- `/conversations` page showing all past AI conversations
- Each conversation displays: video thumbnail, title, last message, question count, timestamp
- Click any conversation to continue it in the Ask AI page
- Conversations load seamlessly with full message history
- "View conversation history" link on Ask AI page

**Backend Features:**
- `GET /api/ask/conversations` - Fetch user's conversation list
- `GET /api/ask/conversation/{id}` - Get full conversation with all messages
- Conversations properly linked to users via Firebase Auth
- Automatic conversation persistence after each question
- Date serialization for proper JSON responses

**Next:** Phase 7 - Reply Generator

---

## Phase 7: Reply Generator

### Objectives
- ✅ Implement reply generation with multiple tones
- ✅ Create variation system

*Detailed implementation steps...*

---

## Phase 8: Paddle Billing Integration

### Objectives
- ✅ Set up Paddle webhook handler
- ✅ Implement signature verification
- ✅ Create event handlers for all subscription events
- ✅ Sync subscription state to Firestore

*Detailed implementation steps...*

---

## Phase 9: Cloud Pub/Sub & Job Orchestration

### Objectives
- ✅ Set up Pub/Sub topics and subscriptions
- ✅ Implement job publisher
- ✅ Create analysis worker
- ✅ Add result handler

*Detailed implementation steps...*

---

## Phase 10: Usage Tracking & Quotas

### Objectives
- ✅ Implement usage counters in Firestore
- ✅ Create quota checking middleware
- ✅ Add monthly reset scheduler

*Detailed implementation steps...*

---

## Phase 11: Redis Caching Layer

### Objectives
- ✅ Set up Redis connection
- ✅ Implement cache for analyses
- ✅ Add cache for comments

*Detailed implementation steps...*

---

## Phase 12: Testing & Validation

### Objectives
- ✅ Unit tests for all services
- ✅ Integration tests for workflows
- ✅ Load testing for scalability

*Detailed testing procedures...*

---

## Phase 13: Deployment

### Objectives
- ✅ Deploy lently-backend to Cloud Run
- ✅ Deploy lently-saas to Firebase
- ✅ Configure production environment variables
- ✅ Set up monitoring and logging

*Detailed deployment steps...*

---

## Appendix: Useful Commands

### Development
```bash
# Run lently-backend
cd lently-backend
source venv/bin/activate
python -m src.main

# Run lently-saas emulators
cd lently-saas/functions
npm run serve

# Run tests
pytest tests/ -v
```

### Debugging
```bash
# Check logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Test endpoints
curl -X GET http://localhost:8000/health
```

---

**Next Steps:** Begin with Phase 1 implementation.
