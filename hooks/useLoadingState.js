"use client";
import { useState, useCallback } from 'react';

/**
 * Custom hook for managing loading states
 * Consolidates repeated loading state patterns across components
 * 
 * @param {Object} initialState - Initial loading states
 * @returns {Object} - Loading state management object
 */
export function useLoadingState(initialState = {}) {
  const [loadingStates, setLoadingStates] = useState({
    isLoading: false,
    ...initialState
  });

  /**
   * Set loading state for a specific key
   * @param {string|boolean} key - Loading state key or boolean for main loading
   * @param {boolean} value - Loading value
   */
  const setLoading = useCallback((key, value) => {
    if (typeof key === 'boolean') {
      setLoadingStates(prev => ({ ...prev, isLoading: key }));
    } else {
      setLoadingStates(prev => ({ ...prev, [key]: value }));
    }
  }, []);

  /**
   * Set multiple loading states at once
   * @param {Object} states - Object of loading states to set
   */
  const setMultipleLoadingStates = useCallback((states) => {
    setLoadingStates(prev => ({ ...prev, ...states }));
  }, []);

  /**
   * Execute async function with loading state management
   * @param {Function} asyncFn - Async function to execute
   * @param {Object} options - Options for loading management
   * @returns {Promise} - Result of the async function
   */
  const withLoading = useCallback(async (asyncFn, options = {}) => {
    const {
      loadingKey = 'isLoading',
      onStart = null,
      onSuccess = null,
      onError = null,
      onFinally = null
    } = options;

    try {
      setLoading(loadingKey, true);
      if (onStart) onStart();

      const result = await asyncFn();
      
      if (onSuccess) onSuccess(result);
      return result;
    } catch (error) {
      if (onError) onError(error);
      throw error;
    } finally {
      setLoading(loadingKey, false);
      if (onFinally) onFinally();
    }
  }, [setLoading]);

  /**
   * Reset all loading states
   */
  const resetLoading = useCallback(() => {
    setMultipleLoadingStates(Object.keys(loadingStates).reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {}));
  }, [loadingStates, setMultipleLoadingStates]);

  return {
    ...loadingStates,
    setLoading,
    setMultipleLoadingStates,
    withLoading,
    resetLoading
  };
}

/**
 * Hook for managing async operations with loading states
 * 
 * @param {Function} asyncFn - Async function to manage
 * @param {Object} options - Options for the hook
 * @returns {Object} - Async operation management object
 */
export function useAsyncOperation(asyncFn, options = {}) {
  const {
    immediate = false,
    onSuccess = null,
    onError = null,
    onFinally = null
  } = options;

  const { isLoading, setLoading, withLoading } = useLoadingState();

  const execute = useCallback(async (...args) => {
    return withLoading(
      () => asyncFn(...args),
      { onSuccess, onError, onFinally }
    );
  }, [asyncFn, withLoading, onSuccess, onError, onFinally]);

  // Execute immediately if requested
  React.useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    isLoading,
    execute,
    setLoading
  };
}

/**
 * Hook for managing multiple async operations
 * 
 * @param {Object} operations - Object of async operations
 * @returns {Object} - Multiple async operations management
 */
export function useMultipleAsyncOperations(operations = {}) {
  const [loadingStates, setLoadingStates] = useState(
    Object.keys(operations).reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {})
  );

  const executeOperation = useCallback(async (operationKey, ...args) => {
    const operation = operations[operationKey];
    if (!operation) {
      throw new Error(`Operation '${operationKey}' not found`);
    }

    try {
      setLoadingStates(prev => ({ ...prev, [operationKey]: true }));
      const result = await operation(...args);
      return result;
    } finally {
      setLoadingStates(prev => ({ ...prev, [operationKey]: false }));
    }
  }, [operations]);

  const isAnyLoading = Object.values(loadingStates).some(Boolean);
  const isLoading = (key) => loadingStates[key] || false;

  return {
    loadingStates,
    isAnyLoading,
    isLoading,
    executeOperation
  };
}
