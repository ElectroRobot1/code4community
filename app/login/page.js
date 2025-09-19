"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { auth, provider, firestore, fetchSignInMethodsForEmail } from "@/firebase";
import { UserCache, CachePerformance } from "@/utils/cache";
import { useAuth } from "@/components/AuthContext";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const { user, userData, loading: authLoading, getRedirectUrl, refreshUserData } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    console.log('[LoginPage] useEffect: Checking redirect conditions', {
      authLoading,
      hasUser: !!user,
      hasUserData: !!userData,
      isRedirecting,
      userEmail: user?.email,
      userEmailVerified: user?.emailVerified
    });
    
    if (!authLoading && user && userData && !isRedirecting) {
      console.log('[LoginPage] useEffect: User is authenticated, preparing redirect');
      setIsRedirecting(true);
      
      const go = async () => {
        try {
          console.log('[LoginPage] useEffect: Refreshing user data before redirect');
          await refreshUserData();
        } catch (error) {
          console.error('[LoginPage] useEffect: Error refreshing user data', error);
        }
        const redirectTo = getRedirectUrl();
        console.log('[LoginPage] useEffect: Redirecting to', redirectTo || "/mathlab");
        try {
          router.push(redirectTo || "/mathlab");
        } catch (error) {
          console.error('[LoginPage] useEffect: Navigation error', error);
        }
      };
      
      // Execute immediately instead of using setTimeout
      go();
    }
  }, [user, userData, authLoading, router, getRedirectUrl, refreshUserData, isRedirecting]);

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('[LoginPage] handleLogin: Starting email/password login attempt', { email });
    setError(null);
    setLoading(true);
    
    try {
      console.log('[LoginPage] handleLogin: Attempting signInWithEmailAndPassword');
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      console.log('[LoginPage] handleLogin: Login successful', {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified
      });
      
      // Check if email is verified - redirect to verification page instead of signing out
      if (!user.emailVerified) {
        console.log('[LoginPage] handleLogin: Email not verified, redirecting to verification page');
        // Redirect to verification page (user stays signed in)
        router.push('/verify-email?email=' + encodeURIComponent(user.email));
        return;
      }
      
      console.log('[LoginPage] handleLogin: Email verified, redirect will be handled by useEffect');
      // Redirect will be handled by useEffect above
    } catch (error) {
      console.error("[LoginPage] handleLogin: Login error", {
        code: error.code,
        message: error.message,
        email
      });
      
      if (error.code === "auth/user-not-found") {
        console.log('[LoginPage] handleLogin: User not found, checking sign-in methods');
        // Check if email is associated with Google account
        try {
          const signInMethods = await fetchSignInMethodsForEmail(auth, email);
          console.log('[LoginPage] handleLogin: Sign-in methods found', signInMethods);
          if (signInMethods.includes("google.com")) {
            setError("No account found with this email and password. Please sign in with Google instead.");
          } else {
            setError("No account found with this email. Please sign up first.");
          }
        } catch (fetchError) {
          console.error('[LoginPage] handleLogin: Error fetching sign-in methods', fetchError);
          setError("No account found with this email. Please sign up first.");
        }
      } else if (error.code === "auth/wrong-password") {
        console.log('[LoginPage] handleLogin: Wrong password, checking sign-in methods');
        // Check if email is associated with Google account
        try {
          const signInMethods = await fetchSignInMethodsForEmail(auth, email);
          console.log('[LoginPage] handleLogin: Sign-in methods found', signInMethods);
          if (signInMethods.includes("google.com")) {
            setError("Incorrect password. This email is associated with a Google account. Please sign in with Google instead.");
          } else {
            setError("Incorrect password. Please try again.");
          }
        } catch (fetchError) {
          console.error('[LoginPage] handleLogin: Error fetching sign-in methods', fetchError);
          setError("Incorrect password. Please try again.");
        }
      } else if (error.code === "auth/invalid-email") {
        console.log('[LoginPage] handleLogin: Invalid email format');
        setError("Please enter a valid email address.");
      } else if (error.code === "auth/too-many-requests") {
        console.log('[LoginPage] handleLogin: Too many requests');
        setError("Too many failed attempts. Please try again later.");
      } else if (error.code === "auth/invalid-credential") {
        console.log('[LoginPage] handleLogin: Invalid credentials, checking sign-in methods');
        // Check if email is associated with Google account
        try {
          const signInMethods = await fetchSignInMethodsForEmail(auth, email);
          console.log('[LoginPage] handleLogin: Sign-in methods found', signInMethods);
          if (signInMethods.includes("google.com")) {
            setError("Invalid credentials. This email is associated with a Google account. Please sign in with Google instead.");
          } else {
            setError("Invalid credentials. Please check your email and password.");
          }
        } catch (fetchError) {
          console.error('[LoginPage] handleLogin: Error fetching sign-in methods', fetchError);
          setError("Invalid credentials. Please check your email and password.");
        }
      } else {
        console.log('[LoginPage] handleLogin: Unknown error', error.code);
        setError("Login failed. Please check your credentials and try again.");
      }
    } finally {
      console.log('[LoginPage] handleLogin: Login attempt completed, setting loading to false');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    console.log('[LoginPage] handleGoogleLogin: Starting Google login attempt');
    setError(null);
    setLoading(true);
    
    try {
      console.log('[LoginPage] handleGoogleLogin: Attempting signInWithPopup');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log('[LoginPage] handleGoogleLogin: Google login successful', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
      
      // Check if user exists in our database
      console.log('[LoginPage] handleGoogleLogin: Checking if user exists in Firestore');
      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      
      if (!userDoc.exists()) {
        console.log('[LoginPage] handleGoogleLogin: User does not exist, creating new account');
        // User doesn't exist, create account automatically
        try {
          const userData = {
            email: user.email,
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            role: "student", // Default role
            mathLabRole: "", // Empty math lab role - user will choose later
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          console.log('[LoginPage] handleGoogleLogin: Creating user document in Firestore', userData);
          await setDoc(doc(firestore, "users", user.uid), userData);
          console.log('[LoginPage] handleGoogleLogin: User document created successfully');
          
          // Refresh user data to ensure it's loaded
          console.log('[LoginPage] handleGoogleLogin: Refreshing user data');
          await refreshUserData();
          
          // Cache user data for immediate availability after redirect
          const cachedUserData = { ...userData, uid: user.uid };
          console.log('[LoginPage] handleGoogleLogin: Caching user data', cachedUserData);
          UserCache.setUserData(cachedUserData);
        } catch (createError) {
          console.error("[LoginPage] handleGoogleLogin: Error creating user account", {
            error: createError.message,
            code: createError.code,
            uid: user.uid
          });
          setError("Failed to create account. Please try again.");
          setLoading(false);
          return;
        }
      } else {
        console.log('[LoginPage] handleGoogleLogin: User exists, syncing data');
        // Sync photoURL from Firebase Auth with Firestore
        const userData = userDoc.data();
        if (user.photoURL && userData.photoURL !== user.photoURL) {
          console.log('[LoginPage] handleGoogleLogin: Updating photoURL in Firestore');
          try {
            await updateDoc(doc(firestore, "users", user.uid), {
              photoURL: user.photoURL
            });
            console.log('[LoginPage] handleGoogleLogin: PhotoURL updated successfully');
          } catch (error) {
            console.error("[LoginPage] handleGoogleLogin: Error updating photoURL", error);
          }
        }
        
        // Cache user data for immediate availability after redirect
        console.log('[LoginPage] handleGoogleLogin: Caching existing user data');
        UserCache.setUserData(userData);
      }
      
      // Add a small delay to ensure AuthContext is updated before redirecting
      console.log('[LoginPage] handleGoogleLogin: Preparing redirect after delay');
      setTimeout(() => {
        const redirectTo = getRedirectUrl();
        console.log('[LoginPage] handleGoogleLogin: Redirecting to', redirectTo || "/mathlab");
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.push("/mathlab");
        }
      }, 100);
    } catch (error) {
      console.error("[LoginPage] handleGoogleLogin: Google login error", {
        code: error.code,
        message: error.message
      });
      if (error.code === "auth/popup-closed-by-user") {
        console.log('[LoginPage] handleGoogleLogin: Popup closed by user');
        setError("Sign in was cancelled. Please try again.");
      } else if (error.code === "auth/popup-blocked") {
        console.log('[LoginPage] handleGoogleLogin: Popup blocked');
        setError("Pop-up was blocked. Please allow pop-ups for this site and try again.");
      } else {
        console.log('[LoginPage] handleGoogleLogin: Unknown Google login error', error.code);
        setError("Google login failed. Please try again.");
      }
    } finally {
      console.log('[LoginPage] handleGoogleLogin: Google login attempt completed, setting loading to false');
      setLoading(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading screen when redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Don't show login form if already authenticated
  if (user && userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-3 mb-8 group">
            <div className="relative">
              <Image
                src="/spartan.png"
                alt="BRHS Utilities Logo"
                width={40}
                height={40}
                className="w-10 h-10 transition-transform duration-200 group-hover:scale-110"
              />
            </div>
            <span className="text-2xl font-bold text-foreground">
              BRHS Utilities
            </span>
          </Link>
          <h1 className="text-3xl font-bold mb-3">Welcome back</h1>
          <p className="text-muted-foreground text-lg">Sign in to your account</p>
        </div>

        <div className="card-elevated p-8">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-3 text-foreground">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-3 text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full text-base py-4">
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Signing In...
                </div>
              ) : (
                <>
                  Sign In
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-4 text-muted-foreground font-medium">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full btn-outline flex items-center justify-center gap-3 py-4 text-base"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent mr-2"></div>
                Signing In...
              </div>
            ) : (
              <>
                <Image
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google logo"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                Continue with Google
              </>
            )}
          </button>

          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-primary hover:text-primary/80 font-semibold transition-colors duration-200">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}