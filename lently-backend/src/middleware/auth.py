"""
Authentication middleware for Firebase token verification
"""

from fastapi import HTTPException, Security, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.firebase_init import verify_firebase_token, get_firestore
from google.cloud import firestore
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()

class AuthenticatedUser:
    """Represents an authenticated user"""
    def __init__(self, uid: str, email: str, token_data: dict):
        self.uid = uid
        self.email = email
        self.email_verified = token_data.get("email_verified", False)
        self.token_data = token_data

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> AuthenticatedUser:
    """
    Verify Firebase ID token and return authenticated user
    
    Usage in routes:
    @app.get("/protected")
    async def protected_route(user: AuthenticatedUser = Depends(get_current_user)):
        return {"message": f"Hello {user.email}"}
    """
    try:
        token = credentials.credentials
        
        # Verify Firebase token
        decoded_token = verify_firebase_token(token)
        
        # Extract user info
        uid = decoded_token.get("uid")
        email = decoded_token.get("email")
        
        if not uid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID"
            )
        
        # Create authenticated user object
        user = AuthenticatedUser(uid=uid, email=email, token_data=decoded_token)
        
        logger.info(f"User authenticated: {uid}")
        return user
        
    except ValueError as e:
        logger.warning(f"Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

async def get_current_user_with_plan(
    user: AuthenticatedUser = Depends(get_current_user)
) -> dict:
    """
    Get authenticated user with their subscription plan and usage info
    
    Returns:
        dict: User data including plan, usage, and limits
    """
    try:
        db = get_firestore()
        user_ref = db.collection("users").document(user.uid)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            # Create new user document with free plan
            user_data = {
                "uid": user.uid,
                "email": user.email,
                "plan": "free",
                "createdAt": firestore.SERVER_TIMESTAMP,
                "usage": {
                    "videosAnalyzed": 0,
                    "videosLimit": 3,
                    "questionsUsed": 0,
                    "questionsLimit": 9,
                    "commentsAnalyzed": 0,
                    "commentsLimit": 300
                }
            }
            user_ref.set(user_data)
            logger.info(f"Created new user document for: {user.uid}")
            return {**user_data, "uid": user.uid}
        
        user_data = user_doc.to_dict()
        
        # Also check billing subscription for plan (single source of truth)
        sub_ref = db.collection("users").document(user.uid).collection("billing").document("subscription")
        sub_doc = sub_ref.get()
        if sub_doc.exists:
            sub_data = sub_doc.to_dict()
            billing_plan = sub_data.get("plan_id")
            if billing_plan:
                user_data["plan"] = billing_plan
                logger.info(f"User {user.uid} plan from billing: {billing_plan}")
        
        return {**user_data, "uid": user.uid}
        
    except Exception as e:
        logger.error(f"Failed to get user data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user data"
        )

def check_quota(action: str):
    """
    Decorator to check if user has quota available for an action
    
    Usage:
    @app.post("/analyze")
    @check_quota("video")
    async def analyze_video(user_data: dict = Depends(get_current_user_with_plan)):
        ...
    """
    async def quota_checker(user_data: dict = Depends(get_current_user_with_plan)):
        usage = user_data.get("usage", {})
        
        if action == "video":
            used = usage.get("videosAnalyzed", 0)
            limit = usage.get("videosLimit", 0)
            
            if used >= limit:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "error": "quota_exceeded",
                        "message": f"You've used all {limit} video analyses this month",
                        "current": used,
                        "limit": limit,
                        "action": "upgrade"
                    }
                )
        
        elif action == "question":
            used = usage.get("questionsUsed", 0)
            limit = usage.get("questionsLimit", 0)
            
            if used >= limit:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "error": "quota_exceeded",
                        "message": f"You've used all {limit} AI questions this month",
                        "current": used,
                        "limit": limit,
                        "action": "upgrade"
                    }
                )
        
        return user_data
    
    return Depends(quota_checker)
