import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification, fetchSignInMethodsForEmail } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./keys.dev.js";

// Initialize Firebase for development
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const provider = new GoogleAuthProvider();

// Configure Google provider
provider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'offline'
});

// No App Check in development
console.log('Firebase initialized for development (no App Check)');

export { auth, provider, firestore, createUserWithEmailAndPassword, sendEmailVerification, fetchSignInMethodsForEmail, app };
export default app;
