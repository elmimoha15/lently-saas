#!/bin/bash
# Setup Cloud Scheduler for Monthly Usage Resets
# Run this script to configure automated monthly resets

set -e

# Configuration
PROJECT_ID="${FIREBASE_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
BACKEND_URL="${BACKEND_URL:-https://lently-backend-xyz.run.app}"
ADMIN_KEY="${JWT_SECRET_KEY:0:16}"  # First 16 chars of JWT secret

echo "🔧 Setting up Cloud Scheduler for Lently Usage Resets"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Backend URL: $BACKEND_URL"
echo ""

# Enable Cloud Scheduler API
echo "1️⃣  Enabling Cloud Scheduler API..."
gcloud services enable cloudscheduler.googleapis.com --project="$PROJECT_ID"

# Create monthly reset job
echo "2️⃣  Creating monthly usage reset job..."
gcloud scheduler jobs create http monthly-usage-reset \
  --location="$REGION" \
  --schedule="0 0 1 * *" \
  --time-zone="America/New_York" \
  --uri="${BACKEND_URL}/api/billing/admin/reset-usage" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body="{\"admin_key\": \"${ADMIN_KEY}\"}" \
  --attempt-deadline=600s \
  --max-retry-attempts=3 \
  --description="Monthly usage reset for all users" \
  --project="$PROJECT_ID" \
  || echo "Job already exists, updating..."

# Update if exists
gcloud scheduler jobs update http monthly-usage-reset \
  --location="$REGION" \
  --schedule="0 0 1 * *" \
  --uri="${BACKEND_URL}/api/billing/admin/reset-usage" \
  --message-body="{\"admin_key\": \"${ADMIN_KEY}\"}" \
  --project="$PROJECT_ID" \
  2>/dev/null || true

# Create daily snapshot job
echo "3️⃣  Creating daily usage snapshot job (optional)..."
gcloud scheduler jobs create http daily-usage-snapshot \
  --location="$REGION" \
  --schedule="0 2 * * *" \
  --time-zone="America/New_York" \
  --uri="${BACKEND_URL}/api/billing/admin/snapshot-usage" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body="{\"admin_key\": \"${ADMIN_KEY}\"}" \
  --attempt-deadline=600s \
  --description="Daily usage snapshot for analytics" \
  --project="$PROJECT_ID" \
  || echo "Job already exists, skipping..."

echo ""
echo "✅ Cloud Scheduler setup complete!"
echo ""
echo "Jobs created:"
echo "  - monthly-usage-reset: Runs 1st of every month at midnight EST"
echo "  - daily-usage-snapshot: Runs daily at 2 AM EST"
echo ""
echo "To test manually:"
echo "  gcloud scheduler jobs run monthly-usage-reset --location=$REGION"
echo ""
echo "To view logs:"
echo "  gcloud scheduler jobs describe monthly-usage-reset --location=$REGION"
echo ""
