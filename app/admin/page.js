"use client";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useUserCache } from "@/hooks/useUserCache";
import { useLoadingState } from "@/hooks/useLoadingState";
import { CommonOperations, getDocuments, addDocument, deleteDocument } from "@/utils/firestoreUtils";
import { handleError, withErrorHandling } from "@/utils/errorHandlingUtils";
import { useEffect, useState, useCallback } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";
import LoadingSpinner from "../../components/LoadingSpinner";
import { doc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { firestore } from "@/firebase";
import { UserCache, CachePerformance } from "@/utils/cache";
import { isAdminUser } from "@/utils/authorization";

export default function AdminDashboard() {
  // Use new authentication redirect hook
  const { isAuthenticated, isLoading: authLoading, user, userData } = useAuthRedirect('/admin');
  
  // Use new user cache hook
  const { cachedUser, refreshCache } = useUserCache();
  
  // Use new loading state hook
  const { isLoading, setLoading, withLoading, isAddingTutor } = useLoadingState({
    isLoading: true,
    isAddingTutor: false
  });
  
  // Additional state
  const [tutors, setTutors] = useState([]);
  const [error, setError] = useState(null);
  const [showAddTutorForm, setShowAddTutorForm] = useState(false);
  const [newTutorEmail, setNewTutorEmail] = useState("");

  // Check if user is admin (by role or email) - simplified with new hooks
  const isAdmin = isAdminUser(userData || cachedUser);

  // Redirect if not admin
  useEffect(() => {
    if (userData && user && !isAdmin) {
      router.push('/welcome');
    }
  }, [userData, user, isAdmin, router]);

  // Redirect to email verification if email is not verified
  useEffect(() => {
    if (userData && !isEmailVerified) {
      router.push('/verify-email?email=' + encodeURIComponent(userData.email));
    }
  }, [userData, isEmailVerified, router]);

  // Fetch tutors using new utilities
  const fetchTutors = useCallback(async () => {
    if (!cachedUser && !userData) return;
    
    const result = await withLoading(async () => {
      const constraints = QueryBuilder.buildQuery('users', {
        where: { mathLabRole: 'tutor' }
      });
      
      const snapshot = await getDocs(query(collection(firestore, "users"), ...constraints));
      const tutorsList = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        tutorsList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
        });
      });

      setTutors(tutorsList);
      return tutorsList;
    }, {
      loadingKey: 'isLoading',
      onError: (error) => {
        handleError(error, {
          context: { operation: 'fetchTutors', userId: user?.uid },
          showAlert: true
        });
        setError("Failed to load tutors. Please try again.");
      }
    });
  }, [userData, cachedUser, withLoading, setLoading]);

  // Fetch tutors when component mounts
  useEffect(() => {
    if (userData || cachedUser) {
      fetchTutors();
    }
  }, [fetchTutors, userData, cachedUser]);

  // Add new tutor using new utilities
  const handleAddTutor = async (e) => {
    e.preventDefault();
    
    if (!newTutorEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    const result = await withLoading(async () => {
      // First, check if user exists
      const constraints = QueryBuilder.buildQuery('users', {
        where: { email: newTutorEmail.trim() }
      });
      
      const snapshot = await getDocs(query(collection(firestore, "users"), ...constraints));
      
      if (snapshot.empty) {
        throw new Error("User with this email does not exist. They must sign up first.");
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // Update user's mathLabRole to 'tutor'
      await updateDoc(doc(firestore, "users", userDoc.id), {
        mathLabRole: 'tutor',
        updatedAt: new Date()
      });

      // Refresh tutors list
      await fetchTutors();
      
      // Clear form
      setNewTutorEmail("");
      setShowAddTutorForm(false);
      
      return userDoc.id;
    }, {
      loadingKey: 'isAddingTutor',
      onError: (error) => {
        handleError(error, {
          context: { operation: 'addTutor', email: newTutorEmail, userId: user?.uid },
          showAlert: true
        });
        setError(error.message || "Failed to add tutor. Please try again.");
      }
    });
  };

  // Remove tutor using new utilities
  const handleRemoveTutor = async (tutorId) => {
    if (!confirm("Are you sure you want to remove this tutor?")) {
      return;
    }

    const result = await withErrorHandling(async () => {
      // Update user's mathLabRole to empty string (remove tutor status)
      await updateDoc(doc(firestore, "users", tutorId), {
        mathLabRole: '',
        updatedAt: new Date()
      });

      // Refresh tutors list
      await fetchTutors();
      
      return tutorId;
    }, {
      context: { operation: 'removeTutor', tutorId, userId: user?.uid },
      showAlert: true,
      onError: (error) => {
        setError("Failed to remove tutor. Please try again.");
      }
    });
  };

  // Show loading while authentication is loading
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden" style={{ overscrollBehavior: 'none' }}>
        <DashboardTopBar title="Admin Dashboard" showNavLinks={false} />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // Redirect handled by useAuthRedirect hook
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" style={{ overscrollBehavior: 'none' }}>
      <DashboardTopBar title="Admin Dashboard" showNavLinks={false} />
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage math lab tutors and system settings
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Math Lab Tutors Section */}
          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Math Lab Tutors</h2>
                <p className="text-muted-foreground">
                  Manage users who can tutor in the math lab
                </p>
              </div>
              <button
                onClick={() => setShowAddTutorForm(true)}
                className="btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Tutor
              </button>
            </div>

            {/* Add Tutor Form */}
            {showAddTutorForm && (
              <div className="mb-6 p-4 bg-muted/20 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Add New Tutor</h3>
                <form onSubmit={handleAddTutor} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={newTutorEmail}
                      onChange={(e) => setNewTutorEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter user's email address"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The user must have already signed up with this email address.
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddTutorForm(false);
                        setNewTutorEmail("");
                        setError(null);
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingTutor}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingTutor ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Adding...
                        </div>
                      ) : (
                        "Add Tutor"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tutors List */}
            {tutors.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Tutors Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add tutors to allow them to help students in the math lab.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tutors.map((tutor) => (
                  <div key={tutor.id} className="flex items-center justify-between p-4 bg-muted/10 rounded-lg border border-border">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{tutor.displayName || tutor.email}</h4>
                        <p className="text-sm text-muted-foreground">{tutor.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Added {tutor.createdAt?.toLocaleDateString() || 'Unknown date'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveTutor(tutor.id)}
                      className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Info Section */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">System Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/10 rounded-lg">
                <div className="text-2xl font-bold text-primary mb-1">{tutors.length}</div>
                <div className="text-sm text-muted-foreground">Active Tutors</div>
              </div>
              <div className="p-4 bg-muted/10 rounded-lg">
                <div className="text-2xl font-bold text-primary mb-1">Admin</div>
                <div className="text-sm text-muted-foreground">Your Role</div>
              </div>
              <div className="p-4 bg-muted/10 rounded-lg">
                <div className="text-2xl font-bold text-primary mb-1">Active</div>
                <div className="text-sm text-muted-foreground">System Status</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
