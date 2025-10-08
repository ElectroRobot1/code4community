"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';

/**
 * Custom hook for handling authentication redirects
 * Replaces the repeated pattern across all protected pages
 * 
 * @param {string} redirectPath - The path to redirect to if not authenticated
 * @param {boolean} requireEmailVerification - Whether to require email verification
 * @returns {Object} - { isAuthenticated, isLoading, user, userData }
 */
export function useAuthRedirect(redirectPath, requireEmailVerification = false) {
  const { user, userData, loading, isEmailVerified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Check authentication
      if (!user) {
        router.push(`/login?redirectTo=${redirectPath}`);
        return;
      }

      // Check email verification if required
      if (requireEmailVerification && !isEmailVerified) {
        router.push('/verify-email');
        return;
      }
    }
  }, [user, loading, isEmailVerified, router, redirectPath, requireEmailVerification]);

  return {
    isAuthenticated: !!user,
    isLoading: loading,
    user,
    userData,
    isEmailVerified
  };
}
