"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/firebase";
import { applyActionCode, checkActionCode, sendEmailVerification } from "firebase/auth";
import DashboardTopBar from "@/components/DashboardTopBar";
import Image from "next/image";

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
    console.log('[VerifyEmailPage] resendVerificationEmail: Starting resend process', {
      hasUser: !!auth.currentUser,
      resendCooldown,
      userEmail: auth.currentUser?.email
    });
    
    if (!auth.currentUser || resendCooldown > 0) {
      console.log('[VerifyEmailPage] resendVerificationEmail: Cannot resend - no user or cooldown active');
      return;
    }
    
    setIsResending(true);
    try {
      console.log('[VerifyEmailPage] resendVerificationEmail: Sending verification email');
      await sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: false
      });
      console.log('[VerifyEmailPage] resendVerificationEmail: Verification email sent successfully');
      setMessage("Verification email sent! Please check your inbox.");
      
      // Start 30-second cooldown
      setResendCooldown(30);
      console.log('[VerifyEmailPage] resendVerificationEmail: Started 30-second cooldown');
    } catch (error) {
      console.error("[VerifyEmailPage] resendVerificationEmail: Error resending verification email", {
        error: error.message,
        code: error.code
      });
      setMessage("Failed to resend verification email. Please try again.");
    } finally {
      console.log('[VerifyEmailPage] resendVerificationEmail: Resend process completed');
      setIsResending(false);
    }
  };

  useEffect(() => {
    const handleEmailVerification = async () => {
      console.log('[VerifyEmailPage] handleEmailVerification: Starting email verification process');
      
      // Prevent multiple verification attempts
      if (hasAttemptedVerification.current) {
        console.log('[VerifyEmailPage] handleEmailVerification: Verification already attempted, skipping');
        return;
      }

      try {
        const oobCode = searchParams.get('oobCode');
        const mode = searchParams.get('mode');
        const email = searchParams.get('email');

        console.log('[VerifyEmailPage] handleEmailVerification: URL parameters', {
          oobCode: oobCode ? 'present' : 'missing',
          mode,
          email,
          hasUser: !!auth.currentUser,
          userEmailVerified: auth.currentUser?.emailVerified
        });

        // Check if user is already verified
        if (auth.currentUser && auth.currentUser.emailVerified) {
          console.log('[VerifyEmailPage] handleEmailVerification: User email already verified');
          setStatus("success");
          setMessage("Your email is already verified! Redirecting you to the dashboard...");
          
          // Set verification status for cross-tab communication
          localStorage.setItem('emailVerificationStatus', 'verified');
          console.log('[VerifyEmailPage] handleEmailVerification: Set emailVerificationStatus in localStorage');
          
          // Trigger custom event
          if (typeof window !== 'undefined') {
            console.log('[VerifyEmailPage] handleEmailVerification: Dispatching emailVerified event');
            window.dispatchEvent(new CustomEvent('emailVerified', { 
              detail: { verified: true, userId: auth.currentUser?.uid } 
            }));
          }
          
          setTimeout(() => {
            // Check for redirectTo parameter
            const redirectTo = searchParams.get('redirectTo');
            const redirectUrl = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/welcome';
            console.log('[VerifyEmailPage] handleEmailVerification: Redirecting to', redirectUrl);
            router.push(redirectUrl);
          }, 2000);
          return;
        }

        // If no oobCode, this is a redirect from signup - check if already verified
        if (!oobCode || mode !== 'verifyEmail') {
          console.log('[VerifyEmailPage] handleEmailVerification: No oobCode or wrong mode, checking if already verified');
          
          // If no user is signed in, redirect to welcome (they'll be redirected to login if needed)
          if (!auth.currentUser) {
            console.log('[VerifyEmailPage] handleEmailVerification: No user signed in, showing pending status');
            setStatus("pending");
            setMessage("Please check your email and click the verification link to continue.");
            setTimeout(() => {
              console.log('[VerifyEmailPage] handleEmailVerification: Redirecting to welcome page');
              router.push('/welcome');
            }, 3000);
            return;
          }
          
          // Check if user is already verified even without oobCode
          if (auth.currentUser.emailVerified) {
          console.log('[VerifyEmailPage] handleEmailVerification: User already verified without oobCode');
          setStatus("success");
          setMessage("Your email is already verified! This page will close automatically.");
          
          // Set verification status for cross-tab communication
          localStorage.setItem('emailVerificationStatus', 'verified');
          console.log('[VerifyEmailPage] handleEmailVerification: Set emailVerificationStatus in localStorage');
          
          // Trigger custom event
          if (typeof window !== 'undefined') {
            console.log('[VerifyEmailPage] handleEmailVerification: Dispatching emailVerified event');
            window.dispatchEvent(new CustomEvent('emailVerified', { 
              detail: { verified: true, userId: auth.currentUser?.uid } 
            }));
          }
          
          // Close the page instead of redirecting
          setTimeout(() => {
            console.log('[VerifyEmailPage] handleEmailVerification: Closing verification page');
            try {
              window.close();
            } catch (error) {
              console.log('[VerifyEmailPage] handleEmailVerification: Could not close window, redirecting to welcome instead');
              const redirectTo = searchParams.get('redirectTo');
              const redirectUrl = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/welcome';
              router.push(redirectUrl);
            }
          }, 2000);
            return;
          }
          
          console.log('[VerifyEmailPage] handleEmailVerification: User signed in but not verified, showing pending status');
          setStatus("pending");
          setMessage("Please check your email and click the verification link to continue.");
          setUser(auth.currentUser);
          return;
        }

        // Mark that we've attempted verification
        hasAttemptedVerification.current = true;
        console.log('[VerifyEmailPage] handleEmailVerification: Marked verification attempt as started');

        // Decode the oobCode if it's URL encoded
        const decodedOobCode = oobCode ? decodeURIComponent(oobCode) : oobCode;
        console.log('[VerifyEmailPage] handleEmailVerification: Decoded oobCode', {
          original: oobCode ? 'present' : 'missing',
          decoded: decodedOobCode ? 'present' : 'missing'
        });

        // Check if the action code is valid
        console.log('[VerifyEmailPage] handleEmailVerification: Checking action code validity');
        await checkActionCode(auth, decodedOobCode);
        console.log('[VerifyEmailPage] handleEmailVerification: Action code is valid');
        
        // Apply the email verification (this should sign the user in automatically)
        console.log('[VerifyEmailPage] handleEmailVerification: Applying action code');
        await applyActionCode(auth, decodedOobCode);
        console.log('[VerifyEmailPage] handleEmailVerification: Action code applied successfully');
        
        // Wait a moment for auth state to update
        console.log('[VerifyEmailPage] handleEmailVerification: Waiting for auth state to update');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force refresh the auth state to update emailVerified status
        if (auth.currentUser) {
          console.log('[VerifyEmailPage] handleEmailVerification: Reloading user to get updated emailVerified status');
          await auth.currentUser.reload();
          console.log('[VerifyEmailPage] handleEmailVerification: User reloaded, emailVerified:', auth.currentUser.emailVerified);
        }
        
        setStatus("success");
        setMessage("Email verified successfully! This page will close automatically.");
        console.log('[VerifyEmailPage] handleEmailVerification: Email verification completed successfully');
        
        // Notify parent window and other tabs immediately
        localStorage.setItem('emailVerificationStatus', 'verified');
        console.log('[VerifyEmailPage] handleEmailVerification: Set emailVerificationStatus in localStorage');
        
        if (typeof window !== 'undefined') {
          console.log('[VerifyEmailPage] handleEmailVerification: Dispatching emailVerified event');
          window.dispatchEvent(new CustomEvent('emailVerified', { 
            detail: { verified: true, userId: auth.currentUser?.uid } 
          }));
          // Also try to notify parent window if this is a popup
          if (window.opener) {
            console.log('[VerifyEmailPage] handleEmailVerification: Notifying parent window');
            window.opener.postMessage({ type: 'EMAIL_VERIFIED', action: 'redirect_and_signin' }, window.location.origin);
          }
        }

        // Close the page immediately instead of redirecting
        setTimeout(() => {
          console.log('[VerifyEmailPage] handleEmailVerification: Closing verification page');
          try {
            window.close();
          } catch (error) {
            console.log('[VerifyEmailPage] handleEmailVerification: Could not close window, redirecting to welcome instead');
            const redirectTo = searchParams.get('redirectTo');
            const redirectUrl = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/welcome';
            router.push(redirectUrl);
          }
        }, 2000);

      } catch (error) {
        console.error("[VerifyEmailPage] handleEmailVerification: Email verification error", {
          code: error.code,
          message: error.message,
          oobCode: searchParams.get('oobCode'),
          mode: searchParams.get('mode')
        });
        
        if (error.code === 'auth/expired-action-code') {
          console.log('[VerifyEmailPage] handleEmailVerification: Action code expired');
          setStatus("expired");
          setMessage("This verification link has expired. Please request a new one.");
        } else if (error.code === 'auth/invalid-action-code') {
          console.log('[VerifyEmailPage] handleEmailVerification: Invalid action code, checking if user is already verified');
          // Check if user is already verified despite the invalid code
          // First reload the user to get the latest verification status
          if (auth.currentUser) {
            try {
              console.log('[VerifyEmailPage] handleEmailVerification: Reloading user after invalid action code');
              await auth.currentUser.reload();
              console.log('[VerifyEmailPage] handleEmailVerification: User reloaded, emailVerified:', auth.currentUser.emailVerified);
              
              if (auth.currentUser.emailVerified) {
                console.log('[VerifyEmailPage] handleEmailVerification: User is already verified despite invalid code');
                setStatus("success");
                setMessage("Your email is already verified! This page will close automatically.");
                
                // Set verification status for cross-tab communication
                localStorage.setItem('emailVerificationStatus', 'verified');
                console.log('[VerifyEmailPage] handleEmailVerification: Set emailVerificationStatus in localStorage');
                
                // Trigger custom event
                if (typeof window !== 'undefined') {
                  console.log('[VerifyEmailPage] handleEmailVerification: Dispatching emailVerified event');
                  window.dispatchEvent(new CustomEvent('emailVerified', { 
                    detail: { verified: true, userId: auth.currentUser?.uid } 
                  }));
                }

                // Close the page instead of redirecting
                setTimeout(() => {
                  console.log('[VerifyEmailPage] handleEmailVerification: Closing verification page');
                  try {
                    window.close();
                  } catch (error) {
                    console.log('[VerifyEmailPage] handleEmailVerification: Could not close window, redirecting to welcome instead');
                    const redirectTo = searchParams.get('redirectTo');
                    const redirectUrl = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/welcome';
                    router.push(redirectUrl);
                  }
                }, 2000);
              } else {
                console.log('[VerifyEmailPage] handleEmailVerification: User not verified, showing error');
                setStatus("error");
                setMessage("Invalid verification link. The link may be malformed or already used. Please try signing up again to get a new verification email.");
              }
            } catch (reloadError) {
              console.error('[VerifyEmailPage] handleEmailVerification: Error reloading user', reloadError);
              setStatus("error");
              setMessage("Invalid verification link. The link may be malformed or already used. Please try signing up again to get a new verification email.");
            }
          } else {
            console.log('[VerifyEmailPage] handleEmailVerification: No current user, showing error');
            setStatus("error");
            setMessage("Invalid verification link. The link may be malformed or already used. Please try signing up again to get a new verification email.");
          }
        } else if (error.code === 'auth/user-disabled') {
          console.log('[VerifyEmailPage] handleEmailVerification: User account disabled');
          setStatus("error");
          setMessage("This account has been disabled. Please contact brhsc4c@gmail.com for assistance.");
        } else {
          console.log('[VerifyEmailPage] handleEmailVerification: Unknown verification error', error.code);
          setStatus("error");
          setMessage(`Verification failed: ${error.message}. Please try signing up again.`);
        }
      }
    };

    // Handle page unload/close
    const handleBeforeUnload = () => {
      try {
        // Clean up localStorage if user leaves before verification completes
        if (status !== "success") {
          localStorage.removeItem('emailVerificationStatus');
        }
      } catch (error) {
        console.error('Error in handleBeforeUnload:', error);
      }
    };

    // Handle visibility change (tab switching)
    const handleVisibilityChange = () => {
      try {
        if (document.hidden && status === "success") {
          // If user switches tabs during countdown, ensure localStorage is set
          localStorage.setItem('emailVerificationStatus', 'verified');
        }
      } catch (error) {
        console.error('Error in handleVisibilityChange:', error);
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

  // Monitor for verification status changes
  useEffect(() => {
    const checkVerificationStatus = () => {
      if (auth.currentUser && auth.currentUser.emailVerified && status === "pending") {
        console.log('[VerifyEmailPage] checkVerificationStatus: User became verified, updating status');
        setStatus("success");
        setMessage("Your email is now verified! This page will close automatically.");
        
        // Set verification status for cross-tab communication
        localStorage.setItem('emailVerificationStatus', 'verified');
        console.log('[VerifyEmailPage] checkVerificationStatus: Set emailVerificationStatus in localStorage');
        
        // Trigger custom event
        if (typeof window !== 'undefined') {
          console.log('[VerifyEmailPage] checkVerificationStatus: Dispatching emailVerified event');
          window.dispatchEvent(new CustomEvent('emailVerified', { 
            detail: { verified: true, userId: auth.currentUser?.uid } 
          }));
        }
        
        // Close the page instead of redirecting
        setTimeout(() => {
          console.log('[VerifyEmailPage] checkVerificationStatus: Closing verification page');
          try {
            window.close();
          } catch (error) {
            console.log('[VerifyEmailPage] checkVerificationStatus: Could not close window, redirecting to welcome instead');
            const redirectTo = searchParams.get('redirectTo');
            const redirectUrl = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/welcome';
            router.push(redirectUrl);
          }
        }, 2000);
      }
    };

    const handleEmailVerifiedEvent = () => {
      console.log('[VerifyEmailPage] handleEmailVerifiedEvent: Email verified event received');
      if (status === "pending") {
        checkVerificationStatus();
      }
    };

    // Check immediately
    checkVerificationStatus();

    // Listen for email verification events
    window.addEventListener('emailVerified', handleEmailVerifiedEvent);

    // Set up interval to check periodically
    const interval = setInterval(checkVerificationStatus, 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('emailVerified', handleEmailVerifiedEvent);
    };
  }, [status, searchParams, router]);

  // Separate useEffect for countdown when verification is successful
  useEffect(() => {
    if (status !== "success") return;

    let countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Notify before closing
          localStorage.setItem('emailVerificationStatus', 'verified');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('emailVerified', { 
              detail: { verified: true, userId: auth.currentUser?.uid } 
            }));
            if (window.opener) {
              window.opener.postMessage({ type: 'EMAIL_VERIFIED', action: 'redirect_and_signin' }, window.location.origin);
            }
          }
          // Try to close the window
          console.log('[VerifyEmailPage] countdown: Closing verification page');
          try {
            window.close();
          } catch (error) {
            console.log('[VerifyEmailPage] countdown: Could not close window, redirecting to welcome instead');
            try {
              router.push('/welcome');
            } catch (navError) {
              console.error('[VerifyEmailPage] countdown: Navigation error', navError);
            }
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
              <Image
                src="/spartan.png"
                alt="BRHS Spartan Logo"
                width={32}
                height={32}
                className="w-8 h-8"
                priority
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
            
            {status === "success" && (
              <div className="mb-6">
                <div className="text-4xl font-bold text-primary mb-2">
                  {countdown}
                </div>
                <p className="text-sm text-gray-500">
                  This page will close automatically...
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
