#!/usr/bin/env bash
# One-time GCP setup for Writing Center Google Form response deep links.
# Requires: gcloud logged in as the same Google account that owns the form + Apps Script.
set -euo pipefail

PROJECT_ID="${WC_GCP_PROJECT_ID:-code4community26}"
PROJECT_NUMBER="${WC_GCP_PROJECT_NUMBER:-698474286096}"

echo "==> Enabling Google Forms API on ${PROJECT_ID}..."
gcloud services enable forms.googleapis.com --project="${PROJECT_ID}"

echo ""
echo "Done. Forms API is enabled on your GCP project."
echo ""
echo "Next (Apps Script UI — same Google account, ~2 min):"
echo "  1. Open your response spreadsheet → Extensions → Apps Script"
echo "  2. Project settings (gear) → Google Cloud Platform (GCP) Project"
echo "     → Change project → paste project number: ${PROJECT_NUMBER}"
echo "     (or pick project: ${PROJECT_ID})"
echo "  3. Enable 'Show appsscript.json' → paste oauthScopes from:"
echo "     google-apps-script/appsscript.json in this repo → Save"
echo "  4. Script properties: WC_SYNC_URL, WC_SYNC_SECRET, WC_FORM_ID=1nRtpON5vn7gNOgWaMjcK7v9Fh1EXPkZXsXuUUL1sZDE"
echo "  5. Paste google-apps-script/writing-center-form-sync.gs → Save"
echo "  6. Run authorizeFormsApiAccess once → Allow all permissions"
echo "  7. Submit a test form response"
echo ""
echo "GCP console: https://console.cloud.google.com/apis/api/forms.googleapis.com/overview?project=${PROJECT_ID}"
