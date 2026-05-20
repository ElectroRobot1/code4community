#!/usr/bin/env bash
# Deploy Firebase Hosting config (Cloud Run rewrites) via REST API when Firebase CLI auth is unavailable.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_ID="code4community26"
SITE_ID="code4community26"
SERVICE_ID="code4community-app"
REGION="us-east4"
# Non-root file only — static files at / take precedence over Cloud Run rewrites.
PUBLIC_FILE="public/deploy-marker.txt"

TOKEN="$(gcloud auth print-access-token)"
AUTH_HEADERS=(
  -H "Authorization: Bearer ${TOKEN}"
  -H "x-goog-user-project: ${PROJECT_ID}"
  -H "Content-Type: application/json"
)

echo "→ Creating Hosting version with Cloud Run rewrite to ${SERVICE_ID}"
VERSION_JSON="$(curl -s "${AUTH_HEADERS[@]}" \
  -d "{
    \"config\": {
      \"rewrites\": [{
        \"glob\": \"**\",
        \"run\": {
          \"serviceId\": \"${SERVICE_ID}\",
          \"region\": \"${REGION}\"
        }
      }]
    }
  }" \
  "https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/versions")"

VERSION_NAME="$(echo "$VERSION_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])")"
VERSION_ID="${VERSION_NAME##*/}"
echo "   Version: ${VERSION_NAME}"

GZIP_FILE="$(mktemp).gz"
gzip -c "$PUBLIC_FILE" > "$GZIP_FILE"
FILE_HASH="$(openssl dgst -sha256 "$GZIP_FILE" | awk '{print $2}')"

echo "→ Registering ${PUBLIC_FILE} (hash ${FILE_HASH:0:12}…)"
POPULATE_JSON="$(curl -s "${AUTH_HEADERS[@]}" \
  -d "{\"files\": {\"/deploy-marker.txt\": \"${FILE_HASH}\"}}" \
  "https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/versions/${VERSION_ID}:populateFiles")"

UPLOAD_URL="$(echo "$POPULATE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('uploadUrl',''))")"
UPLOAD_REQUIRED="$(echo "$POPULATE_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(','.join(d.get('uploadRequiredHashes',[])))")"

if echo ",${UPLOAD_REQUIRED}," | grep -q ",${FILE_HASH},"; then
  echo "→ Uploading file bytes"
  curl -s -X POST \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@${GZIP_FILE}" \
    "${UPLOAD_URL}/${FILE_HASH}" >/dev/null
fi

rm -f "$GZIP_FILE"

echo "→ Finalizing version"
curl -s "${AUTH_HEADERS[@]}" -X PATCH \
  -d '{"status":"FINALIZED"}' \
  "https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/versions/${VERSION_ID}?update_mask=status" >/dev/null

echo "→ Releasing to live site"
curl -s "${AUTH_HEADERS[@]}" -X POST \
  "https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/releases?versionName=${VERSION_NAME}" >/dev/null

echo ""
echo "Done. Live site: https://${SITE_ID}.web.app"
