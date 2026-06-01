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

**You do not deploy Apps Script to Firebase.** Save the script in Google, add a trigger, and authorize once. Only the Google account that can manage the form or response sheet usually can create that trigger.

### Script + trigger (form or spreadsheet)

Use **one file**: `google-apps-script/writing-center-form-sync.gs` (handles both event types).

1. Form → **Responses** → **Link to Sheets**.
2. Open **Apps Script** from the **form** *or* the **response spreadsheet** (wherever you can add a trigger).
3. Paste/replace with the latest `writing-center-form-sync.gs` from the repo.
4. **Script properties**: `WC_SYNC_URL`, `WC_SYNC_SECRET` (see below).
5. **Triggers** → `onFormSubmit` → **On form submit**:
   - Script on the **form** → **From form**
   - Script on the **sheet** → **From spreadsheet**
6. **Authorize**. Test by **submitting the form** (do not use Run in the editor — `e` is missing and you get `e.response` undefined).

### Permission error on “From form” trigger

Form owner links responses to a Sheet and gives you **Editor** on the spreadsheet, then use the sheet script project with **From spreadsheet** (same `.gs` file as above).

### “You do not have permission to perform this action”

- Only the **form owner** (or a Workspace admin) can install a **From form** trigger unless you use Option B on the sheet.
- LCPS Google Workspace may block **external HTTP** from Apps Script — an admin may need to allow it, or the form owner uses a personal Google account for the club form.
- You are **not** “deploying” to Code4Community; you are authorizing Google to call your site’s API.

## Flow

1. Student logs into Code4Community → Writing Center → **Request Help** → **Async** → **Open Google Form** (email prefilled when entry IDs are configured).
2. Student submits the Google Form.
3. Apps Script POSTs to `/api/writing-center/google-form-sync`.
4. API creates a Firestore `sessions` doc (`sessionType: ASYNC`, `status: PENDING`).
5. Tutors see it on their dashboard like any other request. **Async** sessions link to that answer in **Google Forms → Responses** (`…/forms/d/…/edit#response=…`), not the spreadsheet row.

### Form response links (Apps Script)

1. Paste the latest `writing-center-form-sync.gs` and **Save**.
2. **Project Settings** → enable **Google Forms API** (or Cloud Console API for the script’s GCP project).
3. Optional `appsscript.json` scopes in `google-apps-script/appsscript.json` — re-run the trigger and **Authorize** when asked for Forms response access.
4. Optional script property `WC_FORM_EDIT_URL` = `https://docs.google.com/forms/d/YOUR_FORM_ID/edit` (fallback if API lookup fails).

Site fallback for older sessions: `NEXT_PUBLIC_WC_FORM_EDIT_URL` (form **edit** URL, from Form → ⋮ in edit mode).

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
