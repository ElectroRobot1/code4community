"use client";
import { useAuth } from "../../components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";
import { doc, updateDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { firestore } from "@/firebase";
import { SettingsCache, UserCache, MathLabCache, CachePerformance, CacheInvalidation } from "@/utils/cache";
import { invalidateOnDataChange } from "@/utils/cacheInvalidation";

export default function SettingsPage() {
  const { user, userData, isEmailVerified } = useAuth();
  const router = useRouter();
  const [cachedUser, setCachedUser] = useState(null);
  const [mathLabRole, setMathLabRole] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [activeTab, setActiveTab] = useState("profile");

  // Optimized caching with centralized cache manager
  useEffect(() => {
    const timing = CachePerformance.startTiming('loadSettingsCachedUser');
    
    const cached = UserCache.getUserData();
    if (cached) {
      setCachedUser(cached);
      setMathLabRole(cached.mathLabRole || "");
    }
    
    CachePerformance.endTiming(timing);
  }, []);

  // Update cache when userData changes
  useEffect(() => {
    if (userData && user) {
      const timing = CachePerformance.startTiming('updateSettingsCache');
      
      // Combine Firebase Auth user with Firestore data
      const combinedUserData = {
        ...userData,
        uid: user.uid,
        email: user.email
      };
      
      // Update cache using centralized cache manager
      UserCache.setUserData(combinedUserData);
      setCachedUser(combinedUserData);
      setMathLabRole(userData.mathLabRole || "");
      
      CachePerformance.endTiming(timing);
    }
  }, [userData, user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !cachedUser) {
      router.push('/login');
    }
  }, [user, cachedUser, router]);

  // Redirect to email verification if email is not verified
  useEffect(() => {
    if (userData && !isEmailVerified) {
      router.push('/verify-email?email=' + encodeURIComponent(userData.email));
    }
  }, [userData, isEmailVerified, router]);

  const handleMathLabRoleUpdate = async () => {
    if (!mathLabRole) {
      setUpdateMessage("Please select a role");
      return;
    }

    setIsUpdating(true);
    setUpdateMessage("");

    try {
      // Get user ID from multiple sources with proper fallback
      const userId = user?.uid || cachedUser?.uid;
      if (!userId) {
        throw new Error("User ID not found. Please try refreshing the page.");
      }

      // Check if user is switching roles
      const currentRole = cachedUser?.mathLabRole;
      const isSwitchingToTutor = currentRole === 'student' && mathLabRole === 'tutor';
      const isSwitchingToStudent = currentRole === 'tutor' && mathLabRole === 'student';
      
      // If switching to tutor, cancel any active student requests first
      if (isSwitchingToTutor) {
        try {
          // Find and cancel any pending student requests
          const studentRequestsQuery = query(
            collection(firestore, "tutoringRequests"),
            where("studentId", "==", userId),
            where("status", "in", ["pending", "accepted"])
          );
          
          const studentRequestsSnapshot = await getDocs(studentRequestsQuery);
          const requestsToCancel = [];
          
          studentRequestsSnapshot.forEach((doc) => {
            requestsToCancel.push(deleteDoc(doc.ref));
          });
          
          if (requestsToCancel.length > 0) {
            await Promise.all(requestsToCancel);
          }
        } catch (cancelError) {
          console.error("Error cancelling student requests:", cancelError);
          // Continue with role update even if cancellation fails
        }
      }
      
      // If switching to student, clear any active tutor sessions
      if (isSwitchingToStudent) {
        // Clear MathLab cache to remove any tutor-related data
        MathLabCache.clearAll();
      }

      // Update Firestore
      await updateDoc(doc(firestore, "users", userId), {
        mathLabRole: mathLabRole,
        updatedAt: new Date()
      });

      // Update local cache using centralized cache manager
      const updatedUser = { ...cachedUser, mathLabRole };
      UserCache.setUserData(updatedUser);
      setCachedUser(updatedUser);
      
      // Invalidate related caches to prevent stale data
      invalidateOnDataChange('mathlab_role', 'update');
      
      // Trigger a custom event to force AuthContext refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userRoleChanged', { 
          detail: { newRole: mathLabRole, userId } 
        }));
      }

      // Show appropriate success message
      if (isSwitchingToTutor) {
        setUpdateMessage("Role updated to tutor. Any active student requests have been cancelled.");
      } else if (isSwitchingToStudent) {
        setUpdateMessage("Role updated to student. Any active tutor sessions have been cleared.");
      } else {
        setUpdateMessage("Math Lab role updated successfully!");
      }
      
      // Clear message after 4 seconds (longer for role change message)
      setTimeout(() => setUpdateMessage(""), 4000);
    } catch (error) {
      console.error("Error updating math lab role:", error);
      setUpdateMessage(error.message || "Failed to update role. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Use cached user if available, fallback to real userData + user
  const displayUser = cachedUser || (userData && user ? { ...userData, uid: user.uid, email: user.email } : null);

  if (!displayUser) {
    return null; // Will redirect to login
  }

  // Tab configuration
  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "mathlab", label: "Math Lab" },
    { id: "preferences", label: "Preferences" },
    { id: "account", label: "Account" }
  ];

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Profile Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Display Name
                  </label>
                  <div className="text-foreground font-medium">
                    {displayUser.displayName || "Not set"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Email
                  </label>
                  <div className="text-foreground font-medium">
                    {displayUser.email}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Account Role
                  </label>
                  <div className="text-foreground font-medium capitalize">
                    {displayUser.role}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "mathlab":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Math Lab Settings</h3>
              <p className="text-muted-foreground mb-6">
                Choose your role in the Math Lab system. This determines how you&apos;ll interact with the tutoring platform.
              </p>

              <div className="space-y-4">
                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-semibold mb-3 text-foreground">
                    Math Lab Role
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student Option */}
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        mathLabRole === 'student' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setMathLabRole('student')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          mathLabRole === 'student' 
                            ? 'border-primary bg-primary' 
                            : 'border-border'
                        }`}>
                          {mathLabRole === 'student' && (
                            <div className="w-2 h-2 bg-white rounded-full m-auto"></div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">Student</div>
                          <div className="text-sm text-muted-foreground">
                            Get help from tutors and access learning resources
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tutor Option */}
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        mathLabRole === 'tutor' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setMathLabRole('tutor')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          mathLabRole === 'tutor' 
                            ? 'border-primary bg-primary' 
                            : 'border-border'
                        }`}>
                          {mathLabRole === 'tutor' && (
                            <div className="w-2 h-2 bg-white rounded-full m-auto"></div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">Tutor</div>
                          <div className="text-sm text-muted-foreground">
                            Help students and manage tutoring sessions
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Update Button */}
                <div className="pt-4">
                  <button
                    onClick={handleMathLabRoleUpdate}
                    disabled={isUpdating || !mathLabRole || mathLabRole === displayUser?.mathLabRole}
                    className={`px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors ${
                      mathLabRole && mathLabRole !== displayUser?.mathLabRole
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {isUpdating ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Updating...
                      </div>
                    ) : (
                      "Update Math Lab Role"
                    )}
                  </button>
                </div>

                {/* Status Message */}
                {updateMessage && (
                  <div className={`p-3 rounded-lg text-sm font-medium ${
                    updateMessage.includes("successfully") 
                      ? "bg-green-100 text-green-800 border border-green-200" 
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}>
                    {updateMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "preferences":
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-6">App Preferences</h3>
              <div className="space-y-6">
                <div className="p-4 bg-muted/20 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">
                        Theme
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Choose your preferred color scheme
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                      Coming Soon
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/20 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">
                        Notifications
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Manage email and push notifications
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                      Coming Soon
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/20 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">
                        Language
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Select your preferred language
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                      Coming Soon
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "account":
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-6">Account Security</h3>
              <div className="space-y-6">
                <div className="p-4 bg-muted/20 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">
                        Password
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Change your account password
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                      Coming Soon
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/20 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">
                        Two-Factor Authentication
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                      Coming Soon
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/20 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">
                        Account Recovery
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Set up recovery options for your account
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                      Coming Soon
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopBar title="Settings" showNavLinks={false} />

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences and application settings</p>
          </div>

          {/* Horizontal Tab Navigation */}
          <div className="bg-card border border-border rounded-xl mb-8 overflow-hidden shadow-sm">
            <nav className="flex">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-5 px-6 font-semibold text-sm transition-all duration-200 relative group ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  } ${index > 0 ? 'border-l border-border/50' : ''}`}
                >
                  <span className="block text-center tracking-wide">{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-foreground/20"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-8">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
