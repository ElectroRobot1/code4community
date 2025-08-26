"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, provider, firestore } from "@/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/components/AuthContext";
import Link from "next/link";
import Image from "next/image";
import db from "../../utils/database";
import { globalCache } from "../../utils/cache";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  // Track if user just logged in
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // Redirect if already logged in (but only after successful login, not on page load)
  useEffect(() => {
    console.log("Login page useEffect:", { user: !!user, userData: !!userData, loading, userEmail: user?.email, userRole: userData?.role, justLoggedIn });
    
    if (!loading && user && justLoggedIn) {
      // If userData is null, it means the user document doesn't exist in Firestore
      // This happens when user signed up but didn't complete role selection
      if (!userData) {
        console.log("No userData (incomplete signup), redirecting to role selection");
        router.push("/signup/role");
        return;
      }
      
      // Check if user has a role assigned
      if (!userData.role) {
        console.log("No role, redirecting to role selection");
        router.push("/signup/role");
        return;
      }
      
      // User is verified and has a role, redirect to appropriate dashboard
      console.log("User complete, redirecting to dashboard");
      if (userData.role === "admin") {
        router.push("/admin/dashboard");
      } else if (userData.role === "teacher") {
        router.push("/teacher/dashboard");
      } else if (userData.role === "student") {
        router.push("/student/dashboard");
      } else {
        router.push("/welcome");
      }
    }
  }, [user, userData, loading, router, justLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      console.log("Attempting login with email:", email);
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful");
      setJustLoggedIn(true);
      // The redirect will be handled by the useEffect above
    } catch (error) {
      console.error("Login error:", error);
      
      // Check if user exists in our database to provide better error messages
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        try {
          // Check cache first for user lookup
          const cacheKey = `userLookup:${email}`;
          const cachedUser = globalCache.get(cacheKey);
          
          if (cachedUser) {
            // User exists in Firestore but login failed
            setError("This email is associated with a Google account. Please use 'Continue with Google' to sign in.");
            return;
          }
          
          // Check if user exists in Firestore with caching
          const usersSnap = await db.getDocuments("users", {
            whereClauses: [{ field: "email", operator: "==", value: email }],
            useCache: true
          });
          
          if (!usersSnap.documents.length) {
            // User doesn't exist at all
            setError("No account found with this email. Please sign up first.");
          } else {
            // User exists in Firestore but login failed
            setError("This email is associated with a Google account. Please use 'Continue with Google' to sign in.");
            // Cache this lookup to avoid future queries
            globalCache.set(cacheKey, true, 300); // 5 minutes
          }
        } catch (dbError) {
          console.error("Error checking user in database:", dbError);
          setError("Login failed. Please check your email and password.");
        }
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("Login failed: " + error.message);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    
    try {
      console.log("Attempting Google login");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in our database
      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      
      if (!userDoc.exists()) {
        // Check if user with this email exists but different UID (email/password user)
        const usersQuery = query(collection(firestore, "users"), where("email", "==", user.email));
        const userSnapshot = await getDocs(usersQuery);
        
        if (!userSnapshot.empty) {
          // User exists with email/password but trying to use Google
          setError("An account with this email already exists using email/password. Please use your password to sign in.");
          return;
        }
        
        // User doesn't exist, redirect to signup
        console.log("User doesn't exist, redirecting to signup");
        router.push("/signup");
        return;
      }
      
      // Sync photoURL from Firebase Auth with Firestore
      const userData = userDoc.data();
      if (user.photoURL && userData.photoURL !== user.photoURL) {
        console.log("Updating photoURL in Firestore during login");
        
        // Modify Google profile picture URL to be more reliable
        let modifiedPhotoURL = user.photoURL;
        if (user.photoURL.includes('lh3.googleusercontent.com')) {
          modifiedPhotoURL = user.photoURL.replace(/=s\d+-c$/, '=s400-c');
          console.log("Modified photoURL during login:", modifiedPhotoURL);
        }
        
        try {
          await updateDoc(doc(firestore, "users", user.uid), {
            photoURL: modifiedPhotoURL
          });
        } catch (error) {
          console.error("Error updating photoURL during login:", error);
        }
      }
      
      console.log("Google login successful");
      setJustLoggedIn(true);
      // The redirect will be handled by the useEffect above
    } catch (error) {
      console.error("Google login error:", error);
      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign in was cancelled. Please try again.");
      } else if (error.code === "auth/popup-blocked") {
        setError("Pop-up was blocked. Please allow pop-ups for this site and try again.");
      } else {
        setError("Google login error: " + error.message);
      }
    }
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium mb-4">Loading...</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-sm text-primary hover:text-primary/80 underline"
          >
            If this takes too long, click here to reload
          </button>
        </div>
      </div>
    );
  }

  // Don't show login form if already authenticated and complete
  if (user && userData && userData.role) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-3 mb-8 group">
            <div className="relative">
              <Image
                src="/logo.svg"
                alt="StudyHub Logo"
                width={40}
                height={40}
                className="w-10 h-10 transition-transform duration-200 group-hover:scale-110"
              />
            </div>
            <span className="text-2xl font-bold text-foreground">
              StudyHub
            </span>
          </Link>
          <h1 className="text-3xl font-bold mb-3">Welcome back</h1>
          <p className="text-muted-foreground text-lg">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="card-elevated p-8">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm font-medium">{error}</p>
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
              />
            </div>

            <button type="submit" className="btn-primary w-full text-base py-4">
              Sign In
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
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
            className="w-full btn-outline flex items-center justify-center gap-3 py-4 text-base"
          >
            <Image
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google logo"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            Continue with Google
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
