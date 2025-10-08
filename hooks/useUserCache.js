"use client";
import { useEffect, useState, useCallback } from 'react';
import { UserCache, CachePerformance } from '@/utils/cache';
import { useAuth } from '@/components/AuthContext';

/**
 * Custom hook for managing user cache across pages
 * Replaces the repeated cache management pattern
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoRefresh - Whether to auto-refresh cache
 * @param {number} options.refreshInterval - Cache refresh interval in ms
 * @returns {Object} - { cachedUser, setCachedUser, refreshCache, isLoading }
 */
export function useUserCache(options = {}) {
  const { autoRefresh = true, refreshInterval = 5 * 60 * 1000 } = options;
  const { user, userData } = useAuth();
  const [cachedUser, setCachedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load cached user data
  const loadCachedUser = useCallback(() => {
    const timing = CachePerformance.startTiming('loadCachedUser');
    
    try {
      const cached = UserCache.getUserData();
      if (cached) {
        setCachedUser(cached);
      }
    } catch (error) {
      console.error('[useUserCache] Error loading cached user:', error);
    } finally {
      CachePerformance.endTiming(timing);
      setIsLoading(false);
    }
  }, []);

  // Update cache when userData changes
  const updateCache = useCallback(() => {
    if (userData && user) {
      const timing = CachePerformance.startTiming('updateUserCache');
      
      try {
        const combinedUserData = {
          ...userData,
          uid: user.uid,
          email: user.email
        };
        
        UserCache.setUserData(combinedUserData);
        setCachedUser(combinedUserData);
      } catch (error) {
        console.error('[useUserCache] Error updating cache:', error);
      } finally {
        CachePerformance.endTiming(timing);
      }
    }
  }, [userData, user]);

  // Refresh cache manually
  const refreshCache = useCallback(() => {
    loadCachedUser();
  }, [loadCachedUser]);

  // Initial load
  useEffect(() => {
    loadCachedUser();
  }, [loadCachedUser]);

  // Update cache when userData changes
  useEffect(() => {
    updateCache();
  }, [updateCache]);

  // Auto-refresh cache
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshCache();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshCache]);

  return {
    cachedUser,
    setCachedUser,
    refreshCache,
    isLoading
  };
}
