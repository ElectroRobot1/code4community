import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification, fetchSignInMethodsForEmail } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Environment-based Firebase config
let firebaseConfig;
let recaptchaSiteKey;

if (process.env.NODE_ENV === 'development') {
  // Development environment - use dev keys
  try {
    const devConfig = require('./keys.dev.js');
    firebaseConfig = devConfig.firebaseConfig;
    recaptchaSiteKey = devConfig.recaptchaSiteKey;
    console.log('Using development Firebase config');
  } catch (error) {
    console.warn('Development keys not found, falling back to environment variables');
    firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };
    recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  }
} else {
  // Production environment - use environment variables
  firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };
  recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  console.log('Using production Firebase config');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const provider = new GoogleAuthProvider();

// Initialize App Check only in production
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'development' && recaptchaSiteKey) {
  try {
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });
    console.log('Firebase App Check initialized');
  } catch (error) {
    console.error('Failed to initialize App Check:', error);
  }
} else if (process.env.NODE_ENV === 'development') {
  console.log('Firebase initialized without App Check (development mode)');
}

// Configure Google provider
provider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'offline'
});

export { auth, provider, firestore, createUserWithEmailAndPassword, sendEmailVerification, fetchSignInMethodsForEmail, app };
export default app;
