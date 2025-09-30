// API client utility with App Check token support
import { getToken } from 'firebase/app-check';
import { app } from '../firebase';

/**
 * Gets the current App Check token
 * @returns {Promise<string|null>} The App Check token or null if unavailable
 */
export async function getAppCheckToken() {
  try {
    if (typeof window === 'undefined') {
      return null; // Server-side, no App Check token needed
    }
    
    // Check if App Check is available
    if (!window.firebase || !window.firebase.appCheck) {
      console.warn('Firebase App Check not available');
      return null;
    }
    
    const token = await getToken(app, false); // false = don't force refresh
    console.log('App Check token obtained:', token ? 'Yes' : 'No');
    return token ? token.token : null;
  } catch (error) {
    console.error('Failed to get App Check token:', error);
    // For development, we might want to continue without App Check
    // In production, you should handle this more strictly
    return null;
  }
}

/**
 * Makes an API request with App Check token included
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} The fetch response
 */
export async function apiRequest(url, options = {}) {
  try {
    // Get App Check token
    const appCheckToken = await getAppCheckToken();
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Add App Check token if available
    if (appCheckToken) {
      headers['X-Firebase-AppCheck'] = appCheckToken;
      console.log('Making API request with App Check token');
    } else {
      console.warn('Making API request without App Check token - this may fail in production');
    }
    
    // Make the request
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Makes a POST request with App Check token
 * @param {string} url - The API endpoint URL
 * @param {Object} data - The data to send
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>} The fetch response
 */
export async function apiPost(url, data, options = {}) {
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * Makes a GET request with App Check token
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>} The fetch response
 */
export async function apiGet(url, options = {}) {
  return apiRequest(url, {
    method: 'GET',
    ...options,
  });
}

/**
 * Makes a file upload request with App Check token
 * @param {string} url - The API endpoint URL
 * @param {FormData} formData - The form data to upload
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>} The fetch response
 */
export async function apiUpload(url, formData, options = {}) {
  try {
    // Get App Check token
    const appCheckToken = await getAppCheckToken();
    
    // Prepare headers (don't set Content-Type for FormData)
    const headers = {
      ...options.headers,
    };
    
    // Add App Check token if available
    if (appCheckToken) {
      headers['X-Firebase-AppCheck'] = appCheckToken;
    }
    
    // Make the request
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
      ...options,
    });
    
    return response;
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
}
