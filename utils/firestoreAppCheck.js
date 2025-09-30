// Firestore App Check integration
import { getToken } from 'firebase/app-check';
import { app } from '../firebase';

let appCheckToken = null;
let tokenRefreshInterval = null;

/**
 * Configures Firestore to include App Check tokens in requests
 * This needs to be called after Firebase App Check is initialized
 */
export async function configureFirestoreAppCheck() {
  try {
    if (typeof window === 'undefined') {
      return; // Server-side, no need to configure
    }

    console.log('Configuring Firestore App Check...');

    // Wait for App Check to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get the initial App Check token
    await refreshFirestoreAppCheckToken();

    // Set up token refresh every 50 minutes
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval);
    }
    
    tokenRefreshInterval = setInterval(async () => {
      await refreshFirestoreAppCheckToken();
    }, 50 * 60 * 1000); // Refresh every 50 minutes

    console.log('Firestore App Check configured successfully');
    
  } catch (error) {
    console.error('Failed to configure Firestore App Check:', error);
  }
}

/**
 * Refreshes the Firestore App Check token
 */
export async function refreshFirestoreAppCheckToken() {
  try {
    const token = await getToken(app, true); // Force refresh
    
    if (token && token.token) {
      appCheckToken = token.token;
      console.log('Firestore App Check token refreshed:', token.token.substring(0, 20) + '...');
      return true;
    } else {
      console.error('No token returned from getToken');
      return false;
    }
  } catch (error) {
    console.error('Failed to refresh Firestore App Check token:', error);
    return false;
  }
}

/**
 * Gets the current Firestore App Check token
 * @returns {string|null} The App Check token or null if unavailable
 */
export function getFirestoreAppCheckToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  return appCheckToken;
}

/**
 * Ensures we have a valid App Check token for Firestore operations
 * @returns {Promise<string|null>} The App Check token or null if unavailable
 */
export async function ensureFirestoreAppCheckToken() {
  if (!appCheckToken) {
    await refreshFirestoreAppCheckToken();
  }
  return appCheckToken;
}
