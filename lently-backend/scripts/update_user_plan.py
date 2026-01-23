#!/usr/bin/env python3
"""
Quick script to update a user's plan in Firestore
"""

import sys
import asyncio
sys.path.insert(0, '/home/elmi/Documents/Projects/Lently/lently-backend')

from src.firebase_init import get_firestore
from google.cloud.firestore import SERVER_TIMESTAMP


async def update_user_plan(user_id: str, plan: str):
    """Update user plan in Firestore"""
    db = get_firestore()
    
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        print(f"User {user_id} not found!")
        return
    
    current_data = user_doc.to_dict()
    print(f"Current plan: {current_data.get('plan', 'unknown')}")
    
    # Update plan
    user_ref.update({
        "plan": plan,
        "updatedAt": SERVER_TIMESTAMP
    })
    
    print(f"✓ Updated user {user_id} to {plan} plan")
    
    # Show updated data
    updated_doc = user_ref.get()
    updated_data = updated_doc.to_dict()
    print(f"New plan: {updated_data.get('plan')}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python update_user_plan.py <user_id> <plan>")
        print("Plans: free, starter, pro, business")
        sys.exit(1)
    
    user_id = sys.argv[1]
    plan = sys.argv[2].lower()
    
    if plan not in ["free", "starter", "pro", "business"]:
        print(f"Invalid plan: {plan}")
        print("Valid plans: free, starter, pro, business")
        sys.exit(1)
    
    asyncio.run(update_user_plan(user_id, plan))
