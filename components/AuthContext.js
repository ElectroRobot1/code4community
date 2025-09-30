"use client";
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, getFirestoreInstance } from "@/firebase";
import { UserCache, CachePerformance } from "@/utils/cache";
import { waitForAppCheck } from "@/utils/waitForAppCheck";

const AuthContext = createContext({ user: null, userData: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Optimized user data fetching with caching
  const fetchUserData = useCallback(async (currentUser, forceRefresh = false) => {
    if (!currentUser) {
      return null;
    }

    const timing = CachePerformance.startTiming('fetchUserData');
    
    try {
      // Wait for App Check to be ready before making Firestore requests
      await waitForAppCheck();
      console.log('App Check is ready, proceeding with Firestore request');
      
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cachedData = UserCache.getUserData();
        if (cachedData && cachedData.uid === currentUser.uid) {
          CachePerformance.endTiming(timing);
          return cachedData;
        }
      } else {
      }

      // Fetch from Firestore
      console.log('Making Firestore request for user:', currentUser.uid);
      const firestore = await getFirestoreInstance();
      
      // Debug: Check if App Check token is available before making request
      if (window.firebaseAppCheck) {
        try {
          const { getToken } = await import('firebase/app-check');
          const token = await getToken(window.firebaseAppCheck, true); // true = force refresh, same as apiClient.js
          console.log('App Check token before Firestore request:', token ? 'Available' : 'Not available');
          if (token) {
            console.log('Token length before request:', token.token.length);
          }
        } catch (error) {
          console.error('Error getting App Check token before Firestore request:', error);
        }
      }
      
      const docRef = doc(firestore, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);
      console.log('Firestore response received:', docSnap.exists());
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const userDataWithUid = { ...data, uid: currentUser.uid };
        
        // Cache the data
        UserCache.setUserData(userDataWithUid);
        setLastFetchTime(Date.now());
        
        CachePerformance.endTiming(timing);
        return userDataWithUid;
      } else {
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
      return;
    }
    
    const timing = CachePerformance.startTiming('refreshUserData');
    
    // Check if we need to refresh based on last fetch time
    const timeSinceLastFetch = Date.now() - lastFetchTime;
    const shouldRefresh = timeSinceLastFetch > 5 * 60 * 1000; // 5 minutes
    
    
    if (shouldRefresh) {
      const data = await fetchUserData(user, true);
      if (data) {
        setUserData(data);
        setLastFetchTime(Date.now());
      } else {
      }
    } else {
    }
    
    CachePerformance.endTiming(timing);
  }, [user, fetchUserData, lastFetchTime]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      
      try {
        setUser(currentUser);
        
        if (currentUser) {
          // Always fetch fresh data first to ensure accuracy, especially after role changes
          const freshData = await fetchUserData(currentUser, true); // Force refresh
          if (freshData) {
            setUserData(freshData);
            setLastFetchTime(Date.now());
          } else {
            // Fallback to cached data if fresh fetch fails
            const cachedData = UserCache.getUserData();
            if (cachedData && cachedData.uid === currentUser.uid) {
              setUserData(cachedData);
            } else {
            }
          }
        } else {
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
          setUserData(cachedData);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchUserData]);

  // Listen for email verification completion
  useEffect(() => {
    
    const applyVerifiedState = async () => {
      try {
        if (auth.currentUser) {
          await auth.currentUser.reload();
          
          // Ensure user state reflects updated emailVerified immediately
          setUser(auth.currentUser);
          const freshData = await fetchUserData(auth.currentUser, true);
          if (freshData) {
            setUserData(freshData);
            setLastFetchTime(Date.now());
          } else {
          }
          localStorage.removeItem('emailVerificationStatus');
        } else {
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
      if (verificationStatus === 'verified') {
        applyVerifiedState();
      }
    };

    const handleEmailVerifiedEvent = () => {
      applyVerifiedState();
    };

    const handleStorage = (event) => {
      if (event.key === 'emailVerificationStatus' && event.newValue === 'verified') {
        applyVerifiedState();
      }
    };

    // Initial check
    handleEmailVerification();
    
    // Listen for custom event and cross-tab storage updates
    window.addEventListener('emailVerified', handleEmailVerifiedEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('emailVerified', handleEmailVerifiedEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchUserData]);

  // Listen for role change events to force refresh
  useEffect(() => {
    const handleRoleChange = async (event) => {
      
      if (user && event.detail.userId === user.uid) {
        // Force refresh user data when role changes
        const freshData = await fetchUserData(user, true);
        if (freshData) {
          setUserData(freshData);
          setLastFetchTime(Date.now());
        } else {
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('userRoleChanged', handleRoleChange);
      return () => {
        window.removeEventListener('userRoleChanged', handleRoleChange);
      };
    }
  }, [user, fetchUserData]);

  // Function to get redirect URL from query params
  const getRedirectUrl = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get('redirectTo');
      if (redirectTo && redirectTo.startsWith('/')) {
        return redirectTo;
      }
    }
    return null;
  };

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    const value = {
      user,
      userData,
      loading,
      getRedirectUrl,
      refreshUserData,
      lastFetchTime,
      isEmailVerified: user?.emailVerified || false
    };
    return value;
  }, [user, userData, loading, refreshUserData, lastFetchTime]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
