/**
 * Web API key used by Identity Toolkit `accounts:lookup` — must match the Firebase app the user signed into.
 */
function getFirebaseWebApiKey() {
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    return process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  }
  // Local dev: keys.dev.js reads same NEXT_PUBLIC_FIREBASE_API_KEY from .env.local
  if (process.env.NODE_ENV === "development") {
    try {
      const { firebaseConfig } = require("../keys.dev.js");
      const k = firebaseConfig?.apiKey;
      if (k) return k;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

/**
 * Verify a Firebase ID token using the Identity Toolkit REST API (no Admin SDK).
 * @param {string} idToken
 * @returns {Promise<{ ok: true, uid: string, email?: string } | { ok: false, error: string }>}
 */
export async function verifyFirebaseIdToken(idToken) {
  const apiKey = getFirebaseWebApiKey();
  if (!idToken || typeof idToken !== "string") {
    return { ok: false, error: "Missing ID token" };
  }
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Server misconfigured: set NEXT_PUBLIC_FIREBASE_API_KEY in .env.local (same project as your Firebase client).",
    };
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error || !Array.isArray(data.users) || data.users.length === 0) {
    return { ok: false, error: "Invalid or expired session. Please sign in again." };
  }

  const u = data.users[0];
  return {
    ok: true,
    uid: u.localId,
    email: u.email,
  };
}
