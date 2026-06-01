# Writing Center ↔ Google Form (async)

Students submit **async** help requests through the club Google Form. Tutors still manage everything in the Writing Center dashboard.

## Form

https://docs.google.com/forms/d/e/1FAIpQLScQJ_8c3mRYa1HKmGuViEkuRaOayLAbyPJlHt64LrAAIRws8A/viewform

The form should collect at least:

- **Email** (LCPS) — must match the student’s Code4Community account
- **Subject / topic** (short text)
- **Link** to their Google Doc or file (URL or file upload)
- **Notes** (optional)

Field titles are matched flexibly (e.g. “Email Address”, “Google Doc link”).

## Server env vars

```bash
# Long random string — shared with Apps Script only
WRITING_CENTER_GOOGLE_FORM_SYNC_SECRET=

# Cloud Run / local Admin SDK (one of):
# FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
# Or use Application Default Credentials on GCP

# Optional prefill (Form → ⋮ → Get pre-filled link → copy entry.XXXXX from URL)
# NEXT_PUBLIC_WC_FORM_ENTRY_EMAIL=entry.123456789
# NEXT_PUBLIC_WC_FORM_ENTRY_NAME=entry.987654321
```

On **Cloud Run**, grant the service account **Firebase Admin** / **Cloud Datastore User** (or use a dedicated service account JSON in `FIREBASE_SERVICE_ACCOUNT_JSON`).

## Apps Script setup

1. Form → **Responses** → **Link to Sheets**.
2. **Extensions** → **Apps Script** → paste `google-apps-script/writing-center-form-sync.gs`.
3. **Project Settings** → **Script properties**:
   - `WC_SYNC_URL` — `https://code4community.net/api/writing-center/google-form-sync`
   - `WC_SYNC_SECRET` — same as `WRITING_CENTER_GOOGLE_FORM_SYNC_SECRET`
4. **Triggers** → **Add trigger** → `onFormSubmit`, event **From form**, select this form.
5. Authorize the script when prompted.

## Flow

1. Student logs into Code4Community → Writing Center → **Request Help** → **Async** → **Open Google Form** (email prefilled when entry IDs are configured).
2. Student submits the Google Form.
3. Apps Script POSTs to `/api/writing-center/google-form-sync`.
4. API creates a Firestore `sessions` doc (`sessionType: ASYNC`, `status: PENDING`).
5. Tutors see it on their dashboard like any other request.

## Local testing

1. Set env vars in `.env.local`.
2. `npm run dev`
3. Point `WC_SYNC_URL` at `http://localhost:3000/api/writing-center/google-form-sync` (Apps Script cannot reach localhost unless you use a tunnel).
4. Or call the API manually:

```bash
curl -X POST http://localhost:3000/api/writing-center/google-form-sync \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"responseId":"test-1","submittedAt":"2026-05-25T12:00:00.000Z","fields":{"Email":"student@lcps.org","Subject":"Essay review","Link":"https://docs.google.com/document/d/example"}}'
```
