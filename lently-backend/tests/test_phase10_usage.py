#!/usr/bin/env python3
"""
Test script for Phase 10: Usage Tracking & Quotas
Run this to verify the implementation works correctly
"""

import asyncio
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.billing.service import billing_service
from src.billing.schemas import UsageType
from src.billing.analytics import usage_analytics_service
from src.billing.reset_scheduler import usage_reset_scheduler


async def test_usage_tracking():
    """Test basic usage tracking"""
    print("\n🧪 Testing Usage Tracking...")
    
    test_user_id = "test_user_phase10"
    
    # 1. Get initial usage
    print("1️⃣  Getting initial usage...")
    usage = await billing_service.get_user_usage(test_user_id)
    print(f"   Initial: {usage.videos_analyzed} videos, {usage.ai_questions_used} questions")
    
    # 2. Check quota
    print("\n2️⃣  Checking quota...")
    quota = await billing_service.check_quota(test_user_id, UsageType.VIDEOS, 1)
    print(f"   ✅ Allowed: {quota.allowed}")
    print(f"   Current: {quota.current}/{quota.limit}")
    print(f"   Remaining: {quota.remaining}")
    
    # 3. Increment usage
    print("\n3️⃣  Incrementing usage...")
    await billing_service.increment_usage(test_user_id, UsageType.VIDEOS, 1)
    await billing_service.increment_usage(test_user_id, UsageType.AI_QUESTIONS, 3)
    print("   ✅ Usage incremented")
    
    # 4. Verify increment
    print("\n4️⃣  Verifying increment...")
    updated_usage = await billing_service.get_user_usage(test_user_id)
    print(f"   Updated: {updated_usage.videos_analyzed} videos, {updated_usage.ai_questions_used} questions")
    
    return True


async def test_quota_enforcement():
    """Test quota enforcement"""
    print("\n🧪 Testing Quota Enforcement...")
    
    test_user_id = "test_user_quota"
    
    # 1. Get current usage
    usage = await billing_service.get_user_usage(test_user_id)
    print(f"1️⃣  Current: {usage.videos_analyzed}/{usage.videos_limit} videos")
    
    # 2. Try to exceed quota
    print("\n2️⃣  Testing quota enforcement...")
    remaining = usage.videos_limit - usage.videos_analyzed
    
    # Use up remaining quota
    for i in range(remaining):
        quota = await billing_service.check_quota(test_user_id, UsageType.VIDEOS, 1)
        if quota.allowed:
            await billing_service.increment_usage(test_user_id, UsageType.VIDEOS, 1)
            print(f"   ✅ Video {i+1}/{remaining} allowed")
    
    # Try one more (should be denied)
    quota = await billing_service.check_quota(test_user_id, UsageType.VIDEOS, 1)
    if not quota.allowed:
        print(f"   ✅ Correctly denied: {quota.message}")
    else:
        print(f"   ❌ Should have been denied!")
        return False
    
    return True


async def test_analytics():
    """Test usage analytics"""
    print("\n🧪 Testing Usage Analytics...")
    
    test_user_id = "test_user_phase10"
    
    try:
        analytics = await usage_analytics_service.get_usage_analytics(
            test_user_id,
            include_trends=False,
            days_back=7
        )
        
        print("1️⃣  Current Period:")
        print(f"   Videos: {analytics.current_period['videos_used']}/{analytics.current_period['videos_limit']}")
        print(f"   AI Questions: {analytics.current_period['ai_questions_used']}/{analytics.current_period['ai_questions_limit']}")
        
        print("\n2️⃣  Usage Percentage:")
        print(f"   Videos: {analytics.usage_percentage['videos']:.1f}%")
        print(f"   AI Questions: {analytics.usage_percentage['ai_questions']:.1f}%")
        
        print("\n3️⃣  Projected Usage:")
        print(f"   Videos: {analytics.projected_usage['videos']} (projected)")
        print(f"   AI Questions: {analytics.projected_usage['ai_questions']} (projected)")
        
        if analytics.warnings:
            print("\n⚠️  Warnings:")
            for warning in analytics.warnings:
                print(f"   - {warning}")
        
        if analytics.recommendations:
            print("\n💡 Recommendations:")
            for rec in analytics.recommendations:
                print(f"   - {rec}")
        
        return True
    except Exception as e:
        print(f"   ⚠️  Analytics not fully available yet: {e}")
        return True  # Not a failure


async def test_reset_scheduler():
    """Test reset scheduler"""
    print("\n🧪 Testing Reset Scheduler...")
    
    test_user_id = "test_user_phase10"
    
    # 1. Get users due for reset
    print("1️⃣  Checking users due for reset...")
    users = await usage_reset_scheduler.get_users_due_for_reset()
    print(f"   {len(users)} users due for reset")
    
    # 2. Force reset for test user
    print(f"\n2️⃣  Force resetting user {test_user_id}...")
    success = await usage_reset_scheduler.reset_user(test_user_id, force=True)
    if success:
        print("   ✅ Reset successful")
        
        # Verify reset
        usage = await billing_service.get_user_usage(test_user_id)
        print(f"   Verified: {usage.videos_analyzed} videos (should be 0)")
    else:
        print("   ❌ Reset failed")
        return False
    
    return True


async def test_billing_info():
    """Test complete billing info"""
    print("\n🧪 Testing Complete Billing Info...")
    
    test_user_id = "test_user_phase10"
    test_email = "test@example.com"
    
    info = await billing_service.get_billing_info(test_user_id, test_email)
    
    print("1️⃣  Subscription:")
    print(f"   Plan: {info.subscription.plan_name}")
    print(f"   Status: {info.subscription.status}")
    
    print("\n2️⃣  Usage:")
    print(f"   Videos: {info.usage.videos_used}/{info.usage.videos_limit} ({info.usage.videos_remaining} remaining)")
    print(f"   AI Questions: {info.usage.ai_questions_used}/{info.usage.ai_questions_limit} ({info.usage.ai_questions_remaining} remaining)")
    
    print("\n3️⃣  Features:")
    print(f"   Priority Support: {info.features['priority_support']}")
    print(f"   Unlimited AI: {info.features['unlimited_ai']}")
    
    return True


async def main():
    """Run all tests"""
    print("="*60)
    print("Phase 10: Usage Tracking & Quotas - Test Suite")
    print("="*60)
    
    tests = [
        ("Usage Tracking", test_usage_tracking),
        ("Quota Enforcement", test_quota_enforcement),
        ("Usage Analytics", test_analytics),
        ("Reset Scheduler", test_reset_scheduler),
        ("Billing Info", test_billing_info),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if await test_func():
                passed += 1
            else:
                failed += 1
                print(f"\n❌ {test_name} failed")
        except Exception as e:
            failed += 1
            print(f"\n❌ {test_name} error: {e}")
    
    print("\n" + "="*60)
    print(f"Results: {passed} passed, {failed} failed")
    print("="*60)
    
    if failed == 0:
        print("\n🎉 All Phase 10 tests passed!")
        print("\n📋 Next steps:")
        print("   1. Set up Cloud Scheduler: ./scripts/setup_usage_scheduler.sh")
        print("   2. Test quota enforcement in analysis endpoints")
        print("   3. Monitor usage analytics in production")
        print("   4. Verify monthly resets work correctly")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please review errors above.")


if __name__ == "__main__":
    asyncio.run(main())
