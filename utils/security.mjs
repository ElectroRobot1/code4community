// Security utilities for Content Security Policy

/**
 * Content Security Policy helper
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "https://www.gstatic.com", "https://apis.google.com"],
  'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  'font-src': ["'self'", "https://fonts.gstatic.com"],
  'img-src': ["'self'", "data:", "https:", "blob:"],
  'connect-src': ["'self'", "https://identitytoolkit.googleapis.com", "https://firestore.googleapis.com"],
  'frame-src': ["'self'", "https://accounts.google.com"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
  'upgrade-insecure-requests': [],
  'block-all-mixed-content': []
};

/**
 * Generate CSP header string
 * @param {object} directives - CSP directives
 * @returns {string} - CSP header value
 */
export function generateCSPHeader(directives = CSP_DIRECTIVES) {
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) {
        return key; // For directives like 'upgrade-insecure-requests' that don't need values
      }
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}