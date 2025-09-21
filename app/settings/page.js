"use client";
import { useAuth } from "../../components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";
import { auth } from "@/firebase";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { validatePassword, sanitizeInput } from "@/utils/validation";
import { UserCache, CachePerformance } from "@/utils/cache";

export default function SettingsPage() {
  const { user, userData, isEmailVerified } = useAuth();
  const router = useRouter();
  const [cachedUser, setCachedUser] = useState(null);
  const [updateMessage, setUpdateMessage] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  
  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Optimized caching with centralized cache manager
  useEffect(() => {
    const timing = CachePerformance.startTiming('loadSettingsCachedUser');
    
    const cached = UserCache.getUserData();
    if (cached) {
      setCachedUser(cached);
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
      
      CachePerformance.endTiming(timing);
    }
  }, [userData, user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !cachedUser) {
      router.push('/login?redirectTo=/settings');
    }
  }, [user, cachedUser, router]);

  // Redirect to email verification if email is not verified
  useEffect(() => {
    if (userData && !isEmailVerified) {
      router.push('/verify-email?email=' + encodeURIComponent(userData.email));
    }
  }, [userData, isEmailVerified, router]);


  // Use cached user if available, fallback to real userData + user
  const displayUser = cachedUser || (userData && user ? { ...userData, uid: user.uid, email: user.email } : null);

  if (!displayUser) {
    return null; // Will redirect to login
  }

  // Tab configuration
  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "preferences", label: "Preferences" },
    { id: "account", label: "Account" }
  ];


  // Password change functionality
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Sanitize inputs
    const sanitizedCurrentPassword = sanitizeInput(currentPassword);
    const sanitizedNewPassword = sanitizeInput(newPassword);
    const sanitizedConfirmPassword = sanitizeInput(confirmPassword);
    
    // Validation
    if (!sanitizedCurrentPassword || !sanitizedNewPassword || !sanitizedConfirmPassword) {
      setPasswordMessage("Please fill in all fields");
      setPasswordSuccess(false);
      return;
    }
    
    if (sanitizedNewPassword !== sanitizedConfirmPassword) {
      setPasswordMessage("New passwords do not match");
      setPasswordSuccess(false);
      return;
    }
    
    // Enhanced password validation
    const passwordError = validatePassword(sanitizedNewPassword);
    if (passwordError) {
      setPasswordMessage(passwordError);
      setPasswordSuccess(false);
      return;
    }
    
    setIsChangingPassword(true);
    setPasswordMessage("");
    
    try {
      
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, sanitizedCurrentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, sanitizedNewPassword);
      
      // Success
      setPasswordMessage("Password changed successfully!");
      setPasswordSuccess(true);
      
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Hide form after 3 seconds
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordMessage("");
        setPasswordSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('[SettingsPage] handlePasswordChange: Password change error', {
        code: error.code,
        message: error.message
      });
      
      if (error.code === 'auth/wrong-password') {
        setPasswordMessage("The current password you entered is incorrect. Please try again.");
      } else if (error.code === 'auth/weak-password') {
        setPasswordMessage("New password is too weak. Please choose a stronger password.");
      } else if (error.code === 'auth/requires-recent-login') {
        setPasswordMessage("Please sign out and sign back in, then try again.");
      } else if (error.code === 'auth/invalid-credential') {
        setPasswordMessage("The current password you entered is incorrect. Please try again.");
      } else {
        setPasswordMessage("Failed to change password. Please try again.");
      }
      setPasswordSuccess(false);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleClosePasswordForm = () => {
    setShowPasswordForm(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("");
    setPasswordSuccess(false);
  };

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
                    <button
                      onClick={() => setShowPasswordForm(true)}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Change Password
                    </button>
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

      {/* Password Change Form Modal */}
      {showPasswordForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-border rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground">Change Password</h3>
              <button
                onClick={handleClosePasswordForm}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Confirm new password"
                  required
                />
              </div>

              {passwordMessage && (
                <div className={`p-3 rounded-lg text-sm font-medium ${
                  passwordSuccess 
                    ? "bg-green-100 text-green-800 border border-green-200" 
                    : "bg-red-100 text-red-800 border border-red-200"
                }`}>
                  {passwordMessage}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClosePasswordForm}
                  className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg font-medium hover:bg-muted/50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isChangingPassword ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Changing...
                    </div>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Message Overlay */}
      {passwordSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-100 text-green-800 border border-green-200 rounded-lg px-6 py-3 shadow-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Password changed successfully!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
