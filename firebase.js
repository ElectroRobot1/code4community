import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification, fetchSignInMethodsForEmail } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { firebaseConfig, recaptchaSiteKey } from "./keys.js";

// Firebase config imported from keys.js

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Initialize App Check for maximum security (development and production)
if (typeof window !== 'undefined') {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true
  });
}

// Configure Google provider for better OAuth experience
provider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'offline'
});

const firestore = getFirestore(app);

export { auth, provider, firestore, createUserWithEmailAndPassword, sendEmailVerification, fetchSignInMethodsForEmail, app };
export default app;
