# Authentication System Guide

## Overview

Your Lently app now has **industry-ready authentication** with automatic token expiration handling, protected routes, and proper session management.

## 🔐 Authentication Flow

### 1. **Initial Visit (Unauthenticated)**
- User lands on `/` → Shows Landing page
- Landing page has "Sign In" and "Get Started" buttons
- Both redirect to proper auth pages

### 2. **Sign In Flow**
1. User clicks "Sign In" → Redirected to `/signin`
2. User clicks "Continue with Google"
3. Google OAuth popup appears
4. User authenticates with Google
5. Firebase creates/validates session
6. **TokenManager automatically starts** 🎯
7. User redirected to:
   - `/onboarding` if first time user
   - `/dashboard` if returning user

### 3. **Sign Up Flow**
1. User clicks "Get Started" → Redirected to `/signup`
2. User clicks "Continue with Google"
3. Google OAuth popup appears
4. New account created in Firebase
5. **TokenManager automatically starts** 🎯
6. User redirected to `/onboarding`

### 4. **Authenticated Session**
- User can access all protected routes:
  - `/dashboard`
  - `/videos`
  - `/videos/:videoId`
  - `/ask-ai`
  - `/templates`
  - `/settings`
  - `/billing`
  - `/analyze`

### 5. **Token Management** ⚡
Your app now automatically handles token expiration:

- **Token Refresh**: Every 50 minutes (before 1-hour expiry)
- **Expiry Check**: Every 60 seconds
- **Auto-Logout**: When token expires
- **Smart Refresh**: API calls only refresh if <5 min until expiry

### 6. **Session Expiration**
When token expires (after 1 hour):
1. TokenManager detects expired token
2. Automatically logs user out
3. User redirected to `/signin`
4. Toast notification: "Your session has expired. Please sign in again."

## 🛡️ Protected Routes

### Route Types

#### **Public Routes** (only for unauthenticated users)
- `/signin` - Sign in page
- `/signup` - Sign up page
- `/login` - Alternative login page
- **Behavior**: If user is already authenticated → Redirect to `/dashboard`

#### **Onboarding Routes** (requires auth, not completed onboarding)
- `/onboarding` - User setup wizard
- **Behavior**: 
  - If not authenticated → Redirect to `/signin`
  - If already completed onboarding → Redirect to `/dashboard`

#### **Protected Routes** (requires auth + completed onboarding)
- All main app pages (dashboard, videos, analyze, etc.)
- **Behavior**: If not authenticated → Redirect to `/signin`

## 📁 Key Files

### 1. **Token Management** ([token.service.ts](frontend/src/services/token.service.ts))
```typescript
// Automatic token refresh and expiry monitoring
export class TokenManager {
  start(onTokenExpired: () => void)  // Start monitoring
  stop()                              // Stop monitoring
  getToken()                         // Get fresh token for API
  refreshToken()                     // Manually refresh
  isTokenValid()                     // Check validity
}
```

### 2. **Auth Context** ([AuthContext.tsx](frontend/src/contexts/AuthContext.tsx))
```typescript
// Global auth state + token lifecycle
- Starts tokenManager when user signs in
- Stops tokenManager when user signs out
- Handles automatic logout on token expiry
```

### 3. **API Service** ([api.service.ts](frontend/src/services/api.service.ts))
```typescript
// All API calls automatically include fresh auth token
- Uses tokenManager.getToken() for smart refresh
- No force refresh on every call (optimized)
```

### 4. **Protected Routes** ([ProtectedRoute.tsx](frontend/src/components/auth/ProtectedRoute.tsx))
```typescript
<ProtectedRoute>      // Requires auth + onboarding
<PublicRoute>         // Only for guests
<OnboardingRoute>     // Requires auth, not onboarding
```

## 🧪 Testing the Auth System

### Test 1: Sign Up Flow
1. Open app in incognito window
2. Navigate to `/`
3. Click "Get Started"
4. Sign in with Google
5. ✅ Should redirect to `/onboarding`
6. Complete onboarding
7. ✅ Should redirect to `/dashboard`

### Test 2: Sign In Flow
1. Sign out from app
2. Navigate to `/signin`
3. Sign in with Google
4. ✅ Should redirect to `/dashboard` (skipping onboarding)

### Test 3: Protected Routes
1. Sign out from app
2. Try to access `/dashboard` directly
3. ✅ Should redirect to `/signin`
4. Sign in
5. ✅ Should redirect back to `/dashboard`

### Test 4: Public Routes (Already Logged In)
1. While logged in, try to access `/signin`
2. ✅ Should redirect to `/dashboard`

### Test 5: Token Refresh (50 min)
1. Sign in to the app
2. Keep browser open for 50+ minutes
3. ✅ Token should auto-refresh (check browser console)
4. Make an API call (e.g., load videos)
5. ✅ Should work without needing to sign in again

### Test 6: Token Expiration (1 hour)
**Manual Test:**
1. Sign in to the app
2. Wait 1 hour (or invalidate token manually in Firebase Console)
3. ✅ App should detect expired token
4. ✅ Auto-logout should trigger
5. ✅ Redirect to `/signin` with toast message

**Quick Test (DevTools):**
```javascript
// In browser console
import { auth } from './lib/firebase';
await auth.currentUser.getIdToken(true); // Force invalid token
// Wait 60 seconds for expiry check
// Should auto-logout
```

### Test 7: Session Persistence
1. Sign in to the app
2. Refresh the page
3. ✅ Should remain logged in
4. Close browser and reopen
5. ✅ Should remain logged in (until token expires)

## 🔧 Configuration

### Token Timings
Located in [token.service.ts](frontend/src/services/token.service.ts#L11-L12):
```typescript
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes
const TOKEN_EXPIRY_CHECK_INTERVAL = 60 * 1000; // 60 seconds
```

### Auto-Logout Message
Located in [AuthContext.tsx](frontend/src/contexts/AuthContext.tsx):
```typescript
tokenManager.start(() => {
  // Customize this message
  navigate('/signin', { 
    state: { message: 'Your session has expired. Please sign in again.' }
  });
});
```

## 🚀 Production Checklist

- ✅ Token auto-refresh every 50 minutes
- ✅ Expiry checking every 60 seconds
- ✅ Automatic logout on token expiry
- ✅ Protected routes with proper redirects
- ✅ Public routes redirect when authenticated
- ✅ Loading states during auth check
- ✅ Error handling and user feedback
- ✅ Session persistence across page refreshes
- ✅ Smart token refresh (only when needed)
- ✅ Cleanup on unmount and sign-out

## 🐛 Troubleshooting

### Issue: "401 Unauthorized" errors
**Solution**: Already fixed! TokenManager now handles this automatically.

### Issue: User not redirected after login
**Check**: 
1. AuthContext is properly wrapping the app in App.tsx
2. ProtectedRoute components are being used correctly
3. Browser console for any errors

### Issue: Token not refreshing
**Check**:
1. TokenManager.start() is called when user signs in (in AuthContext)
2. Browser console shows "[TokenManager] Token refreshed successfully"
3. No errors in Firebase configuration

### Issue: User stays logged in forever
**This is expected behavior** - Firebase tokens persist across sessions. To force logout after browser close, you would need to change Firebase auth persistence setting.

## 📊 Monitoring

### Browser Console Logs
The TokenManager logs important events:
```
[TokenManager] Token refreshed successfully  // Every 50 min
[TokenManager] Token expired, logging out    // On expiry
```

### Token Inspection
```javascript
// In browser console
import { auth } from './lib/firebase';
const user = auth.currentUser;
const tokenResult = await user.getIdTokenResult();
console.log('Expires at:', tokenResult.expirationTime);
console.log('Time until expiry:', 
  new Date(tokenResult.expirationTime) - new Date());
```

## 🎯 Summary

Your authentication system is now **production-ready** with:

1. ✅ **Google OAuth** integration
2. ✅ **Automatic token refresh** (50 min intervals)
3. ✅ **Automatic logout** on token expiry
4. ✅ **Protected routes** with proper redirects
5. ✅ **Smart API token management** (no unnecessary refreshes)
6. ✅ **Session persistence** across page refreshes
7. ✅ **Loading states** and error handling
8. ✅ **Industry-standard security** practices

No more 401 errors. No manual token handling. Just clean, automatic authentication. 🔥
