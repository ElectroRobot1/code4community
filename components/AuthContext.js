"use client";
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/firebase";
import { UserCache, CachePerformance } from "@/utils/cache";

const AuthContext = createContext({ user: null, userData: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Optimized user data fetching with caching
  const fetchUserData = useCallback(async (currentUser, forceRefresh = false) => {
    if (!currentUser) {
      console.log('[AuthContext] fetchUserData: No current user provided');
      return null;
    }

    console.log(`[AuthContext] fetchUserData: Starting fetch for user ${currentUser.uid}, forceRefresh: ${forceRefresh}`);
    const timing = CachePerformance.startTiming('fetchUserData');
    
    try {
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cachedData = UserCache.getUserData();
        if (cachedData && cachedData.uid === currentUser.uid) {
          console.log('[AuthContext] fetchUserData: Using cached data for user', currentUser.uid);
          CachePerformance.endTiming(timing);
          return cachedData;
        }
        console.log('[AuthContext] fetchUserData: No valid cached data found, fetching from Firestore');
      } else {
        console.log('[AuthContext] fetchUserData: Force refresh requested, bypassing cache');
      }

      // Fetch from Firestore
      console.log('[AuthContext] fetchUserData: Fetching from Firestore for user', currentUser.uid);
      const docRef = doc(firestore, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const userDataWithUid = { ...data, uid: currentUser.uid };
        console.log('[AuthContext] fetchUserData: Successfully fetched user data from Firestore', {
          uid: currentUser.uid,
          email: data.email,
          role: data.role,
          emailVerified: currentUser.emailVerified
        });
        
        // Cache the data
        UserCache.setUserData(userDataWithUid);
        setLastFetchTime(Date.now());
        
        CachePerformance.endTiming(timing);
        return userDataWithUid;
      } else {
        console.log('[AuthContext] fetchUserData: User document does not exist in Firestore for uid', currentUser.uid);
      }
      
      CachePerformance.endTiming(timing);
      return null;
    } catch (err) {
      console.error("[AuthContext] fetchUserData: Error fetching user data", {
        error: err,
        uid: currentUser.uid,
        forceRefresh
      });
      CachePerformance.endTiming(timing);
      return null;
    }
  }, []);

  // Optimized refresh function with stale data detection
  const refreshUserData = useCallback(async () => {
    if (!user) {
      console.log('[AuthContext] refreshUserData: No user available for refresh');
      return;
    }
    
    console.log('[AuthContext] refreshUserData: Starting refresh for user', user.uid);
    const timing = CachePerformance.startTiming('refreshUserData');
    
    // Check if we need to refresh based on last fetch time
    const timeSinceLastFetch = Date.now() - lastFetchTime;
    const shouldRefresh = timeSinceLastFetch > 5 * 60 * 1000; // 5 minutes
    
    console.log('[AuthContext] refreshUserData: Time since last fetch', {
      timeSinceLastFetch,
      shouldRefresh,
      lastFetchTime: new Date(lastFetchTime).toISOString()
    });
    
    if (shouldRefresh) {
      console.log('[AuthContext] refreshUserData: Data is stale, fetching fresh data');
      const data = await fetchUserData(user, true);
      if (data) {
        console.log('[AuthContext] refreshUserData: Successfully refreshed user data');
        setUserData(data);
        setLastFetchTime(Date.now());
      } else {
        console.log('[AuthContext] refreshUserData: Failed to fetch fresh data, keeping existing data');
      }
    } else {
      console.log('[AuthContext] refreshUserData: Data is fresh, skipping refresh');
    }
    
    CachePerformance.endTiming(timing);
  }, [user, fetchUserData, lastFetchTime]);

  useEffect(() => {
    console.log('[AuthContext] Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('[AuthContext] Auth state changed', {
        hasUser: !!currentUser,
        uid: currentUser?.uid,
        email: currentUser?.email,
        emailVerified: currentUser?.emailVerified
      });
      
      try {
        setUser(currentUser);
        
        if (currentUser) {
          console.log('[AuthContext] User signed in, fetching user data');
          // Always fetch fresh data first to ensure accuracy, especially after role changes
          const freshData = await fetchUserData(currentUser, true); // Force refresh
          if (freshData) {
            console.log('[AuthContext] Successfully loaded fresh user data', {
              uid: freshData.uid,
              email: freshData.email,
              role: freshData.role
            });
            setUserData(freshData);
            setLastFetchTime(Date.now());
          } else {
            console.log('[AuthContext] Failed to fetch fresh data, trying cached data');
            // Fallback to cached data if fresh fetch fails
            const cachedData = UserCache.getUserData();
            if (cachedData && cachedData.uid === currentUser.uid) {
              console.log('[AuthContext] Using cached data as fallback');
              setUserData(cachedData);
            } else {
              console.log('[AuthContext] No valid cached data available');
            }
          }
        } else {
          console.log('[AuthContext] User signed out, clearing user data');
          setUserData(null);
          UserCache.clearUserData();
        }
      } catch (error) {
        console.error("[AuthContext] Auth state change error:", {
          error: error.message,
          code: error.code,
          hasUser: !!currentUser,
          uid: currentUser?.uid
        });
        // Fallback to cached data if available
        const cachedData = UserCache.getUserData();
        if (cachedData) {
          console.log('[AuthContext] Using cached data after error');
          setUserData(cachedData);
        }
      } finally {
        console.log('[AuthContext] Auth state change complete, setting loading to false');
        setLoading(false);
      }
    });

    return () => {
      console.log('[AuthContext] Cleaning up auth state listener');
      unsubscribe();
    };
  }, [fetchUserData]);

  // Listen for email verification completion
  useEffect(() => {
    console.log('[AuthContext] Setting up email verification listeners');
    
    const applyVerifiedState = async () => {
      console.log('[AuthContext] applyVerifiedState: Starting email verification state application');
      try {
        if (auth.currentUser) {
          console.log('[AuthContext] applyVerifiedState: Reloading user to get updated emailVerified status');
          await auth.currentUser.reload();
          console.log('[AuthContext] applyVerifiedState: User reloaded, emailVerified:', auth.currentUser.emailVerified);
          
          // Ensure user state reflects updated emailVerified immediately
          setUser(auth.currentUser);
          const freshData = await fetchUserData(auth.currentUser, true);
          if (freshData) {
            console.log('[AuthContext] applyVerifiedState: Successfully updated user data after verification');
            setUserData(freshData);
            setLastFetchTime(Date.now());
          } else {
            console.log('[AuthContext] applyVerifiedState: Failed to fetch fresh data after verification');
          }
          localStorage.removeItem('emailVerificationStatus');
          console.log('[AuthContext] applyVerifiedState: Removed emailVerificationStatus from localStorage');
        } else {
          console.log('[AuthContext] applyVerifiedState: No current user available');
        }
      } catch (error) {
        console.error('[AuthContext] applyVerifiedState: Error applying verified state:', {
          error: error.message,
          code: error.code
        });
      }
    };

    const handleEmailVerification = () => {
      const verificationStatus = localStorage.getItem('emailVerificationStatus');
      console.log('[AuthContext] handleEmailVerification: Checking verification status', { verificationStatus });
      if (verificationStatus === 'verified') {
        console.log('[AuthContext] handleEmailVerification: Email verification detected, applying state');
        applyVerifiedState();
      }
    };

    const handleEmailVerifiedEvent = () => {
      console.log('[AuthContext] handleEmailVerifiedEvent: Email verified event received');
      applyVerifiedState();
    };

    const handleStorage = (event) => {
      console.log('[AuthContext] handleStorage: Storage event received', {
        key: event.key,
        newValue: event.newValue
      });
      if (event.key === 'emailVerificationStatus' && event.newValue === 'verified') {
        console.log('[AuthContext] handleStorage: Email verification status change detected');
        applyVerifiedState();
      }
    };

    // Initial check
    console.log('[AuthContext] Performing initial email verification check');
    handleEmailVerification();
    
    // Listen for custom event and cross-tab storage updates
    console.log('[AuthContext] Adding event listeners for email verification');
    window.addEventListener('emailVerified', handleEmailVerifiedEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      console.log('[AuthContext] Cleaning up email verification listeners');
      window.removeEventListener('emailVerified', handleEmailVerifiedEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchUserData]);

  // Listen for role change events to force refresh
  useEffect(() => {
    const handleRoleChange = async (event) => {
      console.log('[AuthContext] handleRoleChange: Role change event received', {
        eventUserId: event.detail?.userId,
        currentUserId: user?.uid,
        matches: user && event.detail.userId === user.uid
      });
      
      if (user && event.detail.userId === user.uid) {
        console.log('[AuthContext] handleRoleChange: Role change for current user, refreshing data');
        // Force refresh user data when role changes
        const freshData = await fetchUserData(user, true);
        if (freshData) {
          console.log('[AuthContext] handleRoleChange: Successfully refreshed user data after role change');
          setUserData(freshData);
          setLastFetchTime(Date.now());
        } else {
          console.log('[AuthContext] handleRoleChange: Failed to refresh user data after role change');
        }
      }
    };

    if (typeof window !== 'undefined') {
      console.log('[AuthContext] Adding userRoleChanged event listener');
      window.addEventListener('userRoleChanged', handleRoleChange);
      return () => {
        console.log('[AuthContext] Removing userRoleChanged event listener');
        window.removeEventListener('userRoleChanged', handleRoleChange);
      };
    }
  }, [user, fetchUserData]);

  // Function to get redirect URL from query params
  const getRedirectUrl = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get('redirectTo');
      console.log('[AuthContext] getRedirectUrl: Checking for redirect URL', { redirectTo });
      if (redirectTo && redirectTo.startsWith('/')) {
        console.log('[AuthContext] getRedirectUrl: Valid redirect URL found', redirectTo);
        return redirectTo;
      }
    }
    console.log('[AuthContext] getRedirectUrl: No valid redirect URL found');
    return null;
  };

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    userData,
    loading,
    getRedirectUrl,
    refreshUserData,
    lastFetchTime,
    isEmailVerified: user?.emailVerified || false
  }), [user, userData, loading, refreshUserData, lastFetchTime]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
