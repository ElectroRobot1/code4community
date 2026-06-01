"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/utils/AuthContext";
import { firestore } from "@/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { buildAsyncFormUrl } from "@/lib/writingCenterForm";
import { formatSessionDate } from "@/lib/firestoreDates";
import { getGoogleFormResponseUrl, isAsyncFormSession } from "@/lib/writingCenterForm";

export default function StudentDashboard() {
  const [sessions, setSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    notes: "",
    sessionType: "IN_PERSON",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user && firestore) {
      const q = query(collection(firestore, "sessions"), where("studentId", "==", user.uid));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const sessionsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setSessions(sessionsData);
        },
        (err) => {
          console.error("Failed to fetch sessions:", err);
        }
      );
      return () => unsubscribe();
    }
  }, [user]);

  const studentDisplayName =
    user?.displayName || user?.email?.split("@")[0] || "Student";

  const openAsyncForm = () => {
    const url = buildAsyncFormUrl({
      email: user?.email || "",
      name: studentDisplayName,
    });
    window.open(url, "_blank", "noopener,noreferrer");
    setShowModal(false);
    setFormData({ subject: "", notes: "", sessionType: "IN_PERSON" });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (formData.sessionType === "ASYNC") {
      openAsyncForm();
      return;
    }

    setError("");
    setLoading(true);
    setIsSubmitting(true);

    try {
      await addDoc(collection(firestore, "sessions"), {
        studentId: user.uid,
        studentName: studentDisplayName,
        studentEmail: user.email,
        subject: formData.subject,
        notes: formData.notes,
        sessionType: "IN_PERSON",
        status: "PENDING",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setShowModal(false);
      setFormData({ subject: "", notes: "", sessionType: "IN_PERSON" });
      setError("");
    } catch (err) {
      setError(err.message || "Failed to create session");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (sessionId) => {
    try {
      await updateDoc(doc(firestore, "sessions", sessionId), {
        status: "CANCELLED",
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to cancel session:", err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "ACCEPTED":
        return "bg-blue-100 text-blue-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-6">
      <header className="w-full flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 mb-6 border-b border-gray-200 pb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Writing Center - Student Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            {sessions.length === 0
              ? "No requests yet"
              : `${sessions.length} request${sessions.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="shrink-0 bg-indigo-600 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm sm:ml-auto"
        >
          Request Help
        </button>
      </header>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden w-full">
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No sessions yet. Click &quot;Request Help&quot; to get started.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {sessions.map((session) => {
              const formResponseUrl = getGoogleFormResponseUrl(session);
              return (
              <li key={session.id} className="w-full px-5 py-4 hover:bg-gray-50/50">
                <div className="flex w-full items-center gap-6 min-h-[3rem]">
                  <div className="flex flex-1 min-w-0 items-center gap-4 lg:gap-8 flex-wrap lg:flex-nowrap">
                    <span className="text-base font-semibold text-indigo-600 lg:flex-[2] min-w-0">
                      {session.subject}
                    </span>
                    <span
                      className={`shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}
                    >
                      {session.status}
                    </span>
                    <span className="shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                      {session.sessionType}
                    </span>
                    {session.source === "google_form" && (
                      <span className="shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                        Google Form
                      </span>
                    )}
                    <span className="text-sm text-gray-600 lg:flex-1 min-w-[10rem]">
                      <span className="text-gray-500">Tutor:</span>{" "}
                      {session.tutorName || "Not assigned yet"}
                    </span>
                    <span className="text-sm text-gray-500 shrink-0 lg:ml-auto">
                      {formatSessionDate(session.createdAt)}
                    </span>
                  </div>
                  {session.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => handleCancel(session.id)}
                      className="shrink-0 text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                {(session.notes ||
                  (isAsyncFormSession(session) && formResponseUrl) ||
                  (session.sessionType === "ASYNC" && session.asyncFileUrl) ||
                  (session.status === "COMPLETED" && session.proofFileUrl)) && (
                  <div className="mt-3 pl-0 flex flex-wrap gap-x-6 gap-y-2 text-sm border-t border-gray-100 pt-3">
                    {session.notes && (
                      <p className="text-gray-600 w-full">
                        <span className="font-medium text-gray-700">Notes:</span> {session.notes}
                      </p>
                    )}
                    {isAsyncFormSession(session) && formResponseUrl && (
                      <a
                        href={formResponseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View in Google Forms
                      </a>
                    )}
                    {session.sessionType === "ASYNC" && session.asyncFileUrl && (
                      <a
                        href={session.asyncFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View submitted document
                      </a>
                    )}
                    {session.status === "COMPLETED" && session.proofFileUrl && (
                      <a
                        href={session.proofFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View tutor feedback
                      </a>
                    )}
                  </div>
                )}
              </li>
            );
            })}
          </ul>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Request Writing Help
              </h3>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Session Type</label>
                    <div className="mt-2 flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="IN_PERSON"
                          checked={formData.sessionType === "IN_PERSON"}
                          onChange={(e) =>
                            setFormData({ ...formData, sessionType: e.target.value })
                          }
                          className="mr-2"
                        />
                        In-Person
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="ASYNC"
                          checked={formData.sessionType === "ASYNC"}
                          onChange={(e) =>
                            setFormData({ ...formData, sessionType: e.target.value })
                          }
                          className="mr-2"
                        />
                        Async (Google Form)
                      </label>
                    </div>
                  </div>

                  {formData.sessionType === "IN_PERSON" ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Subject</label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          value={formData.subject}
                          onChange={(e) =>
                            setFormData({ ...formData, subject: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Notes (optional)
                        </label>
                        <textarea
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          rows={3}
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="rounded-md border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                      <p className="font-medium mb-1">Submit on Google Forms</p>
                      <p>
                        Use the same email you use here ({user?.email}). After you submit the form,
                        your request will appear below for tutors—usually within a minute.
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormData({ subject: "", notes: "", sessionType: "IN_PERSON" });
                      setError("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? "Please wait…"
                      : formData.sessionType === "ASYNC"
                        ? "Open Google Form"
                        : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
