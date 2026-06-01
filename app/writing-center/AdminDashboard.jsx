"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/utils/AuthContext";
import { firestore } from "@/firebase";
import { collection, onSnapshot, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { formatSessionDate } from "@/lib/firestoreDates";
import { getGoogleFormResponseUrl, isAsyncFormSession } from "@/lib/writingCenterForm";

function getUserDisplayName(user) {
  return (
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email?.split("@")[0] ||
    ""
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, asyncPending: 0 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [expandedSession, setExpandedSession] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTutorFilter, setSelectedTutorFilter] = useState('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      const name = getUserDisplayName(user).toLowerCase();
      const email = (user.email || '').toLowerCase();
      const first = (user.firstName || '').toLowerCase();
      const last = (user.lastName || '').toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        first.includes(q) ||
        last.includes(q)
      );
    });
  }, [users, userSearchQuery]);

  useEffect(() => {
    if (!firestore) return;

    const sessionsUnsubscribe = onSnapshot(collection(firestore, 'sessions'), (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(sessionsData);
      setStats({
        total: sessionsData.length,
        completed: sessionsData.filter(s => s.status === 'COMPLETED').length,
        pending: sessionsData.filter(s => s.status === 'PENDING').length,
        asyncPending: sessionsData.filter(s => s.status === 'PENDING' && s.sessionType === 'ASYNC').length
      });
    }, (err) => {
      console.error('Failed to fetch sessions:', err);
    });

    const usersUnsubscribe = onSnapshot(collection(firestore, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    }, (err) => {
      console.error('Failed to fetch users:', err);
    });

    return () => {
      sessionsUnsubscribe();
      usersUnsubscribe();
    };
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateDoc(doc(firestore, 'users', userId), {
        role: newRole
      });
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleAssignSession = async () => {
    if (!selectedSession || !selectedTutor) return;
    
    try {
      const tutorUser = users.find(u => u.id === selectedTutor);
      await updateDoc(doc(firestore, 'sessions', selectedSession.id), {
        tutorId: selectedTutor,
        tutorName: tutorUser?.displayName || tutorUser?.email,
        tutorEmail: tutorUser?.email,
        status: 'ACCEPTED',
        updatedAt: serverTimestamp()
      });
      setShowAssignModal(false);
      setSelectedSession(null);
      setSelectedTutor('');
    } catch (err) {
      console.error('Failed to assign session:', err);
    }
  };

  const openAssignModal = (session) => {
    setSelectedSession(session);
    setShowAssignModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (statusFilter !== 'ALL' && session.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && session.sessionType !== typeFilter) return false;
    if (selectedTutorFilter !== 'ALL' && session.tutorId !== selectedTutorFilter) return false;
    return true;
  });

  const tutors = users.filter(user => (user.role || '').toUpperCase() === 'TUTOR');
  const tutorSessions = selectedTutorFilter === 'ALL' 
    ? sessions 
    : sessions.filter(s => s.tutorId === selectedTutorFilter);

  const tabClass = (tab) =>
    `whitespace-nowrap py-2 px-3 rounded-md text-sm font-medium transition-colors ${
      activeTab === tab
        ? "bg-indigo-100 text-indigo-700"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-6">
      <header className="w-full flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8 mb-6 border-b border-gray-200 pb-4">
        <div className="min-w-0 shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">Writing Center - Admin Dashboard</h1>
          <nav className="mt-3 flex flex-wrap gap-1" aria-label="Admin sections">
            <button type="button" onClick={() => setActiveTab("sessions")} className={tabClass("sessions")}>
              Sessions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tutor-assignments")}
              className={tabClass("tutor-assignments")}
            >
              Tutor Assignments
            </button>
            <button type="button" onClick={() => setActiveTab("users")} className={tabClass("users")}>
              User Management
            </button>
          </nav>
        </div>

        {activeTab === "sessions" && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm"
              aria-label="Filter by status"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm"
              aria-label="Filter by type"
            >
              <option value="ALL">All Types</option>
              <option value="IN_PERSON">In-Person</option>
              <option value="ASYNC">Async</option>
            </select>
          </div>
        )}
      </header>

      {activeTab === "sessions" ? (
        <div className="w-full">
          <div className="bg-white shadow rounded-lg mb-6 overflow-hidden w-full">
            <div className="flex flex-col sm:flex-row sm:divide-x divide-gray-200">
              <div className="flex-1 flex items-center justify-between gap-4 px-5 py-4 border-b sm:border-b-0 border-gray-200">
                <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.total}</p>
              </div>
              <div className="flex-1 flex items-center justify-between gap-4 px-5 py-4 border-b sm:border-b-0 border-gray-200">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600 tabular-nums">{stats.completed}</p>
              </div>
              <div className="flex-1 flex items-center justify-between gap-4 px-5 py-4 border-b sm:border-b-0 border-gray-200">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 tabular-nums">{stats.pending}</p>
              </div>
              <div className="flex-1 flex items-center justify-between gap-4 px-5 py-4">
                <p className="text-sm font-medium text-gray-500">Async Pending</p>
                <p className="text-2xl font-bold text-purple-600 tabular-nums">{stats.asyncPending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden w-full">
            {filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No sessions found</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredSessions.map((session) => {
                  const formResponseUrl = getGoogleFormResponseUrl(session);
                  const isExpanded = expandedSession === session.id;
                  return (
                  <li key={session.id} className="w-full">
                    <button
                      type="button"
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                      className="w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex w-full items-center gap-6 min-h-[3rem]">
                        <div className="flex flex-1 min-w-0 items-center gap-4 lg:gap-8 flex-wrap lg:flex-nowrap">
                          <div className="flex items-center gap-2 min-w-0 lg:flex-[2]">
                            {formResponseUrl && isAsyncFormSession(session) ? (
                              <a
                                href={formResponseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-base font-semibold text-indigo-600 hover:text-indigo-800 underline"
                              >
                                {session.subject}
                              </a>
                            ) : (
                              <span className="text-base font-semibold text-indigo-600">
                                {session.subject}
                              </span>
                            )}
                          </div>
                          <span
                            className={`shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}
                          >
                            {session.status}
                          </span>
                          <span className="shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            {session.sessionType}
                          </span>
                          <span className="text-sm text-gray-600 lg:flex-1 min-w-[10rem]">
                            <span className="text-gray-500">Student:</span> {session.studentName}
                          </span>
                          <span className="text-sm text-gray-600 lg:flex-1 min-w-[10rem]">
                            <span className="text-gray-500">Tutor:</span> {session.tutorName || "Unassigned"}
                          </span>
                          <span className="text-sm text-gray-500 shrink-0 lg:ml-auto">
                            {formatSessionDate(session.createdAt)}
                          </span>
                        </div>
                        <svg
                          className={`w-5 h-5 shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 w-full">
                        <div className="space-y-2">
                          {session.notes && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Notes:</p>
                              <p className="text-sm text-gray-600">{session.notes}</p>
                            </div>
                          )}
                          {isAsyncFormSession(session) && formResponseUrl && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Google Forms:</p>
                              <a
                                href={formResponseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                View in Google Forms
                              </a>
                            </div>
                          )}
                          {session.asyncFileUrl && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Student&apos;s document:</p>
                              <a
                                href={session.asyncFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                {session.asyncFileName || "Open submitted file"}
                              </a>
                            </div>
                          )}
                          {session.proofFileUrl && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Proof File:</p>
                              <a
                                href={session.proofFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                {session.proofFileName}
                              </a>
                            </div>
                          )}
                          {session.duration && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Session Duration:</p>
                              <p className="text-sm text-gray-600">{Math.floor(session.duration / 60)}:{(session.duration % 60).toString().padStart(2, '0')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : activeTab === 'tutor-assignments' ? (
        <div className="w-full">
          <div className="mb-6 flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filter by Tutor:</label>
            <select
              value={selectedTutorFilter}
              onChange={(e) => setSelectedTutorFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="ALL">All Tutors</option>
              {tutors.map(tutor => (
                <option key={tutor.id} value={tutor.id}>
                  {tutor.displayName || tutor.email}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md w-full">
            <table className="w-full min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Tutor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tutorSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.studentName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.sessionType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.tutorName || 'Unassigned'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {session.status === 'PENDING' && (
                        <button
                          onClick={() => openAssignModal(session)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Assign Tutor
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <div className="mb-4">
            <label htmlFor="user-search" className="sr-only">
              Search users
            </label>
            <input
              id="user-search"
              type="search"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {userSearchQuery.trim() && (
              <p className="mt-2 text-sm text-gray-500">
                {filteredUsers.length} of {users.length} users
              </p>
            )}
          </div>
          <div className="bg-white shadow overflow-hidden sm:rounded-md w-full">
            <table className="w-full min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                      {userSearchQuery.trim() ? 'No users match your search.' : 'No users found.'}
                    </td>
                  </tr>
                ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getUserDisplayName(user)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <select
                        value={(user.role || 'STUDENT').toUpperCase()}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="STUDENT">Student</option>
                        <option value="TUTOR">Tutor</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAssignModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Tutor to Session</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Session: {selectedSession.subject} - {selectedSession.studentName}
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Tutor:</label>
              <select
                value={selectedTutor}
                onChange={(e) => setSelectedTutor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">-- Select a tutor --</option>
                {tutors.map(tutor => (
                  <option key={tutor.id} value={tutor.id}>
                    {tutor.displayName || tutor.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedSession(null);
                  setSelectedTutor('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSession}
                disabled={!selectedTutor}
                className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
