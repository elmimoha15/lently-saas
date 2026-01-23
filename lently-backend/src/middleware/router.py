"""
User management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from src.middleware.auth import get_current_user, get_current_user_with_plan, AuthenticatedUser
from src.middleware.schemas import UserResponse, UpdateProfileRequest, UpdateSettingsRequest
from src.firebase_init import get_firestore
from google.cloud import firestore
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user", tags=["User Management"])

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(user_data: dict = Depends(get_current_user_with_plan)):
    """
    Get current authenticated user's profile
    """
    return user_data

@router.put("/profile")
async def update_profile(
    request: UpdateProfileRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Update user profile (display name, photo URL)
    """
    try:
        db = get_firestore()
        user_ref = db.collection("users").document(user.uid)
        
        update_data = {}
        if request.displayName is not None:
            update_data["displayName"] = request.displayName
        if request.photoURL is not None:
            update_data["photoURL"] = request.photoURL
        
        if update_data:
            user_ref.update(update_data)
            logger.info(f"Profile updated for user: {user.uid}")
        
        return {"message": "Profile updated successfully", "updated": update_data}
        
    except Exception as e:
        logger.error(f"Failed to update profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

@router.put("/settings")
async def update_settings(
    request: UpdateSettingsRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Update user settings/preferences
    """
    try:
        db = get_firestore()
        user_ref = db.collection("users").document(user.uid)
        
        update_data = {}
        if request.emailNotifications is not None:
            update_data["settings.emailNotifications"] = request.emailNotifications
        if request.monthlyReports is not None:
            update_data["settings.monthlyReports"] = request.monthlyReports
        if request.betaFeatures is not None:
            update_data["settings.betaFeatures"] = request.betaFeatures
        
        if update_data:
            user_ref.update(update_data)
            logger.info(f"Settings updated for user: {user.uid}")
        
        return {"message": "Settings updated successfully", "updated": update_data}
        
    except Exception as e:
        logger.error(f"Failed to update settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update settings"
        )

@router.get("/usage")
async def get_usage_stats(user_data: dict = Depends(get_current_user_with_plan)):
    """
    Get current usage statistics and limits
    """
    usage = user_data.get("usage", {})
    plan = user_data.get("plan", "free")
    
    return {
        "plan": plan,
        "usage": usage,
        "percentageUsed": {
            "videos": (usage.get("videosAnalyzed", 0) / usage.get("videosLimit", 1)) * 100,
            "questions": (usage.get("questionsUsed", 0) / usage.get("questionsLimit", 1)) * 100,
            "comments": (usage.get("commentsAnalyzed", 0) / usage.get("commentsLimit", 1)) * 100,
        }
    }

@router.delete("/account")
async def delete_account(user: AuthenticatedUser = Depends(get_current_user)):
    """
    Delete user account and all associated data
    ⚠️ This action is irreversible!
    
    Deletes:
    - User profile
    - All analyses and video data
    - All AI conversations
    - Usage statistics
    - Billing records (subscription canceled if active)
    """
    try:
        db = get_firestore()
        user_id = user.uid
        
        logger.info(f"Starting account deletion for user: {user_id}")
        
        # 1. Delete all analyses
        analyses_ref = db.collection("analyses").where("user_id", "==", user_id)
        analyses = analyses_ref.stream()
        analysis_count = 0
        for analysis in analyses:
            analysis.reference.delete()
            analysis_count += 1
        logger.info(f"Deleted {analysis_count} analyses")
        
        # 2. Delete all conversations
        conversations_ref = db.collection("conversations").where("user_id", "==", user_id)
        conversations = conversations_ref.stream()
        conversation_count = 0
        for conversation in conversations:
            conversation.reference.delete()
            conversation_count += 1
        logger.info(f"Deleted {conversation_count} conversations")
        
        # 3. Delete usage documents
        usage_ref = db.collection("usage").where("user_id", "==", user_id)
        usage_docs = usage_ref.stream()
        usage_count = 0
        for usage_doc in usage_docs:
            usage_doc.reference.delete()
            usage_count += 1
        logger.info(f"Deleted {usage_count} usage records")
        
        # 4. Delete user document
        user_ref = db.collection("users").document(user_id)
        user_ref.delete()
        logger.info(f"Deleted user document")
        
        # 5. Delete Firebase Auth user
        try:
            from firebase_admin import auth as admin_auth
            admin_auth.delete_user(user_id)
            logger.info(f"Deleted Firebase Auth user")
        except Exception as auth_error:
            logger.warning(f"Could not delete Firebase Auth user: {auth_error}")
        
        logger.info(f"Account deletion complete for user: {user_id}")
        logger.info(f"Summary: {analysis_count} analyses, {conversation_count} conversations, {usage_count} usage records deleted")
        
        return {
            "message": "Account deleted successfully",
            "deleted": {
                "analyses": analysis_count,
                "conversations": conversation_count,
                "usage_records": usage_count
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to delete account: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account"
        )
