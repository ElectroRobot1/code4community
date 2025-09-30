// Utility to wait for Firebase App Check to be ready
export function waitForAppCheck() {
  return new Promise((resolve, reject) => {
    // Check if App Check is already ready
    if (typeof window !== 'undefined' && window.firebaseAppCheckReady) {
      resolve(true);
      return;
    }

    // Wait for the App Check ready event
    if (typeof window !== 'undefined') {
      const timeout = setTimeout(() => {
        reject(new Error('App Check initialization timeout'));
      }, 10000); // 10 second timeout

      window.addEventListener('firebaseAppCheckReady', () => {
        clearTimeout(timeout);
        resolve(true);
      }, { once: true });
    } else {
      // Server-side, no App Check needed
      resolve(true);
    }
  });
}

export function isAppCheckReady() {
  if (typeof window === 'undefined') {
    return true; // Server-side, no App Check needed
  }
  return window.firebaseAppCheckReady || false;
}
