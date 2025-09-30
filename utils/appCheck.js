// Firebase App Check token validation utility
import { initializeApp, getApps } from 'firebase/app';
import { getAppCheck, verifyAppCheckToken } from 'firebase/app-check';
import { firebaseConfig } from '../keys.js';

// Initialize Firebase app for server-side validation
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize App Check for server-side token verification
const appCheck = getAppCheck(app);

/**
 * Validates an App Check token from the request headers
 * @param {Request} request - The incoming request
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function validateAppCheckToken(request) {
  try {
    // Get the App Check token from the X-Firebase-AppCheck header
    const appCheckToken = request.headers.get('X-Firebase-AppCheck');
    
    if (!appCheckToken) {
      return {
        valid: false,
        error: 'Missing App Check token'
      };
    }

    // Verify the token with Firebase
    const appCheckClaims = await verifyAppCheckToken(appCheck, appCheckToken);
    
    // Additional validation - check if token is not expired
    const now = Math.floor(Date.now() / 1000);
    if (appCheckClaims.exp && appCheckClaims.exp < now) {
      return {
        valid: false,
        error: 'App Check token expired'
      };
    }

    return {
      valid: true,
      claims: appCheckClaims
    };
  } catch (error) {
    console.error('App Check token validation error:', error);
    return {
      valid: false,
      error: 'Invalid App Check token'
    };
  }
}

/**
 * Middleware to validate App Check tokens for API routes
 * @param {Function} handler - The API route handler
 * @returns {Function} - Wrapped handler with App Check validation
 */
export function withAppCheck(handler) {
  return async (request, context) => {
    // Skip App Check validation for GET requests to public endpoints
    if (request.method === 'GET' && 
        (request.url.includes('/api/avatar') || 
         request.url.includes('/api/health'))) {
      return handler(request, context);
    }

    // Validate App Check token
    const validation = await validateAppCheckToken(request);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ 
          error: 'App Check validation failed', 
          details: validation.error 
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Add App Check claims to request for use in handler
    request.appCheckClaims = validation.claims;
    
    return handler(request, context);
  };
}
