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

| Plan | Price | Videos/month | AI Questions | Comments/video |
|------|-------|--------------|--------------|----------------|
| **Free** | $0 | 1 | 2 total | 100 |
| **Starter** | $19 | 10 | 30 total | 1,500 |
| **Pro** | $39 | 20 | 75 total | 3,000 |
| **Business** | $79 | 50 | Unlimited | 10,000 |

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

### 9.1 Implementation Complete

**Phase 9 has been fully implemented with asynchronous job processing using Cloud Pub/Sub.**

**Files Created:**
- `src/pubsub/__init__.py` - Module exports
- `src/pubsub/schemas.py` - Job and result Pydantic models
- `src/pubsub/publisher.py` - Job publisher service for Pub/Sub
- `src/pubsub/worker.py` - Background worker that processes jobs

**Files Updated:**
- `src/config.py` - Added Pub/Sub configuration
- `src/analysis/router.py` - Added async job endpoints

### 9.2 Architecture

The system now supports two modes of video analysis:

#### Mode 1: In-Memory Background Processing (Default)
```
POST /api/analysis/start → Creates in-memory job → Background task processes
                         ↓
                    Returns analysis_id
                         ↓
GET /api/analysis/progress/{id} → SSE stream for real-time updates
```

#### Mode 2: Pub/Sub Queue (Production-Ready, Scalable)
```
POST /api/analysis/async → Publish to Pub/Sub → Returns job_id
                         ↓                    ↓
                    Job document         Worker pulls job
                    in Firestore         from subscription
                         ↓                    ↓
                    Tracks status        Processes analysis
                         ↓                    ↓
GET /api/analysis/job/{id} ← Updates ← Stores result
```

### 9.3 API Endpoints

#### New Async Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analysis/async` | POST | Submit job to Pub/Sub queue |
| `/api/analysis/job/{job_id}` | GET | Check job status and progress |
| `/api/analysis/job/{job_id}` | DELETE | Cancel pending/queued job |

#### Existing Endpoints (Still Supported)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analysis/start` | POST | Start in-memory background analysis |
| `/api/analysis/progress/{id}` | GET | SSE stream for progress updates |
| `/api/analysis/history` | GET | Get user's analysis history |
| `/api/analysis/{id}` | GET | Get specific analysis result |

### 9.4 Job States

Jobs flow through these states:

1. **PENDING** - Job created, not yet published
2. **QUEUED** - Published to Pub/Sub, waiting for worker
3. **PROCESSING** - Worker is processing the job
4. **COMPLETED** - Successfully finished
5. **FAILED** - Error occurred during processing
6. **CANCELLED** - User cancelled before processing

### 9.5 Request/Response Examples

**Submit Async Analysis:**
```bash
curl -X POST http://localhost:8000/api/analysis/async \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "video_url_or_id": "dQw4w9WgXcQ",
    "max_comments": 100,
    "include_sentiment": true,
    "include_classification": true,
    "include_insights": true,
    "include_summary": true
  }'
```

**Response:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "message": "Analysis job queued. Use GET /job/{job_id} to check status."
}
```

**Check Job Status:**
```bash
curl http://localhost:8000/api/analysis/job/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (Processing):**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "firebase_user_id",
  "video_id": "dQw4w9WgXcQ",
  "status": "processing",
  "progress": 0.65,
  "current_step": "Extracting insights",
  "created_at": "2026-01-17T12:00:00Z",
  "updated_at": "2026-01-17T12:02:30Z"
}
```

**Response (Completed):**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "firebase_user_id",
  "video_id": "dQw4w9WgXcQ",
  "status": "completed",
  "progress": 1.0,
  "current_step": "Completed",
  "analysis_id": "abc123def456",
  "created_at": "2026-01-17T12:00:00Z",
  "updated_at": "2026-01-17T12:03:45Z"
}
```

### 9.6 Running the Worker

**In Development (Local):**
```bash
cd /home/elmi/Documents/Projects/Lently/lently-backend
source venv/bin/activate

# Run as standalone worker
python -m src.pubsub.worker
```

**In Production (Cloud Run/Compute Engine):**
```bash
# Deploy worker as separate Cloud Run service
gcloud run deploy lently-analysis-worker \
  --source . \
  --region us-central1 \
  --platform managed \
  --command "python -m src.pubsub.worker" \
  --set-env-vars FIREBASE_PROJECT_ID=your-project-id \
  --max-instances 10 \
  --min-instances 1
```

### 9.7 Setting Up Cloud Pub/Sub

**1. Enable Pub/Sub API:**
```bash
gcloud services enable pubsub.googleapis.com
```

**2. Create Topic:**
```bash
gcloud pubsub topics create analysis-jobs
```

**3. Create Subscription with retry policy:**
```bash
gcloud pubsub subscriptions create analysis-jobs-worker \
  --topic analysis-jobs \
  --ack-deadline 600 \
  --message-retention-duration 7d \
  --min-retry-delay 10s \
  --max-retry-delay 600s
```

**4. Update .env:**
```bash
# Add to .env
PUBSUB_ANALYSIS_TOPIC=analysis-jobs
PUBSUB_ANALYSIS_SUBSCRIPTION=analysis-jobs-worker
PUBSUB_ENABLED=true
```

### 9.8 Key Features

#### 1. Graceful Degradation
- If Pub/Sub is not configured, falls back to in-memory processing
- No breaking changes to existing workflows
- Frontend can detect and use appropriate endpoint

#### 2. Progress Tracking
- Jobs tracked in Firestore `analysis_jobs` collection
- Real-time progress updates (0.0 - 1.0)
- Detailed step descriptions

#### 3. Retry Logic
- Failed jobs automatically retried by Pub/Sub
- Configurable retry delays and max attempts
- Dead-letter queue for permanently failed jobs

#### 4. Cancellation Support
- Users can cancel pending/queued jobs
- Cannot cancel jobs already processing

#### 5. Priority Support
- Jobs can have priority 1-10 (1=highest)
- Premium users could get higher priority

### 9.9 Monitoring & Metrics

**View Pub/Sub Metrics:**
```bash
# View topic metrics
gcloud pubsub topics describe analysis-jobs

# View subscription metrics
gcloud pubsub subscriptions describe analysis-jobs-worker
```

**Check Job Status in Firestore:**
```javascript
// In Firebase Console or app
db.collection('analysis_jobs')
  .where('status', '==', 'processing')
  .get()
```

### 9.10 Testing

**Test Job Submission:**
```bash
# Start backend
cd lently-backend
source venv/bin/activate
uvicorn src.main:app --reload --port 8000

# In another terminal, start worker
python -m src.pubsub.worker

# Submit test job
curl -X POST http://localhost:8000/api/analysis/async \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "video_url_or_id": "dQw4w9WgXcQ",
    "max_comments": 50
  }'

# Check status (use job_id from response)
curl http://localhost:8000/api/analysis/job/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Flow:**
1. Job status starts as `queued`
2. Worker picks up job, status becomes `processing`
3. Progress updates from 0.0 → 1.0
4. Status becomes `completed` with `analysis_id`
5. Retrieve full analysis using `GET /api/analysis/{analysis_id}`

### 9.11 Advantages Over Synchronous Processing

| Aspect | Synchronous | Pub/Sub Async |
|--------|-------------|---------------|
| **Response Time** | Waits 30-120s | Returns immediately |
| **Scalability** | Limited by server threads | Unlimited workers |
| **Reliability** | Lost if connection drops | Persisted in queue |
| **Retry** | Manual only | Automatic retries |
| **Priority** | FIFO only | Priority-based |
| **Monitoring** | Limited | Full metrics in Cloud Console |

### ✅ Phase 9 Complete

- [x] Pub/Sub publisher service
- [x] Background worker with job processing
- [x] Job status tracking in Firestore
- [x] Async API endpoints
- [x] Progress reporting (0-100%)
- [x] Job cancellation
- [x] Retry logic and error handling
- [x] Graceful degradation when Pub/Sub unavailable
- [x] Priority support for premium users
- [x] Comprehensive monitoring and logging

**Next:** Phase 10 - Usage Tracking & Quotas

---

## Phase 10: Usage Tracking & Quotas

### Objectives
- ✅ Implement usage counters in Firestore
- ✅ Create quota checking middleware
- ✅ Add monthly reset scheduler

### 10.1 Implementation Complete

**Phase 10 enhances the existing billing system with comprehensive usage tracking, analytics, and automated resets.**

**Files Enhanced/Created:**
- `src/billing/service.py` - Already has atomic usage counters and quota enforcement
- `src/billing/enforcement.py` - Already has FastAPI dependencies for quota checking
- `src/billing/analytics.py` - **NEW** - Usage analytics and trends
- `src/billing/reset_scheduler.py` - **NEW** - Monthly reset automation
- `src/billing/router.py` - **UPDATED** - Added analytics and admin endpoints
- `scripts/setup_usage_scheduler.sh` - **NEW** - Cloud Scheduler setup script

### 10.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Usage Tracking Flow                       │
└─────────────────────────────────────────────────────────────┘

User Action (Video Analysis/AI Question)
           ↓
    Check Quota (require_video_quota/require_ai_quota)
           ↓
    [ALLOWED?] ──No→ Return 402 Payment Required
           ↓
         Yes
           ↓
    Perform Action
           ↓
    Increment Counter (atomic Firestore update)
           ↓
    Return Success


┌─────────────────────────────────────────────────────────────┐
│                    Monthly Reset Flow                        │
└─────────────────────────────────────────────────────────────┘

Cloud Scheduler (1st of month, midnight)
           ↓
    POST /api/billing/admin/reset-usage
           ↓
    UsageResetScheduler.reset_all_users()
           ↓
    For each user:
      - Check if period ended
      - Reset counters to 0
      - Update limits based on current plan
      - Set new period_start and period_end
           ↓
    Return stats (reset_successful, reset_failed, not_due)
```

### 10.3 Core Components

#### 1. Usage Counters (Firestore)

**Document Structure:**
```javascript
// users/{userId}/billing/usage
{
  videos_analyzed: 5,
  comments_analyzed: 437,
  ai_questions_used: 12,
  videos_limit: 10,
  comments_limit: 3000,
  ai_questions_limit: 30,
  period_start: "2026-01-01T00:00:00Z",
  period_end: "2026-02-01T00:00:00Z"
}
```

**Atomic Updates:**
```python
# Increment using Firestore's Increment
from google.cloud.firestore import Increment
usage_ref.update({
  "videos_analyzed": Increment(1)
})
```

#### 2. Quota Enforcement (Middleware)

**FastAPI Dependencies:**
```python
from src.billing.enforcement import require_video_quota

@router.post("/api/analysis/start")
async def start_analysis(
    quota: QuotaCheckResult = Depends(require_video_quota),
    user: AuthenticatedUser = Depends(get_current_user)
):
    # If we reach here, user has quota
    # quota.remaining tells us how many left
    ...
```

**Available Enforcers:**
- `require_video_quota()` - For video analysis
- `require_ai_quota()` - For AI questions
- `require_comments_quota()` - For comment limits

#### 3. Usage Analytics

**Get Comprehensive Analytics:**
```python
from src.billing.analytics import usage_analytics_service

analytics = await usage_analytics_service.get_usage_analytics(
    user_id="user123",
    include_trends=True,
    days_back=30
)

# Returns:
# - current_period: Current usage vs limits
# - usage_percentage: % of quota used
# - projected_usage: Estimated end-of-period usage
# - warnings: List of quota warnings
# - recommendations: Actionable suggestions
# - trends: Historical daily snapshots (optional)
```

### 10.4 API Endpoints

#### User Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/billing/info` | GET | Complete billing info (usage + subscription) |
| `/api/billing/usage` | GET | Current usage only |
| `/api/billing/analytics` | GET | Usage trends and projections |
| `/api/billing/quota/{type}` | GET | Check specific quota |

#### Admin Endpoints (Cron/Scheduler)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/billing/admin/reset-usage` | POST | Reset usage for one/all users |
| `/api/billing/admin/users-due-reset` | GET | List users needing reset |

### 10.5 Monthly Reset System

**How It Works:**

1. **Cloud Scheduler** triggers monthly (1st of each month)
2. **UsageResetScheduler** processes all users
3. For each user:
   - Check if `period_end` has passed
   - If yes: Reset counters, update limits, set new period
   - If no: Skip
4. Return statistics

**Manual Reset (Single User):**
```bash
curl -X POST http://localhost:8000/api/billing/admin/reset-usage \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "force": false,
    "admin_key": "your_admin_key"
  }'
```

**Bulk Reset (All Users):**
```bash
curl -X POST http://localhost:8000/api/billing/admin/reset-usage \
  -H "Content-Type: application/json" \
  -d '{
    "admin_key": "your_admin_key"
  }'
```

### 10.6 Setup Cloud Scheduler

**Automated Setup:**
```bash
cd lently-backend/scripts
chmod +x setup_usage_scheduler.sh

# Set environment variables
export FIREBASE_PROJECT_ID=your-project-id
export GCP_REGION=us-central1
export BACKEND_URL=https://your-backend-url.run.app
export JWT_SECRET_KEY=your-jwt-secret

# Run setup
./setup_usage_scheduler.sh
```

**Manual Setup:**
```bash
# 1. Enable API
gcloud services enable cloudscheduler.googleapis.com

# 2. Create monthly reset job
gcloud scheduler jobs create http monthly-usage-reset \
  --location=us-central1 \
  --schedule="0 0 1 * *" \
  --time-zone="America/New_York" \
  --uri="https://your-backend.run.app/api/billing/admin/reset-usage" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"admin_key": "your_admin_key"}' \
  --attempt-deadline=600s

# 3. Test manually
gcloud scheduler jobs run monthly-usage-reset --location=us-central1
```

### 10.7 Usage Analytics Examples

**Request:**
```bash
curl http://localhost:8000/api/billing/analytics?include_trends=true&days_back=30 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "current_period": {
    "videos_used": 7,
    "videos_limit": 10,
    "ai_questions_used": 18,
    "ai_questions_limit": 30,
    "comments_analyzed": 524,
    "comments_limit": 3000
  },
  "usage_percentage": {
    "videos": 70.0,
    "ai_questions": 60.0
  },
  "projected_usage": {
    "videos": 12,
    "ai_questions": 28
  },
  "warnings": [
    "You've used 70% of your video quota",
    "At current pace, you'll exceed your video limit before period ends"
  ],
  "recommendations": [
    "Consider upgrading to Pro plan to avoid running out of videos"
  ],
  "trends": {
    "avg_videos_per_day": 0.5,
    "avg_ai_questions_per_day": 1.2,
    "total_videos": 7,
    "total_ai_questions": 18,
    "total_comments": 524,
    "peak_usage_day": "2026-01-15T00:00:00Z"
  }
}
```

### 10.8 Quota Check Flow

**Example: Video Analysis**

```python
# In analysis/router.py
from src.billing.enforcement import require_video_quota

@router.post("/start")
async def start_analysis(
    request: AnalysisRequest,
    quota: QuotaCheckResult = Depends(require_video_quota),
    user: AuthenticatedUser = Depends(get_current_user)
):
    # Quota is checked BEFORE entering this function
    # If exceeded, user gets 402 Payment Required
    
    # Perform analysis
    result = await analysis_service.run_analysis(...)
    
    # Increment usage AFTER success
    await billing_service.increment_usage(
        user.uid,
        UsageType.VIDEOS,
        amount=1
    )
    
    return result
```

**Error Response (Quota Exceeded):**
```json
{
  "detail": {
    "error": "quota_exceeded",
    "usage_type": "videos",
    "current": 10,
    "limit": 10,
    "remaining": 0,
    "message": "You've reached your videos limit (10). Upgrade your plan to continue.",
    "upgrade_required": true
  }
}
```

### 10.9 Firestore Collections

#### `users/{userId}/billing/usage`
Current usage and limits:
```javascript
{
  videos_analyzed: 5,
  comments_analyzed: 437,
  ai_questions_used: 12,
  videos_limit: 10,
  comments_limit: 3000,
  ai_questions_limit: 30,
  period_start: Timestamp,
  period_end: Timestamp
}
```

#### `users/{userId}/billing/subscription`
Subscription details:
```javascript
{
  plan_id: "pro",
  status: "active",
  paddle_subscription_id: "sub_123",
  current_period_start: Timestamp,
  current_period_end: Timestamp,
  cancel_at_period_end: false,
  billing_cycle: "monthly"
}
```

#### `users/{userId}/usage_history/{date}` (Optional)
Daily snapshots for analytics:
```javascript
{
  date: "2026-01-17",
  videos_used: 2,
  ai_questions_used: 5,
  comments_analyzed: 150
}
```

### 10.10 Testing

**Test Quota Enforcement:**
```bash
# Create test user with free plan (3 videos)
# Analyze 3 videos successfully
# 4th video should return 402

curl -X POST http://localhost:8000/api/analysis/start \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"video_url_or_id": "test123"}'

# Expected after 3rd video:
# Status: 402 Payment Required
# Body: {"error": "quota_exceeded", "limit": 3, "current": 3}
```

**Test Monthly Reset:**
```bash
# Test reset for single user
curl -X POST http://localhost:8000/api/billing/admin/reset-usage \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "force": true,
    "admin_key": "test_key"
  }'

# Verify usage was reset
curl http://localhost:8000/api/billing/usage \
  -H "Authorization: Bearer TOKEN"

# Should show videos_analyzed: 0
```

**Test Analytics:**
```bash
curl http://localhost:8000/api/billing/analytics \
  -H "Authorization: Bearer TOKEN"

# Should return usage trends and projections
```

### 10.11 Key Features

#### ✅ **Atomic Usage Tracking**
- Firestore's `Increment` ensures no race conditions
- Multiple requests can increment simultaneously
- Guaranteed accuracy

#### ✅ **Pre-Request Enforcement**
- Quota checked BEFORE expensive operations
- Prevents wasted resources
- Clear error messages with upgrade CTAs

#### ✅ **Automated Monthly Resets**
- Cloud Scheduler triggers resets
- Handles all users automatically
- Retry logic for failures
- Monitoring and alerts

#### ✅ **Usage Analytics**
- Historical trends
- Usage projections
- Smart recommendations
- Warning system

#### ✅ **Plan-Based Limits**
- Limits automatically updated on plan change
- Immediate effect
- No manual intervention needed

#### ✅ **Graceful Degradation**
- If Cloud Scheduler fails, manual reset available
- Admin endpoints for emergency fixes
- Query to find users needing reset

### 10.12 Monitoring & Alerts

**View Scheduler Status:**
```bash
gcloud scheduler jobs describe monthly-usage-reset --location=us-central1
```

**Check Recent Runs:**
```bash
gcloud scheduler jobs executions list monthly-usage-reset --location=us-central1
```

**View Logs:**
```bash
gcloud logging read "resource.type=cloud_scheduler_job 
  AND resource.labels.job_id=monthly-usage-reset" 
  --limit 50
```

**Set Up Alerts:**
```bash
# Alert if reset job fails
gcloud monitoring alert-policies create \
  --notification-channels=YOUR_CHANNEL \
  --display-name="Usage Reset Failed" \
  --condition="..." \
  --combiner=OR
```

### 10.13 Best Practices

1. **Always Use Enforcement Dependencies**
   ```python
   # ❌ Don't check quota manually
   usage = await billing_service.get_user_usage(user_id)
   if usage.videos_analyzed >= usage.videos_limit:
       raise HTTPException(...)
   
   # ✅ Use dependency injection
   quota: QuotaCheckResult = Depends(require_video_quota)
   ```

2. **Increment After Success**
   ```python
   # ✅ Increment only after operation completes
   result = await expensive_operation()
   await billing_service.increment_usage(user_id, UsageType.VIDEOS)
   return result
   ```

3. **Use BillingService Everywhere**
   ```python
   # ✅ Single source of truth
   from src.billing import billing_service
   info = await billing_service.get_billing_info(user_id, email)
   ```

4. **Monitor Reset Jobs**
   - Set up alerts for failed resets
   - Check logs monthly
   - Have manual backup process

### ✅ Phase 10 Complete

- [x] Atomic usage counters in Firestore
- [x] Quota enforcement with FastAPI dependencies
- [x] Monthly reset scheduler with Cloud Scheduler
- [x] Usage analytics with trends and projections
- [x] Admin endpoints for manual resets
- [x] Daily usage snapshots (optional)
- [x] Smart recommendations system
- [x] Projected usage calculations
- [x] Comprehensive monitoring and logging

**Next:** Phase 11 - Redis Caching Layer

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
