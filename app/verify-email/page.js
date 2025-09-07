"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/firebase";
import { applyActionCode, checkActionCode, sendEmailVerification } from "firebase/auth";
import DashboardTopBar from "@/components/DashboardTopBar";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState("verifying"); // verifying, success, error, expired
  const [message, setMessage] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [user, setUser] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const hasAttemptedVerification = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();

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

        console.log('Verification params:', { oobCode, mode, searchParams: searchParams.toString() });
        console.log('Full URL:', window.location.href);

        // Decode the oobCode if it's URL encoded
        const decodedOobCode = oobCode ? decodeURIComponent(oobCode) : oobCode;
        console.log('Decoded oobCode:', decodedOobCode);

        if (!oobCode || mode !== 'verifyEmail') {
          setStatus("error");
          setMessage("This page is only accessible via the verification link sent to your email. Please check your email and click the verification link.");
          return;
        }

        // Mark that we've attempted verification
        hasAttemptedVerification.current = true;

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
          // Try to close the current tab (will work if opened in popup/new tab)
          try {
            window.close();
          } catch (e) {
            // If can't close (e.g., not in popup), redirect instead
            router.push('/welcome');
          }
          
          // Send message to parent window to redirect and sign in
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'EMAIL_VERIFIED', 
              action: 'redirect_and_signin' 
            }, window.location.origin);
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
      case "error":
      case "expired":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <DashboardTopBar title="BRHS Utilities" showNavLinks={false} />
      
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
                  This page will close in {countdown} second{countdown !== 1 ? &apos;s&apos; : &apos;&apos;}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {status === "success" && (
              <div className="space-y-3">
                {/* Page will auto-close after countdown */}
              </div>
            )}

            {(status === "error" || status === "expired") && (
              <div className="space-y-3">
                <button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="w-full bg-primary text-white py-3 px-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResending ? "Sending..." : "Resend Verification Email"}
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Back to Login
                </button>
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
