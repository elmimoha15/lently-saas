"""
Usage Reset Scheduler
=====================

Automated monthly reset of usage counters for all users.
Can be triggered via:
1. Cloud Scheduler (production)
2. Manual API call (testing)
3. Cron job (alternative)
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict
from firebase_admin import firestore

from ..firebase_init import get_firestore
from ..billing.service import BillingService
from ..billing.schemas import PlanId

logger = logging.getLogger(__name__)


class UsageResetScheduler:
    """
    Handles monthly usage resets for all users.
    
    This should be triggered at the start of each month via Cloud Scheduler.
    """
    
    def __init__(self):
        """Initialize scheduler"""
        self.db = get_firestore()
        self.billing_service = BillingService()
    
    async def reset_all_users(self) -> Dict[str, int]:
        """
        Reset usage for all users whose billing period has ended.
        
        Returns:
            Dict with counts of users processed
        """
        logger.info("Starting monthly usage reset...")
        
        stats = {
            "total_checked": 0,
            "reset_successful": 0,
            "reset_failed": 0,
            "not_due": 0,
        }
        
        try:
            # Get all users
            users_ref = self.db.collection("users")
            users = users_ref.stream()
            
            for user_doc in users:
                user_id = user_doc.id
                stats["total_checked"] += 1
                
                try:
                    # Check if reset is due
                    if await self._should_reset_usage(user_id):
                        await self.billing_service.reset_usage(user_id)
                        stats["reset_successful"] += 1
                        logger.info(f"Reset usage for user {user_id}")
                    else:
                        stats["not_due"] += 1
                except Exception as e:
                    logger.error(f"Failed to reset user {user_id}: {e}")
                    stats["reset_failed"] += 1
            
            logger.info(f"Usage reset complete: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error in reset_all_users: {e}")
            raise
    
    async def _should_reset_usage(self, user_id: str) -> bool:
        """
        Check if user's usage should be reset.
        
        Returns True if:
        - User has an active subscription
        - Current period has ended
        """
        try:
            usage = await self.billing_service.get_user_usage(user_id)
            
            # Check if period has ended
            if usage.period_end and usage.period_end <= datetime.utcnow():
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking reset status for {user_id}: {e}")
            return False
    
    async def reset_user(self, user_id: str, force: bool = False) -> bool:
        """
        Reset usage for a specific user.
        
        Args:
            user_id: Firebase user ID
            force: If True, reset even if period hasn't ended
        
        Returns:
            True if reset was performed
        """
        try:
            if force or await self._should_reset_usage(user_id):
                await self.billing_service.reset_usage(user_id)
                logger.info(f"Reset usage for user {user_id} (force={force})")
                return True
            else:
                logger.info(f"Usage reset not due for user {user_id}")
                return False
        except Exception as e:
            logger.error(f"Error resetting user {user_id}: {e}")
            raise
    
    async def get_users_due_for_reset(self) -> List[str]:
        """
        Get list of user IDs whose usage should be reset.
        
        Useful for monitoring and testing.
        """
        due_users = []
        
        try:
            users_ref = self.db.collection("users")
            users = users_ref.stream()
            
            for user_doc in users:
                user_id = user_doc.id
                if await self._should_reset_usage(user_id):
                    due_users.append(user_id)
            
            return due_users
            
        except Exception as e:
            logger.error(f"Error getting users due for reset: {e}")
            return []


# Singleton instance
usage_reset_scheduler = UsageResetScheduler()


async def get_usage_reset_scheduler() -> UsageResetScheduler:
    """Dependency injection for FastAPI"""
    return usage_reset_scheduler
