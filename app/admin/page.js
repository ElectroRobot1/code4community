"use client";
import { useAuth } from "../../components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";
import LoadingSpinner from "../../components/LoadingSpinner";
import { doc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { firestore } from "@/firebase";
import { UserCache, AdminCache, CachePerformance } from "@/utils/cache";
import { isAdminUser } from "@/utils/authorization";

export default function AdminDashboard() {
  const { user, userData, isEmailVerified } = useAuth();
  const router = useRouter();
  const [cachedUser, setCachedUser] = useState(null);
  const [tutors, setTutors] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddTutorForm, setShowAddTutorForm] = useState(false);
  const [newTutorEmail, setNewTutorEmail] = useState("");
  const [isAddingTutor, setIsAddingTutor] = useState(false);
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  // Optimized caching with centralized cache manager
  useEffect(() => {
    const timing = CachePerformance.startTiming('loadAdminCachedUser');
    
    const cached = UserCache.getUserData();
    if (cached) {
      setCachedUser(cached);
    }
    
    CachePerformance.endTiming(timing);
  }, []);

  // Update cache when userData changes
  useEffect(() => {
    if (userData && user) {
      const timing = CachePerformance.startTiming('updateAdminCache');
      
      const combinedUserData = {
        ...userData,
        uid: user.uid,
        email: user.email
      };
      
      UserCache.setUserData(combinedUserData);
      setCachedUser(combinedUserData);
      
      CachePerformance.endTiming(timing);
    }
  }, [userData, user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !cachedUser) {
      router.push('/login?redirectTo=/admin');
    }
  }, [user, cachedUser, router]);

  // Check if user is admin (by role or email)
  const isAdmin = userData && user && isAdminUser(userData.role, user.email);

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

  // Fetch tutors
  const fetchTutors = useCallback(async (forceRefresh = false) => {
    if (!cachedUser && !userData) return;
    
    const timing = CachePerformance.startTiming('fetchTutors');
    setIsLoading(true);
    setError(null);
    
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedTutors = AdminCache.getTutors();
        if (cachedTutors && cachedTutors.length >= 0) {
          // Convert createdAt strings back to Date objects
          const tutorsWithDates = cachedTutors.map(tutor => ({
            ...tutor,
            createdAt: tutor.createdAt instanceof Date ? tutor.createdAt : new Date(tutor.createdAt)
          }));
          setTutors(tutorsWithDates);
          setIsLoading(false);
          CachePerformance.endTiming(timing);
          return;
        }
      }

      // Query users with mathLabRole 'tutor'
      const tutorsQuery = query(
        collection(firestore, "users"),
        where("mathLabRole", "==", "tutor")
      );

      const snapshot = await getDocs(tutorsQuery);
      const tutorsList = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        tutorsList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
        });
      });

      // Cache the results
      AdminCache.setTutors(tutorsList);
      setTutors(tutorsList);
      
    } catch (error) {
      console.error("Error fetching tutors:", error);
      setError("Failed to load tutors. Please try again.");
    } finally {
      setIsLoading(false);
      CachePerformance.endTiming(timing);
    }
  }, [userData, cachedUser]);

  // Fetch admins
  const fetchAdmins = useCallback(async (forceRefresh = false) => {
    if (!cachedUser && !userData) return;
    
    const timing = CachePerformance.startTiming('fetchAdmins');
    setError(null);
    
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedAdmins = AdminCache.getAdmins();
        if (cachedAdmins && cachedAdmins.length >= 0) {
          // Convert createdAt strings back to Date objects
          const adminsWithDates = cachedAdmins.map(admin => ({
            ...admin,
            createdAt: admin.createdAt instanceof Date ? admin.createdAt : new Date(admin.createdAt)
          }));
          setAdmins(adminsWithDates);
          CachePerformance.endTiming(timing);
          return;
        }
      }

      // Query users with role 'admin'
      const adminsQuery = query(
        collection(firestore, "users"),
        where("role", "==", "admin")
      );

      const snapshot = await getDocs(adminsQuery);
      const adminsList = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        adminsList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
        });
      });

      // Cache the results
      AdminCache.setAdmins(adminsList);
      setAdmins(adminsList);
      
    } catch (error) {
      console.error("Error fetching admins:", error);
      setError("Failed to load admins. Please try again.");
    } finally {
      CachePerformance.endTiming(timing);
    }
  }, [userData, cachedUser]);

  // Fetch tutors and admins when component mounts
  useEffect(() => {
    if (userData || cachedUser) {
      fetchTutors();
      fetchAdmins();
    }
  }, [fetchTutors, fetchAdmins, userData, cachedUser]);

  // Add new tutor
  const handleAddTutor = async (e) => {
    e.preventDefault();
    
    if (!newTutorEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    setIsAddingTutor(true);
    setError(null);

    try {
      // First, check if user exists
      const usersQuery = query(
        collection(firestore, "users"),
        where("email", "==", newTutorEmail.trim())
      );
      
      const snapshot = await getDocs(usersQuery);
      
      if (snapshot.empty) {
        setError("User with this email does not exist. They must sign up first.");
        setIsAddingTutor(false);
        return;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // Update user's mathLabRole to 'tutor'
      await updateDoc(doc(firestore, "users", userDoc.id), {
        mathLabRole: 'tutor',
        updatedAt: new Date()
      });

      // Refresh tutors list (force refresh to clear cache)
      await fetchTutors(true);
      
      // Clear form
      setNewTutorEmail("");
      setShowAddTutorForm(false);
      
    } catch (error) {
      console.error("Error adding tutor:", error);
      setError("Failed to add tutor. Please try again.");
    } finally {
      setIsAddingTutor(false);
    }
  };

  // Remove tutor
  const handleRemoveTutor = async (tutorId) => {
    if (!confirm("Are you sure you want to remove this tutor?")) {
      return;
    }

    try {
      // Update user's mathLabRole to empty string (remove tutor status)
      await updateDoc(doc(firestore, "users", tutorId), {
        mathLabRole: '',
        updatedAt: new Date()
      });

      // Refresh tutors list (force refresh to clear cache)
      await fetchTutors(true);
      
    } catch (error) {
      console.error("Error removing tutor:", error);
      setError("Failed to remove tutor. Please try again.");
    }
  };

  // Add new admin
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    
    if (!newAdminEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    setIsAddingAdmin(true);
    setError(null);

    try {
      // First, check if user exists
      const usersQuery = query(
        collection(firestore, "users"),
        where("email", "==", newAdminEmail.trim())
      );
      
      const snapshot = await getDocs(usersQuery);
      
      if (snapshot.empty) {
        setError("User with this email does not exist. They must sign up first.");
        setIsAddingAdmin(false);
        return;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // Update user's role to 'admin'
      await updateDoc(doc(firestore, "users", userDoc.id), {
        role: 'admin',
        updatedAt: new Date()
      });

      // Refresh admins list (force refresh to clear cache)
      await fetchAdmins(true);
      
      // Clear form
      setNewAdminEmail("");
      setShowAddAdminForm(false);
      
    } catch (error) {
      console.error("Error adding admin:", error);
      setError("Failed to add admin. Please try again.");
    } finally {
      setIsAddingAdmin(false);
    }
  };

  // Remove admin
  const handleRemoveAdmin = async (adminId) => {
    if (!confirm("Are you sure you want to remove this admin?")) {
      return;
    }

    try {
      // Update user's role to 'student' (remove admin status)
      await updateDoc(doc(firestore, "users", adminId), {
        role: 'student',
        updatedAt: new Date()
      });

      // Refresh admins list (force refresh to clear cache)
      await fetchAdmins(true);
      
    } catch (error) {
      console.error("Error removing admin:", error);
      setError("Failed to remove admin. Please try again.");
    }
  };

  // Use cached user if available, fallback to real userData
  const displayUser = userData || cachedUser;

  if (!displayUser) {
    return null; // Will redirect to login
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden" style={{ overscrollBehavior: 'none' }}>
        <DashboardTopBar title="Admin Dashboard" showNavLinks={false} />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
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

          {/* Admins Section */}
          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Admins</h2>
                <p className="text-muted-foreground">
                  Manage users with admin privileges
                </p>
              </div>
              <button
                onClick={() => setShowAddAdminForm(true)}
                className="btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Admin
              </button>
            </div>

            {/* Add Admin Form */}
            {showAddAdminForm && (
              <div className="mb-6 p-4 bg-muted/20 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Add New Admin</h3>
                <form onSubmit={handleAddAdmin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
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
                        setShowAddAdminForm(false);
                        setNewAdminEmail("");
                        setError(null);
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingAdmin}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingAdmin ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Adding...
                        </div>
                      ) : (
                        "Add Admin"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Admins List */}
            {admins.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Admins Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add admins to give them system administration privileges.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-4 bg-muted/10 rounded-lg border border-border">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{admin.displayName || admin.email}</h4>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Added {admin.createdAt?.toLocaleDateString() || 'Unknown date'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAdmin(admin.id)}
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
