# Lently SaaS - YouTube Comment Intelligence Platform

**Transform thousands of YouTube comments into clear, actionable insights in seconds.**

## Overview

Lently is a SaaS platform that helps YouTube creators understand their audience through AI-powered comment analysis. Get content ideas, audience insights, and engagement strategies from your video comments.

## Features

### ✅ Completed (Phase 1-6)

- **Smart Comment Analysis**
  - Sentiment analysis with emotion detection
  - Comment classification (questions, feedback, appreciation, criticism, etc.)
  - Theme extraction and content ideas
  - Executive summaries with priority actions

- **Ask AI Feature**
  - Conversational AI that answers creator questions
  - Context-aware responses based on actual comment data
  - Source citations showing which comments informed answers
  - Smart question suggestions tailored to each video
  
- **Authentication & User Management**
  - Firebase Authentication integration
  - Usage tracking and quota enforcement
  - Subscription plan management

- **YouTube Integration**
  - Smart comment fetching with spam filtering
  - Engagement scoring and relevance ranking
  - Video metadata extraction

## Tech Stack

### Backend
- **FastAPI** - Python web framework
- **Firebase Admin SDK** - Authentication & Firestore database
- **Gemini AI** - Google's AI for analysis and conversations
- **YouTube Data API** - Comment and video data

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations

## Project Structure

```
/home/elmi/Documents/Projects/Lently/
├── lently-backend/          # FastAPI Backend
│   ├── src/
│   │   ├── analysis/        # Analysis pipeline
│   │   ├── ask_ai/          # Ask AI feature
│   │   ├── gemini/          # Gemini AI client
│   │   ├── youtube/         # YouTube API client
│   │   ├── middleware/      # Auth & user management
│   │   └── main.py          # App entry point
│   ├── requirements.txt
│   └── .env
│
└── frontend/                # React Frontend
    ├── src/
    │   ├── components/      # Reusable components
    │   ├── pages/           # Page components
    │   ├── services/        # API client
    │   └── types/           # TypeScript types
    └── package.json
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Firebase project with Firestore enabled
- YouTube Data API key
- Gemini API key

### Backend Setup

```bash
cd lently-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file with:
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
YOUTUBE_API_KEY=your-youtube-api-key
GEMINI_API_KEY=your-gemini-api-key
ENVIRONMENT=development

# Run server
uvicorn src.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install

# Create .env file with:
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id

# Run dev server
npm run dev
```

## Subscription Plans

| Plan | Videos/month | AI Questions | Comments/video |
|------|--------------|--------------|----------------|
| **Free** | 3 | 9 total | 300 |
| **Starter** | 10 | 30/video | 3,000 |
| **Pro** | 25 | 100/video | 10,000 |
| **Business** | 100 | Unlimited | 50,000 |

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Development Status

- ✅ Phase 1: Project Setup & Infrastructure
- ✅ Phase 2: Authentication & User Management
- ✅ Phase 3: YouTube Integration
- ✅ Phase 4: Gemini AI Integration
- ✅ Phase 5: Analysis Pipeline
- ✅ Phase 6: Ask AI Feature (Latest)
- 🚧 Phase 7: Reply Generator
- 🚧 Phase 8: Paddle Billing Integration
- 🚧 Phase 9: Cloud Pub/Sub
- 🚧 Phase 10: Usage Tracking
- 🚧 Phase 11: Redis Caching
- 🚧 Phase 12: Testing
- 🚧 Phase 13: Deployment

## Recent Updates (Phase 6)

### Ask AI Feature - Redesigned for Creators

The Ask AI feature has been completely redesigned based on what YouTubers actually want:

**What Creators Get:**
- "What video should I make next?" → Specific ideas from viewer requests
- "What confused viewers?" → Issues + how to fix them
- "What worked well?" → What to keep doing

**Key Improvements:**
- Actionable answers (not just data dumps)
- Direct responses with specific quotes
- Context filtering (positive/negative/questions/feedback)
- Smart question suggestions based on analysis
- Conversation history for follow-ups

## Contributing

This is a private project. For questions or issues, contact the development team.

## License

Proprietary - All rights reserved
