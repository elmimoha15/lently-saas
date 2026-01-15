# Phase 2: Authentication & User Management - Complete

## ✅ Implementation Complete

Phase 2 has been fully implemented with the following components:

### Files Created:

1. **[src/middleware/auth.py](../src/middleware/auth.py)**
   - Firebase token verification
   - `get_current_user()` - Extract authenticated user from token
   - `get_current_user_with_plan()` - Get user with subscription data
   - `check_quota()` - Decorator for quota enforcement

2. **[src/middleware/schemas.py](../src/middleware/schemas.py)**
   - User data models (UserResponse, UserUsage, UserSettings)
   - Request schemas for profile/settings updates

3. **[src/middleware/router.py](../src/middleware/router.py)**
   - `/api/user/me` - Get current user
   - `/api/user/profile` - Update profile
   - `/api/user/settings` - Update settings
   - `/api/user/usage` - Get usage stats
   - `/api/user/account` - Delete account

### Testing Instructions:

#### 1. Start the Server

```bash
cd /home/elmi/Documents/Projects/Lently/lently-backend
source venv/bin/activate
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Create a Test User

Go to Firebase Console → Authentication → Add User:
- Email: `test@lently.com`
- Password: `TestPassword123!`

#### 3. Get Firebase Web API Key

Firebase Console → Project Settings → General → Web API Key

Copy it for the next step.

#### 4. Get ID Token (Python Script)

Create `test_auth.py`:

```python
import requests
import json

# Your Firebase Web API Key
API_KEY = "YOUR_WEB_API_KEY_HERE"

# Test user credentials
EMAIL = "test@lently.com"
PASSWORD = "TestPassword123!"

# Sign in and get ID token
url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"
response = requests.post(url, json={
    "email": EMAIL,
    "password": PASSWORD,
    "returnSecureToken": True
})

if response.status_code == 200:
    data = response.json()
    id_token = data["idToken"]
    
    print("✅ Authentication successful!")
    print(f"\nID Token (first 50 chars): {id_token[:50]}...")
    
    # Test protected endpoint
    print("\n🔒 Testing protected endpoint...")
    headers = {"Authorization": f"Bearer {id_token}"}
    test_response = requests.get("http://localhost:8000/api/protected", headers=headers)
    
    print(f"Status: {test_response.status_code}")
    print(f"Response: {json.dumps(test_response.json(), indent=2)}")
    
    # Test user profile
    print("\n👤 Testing user profile endpoint...")
    profile_response = requests.get("http://localhost:8000/api/user/me", headers=headers)
    print(f"Status: {profile_response.status_code}")
    print(f"Response: {json.dumps(profile_response.json(), indent=2)}")
    
    # Test usage stats
    print("\n📊 Testing usage stats...")
    usage_response = requests.get("http://localhost:8000/api/user/usage", headers=headers)
    print(f"Status: {usage_response.status_code}")
    print(f"Response: {json.dumps(usage_response.json(), indent=2)}")
    
else:
    print(f"❌ Error: {response.text}")
```

Run it:
```bash
python test_auth.py
```

#### 5. Test with cURL

```bash
# Set your ID token
export TOKEN="eyJhbG..."

# Test authentication
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/protected

# Get user profile
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/user/me

# Get usage stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/user/usage

# Update profile
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Test User"}' \
  http://localhost:8000/api/user/profile
```

### Expected Responses:

#### `/api/protected`
```json
{
  "message": "Authentication successful!",
  "user": {
    "uid": "firebase-uid-here",
    "email": "test@lently.com",
    "email_verified": false
  }
}
```

#### `/api/user/me`
```json
{
  "uid": "firebase-uid-here",
  "email": "test@lently.com",
  "plan": "free",
  "usage": {
    "videosAnalyzed": 0,
    "videosLimit": 3,
    "questionsUsed": 0,
    "questionsLimit": 9,
    "commentsAnalyzed": 0,
    "commentsLimit": 300
  },
  "settings": null,
  "createdAt": "2026-01-14T..."
}
```

#### `/api/user/usage`
```json
{
  "plan": "free",
  "usage": {
    "videosAnalyzed": 0,
    "videosLimit": 3,
    "questionsUsed": 0,
    "questionsLimit": 9,
    "commentsAnalyzed": 0,
    "commentsLimit": 300
  },
  "percentageUsed": {
    "videos": 0.0,
    "questions": 0.0,
    "comments": 0.0
  }
}
```

### Firestore Data Verification

Check Firebase Console → Firestore Database:

You should see a `users` collection with a document for your test user containing:
- uid
- email
- plan: "free"
- usage object
- createdAt timestamp

### Quota Testing

To test quota enforcement, modify usage manually in Firestore:

1. Go to Firestore → users → {your-uid}
2. Edit `usage.videosAnalyzed` to `3`
3. Try accessing an endpoint with `check_quota("video")`
4. Should receive 402 Payment Required

### API Documentation

Visit http://localhost:8000/docs to see interactive API documentation (Swagger UI).

All authentication-protected endpoints require:
- Header: `Authorization: Bearer {firebase-id-token}`

---

## ✅ Phase 2 Checklist

- [x] Firebase token verification implemented
- [x] User management endpoints created
- [x] Automatic user document creation on first login
- [x] Usage tracking system in place
- [x] Quota enforcement working
- [x] Protected API routes functional
- [x] Firestore schema designed

**Phase 2 Complete!** Ready to proceed to Phase 3: YouTube API Integration.
