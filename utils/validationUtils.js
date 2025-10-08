/**
 * Consolidated validation utilities
 * Consolidates repeated validation patterns across the application
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { validateEmail, validatePassword, validateConfirmPassword } from './validation';

/**
 * Common validation schemas
 */
export const VALIDATION_SCHEMAS = {
  // User registration schema
  USER_REGISTRATION: {
    firstName: {
      required: true,
      minLength: 1,
      maxLength: 50,
      message: 'First name is required and must be 1-50 characters'
    },
    lastName: {
      required: true,
      minLength: 1,
      maxLength: 50,
      message: 'Last name is required and must be 1-50 characters'
    },
    email: {
      required: true,
      validator: validateEmail,
      message: 'Please enter a valid email address'
    },
    password: {
      required: true,
      validator: validatePassword,
      message: 'Password must meet security requirements'
    },
    confirmPassword: {
      required: true,
      validator: (value, formData) => validateConfirmPassword(value, formData.password),
      message: 'Passwords do not match'
    }
  },

  // Tutoring request schema
  TUTORING_REQUEST: {
    course: {
      required: true,
      allowedValues: ['Algebra 1', 'Algebra 2', 'Algebra 2 Trig', 'Functions', 'Trig with Adv Alg', 'Geometry'],
      message: 'Please select a valid course'
    },
    description: {
      required: true,
      minLength: 10,
      maxLength: 500,
      message: 'Description must be 10-500 characters'
    }
  },

  // User profile update schema
  USER_PROFILE: {
    firstName: {
      required: true,
      minLength: 1,
      maxLength: 50,
      message: 'First name is required and must be 1-50 characters'
    },
    lastName: {
      required: true,
      minLength: 1,
      maxLength: 50,
      message: 'Last name is required and must be 1-50 characters'
    },
    email: {
      required: true,
      validator: validateEmail,
      message: 'Please enter a valid email address'
    }
  }
};

/**
 * Generic form validator
 * 
 * @param {Object} formData - Form data to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} - Validation result
 */
export function validateForm(formData, schema) {
  const errors = {};
  let isValid = true;

  Object.entries(schema).forEach(([field, rules]) => {
    const value = formData[field];
    const error = validateField(value, rules, formData);
    
    if (error) {
      errors[field] = error;
      isValid = false;
    }
  });

  return {
    isValid,
    errors,
    hasErrors: Object.keys(errors).length > 0
  };
}

/**
 * Validate a single field
 * 
 * @param {any} value - Field value
 * @param {Object} rules - Validation rules
 * @param {Object} formData - Complete form data (for dependent validations)
 * @returns {string|null} - Error message or null if valid
 */
export function validateField(value, rules, formData = {}) {
  // Check if required
  if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return rules.message || `${field} is required`;
  }

  // Skip other validations if not required and empty
  if (!rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return null;
  }

  // Check minimum length
  if (rules.minLength && value && value.length < rules.minLength) {
    return rules.message || `Must be at least ${rules.minLength} characters`;
  }

  // Check maximum length
  if (rules.maxLength && value && value.length > rules.maxLength) {
    return rules.message || `Must be no more than ${rules.maxLength} characters`;
  }

  // Check allowed values
  if (rules.allowedValues && !rules.allowedValues.includes(value)) {
    return rules.message || `Must be one of: ${rules.allowedValues.join(', ')}`;
  }

  // Custom validator
  if (rules.validator) {
    const customError = rules.validator(value, formData);
    if (customError) {
      return customError;
    }
  }

  return null;
}

/**
 * Real-time form validation hook
 * 
 * @param {Object} initialData - Initial form data
 * @param {Object} schema - Validation schema
 * @returns {Object} - Form validation state and methods
 */
export function useFormValidation(initialData = {}, schema = {}) {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Validate form whenever data changes
  const validation = useMemo(() => {
    return validateForm(formData, schema);
  }, [formData, schema]);

  // Update errors when validation changes
  useEffect(() => {
    setErrors(validation.errors);
  }, [validation.errors]);

  // Update form field
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  // Update multiple fields
  const updateFields = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setTouched(prev => ({ ...prev, ...Object.keys(updates).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {}) }));
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  // Get field error (only show if touched)
  const getFieldError = useCallback((field) => {
    return touched[field] ? errors[field] : null;
  }, [errors, touched]);

  // Check if field has error
  const hasFieldError = useCallback((field) => {
    return touched[field] && !!errors[field];
  }, [errors, touched]);

  return {
    formData,
    errors,
    touched,
    isValid: validation.isValid,
    hasErrors: validation.hasErrors,
    updateField,
    updateFields,
    resetForm,
    getFieldError,
    hasFieldError,
    setFormData,
    setTouched
  };
}

/**
 * Common validation utilities
 */
export const ValidationUtils = {
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {string|null} - Error message or null
   */
  validateEmail,

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {string|null} - Error message or null
   */
  validatePassword,

  /**
   * Validate password confirmation
   * @param {string} confirmPassword - Confirmation password
   * @param {string} password - Original password
   * @returns {string|null} - Error message or null
   */
  validateConfirmPassword,

  /**
   * Validate required field
   * @param {any} value - Value to validate
   * @param {string} fieldName - Field name for error message
   * @returns {string|null} - Error message or null
   */
  validateRequired: (value, fieldName = 'Field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },

  /**
   * Validate string length
   * @param {string} value - Value to validate
   * @param {number} min - Minimum length
   * @param {number} max - Maximum length
   * @param {string} fieldName - Field name for error message
   * @returns {string|null} - Error message or null
   */
  validateLength: (value, min, max, fieldName = 'Field') => {
    if (!value) return null;
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    if (value.length > max) {
      return `${fieldName} must be no more than ${max} characters`;
    }
    return null;
  },

  /**
   * Validate numeric range
   * @param {number} value - Value to validate
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {string} fieldName - Field name for error message
   * @returns {string|null} - Error message or null
   */
  validateRange: (value, min, max, fieldName = 'Field') => {
    if (value === null || value === undefined) return null;
    if (value < min) {
      return `${fieldName} must be at least ${min}`;
    }
    if (value > max) {
      return `${fieldName} must be no more than ${max}`;
    }
    return null;
  }
};

/**
 * Pre-built validation functions for common use cases
 */
export const CommonValidators = {
  /**
   * Validate user registration form
   * @param {Object} formData - Registration form data
   * @returns {Object} - Validation result
   */
  validateRegistration: (formData) => 
    validateForm(formData, VALIDATION_SCHEMAS.USER_REGISTRATION),

  /**
   * Validate tutoring request form
   * @param {Object} formData - Tutoring request form data
   * @returns {Object} - Validation result
   */
  validateTutoringRequest: (formData) => 
    validateForm(formData, VALIDATION_SCHEMAS.TUTORING_REQUEST),

  /**
   * Validate user profile form
   * @param {Object} formData - User profile form data
   * @returns {Object} - Validation result
   */
  validateUserProfile: (formData) => 
    validateForm(formData, VALIDATION_SCHEMAS.USER_PROFILE)
};
