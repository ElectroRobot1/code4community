"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/firebase";
import { validatePassword } from "@/utils/validation";
import Link from "next/link";
import Image from "next/image";

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [oobCode, setOobCode] = useState(null);
  const [email, setEmail] = useState("");
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('oobCode');
    if (code) {
      setOobCode(code);
      verifyCode(code);
    } else {
      setError("Invalid reset link. Please request a new password reset.");
      setVerifying(false);
    }
  }, [searchParams]);

  const verifyCode = async (code) => {
    try {
      const email = await verifyPasswordResetCode(auth, code);
      setEmail(email);
      setVerifying(false);
    } catch (error) {
      console.error('Error verifying reset code:', error);
      setError("Invalid or expired reset link. Please request a new password reset.");
      setVerifying(false);
    }
  };

  const handleResetPassword = async (submitEvent) => {
    submitEvent.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (!oobCode) {
      setError("Invalid reset code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (error) {
      console.error('Error resetting password:', error);
      
      let errorMessage = "Failed to reset password. Please try again.";
      
      if (error.code === 'auth/invalid-action-code') {
        errorMessage = "Invalid or expired reset link. Please request a new password reset.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      } else if (error.code === 'auth/expired-action-code') {
        errorMessage = "Reset link has expired. Please request a new password reset.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (success) {
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
          </div>

          <div className="card-elevated p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold mb-4">Password Reset Successful!</h1>
            <p className="text-muted-foreground mb-6">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            
            <Link 
              href="/login" 
              className="btn-primary w-full text-base py-4 inline-flex items-center justify-center"
            >
              Sign In
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
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
          <h1 className="text-3xl font-bold mb-3">Reset Password</h1>
          <p className="text-muted-foreground text-lg">
            Enter your new password for {email}
          </p>
        </div>

        <div className="card-elevated p-8">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold mb-3 text-foreground">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                placeholder="Enter your new password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-3 text-foreground">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full text-base py-4">
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Resetting Password...
                </div>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-muted-foreground">
              Remember your password?{' '}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
