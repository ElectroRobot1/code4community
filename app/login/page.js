"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { auth, provider, getFirestoreInstance, fetchSignInMethodsForEmail } from "@/firebase";
import { UserCache, CachePerformance } from "@/utils/cache";
import { useAuth } from "@/components/AuthContext";
import { validateEmail, validatePassword, sanitizeInput } from "@/utils/validation";
import { handleAuthError, logError } from "@/utils/errorHandling";
import { isAdminEmail } from "@/config/admin";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const router = useRouter();
  const { user, userData, loading: authLoading, getRedirectUrl, refreshUserData } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    
    if (!authLoading && user && userData && !isRedirecting) {
      setIsRedirecting(true);
      
      const go = async () => {
        try {
          await refreshUserData();
        } catch (error) {
          console.error('[LoginPage] useEffect: Error refreshing user data', error);
        }
        const redirectTo = getRedirectUrl();
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
    setError(null);
    setLoading(true);
    
    // Validate inputs
    const sanitizedEmail = sanitizeInput(email);
    if (sanitizedEmail !== email) {
      setError("Email contains invalid characters");
      setLoading(false);
      return;
    }

    const emailError = validateEmail(sanitizedEmail);
    if (emailError) {
      setError(emailError);
      setLoading(false);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }
    
    try {
      const result = await signInWithEmailAndPassword(auth, sanitizedEmail, password);
      const user = result.user;
      
      // Check if email is verified - redirect to verification page instead of signing out
      if (!user.emailVerified) {
        // Redirect to verification page (user stays signed in)
        router.push('/verify-email?email=' + encodeURIComponent(user.email));
        return;
      }
      
      // Redirect will be handled by useEffect above
    } catch (error) {
      logError(error, { type: 'login', email: sanitizedEmail });
      
      const errorResponse = handleAuthError(error);
      setError(errorResponse.error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      setError("Please enter your email address");
      return;
    }

    const emailError = validateEmail(forgotPasswordEmail);
    if (emailError) {
      setError(emailError);
      return;
    }

    setForgotPasswordLoading(true);
    setError(null);

    try {
      
      // Configure action code settings for password reset
      const actionCodeSettings = {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: false,
      };
      
      await sendPasswordResetEmail(auth, forgotPasswordEmail, actionCodeSettings);
      
      setError(`Password reset email sent to ${forgotPasswordEmail}. Please check your inbox and follow the instructions to reset your password.`);
      setShowForgotPassword(false);
      setForgotPasswordEmail("");
    } catch (error) {
      console.error('[LoginPage] handleForgotPassword: Error sending password reset email', error);
      
      let errorMessage = "Failed to send password reset email. Please try again.";
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many password reset attempts. Please try again later.";
      }
      
      setError(errorMessage);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in our database
      const firestore = await getFirestoreInstance();
      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      
      if (!userDoc.exists()) {
        // User doesn't exist, create account automatically
        try {
          const userData = {
            email: user.email,
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            role: "student", // Default role; admin elevation handled by update path
            mathLabRole: "", // Empty math lab role - user will choose later
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await setDoc(doc(firestore, "users", user.uid), userData);
          
          // Refresh user data to ensure it's loaded
          await refreshUserData();
          
          // Cache user data for immediate availability after redirect
          const cachedUserData = { ...userData, uid: user.uid };
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
        // Sync photoURL from Firebase Auth with Firestore
        const userData = userDoc.data();
        
        // Check if user should be admin and update role if needed
        const isAdmin = isAdminEmail(user.email);
        const needsRoleUpdate = isAdmin && userData.role !== 'admin';
        
        if (needsRoleUpdate) {
          try {
            await updateDoc(doc(firestore, "users", user.uid), {
              role: 'admin',
              updatedAt: new Date()
            });
            userData.role = 'admin'; // Update local data
          } catch (error) {
            console.error("[LoginPage] handleGoogleLogin: Error updating role", error);
          }
        }
        
        if (user.photoURL && userData.photoURL !== user.photoURL) {
          try {
            await updateDoc(doc(firestore, "users", user.uid), {
              photoURL: user.photoURL
            });
          } catch (error) {
            console.error("[LoginPage] handleGoogleLogin: Error updating photoURL", error);
          }
        }
        
        // Cache user data for immediate availability after redirect
        UserCache.setUserData(userData);
      }
      
      // Add a small delay to ensure AuthContext is updated before redirecting
      setTimeout(() => {
        const redirectTo = getRedirectUrl();
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
        setError("Sign in was cancelled. Please try again.");
      } else if (error.code === "auth/popup-blocked") {
        setError("Pop-up was blocked. Please allow pop-ups for this site and try again.");
      } else {
        setError("Google login failed. Please try again.");
      }
    } finally {
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

          {!showForgotPassword ? (
            <>
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

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors duration-200"
                  disabled={loading}
                >
                  Forgot your password?
                </button>
              </div>

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
            </>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
                <p className="text-muted-foreground">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              <div>
                <label htmlFor="forgot-email" className="block text-sm font-semibold mb-3 text-foreground">
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email"
                  className="input"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  required
                  disabled={forgotPasswordLoading}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotPasswordLoading || !forgotPasswordEmail.trim()}
                  className="btn-primary flex-1 text-base py-4"
                >
                  {forgotPasswordLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Sending...
                    </div>
                  ) : (
                    'Send Reset Email'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail("");
                    setError(null);
                  }}
                  disabled={forgotPasswordLoading}
                  className="btn-outline flex-1 text-base py-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
