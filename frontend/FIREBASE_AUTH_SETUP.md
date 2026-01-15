# Firebase Authentication Setup Guide

This guide explains how to complete the Firebase Authentication setup for Lently.

## Prerequisites

1. A Firebase project (you mentioned you already have one: `lently-be677`)
2. Google Sign-In enabled in Firebase Console

## Step 1: Enable Google Sign-In in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`lently-be677`)
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Toggle **Enable**
6. Add your project's support email
7. Click **Save**

## Step 2: Configure Authorized Domains

1. In Firebase Console → Authentication → Settings → Authorized domains
2. Add these domains:
   - `localhost` (for development)
   - Your production domain (when ready)

## Step 3: Get Firebase Web App Configuration

1. Go to Firebase Console → Project Settings (gear icon)
2. Scroll down to **Your apps**
3. If you don't have a web app:
   - Click **Add app** → **Web** (</> icon)
   - Register your app (e.g., "Lently Web")
   - Copy the configuration
4. If you already have a web app, click on it to see the config

## Step 4: Create Environment File

Create a `.env` file in the `frontend` directory:

```bash
cd /home/elmi/Documents/Projects/Lently/frontend
cp .env.example .env
```

Then edit `.env` with your Firebase configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSy...your-api-key
VITE_FIREBASE_AUTH_DOMAIN=lently-be677.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=lently-be677
VITE_FIREBASE_STORAGE_BUCKET=lently-be677.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Backend API URL
VITE_API_URL=http://localhost:8000
```

## Step 5: Firestore Security Rules

Update your Firestore security rules in Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can only read/write their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Analyses collection - users can read their own analyses
    match /analyses/{analysisId} {
      allow read: if request.auth != null && 
                    resource.data.user_id == request.auth.uid;
      // Only backend (admin) can write analyses
      allow write: if false;
    }
    
    // Conversations collection - users can read/write their own conversations
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null && 
                           resource.data.user_id == request.auth.uid;
    }
  }
}
```

## Step 6: Test the Setup

1. Start the development server:
   ```bash
   cd /home/elmi/Documents/Projects/Lently/frontend
   npm run dev
   ```

2. Open http://localhost:5173

3. Navigate to `/signup` and test Google Sign-Up:
   - Click "Continue with Google"
   - Select a Google account
   - Complete onboarding

4. Sign out and test Sign-In:
   - Navigate to `/signin`
   - Click "Continue with Google"
   - Verify you're redirected to dashboard

## Architecture Overview

### File Structure

```
frontend/src/
├── lib/
│   └── firebase.ts          # Firebase initialization
├── types/
│   └── user.ts              # User & subscription types
├── services/
│   ├── auth.service.ts      # Authentication logic
│   └── api.service.ts       # Backend API client
├── contexts/
│   └── AuthContext.tsx      # Auth state management
├── components/
│   └── auth/
│       └── ProtectedRoute.tsx  # Route guards
└── pages/
    ├── SignIn.tsx           # Sign in page
    ├── SignUp.tsx           # Sign up page
    └── Onboarding.tsx       # Onboarding flow
```

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         SIGN UP FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User clicks "Continue with Google"                          │
│                    ↓                                             │
│  2. Google account picker (always shown via prompt:'select')    │
│                    ↓                                             │
│  3. Check if user exists in Firestore                           │
│        │                                                         │
│        ├── EXISTS → Sign out + Error: "Account exists,          │
│        │            please sign in"                              │
│        │                                                         │
│        └── NOT EXISTS → Create user document                     │
│                    ↓                                             │
│  4. Redirect to /onboarding                                      │
│                    ↓                                             │
│  5. Complete onboarding (goals + plan)                          │
│                    ↓                                             │
│  6. Save to Firestore + Redirect to dashboard                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         SIGN IN FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User clicks "Continue with Google"                          │
│                    ↓                                             │
│  2. Google account picker                                        │
│                    ↓                                             │
│  3. Check if user exists in Firestore                           │
│        │                                                         │
│        ├── NOT EXISTS → Sign out + Error: "No account,          │
│        │                please sign up first"                    │
│        │                                                         │
│        └── EXISTS → Update last login                           │
│                    ↓                                             │
│  4. Check hasCompletedOnboarding                                │
│        │                                                         │
│        ├── FALSE → Redirect to /onboarding                      │
│        │                                                         │
│        └── TRUE → Redirect to dashboard or intended page        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### User Data Model (Firestore)

```typescript
interface LentlyUser {
  uid: string;
  email: string | null;
  
  profile: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
    onboardingGoals: string[];
  };
  
  subscription: {
    planId: 'free' | 'starter' | 'pro';
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
    currentPeriodStart: Timestamp;
    currentPeriodEnd: Timestamp | null;
    cancelAtPeriodEnd: boolean;
    paddleSubscriptionId?: string;  // For Paddle integration
    paddleCustomerId?: string;
  };
  
  usage: {
    videosAnalyzedThisMonth: number;
    aiQuestionsThisMonth: number;
    lastResetDate: Timestamp;
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
  hasCompletedOnboarding: boolean;
}
```

## Backend Integration

The frontend is prepared for seamless backend integration:

### API Client

The `api.service.ts` automatically:
- Gets Firebase ID token from current user
- Attaches `Authorization: Bearer <token>` header
- Handles errors gracefully

### Backend Verification

Your backend (FastAPI) should verify Firebase tokens:

```python
from firebase_admin import auth

def verify_token(authorization: str):
    token = authorization.replace("Bearer ", "")
    decoded_token = auth.verify_id_token(token)
    return decoded_token["uid"]
```

## Payment Integration (Paddle)

The user model is designed for Paddle integration:

1. **During Onboarding:**
   - User selects a plan
   - If paid plan → redirect to Paddle checkout
   - On successful payment → Paddle webhook updates Firestore

2. **Paddle Webhook Handler (Backend):**
   ```python
   @app.post("/webhooks/paddle")
   async def paddle_webhook(event: PaddleEvent):
       if event.type == "subscription.created":
           user_id = event.custom_data.user_id
           await update_user_subscription(user_id, {
               "planId": event.plan_id,
               "status": "active",
               "paddleSubscriptionId": event.subscription_id,
               "paddleCustomerId": event.customer_id,
           })
   ```

3. **Frontend Updates:**
   - After Paddle checkout, call `refreshUser()` to sync state
   - Or use Firestore real-time listener for instant updates

## Troubleshooting

### "popup-closed-by-user" Error
User closed the Google popup. This is expected behavior.

### "auth/network-request-failed"
Network issue. Check internet connection.

### User data not loading
1. Check Firestore rules allow reading user's own document
2. Verify the user document exists in Firestore
3. Check browser console for errors

### Protected routes not working
1. Ensure `AuthProvider` wraps `BrowserRouter`
2. Check that routes use `ProtectedRoute`, `PublicRoute`, or `OnboardingRoute`

## Next Steps

1. ✅ Firebase Authentication with Google Sign-In
2. ⏳ Connect frontend to backend API
3. ⏳ Integrate Paddle for payments
4. ⏳ Add real-time subscription updates with Firestore listeners
