"use client";
import { useAuth } from "../../../components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import DashboardTopBar from "../../../components/DashboardTopBar";
import MathLabSidebar from "../../../components/MathLabSidebar";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { firestore } from "@/firebase";
import { UserCache, MathLabCache, CachePerformance } from "@/utils/cache";
import { isAdminUser } from "@/utils/authorization";

function SessionTrackingPageContent() {
  const { user, userData, isEmailVerified, loading } = useAuth();
  const router = useRouter();
  const [cachedUser, setCachedUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Optimized caching
  useEffect(() => {
    const timing = CachePerformance.startTiming('loadTrackingCachedUser');
    
    const cached = UserCache.getUserData();
    if (cached) {
      setCachedUser(cached);
    }
    
    CachePerformance.endTiming(timing);
  }, []);

  // Update cache when userData changes
  useEffect(() => {
    if (userData && user) {
      const timing = CachePerformance.startTiming('updateTrackingCache');
      
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
    if (!loading && !user && !cachedUser) {
      router.push('/login?redirectTo=/mathlab/session-tracking');
    }
  }, [user, cachedUser, loading, router]);

  // Check if user is admin
  const isAdmin = userData && user && isAdminUser(userData.role, user.email);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && userData && !isAdmin) {
      router.push('/mathlab');
    }
  }, [loading, userData, isAdmin, router]);

  // Redirect to email verification if email is not verified
  useEffect(() => {
    if (userData && !isEmailVerified) {
      router.push('/verify-email?email=' + encodeURIComponent(userData.email));
    }
  }, [userData, isEmailVerified, router]);

  // Fetch all completed sessions
  const fetchSessions = useCallback(async (forceRefresh = false) => {
    if (!isAdmin) return;
    
    const timing = CachePerformance.startTiming('fetchAllSessions');
    setIsLoading(true);
    setError(null);
    
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedSessions = MathLabCache.getSessionTracking();
        if (cachedSessions && cachedSessions.length >= 0) {
          // Convert date strings back to Date objects
          const sessionsWithDates = cachedSessions.map(session => ({
            ...session,
            completedAt: session.completedAt instanceof Date ? session.completedAt : new Date(session.completedAt),
            startTime: session.startTime instanceof Date ? session.startTime : new Date(session.startTime),
            endTime: session.endTime instanceof Date ? session.endTime : new Date(session.endTime)
          }));
          setSessions(sessionsWithDates);
          setIsLoading(false);
          CachePerformance.endTiming(timing);
          return;
        }
      }

      // Query all completed sessions, ordered by completedAt descending
      const sessionsQuery = query(
        collection(firestore, "completedSessions"),
        orderBy("completedAt", "desc")
      );

      const snapshot = await getDocs(sessionsQuery);
      const allSessions = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const session = {
          id: doc.id,
          ...data,
          completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : (data.completedAt ? new Date(data.completedAt) : new Date()),
          startTime: data.startTime?.toDate ? data.startTime.toDate() : (data.startTime ? new Date(data.startTime) : new Date()),
          endTime: data.endTime?.toDate ? data.endTime.toDate() : (data.endTime ? new Date(data.endTime) : new Date())
        };
        allSessions.push(session);
      });

      // Already sorted by Firestore query, but ensure descending order
      allSessions.sort((a, b) => b.completedAt - a.completedAt);
      
      // Cache the results
      MathLabCache.setSessionTracking(allSessions);
      setSessions(allSessions);
      
    } catch (error) {
      console.error("Error fetching sessions:", error);
      
      if (error.code === 'failed-precondition' || error.message.includes('index')) {
        setSessions([]);
        setError(null);
      } else {
        setError("Failed to load sessions. Please try again.");
      }
    } finally {
      setIsLoading(false);
      CachePerformance.endTiming(timing);
    }
  }, [isAdmin]);

  // Fetch sessions when component mounts
  useEffect(() => {
    if (isAdmin) {
      fetchSessions();
    }
  }, [fetchSessions, isAdmin]);

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) {
      return sessions;
    }

    const query = searchQuery.toLowerCase().trim();
    return sessions.filter(session => {
      const tutorName = (session.tutorName || '').toLowerCase();
      const studentName = (session.studentName || '').toLowerCase();
      const course = (session.course || '').toLowerCase();
      
      return tutorName.includes(query) || 
             studentName.includes(query) || 
             course.includes(query);
    });
  }, [sessions, searchQuery]);

  // Format duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardTopBar title="Session Tracking" />
        <MathLabSidebar />
        <div className="flex-1 flex items-center justify-center ml-0 md:ml-16">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar title="Session Tracking" />
      <Suspense fallback={null}>
        <MathLabSidebar />
      </Suspense>
      
      <div className="flex-1 px-6 py-4 ml-0 md:ml-16 pb-16 md:pb-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-6">Session Tracking</h1>
          
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="       Search by tutor name, student name, or course..."
                className="w-full px-4 py-3 pl-10 text-sm text-foreground bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <svg 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing {filteredSessions.length} of {sessions.length} sessions
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          {/* Sessions Table */}
          {filteredSessions.length === 0 ? (
            <div className="card-elevated p-8 rounded-xl text-center">
              <p className="text-muted-foreground">
                {searchQuery ? "No sessions found matching your search." : "No sessions found."}
              </p>
            </div>
          ) : (
            <div className="card-elevated rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Date & Time</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Tutor</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Student</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Course</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((session) => (
                      <tr key={session.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div>
                            <div className="font-medium">
                              {session.completedAt?.toLocaleDateString([], { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {session.completedAt?.toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div>
                            <div className="font-medium">{session.tutorName || 'Unknown'}</div>
                            {session.tutorEmail && (
                              <div className="text-muted-foreground text-xs">{session.tutorEmail}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div>
                            <div className="font-medium">{session.studentName || 'Unknown'}</div>
                            {session.studentEmail && (
                              <div className="text-muted-foreground text-xs">{session.studentEmail}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {session.course || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {formatDuration(session.duration || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SessionTrackingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <SessionTrackingPageContent />
    </Suspense>
  );
}

