"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardTopBar from "@/components/DashboardTopBar";

function CheckEmailContent() {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const email = searchParams.get('email');

  // Listen for email verification completion and check localStorage (no polling)
  useEffect(() => {
    console.log('[CheckEmailPage] useEffect: Setting up email verification listeners');
    let redirectTimeout = null;

    const handleMessage = (event) => {
      console.log('[CheckEmailPage] handleMessage: Received message', {
        origin: event.origin,
        type: event.data?.type,
        isFromSameOrigin: event.origin === window.location.origin
      });
      
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'EMAIL_VERIFIED') {
        console.log('[CheckEmailPage] handleMessage: Email verified message received');
        handleVerificationComplete();
      }
    };

    // Local handler when storage changes (cross-tab)
    const handleStorage = (event) => {
      console.log('[CheckEmailPage] handleStorage: Storage event received', {
        key: event.key,
        newValue: event.newValue
      });
      
      if (event.key === 'emailVerificationStatus' && event.newValue === 'verified') {
        console.log('[CheckEmailPage] handleStorage: Email verification status change detected');
        localStorage.removeItem('emailVerificationStatus');
        handleVerificationComplete();
      }
    };

    const handleVerificationComplete = () => {
      console.log('[CheckEmailPage] handleVerificationComplete: Email verification completed');
      setIsVerified(true);
      setMessage("Email verified! Redirecting you to the dashboard...");
      
      // Redirect to welcome page after a short delay
      console.log('[CheckEmailPage] handleVerificationComplete: Setting up redirect timeout');
      redirectTimeout = setTimeout(() => {
        console.log('[CheckEmailPage] handleVerificationComplete: Redirecting to welcome page');
        router.push('/welcome');
      }, 2000);
    };

    // Handle page unload/close
    const handleBeforeUnload = () => {
      console.log('[CheckEmailPage] handleBeforeUnload: Page unloading, cleaning up');
      // Clean up any pending redirects
      if (redirectTimeout) {
        console.log('[CheckEmailPage] handleBeforeUnload: Clearing redirect timeout');
        clearTimeout(redirectTimeout);
      }
    };

    // Handle visibility change (tab switching) - check once
    const handleVisibilityChange = () => {
      console.log('[CheckEmailPage] handleVisibilityChange: Visibility changed', {
        hidden: document.hidden,
        isVerified
      });
      
      if (!document.hidden && !isVerified) {
        console.log('[CheckEmailPage] handleVisibilityChange: Tab became visible, checking verification status');
        const verificationStatus = localStorage.getItem('emailVerificationStatus');
        console.log('[CheckEmailPage] handleVisibilityChange: Verification status', verificationStatus);
        
        if (verificationStatus === 'verified') {
          console.log('[CheckEmailPage] handleVisibilityChange: Email verified, completing verification');
          localStorage.removeItem('emailVerificationStatus');
          handleVerificationComplete();
        }
      }
    };

    console.log('[CheckEmailPage] useEffect: Adding event listeners');
    window.addEventListener('message', handleMessage);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorage);
    
    return () => {
      console.log('[CheckEmailPage] useEffect: Cleaning up event listeners');
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [router, isVerified]);

  const handleResendVerification = async () => {
    console.log('[CheckEmailPage] handleResendVerification: Resend verification requested');
    setIsResending(true);
    setMessage("Please go back to the signup page and try again to resend the verification email.");
    setTimeout(() => {
      console.log('[CheckEmailPage] handleResendVerification: Resend message timeout completed');
      setIsResending(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <DashboardTopBar title="Check Your Email" showNavLinks={false} />
      
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* Email Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Main Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {isVerified ? "Email Verified!" : "Check Your Email"}
            </h1>

            {!isVerified ? (
              <>
                <p className="text-gray-600 mb-6">
                  We&apos;ve sent a verification link to:
                </p>

                <div className="bg-gray-50 rounded-lg p-3 mb-6">
                  <p className="font-semibold text-gray-900">{email}</p>
                </div>

                <p className="text-gray-600 mb-6">
                  Click the link in the email to verify your account and complete your signup.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-6">
                  Your email has been verified successfully! You&apos;re being redirected to the dashboard.
                </p>
              </>
            )}

            {/* Action Buttons */}
            {!isVerified && (
              <div className="space-y-3">
                <button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="w-full bg-primary text-white py-3 px-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResending ? "Sending..." : "Resend Verification Email"}
                </button>
                
                <button
                  onClick={() => router.push('/login?redirectTo=/welcome')}
                  className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            )}

            {/* Help Text */}
            <div className="mt-6 text-sm text-gray-500">
              <p>Didn&apos;t receive the email? Check your spam folder.</p>
              <p className="mt-1">The verification link will expire in 24 hours.</p>
            </div>

            {/* Message Display */}
            {message && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">{message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <DashboardTopBar title="Check Your Email" showNavLinks={false} />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-6"></div>
              <h1 className="text-2xl font-bold text-gray-600 mb-4">Loading...</h1>
              <p className="text-gray-500">Please wait while we load the page...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <CheckEmailContent />
    </Suspense>
  );
}
