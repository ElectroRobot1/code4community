"use client";
import { useAuth } from "../../components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";
import { doc, updateDoc, collection, query, where, getDocs, addDoc, onSnapshot } from "firebase/firestore";
import { firestore } from "@/firebase";

export default function MathLabPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [selectedCourse, setSelectedCourse] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [cachedUser, setCachedUser] = useState(null);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [mathLabRole, setMathLabRole] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [studentRequest, setStudentRequest] = useState(null);

  // Available courses
  const courses = [
    "Algebra 1",
    "Geometry", 
    "Functions",
    "Algebra 2",
    "Algebra 2 Trig"
  ];

  // No custom filtering — native select handles searching

  // Simple caching to prevent loading delay
  useEffect(() => {
    const cached = localStorage.getItem('brhs_user_cache');
    if (cached) {
      try {
        const user = JSON.parse(cached);
        setCachedUser(user);
        // Check if user has chosen a math lab role
        if (!user.mathLabRole) {
          setShowRoleSelection(true);
        }
      } catch (e) {
        localStorage.removeItem('brhs_user_cache');
      }
    }
  }, []);

  // Update cache when userData changes
  useEffect(() => {
    if (userData && user) {
      // Combine Firebase Auth user with Firestore data
      const combinedUserData = {
        ...userData,
        uid: user.uid,
        email: user.email
      };
      localStorage.setItem('brhs_user_cache', JSON.stringify(combinedUserData));
      setCachedUser(combinedUserData);
      // Check if user has chosen a math lab role
      if (!userData.mathLabRole) {
        setShowRoleSelection(true);
      }
    }
  }, [userData, user]);

  // Use cached user if available, fallback to real userData
  const displayUser = userData || cachedUser;

  // Redirect to login if not authenticated (use cached user if available)
  useEffect(() => {
    if (!user && !cachedUser) {
      router.push('/login');
    }
  }, [user, cachedUser, router]);

  // Fetch pending requests if user is a tutor
  useEffect(() => {
    if (displayUser?.mathLabRole === 'tutor') {
      const unsubscribe = fetchPendingRequests();
      
      // Also check for active sessions
      const checkActiveSessions = async () => {
        try {
          const q = query(
            collection(firestore, "tutoringRequests"),
            where("status", "==", "accepted"),
            where("tutorId", "==", user?.uid || cachedUser?.uid)
          );
          
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const sessionDoc = snapshot.docs[0];
            const sessionData = sessionDoc.data();
            
            setActiveSession({
              requestId: sessionDoc.id,
              studentName: sessionData.studentName,
              studentEmail: sessionData.studentEmail,
              course: sessionData.course,
              startTime: sessionData.acceptedAt?.toDate() || new Date()
            });
            setSessionStartTime(sessionData.acceptedAt?.toDate() || new Date());
          }
        } catch (error) {
          console.error("Error checking active sessions:", error);
        }
      };
      
      checkActiveSessions();
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [displayUser?.mathLabRole, user?.uid, cachedUser?.uid]);

  // Session timer effect
  useEffect(() => {
    let interval;
    if (activeSession && sessionStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now - sessionStartTime) / 1000);
        setSessionDuration(duration);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession, sessionStartTime]);

  // Check for student requests
  useEffect(() => {
    if (displayUser?.mathLabRole === 'student') {
      const checkStudentRequest = () => {
        try {
          const q = query(
            collection(firestore, "tutoringRequests"),
            where("studentId", "==", user?.uid || cachedUser?.uid),
            where("status", "in", ["pending", "accepted"])
          );
          
          const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
              const requestDoc = snapshot.docs[0];
              const requestData = requestDoc.data();
              
              if (requestData.status === 'pending') {
                setStudentRequest({
                  id: requestDoc.id,
                  course: requestData.course,
                  status: requestData.status,
                  createdAt: requestData.createdAt?.toDate() || new Date()
                });
              } else if (requestData.status === 'accepted') {
                // Student has been matched with a tutor
                setStudentRequest({
                  id: requestDoc.id,
                  course: requestData.course,
                  status: requestData.status,
                  tutorName: requestData.tutorName,
                  acceptedAt: requestData.acceptedAt?.toDate() || new Date()
                });
              }
            } else {
              setStudentRequest(null);
            }
          });
          
          return unsubscribe;
        } catch (error) {
          console.error("Error checking student request:", error);
          return () => {}; // Return empty cleanup function on error
        }
      };
      
      const unsubscribe = checkStudentRequest();
      return () => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [displayUser?.mathLabRole, user?.uid, cachedUser?.uid]);

  // No dropdown overlay logic needed with native select

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
  };

  const handleMatchMe = async () => {
    if (!selectedCourse) {
      alert("Please select a course first!");
      return;
    }

    setIsMatching(true);
    
    try {
      // Create a tutoring request
      const requestData = {
        studentId: user?.uid || cachedUser?.uid,
        studentName: displayUser?.displayName || displayUser?.firstName + ' ' + displayUser?.lastName || user?.email || 'Anonymous Student',
        studentEmail: user?.email || cachedUser?.email,
        course: selectedCourse,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(firestore, "tutoringRequests"), requestData);
      
      // Set the student request state to show the matching screen
      setStudentRequest({
        id: docRef.id,
        course: selectedCourse,
        status: 'pending',
        createdAt: new Date()
      });
      
      setIsMatching(false);
      setSelectedCourse(""); // Reset selection
    } catch (error) {
      console.error("Error submitting request:", error);
      alert("Failed to submit request. Please try again.");
      setIsMatching(false);
    }
  };

  // Function to fetch pending requests for tutors
  const fetchPendingRequests = () => {
    if (displayUser?.mathLabRole !== 'tutor') {
      return () => {}; // Return empty cleanup function
    }
    
    setIsLoadingRequests(true);
    try {
      const q = query(
        collection(firestore, "tutoringRequests"),
        where("status", "==", "pending")
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests = [];
        snapshot.forEach((doc) => {
          requests.push({ id: doc.id, ...doc.data() });
        });
        setPendingRequests(requests);
        setIsLoadingRequests(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error fetching requests:", error);
      setIsLoadingRequests(false);
      return () => {}; // Return empty cleanup function on error
    }
  };

  // Helper function to format time
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to cancel student request
  const handleCancelRequest = async () => {
    if (!studentRequest) return;
    
    try {
      await updateDoc(doc(firestore, "tutoringRequests", studentRequest.id), {
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date()
      });
      
      setStudentRequest(null);
    } catch (error) {
      console.error("Error cancelling request:", error);
      alert("Failed to cancel request. Please try again.");
    }
  };

  // Function to end tutoring session
  const handleEndSession = async () => {
    if (!activeSession) return;
    
    try {
      // Update the request status to completed
      await updateDoc(doc(firestore, "tutoringRequests", activeSession.requestId), {
        status: 'completed',
        sessionDuration: sessionDuration,
        endedAt: new Date(),
        updatedAt: new Date()
      });

      // Clear session state
      setActiveSession(null);
      setSessionStartTime(null);
      setSessionDuration(0);
    } catch (error) {
      console.error("Error ending session:", error);
      alert("Failed to end session. Please try again.");
    }
  };

  // Function for tutors to accept requests
  const handleAcceptRequest = async (requestId, studentId, course) => {
    try {
      // Find the request details
      const request = pendingRequests.find(req => req.id === requestId);
      if (!request) {
        throw new Error("Request not found");
      }

      // Update the request status to accepted
      await updateDoc(doc(firestore, "tutoringRequests", requestId), {
        status: 'accepted',
        tutorId: user?.uid || cachedUser?.uid,
        tutorName: displayUser?.displayName || displayUser?.firstName + ' ' + displayUser?.lastName || user?.email || 'Anonymous Tutor',
        tutorEmail: user?.email || cachedUser?.email,
        acceptedAt: new Date(),
        updatedAt: new Date()
      });

      // Start the tutoring session
      setActiveSession({
        requestId,
        studentName: request.studentName,
        studentEmail: request.studentEmail,
        course: request.course,
        startTime: new Date()
      });
      setSessionStartTime(new Date());
      setSessionDuration(0);

      // TODO: Send notification to student (could be email, push notification, etc.)
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Failed to accept request. Please try again.");
    }
  };

  const handleRoleSelection = async () => {
    if (!mathLabRole) {
      alert("Please select a role first!");
      return;
    }

    setIsUpdating(true);

    try {
      // Get user ID from multiple sources with proper fallback
      const userId = user?.uid || cachedUser?.uid;
      if (!userId) {
        throw new Error("User ID not found. Please try refreshing the page.");
      }

      // Update Firestore
      await updateDoc(doc(firestore, "users", userId), {
        mathLabRole: mathLabRole,
        updatedAt: new Date()
      });

      // Update local cache
      const updatedUser = { ...cachedUser, mathLabRole };
      localStorage.setItem('brhs_user_cache', JSON.stringify(updatedUser));
      setCachedUser(updatedUser);

      // Hide role selection
      setShowRoleSelection(false);
    } catch (error) {
      console.error("Error updating math lab role:", error);
      alert(error.message || "Failed to update role. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Don't show loading state - use cached data immediately
  if (!displayUser) {
    return null; // Will redirect to login
  }

  // Show student matching screen if they have a pending request
  if (studentRequest && displayUser?.mathLabRole === 'student') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <DashboardTopBar 
          title="BRHS Math Lab - Finding Tutor" 
          showNavLinks={false}
        />

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-2xl w-full">
            {/* Matching Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-full mb-6">
                <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {studentRequest.status === 'pending' ? (
                <>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Finding Your Tutor
                  </h1>
                  
                  <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                    We&apos;re searching for the perfect tutor for {studentRequest.course}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Tutor Found!
                  </h1>
                  
                  <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                    {studentRequest.tutorName} will be tutoring you in {studentRequest.course}
                  </p>
                </>
              )}
            </div>

            {/* Request Info Card */}
            <div className="bg-white rounded-2xl border-2 border-primary/20 p-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Course Info */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Course</h3>
                  <p className="text-primary font-medium">{studentRequest.course}</p>
                </div>

                {/* Status Info */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    {studentRequest.status === 'pending' ? (
                      <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
                  <p className={`font-medium ${
                    studentRequest.status === 'pending' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {studentRequest.status === 'pending' ? 'Searching...' : 'Matched!'}
                  </p>
                </div>
              </div>

              {/* Request Details */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Request submitted at {studentRequest.createdAt.toLocaleTimeString()}
                  </p>
                  {studentRequest.status === 'accepted' && (
                    <p className="text-sm text-gray-500 mt-1">
                      Accepted at {studentRequest.acceptedAt.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="text-center space-y-4">
              {studentRequest.status === 'pending' && (
                <button
                  onClick={handleCancelRequest}
                  className="px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-gray-500/25 hover:shadow-xl hover:shadow-gray-500/30"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel Request
                  </div>
                </button>
              )}
              
              {studentRequest.status === 'accepted' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-lg font-semibold text-green-800">Tutoring Session Ready!</span>
                  </div>
                  <p className="text-green-700 text-center">
                    Your tutor {studentRequest.tutorName} is ready to begin. 
                    They will start the session shortly.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show tutoring session if active
  if (activeSession && displayUser?.mathLabRole === 'tutor') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <DashboardTopBar 
          title="BRHS Math Lab - Active Session" 
          showNavLinks={false}
        />

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-4xl w-full">
            {/* Session Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-full mb-6">
                <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Tutoring Session Active
              </h1>
              
              <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                You are currently tutoring {activeSession.studentName} in {activeSession.course}
              </p>
            </div>

            {/* Session Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Student Info */}
              <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Student</h3>
                <p className="text-primary font-medium">{activeSession.studentName}</p>
                <p className="text-sm text-gray-500 mt-1">{activeSession.studentEmail}</p>
              </div>

              {/* Course Info */}
              <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Course</h3>
                <p className="text-primary font-medium">{activeSession.course}</p>
                <p className="text-sm text-gray-500 mt-1">Math Lab Session</p>
              </div>

              {/* Session Timer */}
              <div className="bg-white rounded-2xl border-2 border-primary/20 p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Duration</h3>
                <div className="text-3xl font-mono font-bold text-primary">
                  {formatTime(sessionDuration)}
                </div>
                <p className="text-sm text-gray-500 mt-1">Live Timer</p>
              </div>
            </div>

            {/* Session Actions */}
            <div className="text-center">
              <button
                onClick={handleEndSession}
                className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  End Session
                </div>
              </button>
              
              <p className="text-sm text-gray-500 mt-4">
                Session started at {activeSession.startTime.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show role selection if user hasn't chosen one
  if (showRoleSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <DashboardTopBar 
          title="BRHS Math Lab" 
          showNavLinks={false}
        />

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-2xl w-full">
            {/* Header Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to BRHS Math Lab!
              </h1>
              
              <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                Let&apos;s get you set up so you can start your math learning journey
              </p>
            </div>

            {/* Role Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Student Card */}
              <div 
                className={`group relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  mathLabRole === 'student' 
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20' 
                    : 'border-gray-200 bg-white hover:border-primary/30 hover:shadow-lg'
                }`}
                onClick={() => setMathLabRole('student')}
              >
                {/* Selection Indicator */}
                <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                  mathLabRole === 'student' 
                    ? 'border-primary bg-primary' 
                    : 'border-gray-300 group-hover:border-primary/50'
                }`}>
                  {mathLabRole === 'student' && (
                    <svg className="w-3 h-3 text-white m-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Icon */}
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-all duration-200 ${
                  mathLabRole === 'student' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
                }`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">I&apos;m a Student</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  I want to get help with math, work with tutors, and access learning resources to improve my skills.
                </p>
                
                {/* Features */}
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Get matched with qualified tutors
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Access course-specific resources
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Track your progress
                  </li>
                </ul>
              </div>

              {/* Tutor Card */}
              <div 
                className={`group relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  mathLabRole === 'tutor' 
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20' 
                    : 'border-gray-200 bg-white hover:border-primary/30 hover:shadow-lg'
                }`}
                onClick={() => setMathLabRole('tutor')}
              >
                {/* Selection Indicator */}
                <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                  mathLabRole === 'tutor' 
                    ? 'border-primary bg-primary' 
                    : 'border-gray-300 group-hover:border-primary/50'
                }`}>
                  {mathLabRole === 'tutor' && (
                    <svg className="w-3 h-3 text-white m-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Icon */}
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-all duration-200 ${
                  mathLabRole === 'tutor' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
                }`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">I&apos;m a Tutor</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  I want to help students learn math, share my knowledge, and manage tutoring sessions.
                </p>
                
                {/* Features */}
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Help students with math concepts
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Manage tutoring sessions
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Build your tutoring profile
                  </li>
                </ul>
              </div>
            </div>

            {/* Action Section */}
            <div className="text-center">
              <button
                onClick={handleRoleSelection}
                disabled={isUpdating || !mathLabRole}
                className={`px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                  mathLabRole 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isUpdating ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                    Setting up your Math Lab experience...
                  </div>
                ) : (
                  <>
                    Continue to Math Lab
                    <svg className="w-5 h-5 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>

              {/* Help Text */}
              <div className="mt-6 text-center">
                <p className="text-gray-500 text-sm">
                  You can change this later in your{" "}
                  <button 
                    onClick={() => router.push('/settings')}
                    className="text-primary hover:text-primary/80 underline font-medium transition-colors"
                  >
                    settings
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Use the reusable DashboardTopBar component */}
      <DashboardTopBar 
        title="BRHS Math Lab" 
        showNavLinks={false} // Don't show navigation links on math lab page
      />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
        {displayUser.mathLabRole === 'tutor' ? (
          // Tutor Dashboard
          <div className="max-w-4xl w-full mx-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-4">Tutor Dashboard</h2>
              <p className="text-lg text-muted-foreground">
                View and accept pending tutoring requests from students
              </p>
            </div>

            {/* Pending Requests */}
            <div className="card-elevated p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Pending Requests</h3>
              
              {isLoadingRequests ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading requests...</p>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-muted-foreground">No pending requests at the moment</p>
                  <p className="text-sm text-muted-foreground mt-2">Students will appear here when they submit tutoring requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="border border-border rounded-lg p-4 bg-card">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">{request.studentName}</h4>
                              <p className="text-sm text-muted-foreground">{request.studentEmail}</p>
                            </div>
                          </div>
                          <div className="ml-13">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                              {request.course}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">
                              Requested {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleString() : 'Recently'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAcceptRequest(request.id, request.studentId, request.course)}
                          className="btn-primary px-4 py-2 text-sm"
                        >
                          Accept Request
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Student Dashboard
          <div className="max-w-md w-full mx-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-4">Welcome to the Math Lab!</h2>
              <p className="text-lg text-muted-foreground">
                Select your course and get matched with a tutor
              </p>
            </div>

            {/* Course Selection (Native Select) */}
            <div className="card-elevated p-6 space-y-6">
              <div>
                <label htmlFor="course-select" className="block text-sm font-semibold mb-3 text-foreground">
                  Select Your Course
                </label>
                <select
                  id="course-select"
                  className="select w-full"
                  value={selectedCourse}
                  onChange={(e) => handleCourseSelect(e.target.value)}
                  aria-label="Select your course"
                >
                  <option value="" disabled>{selectedCourse ? 'Change course' : 'Choose a course'}</option>
                  {courses.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>

                
              </div>

              {/* Match Me Button */}
              <button
                onClick={handleMatchMe}
                disabled={!selectedCourse || isMatching}
                className="btn-primary w-full text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMatching ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Submitting request...
                  </div>
                ) : (
                  <>
                    Submit Tutoring Request
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Instructions */}
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                Need help? Contact your math teacher or visit the main office.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
