"use client";
import { useAuth } from "../../../components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import DashboardTopBar from "../../../components/DashboardTopBar";
import MathLabSidebar from "../../../components/MathLabSidebar";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { doc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { firestore } from "@/firebase";
import { MathLabCache, UserCache, CachePerformance } from "@/utils/cache";
import { canAccess, isAdminUser } from "@/utils/authorization";

function MathLabHistoryPageContent() {
  const { user, userData, isEmailVerified } = useAuth();
  const router = useRouter();
  const [cachedUser, setCachedUser] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all, student, tutor
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Available courses - memoized for performance
  const courses = useMemo(() => [
    "Algebra 1",
    "Algebra 2", 
    "Algebra 2 Trig",
    "Functions",
    "Trig with Adv Alg",
    "Geometry"
  ], []);

  // Optimized caching with centralized cache manager
  useEffect(() => {
    const timing = CachePerformance.startTiming('loadHistoryCachedUser');
    
    const cached = UserCache.getUserData();
    if (cached) {
      setCachedUser(cached);
    }
    
    CachePerformance.endTiming(timing);
  }, []);

  // Update cache when userData changes
  useEffect(() => {
    if (userData && user) {
      const timing = CachePerformance.startTiming('updateHistoryCache');
      
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
      router.push('/login?redirectTo=/mathlab/history');
    }
  }, [user, cachedUser, router]);

  // Check authorization for Math Lab access
  const isAuthorized = user && userData && canAccess(userData.role, 'mathlab', userData.mathLabRole);

  // Redirect to email verification if email is not verified
  useEffect(() => {
    if (userData && !isEmailVerified) {
      router.push('/verify-email?email=' + encodeURIComponent(userData.email));
    }
  }, [userData, isEmailVerified, router]);

  // Fetch session history
  const fetchSessionHistory = useCallback(async (forceRefresh = false) => {
    if (!cachedUser && !userData) return;
    
    const timing = CachePerformance.startTiming('fetchSessionHistory');
    setIsLoading(true);
    setError(null);
    
    // If force refresh, clear cache first
    if (forceRefresh) {
      MathLabCache.setSessions([]);
      setIsRefreshing(true);
    }
    
    try {
      const userId = user?.uid || cachedUser?.uid;
      const userRole = userData?.mathLabRole || cachedUser?.mathLabRole || 'student';
      
      console.log('[SessionHistory] Debug info:', {
        userId,
        userRole,
        userData: userData?.mathLabRole,
        cachedUser: cachedUser?.mathLabRole,
        userDataExists: !!userData,
        cachedUserExists: !!cachedUser
      });
      
      if (!userId) {
        throw new Error("User information not available");
      }

      // Try to get from cache first
      const cachedHistory = MathLabCache.getSessions();
      if (cachedHistory && cachedHistory.length > 0) {
        setSessionHistory(cachedHistory);
        setIsLoading(false);
        return; // Exit early if we have cached data
      }
      
      // Query completed sessions from Firestore
      // Use a simpler query to avoid composite index requirements
      const sessionsQuery = query(
        collection(firestore, "completedSessions"),
        where(userRole === 'student' ? 'studentId' : 'tutorId', '==', userId),
        limit(50)
      );

      console.log('[SessionHistory] Query:', {
        collection: 'completedSessions',
        field: userRole === 'student' ? 'studentId' : 'tutorId',
        value: userId,
        userRole
      });

      const snapshot = await getDocs(sessionsQuery);
      const sessions = [];
      
      console.log('[SessionHistory] Snapshot:', {
        size: snapshot.size,
        empty: snapshot.empty
      });
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('[SessionHistory] Session data:', {
          id: doc.id,
          studentId: data.studentId,
          tutorId: data.tutorId,
          studentName: data.studentName,
          tutorName: data.tutorName
        });
        const session = {
          id: doc.id,
          ...data,
          completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : (data.completedAt ? new Date(data.completedAt) : new Date()),
          startTime: data.startTime?.toDate ? data.startTime.toDate() : (data.startTime ? new Date(data.startTime) : new Date()),
          endTime: data.endTime?.toDate ? data.endTime.toDate() : (data.endTime ? new Date(data.endTime) : new Date())
        };
        
        // Debug logging to help identify date issues
        if (!(session.completedAt instanceof Date)) {
          console.warn('Invalid completedAt date for session:', session.id, session.completedAt);
        }
        
        sessions.push(session);
      });

      // Sort by completedAt in descending order (most recent first)
      sessions.sort((a, b) => b.completedAt - a.completedAt);

      // Cache the results with longer TTL for session history
      MathLabCache.setSessions(sessions);
      setSessionHistory(sessions);
      
    } catch (error) {
      console.error("Error fetching session history:", error);
      
      // Check if it's a missing index error or collection doesn't exist yet
      if (error.code === 'failed-precondition' || error.message.includes('index')) {
        // Collection might not exist yet or index not created
        setSessionHistory([]);
        setError(null); // Don't show error for missing data
      } else {
        setError("Failed to load session history. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      CachePerformance.endTiming(timing);
    }
  }, [user, userData, cachedUser]);

  // Fetch history when component mounts
  useEffect(() => {
    if (userData || cachedUser) {
      fetchSessionHistory();
    }
  }, [fetchSessionHistory, userData, cachedUser]);

  // Reset filter if student tries to select tutor filter
  useEffect(() => {
    const displayUser = userData || cachedUser;
    const isTutor = displayUser?.mathLabRole === 'tutor';
    const isAdmin = userData && user && isAdminUser(userData.role, user.email);
    
    if (!isTutor && !isAdmin && filter === 'tutor') {
      setFilter('all');
    }
  }, [userData, cachedUser, filter, user]);

  // Filter sessions based on current filter
  const filteredSessions = useMemo(() => {
    if (filter === "all") return sessionHistory;
    
    return sessionHistory.filter(session => {
      if (filter === "student") return session.studentId === (user?.uid || cachedUser?.uid);
      if (filter === "tutor") return session.tutorId === (user?.uid || cachedUser?.uid);
      return true;
    });
  }, [sessionHistory, filter, user?.uid, cachedUser?.uid]);

  // Format duration helper
  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "Unknown";
    
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    const end = endTime instanceof Date ? endTime : new Date(endTime);
    const durationMs = end - start;
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `${durationMinutes}m`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  // Use cached user if available, fallback to real userData
  const displayUser = userData || cachedUser;

  if (!displayUser) {
    return null; // Will redirect to login
  }

  // Show access denied if not authorized
  if (user && userData && !isAuthorized) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden" style={{ overscrollBehavior: 'none' }}>
        <DashboardTopBar title="Math Lab History" showNavLinks={false} />
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You don&apos;t have permission to access the Math Lab.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" style={{ overscrollBehavior: 'none' }}>
      <DashboardTopBar title="Math Lab History" showNavLinks={false} />
      <Suspense fallback={null}>
        <MathLabSidebar />
      </Suspense>
      
      {/* Main Content with sidebar offset */}
      <div className="ml-0 md:ml-16 pb-16 md:pb-0">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Session History</h1>
              <p className="text-muted-foreground">
                View your past tutoring sessions and activity
              </p>
            </div>

            {/* Filter Tabs and Refresh Button */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex space-x-1 bg-muted/30 p-1 rounded-lg w-fit">
                {(() => {
                  const displayUser = userData || cachedUser;
                  const isTutor = displayUser?.mathLabRole === 'tutor';
                  const isAdmin = userData && user && isAdminUser(userData.role, user.email);
                  
                  const filterOptions = [
                    { id: "all", label: "All Sessions" },
                    { id: "student", label: "As Student" }
                  ];
                  
                  // Add tutor filter if user is a tutor or admin (admins can also tutor)
                  if (isTutor || isAdmin) {
                    filterOptions.push({ id: "tutor", label: "As Tutor" });
                  }
                  
                  return filterOptions;
                })().map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      filter === tab.id
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={() => fetchSessionHistory(true)}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg 
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-destructive text-lg mb-2">{error}</div>
                <button
                  onClick={fetchSessionHistory}
                  className="btn-primary"
                >
                  Try Again
                </button>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold text-foreground mb-2">No Session History</h4>
                  <p className="text-muted-foreground mb-4">
                    {filter === "all" 
                      ? "You haven't completed any tutoring sessions yet."
                      : `You haven't completed any sessions ${filter === "student" ? "as a student" : "as a tutor"} yet.`
                    }
                  </p>
                  <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Start your first session
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSessions.map((session) => (
                  <div key={session.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{session.course}</h3>
                          <p className="text-sm text-muted-foreground">
                            {session.studentName} {session.tutorName && `• ${session.tutorName}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">
                          {formatDuration(session.startTime, session.endTime)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {session.completedAt instanceof Date ? session.completedAt.toLocaleDateString() : 'Unknown date'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {session.completedAt instanceof Date ? session.completedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Unknown time'}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Completed
                        </span>
                      </div>
                      <div className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Success
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MathLabHistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <MathLabHistoryPageContent />
    </Suspense>
  );
}
