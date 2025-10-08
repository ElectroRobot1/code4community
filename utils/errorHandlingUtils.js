/**
 * Centralized error handling utilities
 * Consolidates repeated error handling patterns across the application
 */

import { logError } from './errorHandling';

/**
 * Standard error response interface
 */
export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, context = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

/**
 * Error types with predefined messages and handling
 */
export const ERROR_TYPES = {
  // Authentication errors
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'You don\'t have permission to perform this action.',
    statusCode: 401,
    showAlert: true
  },
  FORBIDDEN: {
    code: 'FORBIDDEN', 
    message: 'Access denied.',
    statusCode: 403,
    showAlert: true
  },
  
  // Validation errors
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Please check your input and try again.',
    statusCode: 400,
    showAlert: true
  },
  
  // Network errors
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network error. Please check your connection and try again.',
    statusCode: 0,
    showAlert: true
  },
  
  // Firestore errors
  FIRESTORE_ERROR: {
    code: 'FIRESTORE_ERROR',
    message: 'Database error. Please try again.',
    statusCode: 500,
    showAlert: true
  },
  
  // Generic errors
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred. Please try again.',
    statusCode: 500,
    showAlert: true
  }
};

/**
 * Handle errors with consistent logging and user feedback
 * 
 * @param {Error} error - The error to handle
 * @param {Object} options - Handling options
 * @param {string} options.context - Additional context for logging
 * @param {boolean} options.showAlert - Whether to show alert to user
 * @param {Function} options.onError - Custom error handler
 * @param {string} options.fallbackMessage - Fallback message if error message is not user-friendly
 * @returns {Object} - Error response object
 */
export function handleError(error, options = {}) {
  const {
    context = {},
    showAlert = true,
    onError = null,
    fallbackMessage = 'An unexpected error occurred. Please try again.'
  } = options;

  // Log the error
  logError(error, context);

  // Determine error type and message
  let errorType = ERROR_TYPES.UNKNOWN_ERROR;
  let userMessage = fallbackMessage;

  if (error instanceof AppError) {
    errorType = ERROR_TYPES[error.code] || ERROR_TYPES.UNKNOWN_ERROR;
    userMessage = error.message;
  } else if (error.code) {
    // Firebase/Firestore errors
    switch (error.code) {
      case 'permission-denied':
        errorType = ERROR_TYPES.FORBIDDEN;
        userMessage = 'You don\'t have permission to perform this action.';
        break;
      case 'unavailable':
        errorType = ERROR_TYPES.NETWORK_ERROR;
        userMessage = 'Service temporarily unavailable. Please try again.';
        break;
      case 'failed-precondition':
        errorType = ERROR_TYPES.VALIDATION_ERROR;
        userMessage = 'Invalid request. Please check your input.';
        break;
      default:
        if (error.message && error.message.length < 100) {
          userMessage = error.message;
        }
    }
  }

  // Show alert if configured
  if (showAlert && errorType.showAlert && typeof window !== 'undefined') {
    alert(userMessage);
  }

  // Call custom error handler if provided
  if (onError) {
    onError(error, userMessage);
  }

  // Return error response
  return {
    success: false,
    error: userMessage,
    code: errorType.code,
    statusCode: errorType.statusCode,
    originalError: error
  };
}

/**
 * Async error wrapper for functions
 * 
 * @param {Function} fn - Function to wrap
 * @param {Object} options - Error handling options
 * @returns {Function} - Wrapped function
 */
export function withErrorHandling(fn, options = {}) {
  return async (...args) => {
    try {
      const result = await fn(...args);
      return { success: true, data: result };
    } catch (error) {
      return handleError(error, options);
    }
  };
}

/**
 * Create a standardized error handler for React components
 * 
 * @param {Object} options - Error handling options
 * @returns {Function} - Error handler function
 */
export function createErrorHandler(options = {}) {
  return (error, context = {}) => {
    return handleError(error, { ...options, context });
  };
}

/**
 * Validation error creator
 * 
 * @param {string} message - Validation error message
 * @param {Object} context - Additional context
 * @returns {AppError} - Validation error
 */
export function createValidationError(message, context = {}) {
  return new AppError(message, 'VALIDATION_ERROR', 400, context);
}

/**
 * Authorization error creator
 * 
 * @param {string} message - Authorization error message
 * @param {Object} context - Additional context
 * @returns {AppError} - Authorization error
 */
export function createAuthError(message, context = {}) {
  return new AppError(message, 'UNAUTHORIZED', 401, context);
}
