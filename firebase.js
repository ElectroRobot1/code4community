import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
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
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

import { firebaseConfig as devFirebaseConfig, recaptchaSiteKey as devRecaptchaSiteKey } from "./keys.dev.js";
import {
  getPublicFirebaseConfig,
  getRecaptchaSiteKey,
  maskSecret,
} from "@/lib/firebaseConfig";

const isDev = process.env.NODE_ENV === "development";
/** `npm run preview:local` — production build against c4cdev (keys.dev.js), not code4community26. */
const useDevFirebase =
  isDev || process.env.NEXT_PUBLIC_USE_DEV_FIREBASE === "1";

const isBuildTime =
  typeof window === "undefined" &&
  !useDevFirebase &&
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

function resolveConfig() {
  if (useDevFirebase) {
    return { config: devFirebaseConfig, recaptcha: devRecaptchaSiteKey, source: "keys.dev.js" };
  }

  if (typeof window !== "undefined" && window.__FIREBASE_CONFIG__) {
    const recaptcha =
      typeof window.__RECAPTCHA_SITE_KEY__ === "string" && window.__RECAPTCHA_SITE_KEY__.trim()
        ? window.__RECAPTCHA_SITE_KEY__.trim()
        : getRecaptchaSiteKey();
    return {
      config: window.__FIREBASE_CONFIG__,
      recaptcha: recaptcha || null,
      source: "window-injected",
    };
  }

  if (isBuildTime) {
    return {
      config: {
        apiKey: "build-time-placeholder",
        authDomain: "build-time-placeholder",
        projectId: "build-time-placeholder",
        storageBucket: "build-time-placeholder",
        messagingSenderId: "build-time-placeholder",
        appId: "build-time-placeholder",
      },
      recaptcha: null,
      source: "build-placeholder",
    };
  }

  return {
    config: getPublicFirebaseConfig(),
    recaptcha: getRecaptchaSiteKey(),
    source: "env-or-default",
  };
}

const { config: firebaseConfig, recaptcha: recaptchaSiteKey, source: configSource } =
  resolveConfig();

if (typeof window !== "undefined") {
  console.info("[Firebase] config source:", configSource, {
    projectId: firebaseConfig?.projectId,
    authDomain: firebaseConfig?.authDomain,
    apiKey: maskSecret(firebaseConfig?.apiKey),
    appCheck: recaptchaSiteKey && !useDevFirebase ? "enabled" : "off",
  });
}

let app;
let auth;
let firestore;
let storage;
let provider;

try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestore = getFirestore(app);
  storage = getStorage(app);
  provider = new GoogleAuthProvider();
  if (typeof window !== "undefined") {
    console.info("[Firebase] initialized OK");
  }
} catch (error) {
  console.error("[Firebase] init failed:", error?.code || error?.message || error);
  console.error(
    "[Firebase] debug: open /api/debug/firebase-config — check API key restrictions & authorized domains",
  );
  app = null;
  auth = null;
  firestore = null;
  storage = null;
  provider = null;
}

if (
  !isBuildTime &&
  typeof window !== "undefined" &&
  !useDevFirebase &&
  recaptchaSiteKey &&
  app
) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    console.info("[Firebase] App Check initialized");
  } catch (error) {
    console.error("[Firebase] App Check failed:", error);
  }
}

if (provider) {
  provider.setCustomParameters({
    prompt: "select_account",
    access_type: "offline",
  });
}

if (!firestore && typeof window !== "undefined") {
  console.error("[Firebase] Firestore is not initialized");
}

export {
  auth,
  provider,
  firestore,
  storage,
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
