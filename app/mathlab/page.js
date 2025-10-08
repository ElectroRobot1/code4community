"use client";
// Version: TDZ fix - displayUser/isAuthorized moved before effects - build timestamp
// Fixed: All event parameters renamed to prevent TDZ issues
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useUserCache } from "@/hooks/useUserCache";
import { useLoadingState } from "@/hooks/useLoadingState";
import { QueryBuilder } from "@/utils/firestoreUtils";
import { handleError } from "@/utils/errorHandlingUtils";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardTopBar from "../../components/DashboardTopBar";
import MathLabSidebar from "../../components/MathLabSidebar";
import LoadingSpinner from "../../components/LoadingSpinner";
import { AppCardSkeleton, RequestCardSkeleton } from "../../components/SkeletonLoader";
import { doc, updateDoc, collection, query, where, getDocs, addDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { firestore } from "@/firebase";
import { MathLabCache, UserCache, CachePerformance } from "@/utils/cache";
import { invalidateOnDataChange } from "@/utils/cacheInvalidation";
import { canAccess, canModify, isTutorOrHigher, ROLES } from "@/utils/authorization";
import Image from "next/image";

export default function MathLabPage() {
  // Use new authentication redirect hook
  const { isAuthenticated, isLoading: authLoading, user, userData } = useAuthRedirect('/mathlab');
  
  // Use new user cache hook
  const { cachedUser } = useUserCache();
  
  // Use new loading state hook
  const { isLoading, setLoading, withLoading, isSubmitting, isMatching, isUpdating, isLoadingRequests } = useLoadingState({
    isLoading: true,
    isSubmitting: false,
    isMatching: false,
    isUpdating: false,
    isLoadingRequests: false
  });
  
  // Router for navigation
  const router = useRouter();
  
  // Determine which user data to display (must be declared before effects that depend on it)
  const displayUser = userData || cachedUser;
  
  // Check authorization for Math Lab access (must be declared before effects/deps that use it)
  const isAuthorized = user && userData && canAccess(userData.role, 'mathlab', userData.mathLabRole);
  
  // Handle redirect for unauthorized users (only if logged in)
  useEffect(() => {
    if (isAuthenticated && user && userData && !isAuthorized) {
      router.push('/welcome');
    }
  }, [isAuthenticated, user, userData, isAuthorized, router]);
  
  // Additional state variables
  const [selectedCourse, setSelectedCourse] = useState("");
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [mathLabRole, setMathLabRole] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [studentRequest, setStudentRequest] = useState(null);
  const [previousStudentRequest, setPreviousStudentRequest] = useState(null);
  const [roleChangeMessage, setRoleChangeMessage] = useState("");
  const [sessionStatus, setSessionStatus] = useState(null); // 'accepted', 'started', 'ended'
  const [sessionEndData, setSessionEndData] = useState(null); // Data for session over screen
  const studentRequestRef = useRef(studentRequest);
  const previousStudentRequestRef = useRef(previousStudentRequest);
  const sessionDurationRef = useRef(sessionDuration);
  
  // Update refs when values change
  useEffect(() => {
    studentRequestRef.current = studentRequest;
  }, [studentRequest]);
  
  useEffect(() => {
    previousStudentRequestRef.current = previousStudentRequest;
  }, [previousStudentRequest]);
  
  useEffect(() => {
    sessionDurationRef.current = sessionDuration;
  }, [sessionDuration]);

  // displayUser and isAuthorized moved above to avoid TDZ in hooks/deps

  // Set loading to false when authentication and user data are available
  useEffect(() => {
    if (isAuthenticated && (userData || cachedUser)) {
      setLoading('isLoading', false);
    }
  }, [isAuthenticated, userData, cachedUser, setLoading]);

  // Fetch pending requests
  const fetchPendingRequests = useCallback(async () => {
    if (!displayUser) return;

    try {
      setLoading('isLoadingRequests', true);
      
      const queryOptions = {
        filters: [
          { field: 'status', operator: '==', value: 'pending' }
        ],
        orderBy: { field: 'createdAt', direction: 'desc' }
      };

      const requests = await QueryBuilder.buildQuery('tutoringRequests', queryOptions);
      setPendingRequests(requests);
      
    } catch (error) {
      handleError(error, {
        context: { operation: 'fetchPendingRequests', userId: displayUser.uid },
        showAlert: false
      });
    } finally {
      setLoading('isLoadingRequests', false);
    }
  }, [displayUser, setLoading]);

  // Check for active sessions
  const checkActiveSessions = useCallback(async () => {
    if (!displayUser) return;

    try {
      const queryOptions = {
        filters: [
          { field: 'status', operator: '==', value: 'active' },
          { field: 'tutorId', operator: '==', value: displayUser.uid }
        ]
      };

      const sessions = await QueryBuilder.buildQuery('tutoringSessions', queryOptions);
      
      if (sessions.length > 0) {
        const session = sessions[0];
        setActiveSession(session);
        setSessionStartTime(session.startTime?.toDate());
        setSessionStatus('started');
      } else {
        setActiveSession(null);
        setSessionStartTime(null);
        setSessionStatus(null);
      }
    } catch (error) {
      handleError(error, {
        context: { operation: 'checkActiveSessions', userId: displayUser.uid },
        showAlert: false
      });
    }
  }, [displayUser]);

  // Handle course selection
  const handleCourseSelect = useCallback((course) => {
    setSelectedCourse(course);
    setStudentRequest(null);
    setPreviousStudentRequest(null);
  }, []);

  // Handle role selection
  const handleRoleSelection = useCallback(async (role) => {
    if (!user || !userData) return;

    try {
      setLoading('isUpdating', true);
      
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        mathLabRole: role,
        updatedAt: new Date()
      });

      setMathLabRole(role);
      setShowRoleSelection(false);
      
      // Invalidate user cache to force refresh
      UserCache.invalidateUserData(user.uid);
      
      // Show success message
      setRoleChangeMessage(`Successfully set your role to ${role}`);
      setTimeout(() => setRoleChangeMessage(""), 3000);
      
    } catch (error) {
      handleError(error, {
        context: { operation: 'handleRoleSelection', userId: user.uid, role },
        showAlert: true
      });
    } finally {
      setLoading('isUpdating', false);
    }
  }, [user, userData, setLoading]);

  // Handle match me functionality
  const handleMatchMe = useCallback(async () => {
    if (!displayUser || !selectedCourse) return;

    try {
      await withLoading(async () => {
        const requestData = {
          studentId: displayUser.uid,
          studentName: displayUser.displayName || `${displayUser.firstName} ${displayUser.lastName}`,
          course: selectedCourse,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const docRef = await addDoc(collection(firestore, 'tutoringRequests'), requestData);
        
        setStudentRequest({
          id: docRef.id,
          ...requestData
        });
        
        // Invalidate related caches
        MathLabCache.invalidateRequests();
        invalidateOnDataChange('tutoringRequests');
        
      }, { loadingKey: 'isSubmitting' });
      
    } catch (error) {
      handleError(error, {
        context: { operation: 'handleMatchMe', userId: displayUser.uid, course: selectedCourse },
        showAlert: true
      });
    }
  }, [displayUser, selectedCourse, withLoading]);

  // Handle accept request
  const handleAcceptRequest = useCallback(async (request) => {
    if (!displayUser || !userData) return;

    try {
      await withLoading(async () => {
        // Create tutoring session
        const sessionData = {
          tutorId: displayUser.uid,
          tutorName: displayUser.displayName || `${displayUser.firstName} ${displayUser.lastName}`,
          studentId: request.studentId,
          studentName: request.studentName,
          course: request.course,
          status: 'active',
          startTime: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const sessionRef = await addDoc(collection(firestore, 'tutoringSessions'), sessionData);
        
        // Update request status
        const requestRef = doc(firestore, 'tutoringRequests', request.id);
        await updateDoc(requestRef, {
          status: 'accepted',
          tutorId: displayUser.uid,
          tutorName: displayUser.displayName || `${displayUser.firstName} ${displayUser.lastName}`,
          updatedAt: new Date()
        });

        // Remove from pending requests
        setPendingRequests(prev => prev.filter(req => req.id !== request.id));
        
        // Set active session
        setActiveSession({
          id: sessionRef.id,
          ...sessionData
        });
        setSessionStartTime(sessionData.startTime);
        setSessionStatus('started');
        
        // Invalidate caches
        MathLabCache.invalidateRequests();
        MathLabCache.invalidateSessions();
        invalidateOnDataChange('tutoringRequests');
        invalidateOnDataChange('tutoringSessions');
        
      }, { loadingKey: 'isMatching' });
      
    } catch (error) {
      handleError(error, {
        context: { operation: 'handleAcceptRequest', userId: displayUser.uid, requestId: request.id },
        showAlert: true
      });
    }
  }, [displayUser, userData, withLoading]);

  // Handle end session
  const handleEndSession = useCallback(async () => {
    if (!activeSession || !displayUser) return;

    try {
      await withLoading(async () => {
        const endTime = new Date();
        const duration = Math.floor((endTime - sessionStartTime) / 1000 / 60); // minutes

        // Update session
        const sessionRef = doc(firestore, 'tutoringSessions', activeSession.id);
        await updateDoc(sessionRef, {
          status: 'completed',
          endTime: endTime,
          duration: duration,
          updatedAt: endTime
        });

        // Update request status
        if (activeSession.requestId) {
          const requestRef = doc(firestore, 'tutoringRequests', activeSession.requestId);
          await updateDoc(requestRef, {
            status: 'completed',
            updatedAt: endTime
          });
        }

        // Set session end data
        setSessionEndData({
          duration: duration,
          course: activeSession.course,
          studentName: activeSession.studentName
        });
        setSessionStatus('ended');
        setActiveSession(null);
        setSessionStartTime(null);
        setSessionDuration(0);
        
        // Invalidate caches
        MathLabCache.invalidateSessions();
        MathLabCache.invalidateRequests();
        invalidateOnDataChange('tutoringSessions');
        invalidateOnDataChange('tutoringRequests');
        
      }, { loadingKey: 'isUpdating' });
      
    } catch (error) {
      handleError(error, {
        context: { operation: 'handleEndSession', userId: displayUser.uid, sessionId: activeSession.id },
        showAlert: true
      });
    }
  }, [activeSession, displayUser, sessionStartTime, withLoading]);

  // Load initial data
  useEffect(() => {
    if (displayUser && isAuthorized) {
      fetchPendingRequests();
      checkActiveSessions();
    }
  }, [displayUser, isAuthorized, fetchPendingRequests, checkActiveSessions]);

  // Set up real-time listener for pending requests
  useEffect(() => {
    if (!displayUser || !isAuthorized) return;

    const requestsQuery = query(
      collection(firestore, 'tutoringRequests'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingRequests(requests);
    });

    return () => unsubscribe();
  }, [displayUser, isAuthorized]);

  // Update session duration
  useEffect(() => {
    if (sessionStartTime && activeSession) {
      const interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now - sessionStartTime) / 1000 / 60);
        setSessionDuration(duration);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [sessionStartTime, activeSession]);

  // Show loading while authentication is loading
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden" style={{ overscrollBehavior: 'none' }}>
        <DashboardTopBar />
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

  // Show access denied if not authorized - redirect to welcome instead
  if (user && userData && !isAuthorized) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardTopBar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-muted-foreground">Redirecting to welcome page...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show session over screen if session just ended (for both tutors and students)
  if (sessionStatus === 'ended' && sessionEndData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <DashboardTopBar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Complete!</h1>
                <p className="text-gray-600">
                  Great job! Your {sessionEndData.course} tutoring session with {sessionEndData.studentName} has ended.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{sessionEndData.duration}</div>
                    <div className="text-sm text-gray-600">Minutes</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{sessionEndData.course}</div>
                    <div className="text-sm text-gray-600">Subject</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{sessionEndData.studentName}</div>
                    <div className="text-sm text-gray-600">Student</div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => {
                    setSessionStatus(null);
                    setSessionEndData(null);
                    fetchPendingRequests();
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue Tutoring
                </button>
                <button
                  onClick={() => router.push('/welcome')}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Return Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show role selection if user hasn't set their math lab role
  if (displayUser && !displayUser.mathLabRole) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden" style={{ overscrollBehavior: 'none' }}>
        <DashboardTopBar />
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-4">Welcome to Math Lab!</h1>
              <p className="text-muted-foreground text-lg">
                Please select your role to get started with tutoring.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => handleRoleSelection('tutor')}
                disabled={isUpdating}
                className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-blue-900 mb-2">I&apos;m a Tutor</h3>
                  <p className="text-blue-700">
                    Help students with their math homework and assignments.
                  </p>
                </div>
              </button>
              
              <button
                onClick={() => handleRoleSelection('student')}
                disabled={isUpdating}
                className="p-6 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-green-900 mb-2">I&apos;m a Student</h3>
                  <p className="text-green-700">
                    Get help with your math homework and assignments.
                  </p>
                </div>
              </button>
            </div>
            
            {isUpdating && (
              <div className="text-center mt-6">
                <LoadingSpinner />
                <p className="text-muted-foreground mt-2">Setting up your role...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Math Lab interface
  return (
    <div className="min-h-screen bg-background overflow-x-hidden" style={{ overscrollBehavior: 'none' }}>
      <DashboardTopBar />
      <MathLabSidebar />
      
      <div className="ml-64 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Math Lab</h1>
            <p className="text-muted-foreground">
              {displayUser?.mathLabRole === 'tutor' 
                ? 'Help students with their math homework and assignments'
                : 'Get help with your math homework and assignments'
              }
            </p>
          </div>

          {/* Role change message */}
          {roleChangeMessage && (
            <div className="mb-6 p-4 bg-green-100 border border-green-200 rounded-lg">
              <p className="text-green-800">{roleChangeMessage}</p>
            </div>
          )}

          {/* Active Session Display */}
          {activeSession && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-blue-900 mb-2">Active Session</h2>
                  <p className="text-blue-700">
                    Tutoring {activeSession.studentName} in {activeSession.course}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Duration: {sessionDuration} minutes
                  </p>
                </div>
                <button
                  onClick={handleEndSession}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  End Session
                </button>
              </div>
            </div>
          )}

          {/* Tutor Interface */}
          {displayUser?.mathLabRole === 'tutor' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pending Requests */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Pending Requests</h2>
                {isLoadingRequests ? (
                  <div className="space-y-4">
                    <RequestCardSkeleton />
                    <RequestCardSkeleton />
                  </div>
                ) : pendingRequests.length > 0 ? (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{request.studentName}</h3>
                            <p className="text-sm text-gray-600">{request.course}</p>
                          </div>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            Pending
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {request.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
                          </span>
                          <button
                            onClick={() => handleAcceptRequest(request)}
                            disabled={isMatching}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No pending requests at the moment.</p>
                  </div>
                )}
              </div>

              {/* Tutor Stats */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Your Stats</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{pendingRequests.length}</div>
                    <div className="text-sm text-gray-600">Pending Requests</div>
                  </div>
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {activeSession ? '1' : '0'}
                    </div>
                    <div className="text-sm text-gray-600">Active Sessions</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Student Interface */}
          {displayUser?.mathLabRole === 'student' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Request Help */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Request Help</h2>
                <div className="p-6 bg-white border border-gray-200 rounded-lg">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Course
                    </label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => handleCourseSelect(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a course...</option>
                      <option value="Algebra 1">Algebra 1</option>
                      <option value="Algebra 2">Algebra 2</option>
                      <option value="Algebra 2 Trig">Algebra 2 Trig</option>
                      <option value="Functions">Functions</option>
                      <option value="Trig with Adv Alg">Trig with Adv Alg</option>
                      <option value="Geometry">Geometry</option>
                    </select>
                  </div>
                  
                  {selectedCourse && (
                    <button
                      onClick={handleMatchMe}
                      disabled={isSubmitting || studentRequest}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {studentRequest ? 'Request Submitted' : 'Submit Tutoring Request'}
                    </button>
                  )}
                  
                  {studentRequest && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800">
                        Your request for {selectedCourse} help has been submitted! 
                        A tutor will be with you shortly.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Student Status */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Your Status</h2>
                <div className="p-6 bg-white border border-gray-200 rounded-lg">
                  {studentRequest ? (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Current Request</h3>
                      <p className="text-gray-600 mb-2">Course: {studentRequest.course}</p>
                      <p className="text-gray-600 mb-4">Status: Pending</p>
                      <div className="text-sm text-gray-500">
                        Waiting for a tutor to accept your request...
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <p>No active requests.</p>
                      <p className="text-sm mt-2">Select a course above to request help.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}