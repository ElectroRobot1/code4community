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
  try {
    console.log('Initializing Firebase App Check with site key:', recaptchaSiteKey);
    
    // Initialize App Check
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });
    
    console.log('Firebase App Check initialized successfully');
    
    // Store appCheck globally for debugging
    window.firebaseAppCheck = appCheck;
    
    // Test token generation after a delay
    setTimeout(async () => {
      try {
        const { getToken } = await import('firebase/app-check');
        const token = await getToken(appCheck, false);
        console.log('Test token generation successful:', token ? 'Yes' : 'No');
      } catch (error) {
        console.error('Test token generation failed:', error);
      }
    }, 1000);
    
  } catch (error) {
    console.error('Failed to initialize Firebase App Check:', error);
  }
}

// Configure Google provider for better OAuth experience
provider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'offline'
});

const firestore = getFirestore(app);

export { auth, provider, firestore, createUserWithEmailAndPassword, sendEmailVerification, fetchSignInMethodsForEmail, app };
export default app;
