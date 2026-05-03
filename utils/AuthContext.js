"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, firestore } from "@/firebase";
import { UserCache, CachePerformance } from "@/utils/cache";
import { isAdminEmail } from "@/config/admin";

const AuthContext = createContext({ user: null, userData: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(auth));
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const fetchUserData = useCallback(async (currentUser, forceRefresh = false) => {
    if (!currentUser || !firestore) {
      return null;
    }

    const timing = CachePerformance.startTiming("fetchUserData");

    try {
      if (!forceRefresh) {
        const cachedData = UserCache.getUserData();
        if (cachedData && cachedData.uid === currentUser.uid) {
          CachePerformance.endTiming(timing);
          return cachedData;
        }
      }

      const docRef = doc(firestore, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const userDataWithUid = { ...data, uid: currentUser.uid };
        UserCache.setUserData(userDataWithUid);
        setLastFetchTime(Date.now());
        CachePerformance.endTiming(timing);
        return userDataWithUid;
      }

      const displayName =
        (currentUser.displayName && currentUser.displayName.trim()) ||
        (currentUser.email && currentUser.email.split("@")[0]) ||
        "User";
      const role = isAdminEmail(currentUser.email) ? "admin" : "student";
      const newProfile = {
        email: currentUser.email,
        displayName,
        photoURL: currentUser.photoURL || "",
        role,
        mathLabRole: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(docRef, newProfile);
      const again = await getDoc(docRef);
      if (again.exists()) {
        const userDataWithUid = { ...again.data(), uid: currentUser.uid };
        UserCache.setUserData(userDataWithUid);
        setLastFetchTime(Date.now());
        CachePerformance.endTiming(timing);
        return userDataWithUid;
      }

      CachePerformance.endTiming(timing);
      return null;
    } catch (err) {
      console.error("[AuthContext] fetchUserData", {
        error: err,
        code: err?.code,
        message: err?.message,
        uid: currentUser?.uid,
        forceRefresh,
      });
      CachePerformance.endTiming(timing);
      return null;
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (!user) {
      return;
    }

    const timing = CachePerformance.startTiming("refreshUserData");
    const timeSinceLastFetch = Date.now() - lastFetchTime;
    const shouldRefresh = timeSinceLastFetch > 5 * 60 * 1000;

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
    if (!auth || !firestore) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);

        if (currentUser) {
          const freshData = await fetchUserData(currentUser, true);
          if (freshData) {
            setUserData(freshData);
            setLastFetchTime(Date.now());
          } else {
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
        console.error("[AuthContext] Auth state change error:", {
          error: error.message,
          code: error.code,
          hasUser: !!currentUser,
          uid: currentUser?.uid,
        });
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

  useEffect(() => {
    if (!auth || !firestore) {
      return;
    }

    const applyVerifiedState = async () => {
      try {
        if (auth.currentUser) {
          await auth.currentUser.reload();
          setUser(auth.currentUser);
          const freshData = await fetchUserData(auth.currentUser, true);
          if (freshData) {
            setUserData(freshData);
            setLastFetchTime(Date.now());
          }
          localStorage.removeItem("emailVerificationStatus");
        }
      } catch (error) {
        console.error("[AuthContext] applyVerifiedState", {
          error: error.message,
          code: error.code,
        });
      }
    };

    const handleEmailVerifiedEvent = () => {
      applyVerifiedState();
    };

    const handleStorage = (event) => {
      if (event.key === "emailVerificationStatus" && event.newValue === "verified") {
        applyVerifiedState();
      }
    };

    const verificationStatus = localStorage.getItem("emailVerificationStatus");
    if (verificationStatus === "verified") {
      applyVerifiedState();
    }

    window.addEventListener("emailVerified", handleEmailVerifiedEvent);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("emailVerified", handleEmailVerifiedEvent);
      window.removeEventListener("storage", handleStorage);
    };
  }, [fetchUserData]);

  useEffect(() => {
    const handleRoleChange = async (event) => {
      if (user && event.detail.userId === user.uid) {
        const freshData = await fetchUserData(user, true);
        if (freshData) {
          setUserData(freshData);
          setLastFetchTime(Date.now());
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("userRoleChanged", handleRoleChange);
      return () => {
        window.removeEventListener("userRoleChanged", handleRoleChange);
      };
    }
    return undefined;
  }, [user, fetchUserData]);

  const getRedirectUrl = () => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get("redirectTo");
      if (redirectTo && redirectTo.startsWith("/")) {
        return redirectTo;
      }
    }
    return null;
  };

  const contextValue = useMemo(
    () => ({
      user,
      userData,
      loading,
      getRedirectUrl,
      refreshUserData,
      lastFetchTime,
      isEmailVerified: user?.emailVerified || false,
    }),
    [user, userData, loading, refreshUserData, lastFetchTime],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
