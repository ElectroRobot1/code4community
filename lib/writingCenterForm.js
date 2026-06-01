/** Public Writing Center async Google Form (view / prefill). */
export const WRITING_CENTER_ASYNC_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScQJ_8c3mRYa1HKmGuViEkuRaOayLAbyPJlHt64LrAAIRws8A/viewform";

/**
 * Optional prefill entry IDs from Google Form → ⋮ → Get pre-filled link.
 * Set in .env.local as NEXT_PUBLIC_WC_FORM_ENTRY_* when known.
 */
export function buildAsyncFormUrl({ email = "", name = "" } = {}) {
  const params = new URLSearchParams();
  params.set("usp", "pp_url");

  const emailEntry = process.env.NEXT_PUBLIC_WC_FORM_ENTRY_EMAIL;
  const nameEntry = process.env.NEXT_PUBLIC_WC_FORM_ENTRY_NAME;

  if (emailEntry && email) params.set(emailEntry, email);
  if (nameEntry && name) params.set(nameEntry, name);

  const qs = params.toString();
  return qs ? `${WRITING_CENTER_ASYNC_FORM_URL}?${qs}` : WRITING_CENTER_ASYNC_FORM_URL;
}

/** Opens this submission in Google Forms → Responses (set by Apps Script sync). */
export function getGoogleFormResponseUrl(session) {
  if (session?.googleFormResponseUrl) return session.googleFormResponseUrl;
  const fallback = process.env.NEXT_PUBLIC_WC_FORM_EDIT_URL;
  if (session?.source === "google_form" && fallback) return fallback;
  return null;
}

export function isAsyncFormSession(session) {
  return (
    session?.sessionType === "ASYNC" &&
    (session?.source === "google_form" || Boolean(session?.googleFormResponseId))
  );
}
