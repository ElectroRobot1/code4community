import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification, fetchSignInMethodsForEmail, signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, signOut, onAuthStateChanged, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, applyActionCode } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

import { firebaseConfig as devFirebaseConfig, recaptchaSiteKey as devRecaptchaSiteKey } from "./keys.dev.js";

/**
 * Dev: use literal config from keys.dev.js — Next dev often inlines NEXT_PUBLIC_* as "" in the client bundle.
 * Prod: NEXT_PUBLIC_* from Vercel / host at build time.
 * Build without env: placeholder for static generation.
 */
const isDev = process.env.NODE_ENV === "development";

const isBuildTime =
  typeof window === "undefined" &&
  !isDev &&
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

let firebaseConfig;
let recaptchaSiteKey;

if (isBuildTime) {
  firebaseConfig = {
    apiKey: "build-time-placeholder",
    authDomain: "build-time-placeholder",
    projectId: "build-time-placeholder",
    storageBucket: "build-time-placeholder",
    messagingSenderId: "build-time-placeholder",
    appId: "build-time-placeholder",
  };
  recaptchaSiteKey = null;
  console.log("Using build-time placeholder Firebase config");
} else if (isDev) {
  firebaseConfig = devFirebaseConfig;
  recaptchaSiteKey = devRecaptchaSiteKey;
  console.log("Using development Firebase config (keys.dev.js)");
} else {
  firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const rk = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  recaptchaSiteKey =
    typeof rk === "string" && rk.trim().length > 0 ? rk.trim() : null;
  console.log("Using production Firebase config (env)");
}

let app;
let auth;
let firestore;
let provider;

try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestore = getFirestore(app);
  provider = new GoogleAuthProvider();
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
  app = null;
  auth = null;
  firestore = null;
  provider = null;
}

if (
  !isBuildTime &&
  typeof window !== "undefined" &&
  !isDev &&
  recaptchaSiteKey &&
  app
) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    console.log("Firebase App Check initialized");
  } catch (error) {
    console.error("Failed to initialize App Check:", error);
  }
} else if (isDev) {
  console.log("Firebase initialized without App Check (development mode)");
} else if (isBuildTime) {
  console.log("Firebase initialized without App Check (build time)");
}

if (provider) {
  provider.setCustomParameters({
    prompt: "select_account",
    access_type: "offline",
  });
}

if (!firestore) {
  console.error("CRITICAL: Firestore is not initialized properly");
}

export {
  auth,
  provider,
  firestore,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  applyActionCode,
  app,
};
export default app;
