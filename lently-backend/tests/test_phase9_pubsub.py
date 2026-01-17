#!/usr/bin/env python3
"""
Test script for Phase 9: Pub/Sub Job Orchestration
Run this to verify the implementation works correctly
"""

import asyncio
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.pubsub.schemas import AnalysisJob, AnalysisJobStatus
from src.pubsub.publisher import JobPublisher


async def test_job_publisher():
    """Test job publisher functionality"""
    print("🧪 Testing Job Publisher...")
    
    publisher = JobPublisher()
    
    # Test 1: Check if publisher initialized
    if publisher.publisher is None:
        print("⚠️  Pub/Sub not configured (this is OK for development)")
        print("   Jobs will be marked as PENDING")
    else:
        print(f"✅ Pub/Sub publisher initialized")
        print(f"   Topic: {publisher.topic_path}")
    
    # Test 2: Create a test job
    print("\n📝 Creating test job...")
    try:
        job_id = await publisher.publish_analysis_job(
            user_id="test_user_123",
            video_id="dQw4w9WgXcQ",
            max_comments=50,
            include_sentiment=True,
            include_classification=True,
            include_insights=True,
            include_summary=True,
            priority=5
        )
        print(f"✅ Job created: {job_id}")
    except Exception as e:
        print(f"❌ Failed to create job: {e}")
        return False
    
    # Test 3: Get job status
    print("\n🔍 Checking job status...")
    try:
        status = await publisher.get_job_status(job_id)
        if status:
            print(f"✅ Job status retrieved:")
            print(f"   Status: {status.get('status')}")
            print(f"   Video ID: {status.get('video_id')}")
            print(f"   Created: {status.get('created_at')}")
        else:
            print("❌ Job not found")
            return False
    except Exception as e:
        print(f"❌ Failed to get status: {e}")
        return False
    
    # Test 4: Cancel job
    print("\n🚫 Testing job cancellation...")
    try:
        cancelled = await publisher.cancel_job(job_id, "test_user_123")
        if cancelled:
            print("✅ Job cancelled successfully")
        else:
            print("⚠️  Job could not be cancelled (may have started processing)")
    except Exception as e:
        print(f"❌ Failed to cancel: {e}")
        return False
    
    print("\n" + "="*60)
    print("✅ All tests passed!")
    print("="*60)
    return True


def test_schemas():
    """Test schema models"""
    print("\n🧪 Testing Schemas...")
    
    # Test AnalysisJob model
    job = AnalysisJob(
        job_id="test-123",
        user_id="user-456",
        video_id="video-789",
        max_comments=100
    )
    
    print(f"✅ AnalysisJob model: {job.job_id}")
    
    # Test JSON serialization
    job_json = job.model_dump_json()
    print(f"✅ JSON serialization works")
    
    return True


async def main():
    """Run all tests"""
    print("="*60)
    print("Phase 9: Pub/Sub Job Orchestration - Test Suite")
    print("="*60)
    
    # Test 1: Schemas
    if not test_schemas():
        print("\n❌ Schema tests failed")
        return
    
    # Test 2: Publisher
    if not await test_job_publisher():
        print("\n❌ Publisher tests failed")
        return
    
    print("\n🎉 All Phase 9 tests passed!")
    print("\n📋 Next steps:")
    print("   1. Set up Cloud Pub/Sub (see PHASE9_COMPLETE.md)")
    print("   2. Update .env with Pub/Sub configuration")
    print("   3. Run the worker: python -m src.pubsub.worker")
    print("   4. Test async endpoints with curl or Postman")


if __name__ == "__main__":
    asyncio.run(main())
