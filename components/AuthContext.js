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
    if (!currentUser) return null;

    const timing = CachePerformance.startTiming('fetchUserData');
    
    try {
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cachedData = UserCache.getUserData();
        if (cachedData && cachedData.uid === currentUser.uid) {
          CachePerformance.endTiming(timing);
          return cachedData;
        }
      }

      // Fetch from Firestore
      const docRef = doc(firestore, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const userDataWithUid = { ...data, uid: currentUser.uid };
        
        // Cache the data
        UserCache.setUserData(userDataWithUid);
        setLastFetchTime(Date.now());
        
        CachePerformance.endTiming(timing);
        return userDataWithUid;
      }
      
      CachePerformance.endTiming(timing);
      return null;
    } catch (err) {
      console.error("Error fetching user data", err);
      CachePerformance.endTiming(timing);
      return null;
    }
  }, []);

  // Optimized refresh function with stale data detection
  const refreshUserData = useCallback(async () => {
    if (!user) return;
    
    const timing = CachePerformance.startTiming('refreshUserData');
    
    // Check if we need to refresh based on last fetch time
    const timeSinceLastFetch = Date.now() - lastFetchTime;
    const shouldRefresh = timeSinceLastFetch > 5 * 60 * 1000; // 5 minutes
    
    if (shouldRefresh) {
      const data = await fetchUserData(user, true);
      if (data) {
        setUserData(data);
        setLastFetchTime(Date.now());
      }
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
            }
          }
        } else {
          setUserData(null);
          UserCache.clearUserData();
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        // Fallback to cached data if available
        const cachedData = UserCache.getUserData();
        if (cachedData) {
          setUserData(cachedData);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  // Listen for email verification completion
  useEffect(() => {
    const handleEmailVerification = () => {
      const verificationStatus = localStorage.getItem('emailVerificationStatus');
      if (verificationStatus === 'verified' && auth.currentUser) {
        // Force reload the user to get updated emailVerified status
        auth.currentUser.reload().then(() => {
          // Clear the verification status
          localStorage.removeItem('emailVerificationStatus');
        }).catch((error) => {
          console.error('Error reloading user after email verification:', error);
        });
      }
    };

    // Check immediately
    handleEmailVerification();
    
    // Set up interval to check for verification status
    const interval = setInterval(handleEmailVerification, 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen for role change events to force refresh
  useEffect(() => {
    const handleRoleChange = async (event) => {
      if (user && event.detail.userId === user.uid) {
        // Force refresh user data when role changes
        const freshData = await fetchUserData(user, true);
        if (freshData) {
          setUserData(freshData);
          setLastFetchTime(Date.now());
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('userRoleChanged', handleRoleChange);
      return () => window.removeEventListener('userRoleChanged', handleRoleChange);
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
