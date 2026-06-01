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

Links must use the **Forms API** `responseId` (starts with `ACY…`), not `FormResponse.getId()`.

#### Fix `403 ACCESS_TOKEN_SCOPE_INSUFFICIENT`

The trigger was authorized **before** the Forms scopes were added. Update the manifest, then **re-authorize**:

1. In Apps Script: **Project settings** (gear) → enable **Show "appsscript.json" manifest file in editor**.
2. Open **appsscript.json** and ensure `oauthScopes` includes (copy from `google-apps-script/appsscript.json` in the repo):
   - `https://www.googleapis.com/auth/forms`
   - `https://www.googleapis.com/auth/forms.responses.readonly`
3. **Save** the project.
4. In the editor, select **`authorizeFormsApiAccess`** → **Run** → **Review permissions** → allow all scopes.
5. If there is no permission prompt: [Google Account → Third-party access](https://myaccount.google.com/permissions) → remove access for this script → run **`authorizeFormsApiAccess`** again.
6. **Executions** should log `Forms API OK` (not 403).
7. **Services** (+) → **Google Forms API** v1, and enable the API in [Cloud Console](https://console.cloud.google.com/apis/library/forms.googleapis.com) for the script’s GCP project.

Then submit a test form response. Executions should not show Forms API 403.

Optional script property `WC_FORM_ID` = `1nRtpON5vn7gNOgWaMjcK7v9Fh1EXPkZXsXuUUL1sZDE` if the script cannot detect the form.

**Older sessions** without `googleFormApiResponseId` need a new form submit to get a working deep link.

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
