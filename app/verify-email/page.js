"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/firebase";
import { applyActionCode, checkActionCode, sendEmailVerification } from "firebase/auth";
import DashboardTopBar from "@/components/DashboardTopBar";

function VerifyEmailContent() {
  const [status, setStatus] = useState("verifying"); // verifying, success, error, expired
  const [message, setMessage] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [user, setUser] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [resendCooldown, setResendCooldown] = useState(0);
  const hasAttemptedVerification = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const resendVerificationEmail = async () => {
    if (!auth.currentUser || resendCooldown > 0) return;
    
    setIsResending(true);
    try {
      await sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: false
      });
      setMessage("Verification email sent! Please check your inbox.");
      
      // Start 30-second cooldown
      setResendCooldown(30);
    } catch (error) {
      console.error("Error resending verification email:", error);
      setMessage("Failed to resend verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    const handleEmailVerification = async () => {
      // Prevent multiple verification attempts
      if (hasAttemptedVerification.current) {
        console.log('Verification already attempted, skipping...');
        return;
      }

      try {
        const oobCode = searchParams.get('oobCode');
        const mode = searchParams.get('mode');
        const email = searchParams.get('email');

        console.log('Verification params:', { oobCode, mode, email, searchParams: searchParams.toString() });
        console.log('Full URL:', window.location.href);

        // Check if user is already verified
        if (auth.currentUser && auth.currentUser.emailVerified) {
          setStatus("success");
          setMessage("Your email is already verified! Redirecting you to the dashboard...");
          setTimeout(() => {
            // Check for redirectTo parameter
            const redirectTo = searchParams.get('redirectTo');
            const redirectUrl = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/welcome';
            router.push(redirectUrl);
          }, 2000);
          return;
        }

        // If no oobCode, this is a redirect from signup - show verification prompt
        if (!oobCode || mode !== 'verifyEmail') {
          setStatus("pending");
          setMessage("Please check your email and click the verification link to continue.");
          setUser(auth.currentUser);
          return;
        }

        // Mark that we've attempted verification
        hasAttemptedVerification.current = true;

        // Decode the oobCode if it's URL encoded
        const decodedOobCode = oobCode ? decodeURIComponent(oobCode) : oobCode;
        console.log('Decoded oobCode:', decodedOobCode);

        // Check if the action code is valid
        console.log('Checking action code:', decodedOobCode);
        await checkActionCode(auth, decodedOobCode);
        
        // Apply the email verification
        console.log('Applying action code:', decodedOobCode);
        await applyActionCode(auth, decodedOobCode);
        
        setStatus("success");
        setMessage("Email verified successfully! This page will close automatically.");
        
        // Set localStorage flag for cross-tab communication
        localStorage.setItem('emailVerificationStatus', 'verified');
        
        // Force refresh the auth state to update emailVerified status
        if (auth.currentUser) {
          await auth.currentUser.reload();
          console.log('User reloaded, emailVerified:', auth.currentUser.emailVerified);
        }
        
        // Also trigger a custom event for immediate detection
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('emailVerified', { 
            detail: { verified: true, userId: auth.currentUser?.uid } 
          }));
        }

      } catch (error) {
        console.error("Email verification error:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          oobCode: searchParams.get('oobCode'),
          mode: searchParams.get('mode')
        });
        
        if (error.code === 'auth/expired-action-code') {
          setStatus("expired");
          setMessage("This verification link has expired. Please request a new one.");
        } else if (error.code === 'auth/invalid-action-code') {
          setStatus("error");
          setMessage("Invalid verification link. The link may be malformed or already used. Please try signing up again to get a new verification email.");
        } else if (error.code === 'auth/user-disabled') {
          setStatus("error");
          setMessage("This account has been disabled. Please contact support.");
        } else {
          setStatus("error");
          setMessage(`Verification failed: ${error.message}. Please try signing up again.`);
        }
      }
    };

    // Handle page unload/close
    const handleBeforeUnload = () => {
      // Clean up localStorage if user leaves before verification completes
      if (status !== "success") {
        localStorage.removeItem('emailVerificationStatus');
      }
    };

    // Handle visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden && status === "success") {
        // If user switches tabs during countdown, ensure localStorage is set
        localStorage.setItem('emailVerificationStatus', 'verified');
      }
    };

    handleEmailVerification();

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [searchParams, router, status]);

  // Separate useEffect for countdown when verification is successful
  useEffect(() => {
    if (status !== "success") return;

    let countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          
          // Send message to parent window to redirect and sign in
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'EMAIL_VERIFIED', 
              action: 'redirect_and_signin' 
            }, window.location.origin);
            // Try to close the popup
            try {
              window.close();
            } catch (e) {
              // If can't close, redirect instead
              const redirectTo = searchParams.get('redirectTo');
              const redirectUrl = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/welcome';
              router.push(redirectUrl);
            }
          } else {
            // Not in popup, redirect directly
            const redirectTo = searchParams.get('redirectTo');
            const redirectUrl = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/welcome';
            router.push(redirectUrl);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
    };
  }, [status, router]);

  // Handle resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    setMessage("Please go back to the signup page and try again to resend the verification email.");
    setIsResending(false);
  };

  const getStatusIcon = () => {
    switch (status) {
      case "verifying":
        return (
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        );
      case "pending":
        return (
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case "success":
        return (
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "error":
      case "expired":
        return (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "text-green-600";
      case "pending":
        return "text-blue-600";
      case "error":
      case "expired":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Minimal topbar with just the title */}
      <header className="bg-background border-b border-border px-6 py-4 mb-6">
        <div className="container">
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              <img
                src="/spartan.png"
                alt="BRHS Spartan Logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <h1 className="text-xl font-semibold text-foreground">BRHS Utilities</h1>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* Status Icon */}
            <div className="flex justify-center mb-6">
              {getStatusIcon()}
            </div>

            {/* Status Message */}
            <h1 className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>
              {status === "verifying" && "Verifying Email..."}
              {status === "pending" && "Verify Your Email"}
              {status === "success" && "Email Verified!"}
              {status === "error" && "Verification Failed"}
              {status === "expired" && "Link Expired"}
            </h1>
            
            {status === "verifying" && (
              <p className="text-sm text-gray-500 mb-4">
                This verification is only required for email/password accounts. Google sign-ins are automatically verified.
              </p>
            )}

            <p className="text-gray-600 mb-6">
              {message}
            </p>
            
            {status === "success" && countdown > 0 && (
              <div className="mb-6">
                <div className="text-4xl font-bold text-primary mb-2">
                  {countdown}
                </div>
                <p className="text-sm text-gray-500">
                  This page will close in {countdown} second{countdown !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {status === "success" && (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const redirectTo = searchParams.get('redirectTo');
                    const redirectUrl = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/welcome';
                    router.push(redirectUrl);
                  }}
                  className="w-full bg-primary text-white py-3 px-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                >
                  Continue to Dashboard
                </button>
                <p className="text-xs text-gray-500 text-center">
                  Or wait for automatic redirect in {countdown} seconds
                </p>
              </div>
            )}

            {status === "pending" && (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-4">
                  We've sent a verification email to <strong>{user?.email}</strong>. 
                  Please check your inbox and click the verification link to continue.
                </div>
                <button
                  onClick={resendVerificationEmail}
                  disabled={isResending || resendCooldown > 0}
                  className="w-full bg-primary text-white py-3 px-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResending ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Verification Email"}
                </button>
              </div>
            )}

            {(status === "error" || status === "expired") && (
              <div className="text-sm text-gray-500">
                Please check your email and click the verification link, or try signing up again.
              </div>
            )}

            {status === "verifying" && (
              <div className="text-sm text-gray-500">
                Please wait while we verify your email...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <DashboardTopBar title="BRHS Utilities" showNavLinks={false} />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-6"></div>
              <h1 className="text-2xl font-bold text-gray-600 mb-4">Loading...</h1>
              <p className="text-gray-500">Please wait while we load the verification page...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
