/**
 * Development Firebase wiring: values come from .env.local (same NEXT_PUBLIC_* keys as production).
 * Safe to commit — no API keys or project IDs are stored in this file.
 *
 * Copy `.env.example` → `.env.local` and paste your dev project config from Firebase Console.
 */

const env = (k) => (typeof process !== "undefined" && process.env[k] ? String(process.env[k]).trim() : "");

export const firebaseConfig = {
  apiKey: env("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: env("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: env("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: env("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: env("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: env("NEXT_PUBLIC_FIREBASE_APP_ID"),
};

const recaptcha = env("NEXT_PUBLIC_RECAPTCHA_SITE_KEY");
export const recaptchaSiteKey = recaptcha.length > 0 ? recaptcha : null;

if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
  const ok = Object.values(firebaseConfig).every(Boolean);
  if (!ok) {
    console.warn(
      "[keys.dev.js] Set all NEXT_PUBLIC_FIREBASE_* variables in .env.local for local dev. See .env.example."
    );
  }
}
