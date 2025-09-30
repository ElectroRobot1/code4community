import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification, fetchSignInMethodsForEmail } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { firebaseConfig, recaptchaSiteKey } from "./keys.js";

// Firebase config imported from keys.js

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Initialize App Check for maximum security
if (typeof window !== 'undefined') {
  try {
    console.log('Initializing Firebase App Check with site key:', recaptchaSiteKey);
    
    // Initialize App Check
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });
    
    console.log('Firebase App Check initialized successfully');
    window.firebaseAppCheck = appCheck;
    
    // Wait for App Check to be fully ready before allowing Firestore operations
    const waitForAppCheck = async () => {
      try {
        const { getToken } = await import('firebase/app-check');
        const token = await getToken(appCheck, false);
        console.log('App Check token ready:', token ? 'Yes' : 'No');
        
        if (token && token.token) {
          console.log('Firebase App Check is fully ready for Firestore operations');
          window.firebaseAppCheckReady = true;
          window.dispatchEvent(new CustomEvent('firebaseAppCheckReady'));
        } else {
          console.error('App Check token not available');
          // Retry after a delay
          setTimeout(waitForAppCheck, 2000);
        }
      } catch (error) {
        console.error('App Check token generation failed:', error);
        // Retry after a delay
        setTimeout(waitForAppCheck, 2000);
      }
    };
    
    // Start the App Check readiness check
    setTimeout(waitForAppCheck, 1000);
    
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
