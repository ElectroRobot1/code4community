"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from "firebase/auth";
import { auth, provider } from "@/firebase";

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      setLoading(true);
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName });
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Create Account</h1>
          <p className="text-muted-foreground">Join StudyHub to get started</p>
        </div>

        <div className="card-elevated p-8">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-semibold mb-2 text-foreground">
                Full Name
              </label>
              <input
                id="displayName"
                type="text"
                placeholder="Enter your full name"
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-2 text-foreground">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email address"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-2 text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Create a password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2 text-foreground">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-base py-4"
            >
              {loading ? (
                "Creating Account..."
              ) : (
                <>
                  Create Account
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full btn-outline flex items-center justify-center gap-3 py-4 text-base"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google logo"
              className="w-6 h-6"
            />
            Continue with Google
          </button>

          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors duration-200">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
