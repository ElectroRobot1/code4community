// Environment-based Firebase configuration
// This automatically switches between dev and prod based on NODE_ENV

let firebaseConfig;

if (process.env.NODE_ENV === 'development') {
  // Development environment
  try {
    firebaseConfig = require('./keys.dev.js');
  } catch (error) {
    console.warn('Development keys not found, falling back to production');
    firebaseConfig = require('./keys.js');
  }
} else {
  // Production environment
  firebaseConfig = require('./keys.js');
}

export default firebaseConfig;
