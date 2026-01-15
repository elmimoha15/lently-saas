"""
User management schemas
"""

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class UserUsage(BaseModel):
    """User quota usage tracking"""
    videosAnalyzed: int = 0
    videosLimit: int = 3
    questionsUsed: int = 0
    questionsLimit: int = 9
    commentsAnalyzed: int = 0
    commentsLimit: int = 300
    periodStart: Optional[datetime] = None
    periodEnd: Optional[datetime] = None

class UserSettings(BaseModel):
    """User preferences"""
    emailNotifications: bool = True
    monthlyReports: bool = True
    betaFeatures: bool = False

class UserResponse(BaseModel):
    """User data returned to client"""
    uid: str
    email: str
    displayName: Optional[str] = None
    photoURL: Optional[str] = None
    plan: str = "free"
    usage: UserUsage
    settings: Optional[UserSettings] = None
    createdAt: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class UpdateProfileRequest(BaseModel):
    """Request to update user profile"""
    displayName: Optional[str] = Field(None, max_length=50)
    photoURL: Optional[str] = None

class UpdateSettingsRequest(BaseModel):
    """Request to update user settings"""
    emailNotifications: Optional[bool] = None
    monthlyReports: Optional[bool] = None
    betaFeatures: Optional[bool] = None
