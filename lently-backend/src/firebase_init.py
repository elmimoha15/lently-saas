"""
Firebase Admin SDK Initialization
Handles authentication and Firestore database connection
"""

import firebase_admin
from firebase_admin import credentials, auth, firestore
from functools import lru_cache
import os
from src.config import get_settings

_firebase_app = None
_firestore_client = None

def initialize_firebase():
    """Initialize Firebase Admin SDK with service account"""
    global _firebase_app, _firestore_client
    
    if _firebase_app is not None:
        return _firebase_app
    
    settings = get_settings()
    
    # Check if service account file exists
    if not os.path.exists(settings.firebase_service_account_path):
        raise FileNotFoundError(
            f"Firebase service account file not found at: {settings.firebase_service_account_path}\n"
            "Please download it from Firebase Console > Project Settings > Service Accounts"
        )
    
    # Initialize Firebase Admin SDK
    cred = credentials.Certificate(settings.firebase_service_account_path)
    _firebase_app = firebase_admin.initialize_app(cred)
    
    # Initialize Firestore client
    _firestore_client = firestore.client()
    
    print(f"✅ Firebase initialized for project: {settings.firebase_project_id}")
    
    return _firebase_app

@lru_cache()
def get_firestore() -> firestore.Client:
    """Get Firestore client instance"""
    global _firestore_client
    
    if _firestore_client is None:
        initialize_firebase()
    
    return _firestore_client

def verify_firebase_token(id_token: str) -> dict:
    """
    Verify Firebase ID token and return decoded token
    
    Args:
        id_token: Firebase ID token from client
        
    Returns:
        dict: Decoded token with user info
        
    Raises:
        auth.InvalidIdTokenError: If token is invalid
        auth.ExpiredIdTokenError: If token is expired
    """
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except auth.InvalidIdTokenError:
        raise ValueError("Invalid Firebase ID token")
    except auth.ExpiredIdTokenError:
        raise ValueError("Firebase ID token has expired")
    except Exception as e:
        raise ValueError(f"Firebase token verification failed: {str(e)}")

def get_user_by_uid(uid: str):
    """Get Firebase user by UID"""
    try:
        user = auth.get_user(uid)
        return user
    except auth.UserNotFoundError:
        return None
    except Exception as e:
        raise ValueError(f"Failed to get user: {str(e)}")
