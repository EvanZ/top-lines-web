#!/usr/bin/env bash
set -euo pipefail

# Deploy the built frontend to S3 (optionally invalidate CloudFront).
# Required env:
#   S3_BUCKET            - target bucket for the static site
# Optional:
#   S3_PREFIX            - key prefix under the bucket (default: root)
#   VITE_API_BASE        - API base URL baked into the build
#   VITE_DATA_BASE       - Data base URL baked into the build
#   CF_DISTRIBUTION_ID   - if set, a CloudFront invalidation will be created

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

: "${S3_BUCKET:?S3_BUCKET is required}"

S3_PREFIX="${S3_PREFIX:-}"
S3_DEST="s3://${S3_BUCKET}/${S3_PREFIX}"
S3_DEST="${S3_DEST%/}" # trim trailing slash

echo "Building frontend with VITE_API_BASE=${VITE_API_BASE:-} VITE_DATA_BASE=${VITE_DATA_BASE:-}"
pushd "$FRONTEND_DIR" >/dev/null
npm ci
VITE_API_BASE="${VITE_API_BASE:-}" \
VITE_DATA_BASE="${VITE_DATA_BASE:-}" \
  npm run build
popd >/dev/null

echo "Syncing dist/ to ${S3_DEST}"
aws s3 sync "$FRONTEND_DIR/dist" "$S3_DEST" --delete

if [[ -n "${CF_DISTRIBUTION_ID:-}" ]]; then
  echo "Creating CloudFront invalidation for /*"
  aws cloudfront create-invalidation --distribution-id "$CF_DISTRIBUTION_ID" --paths "/*"
fi

echo "Deploy complete."
