# AI Study (quiz generator)

## Server setup

1. Create an API key in [Google AI Studio](https://aistudio.google.com/apikey) (Gemini).
2. Add to **local** `.env.local`:
   ```bash
   GEMINI_API_KEY=your_key_here
   ```
   Optional: set `GEMINI_MODEL` (default: **`gemini-2.5-flash`**). Older `gemini-2.0-flash` is deprecated and may have **no free quota** (limit 0). You can also use `GOOGLE_AI_API_KEY` instead of `GEMINI_API_KEY`.
3. On **Vercel**: Project → Settings → Environment Variables → add `GEMINI_API_KEY` for Production (and Preview if you want).

Restart the dev server after changing env vars.

**Never commit API keys.** If a key was shared publicly, revoke it in Google AI Studio and create a new one.

## How it works

- Signed-in users POST their notes to `/api/study/generate-quiz`.
- The route verifies the Firebase ID token, then calls **Google Gemini** to return JSON for a multiple-choice quiz grounded in the notes.
- Request body may include **`subject`**: `"history"` (default) or `"science"` only. **`math`** is not supported by this API—Math practice is **programmatic** on the Study page (`components/study/StudyQuiz.js`).
- Notes are not stored; they are only sent for that request.

## Limits

- ~120,000 characters max per request (roughly “long notes”).
- 3–15 questions per quiz (UI defaults to 8).
