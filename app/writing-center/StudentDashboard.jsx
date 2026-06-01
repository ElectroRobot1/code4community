"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/utils/AuthContext";
import { firestore } from "@/firebase";
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from "firebase/firestore";

export default function StudentDashboard() {
  const [sessions, setSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    notes: '',
    sessionType: 'IN_PERSON',
    asyncFile: null
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user && firestore) {
      const q = query(collection(firestore, 'sessions'), where('studentId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSessions(sessionsData);
      }, (err) => {
        console.error('Failed to fetch sessions:', err);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const compressImage = (file, maxWidth = 1920, maxHeight = 1080, quality = 0.7) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (maxHeight / height) * width;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            file.type,
            quality
          );
        };
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setError('');
    setLoading(true);
    setIsSubmitting(true);

    try {
      await addDoc(collection(firestore, 'sessions'), {
        studentId: user.uid,
        studentName: user.displayName || user.email,
        studentEmail: user.email,
        subject: formData.subject,
        notes: formData.notes,
        sessionType: formData.sessionType,
        status: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setShowModal(false);
      setFormData({ subject: '', notes: '', sessionType: 'IN_PERSON', asyncFile: null });
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (sessionId) => {
    try {
      await updateDoc(doc(firestore, 'sessions', sessionId), {
        status: 'CANCELLED',
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to cancel session:', err);
    }
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Writing Center - Student Dashboard</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Request Help
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {sessions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No sessions yet. Click "Request Help" to get started.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <li key={session.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-indigo-600">{session.subject}</p>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        {session.sessionType}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {session.tutorName ? `Tutor: ${session.tutorName}` : 'No tutor assigned yet'}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                    {session.notes && (
                      <p className="mt-1 text-sm text-gray-600">{session.notes}</p>
                    )}
                    {session.status === 'COMPLETED' && session.sessionType === 'ASYNC' && session.proofFileUrl && (
                      <a
                        href={session.proofFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-indigo-600 hover:text-indigo-900"
                      >
                        View Tutor Feedback
                      </a>
                    )}
                  </div>
                  {session.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancel(session.id)}
                      className="ml-4 text-red-600 hover:text-red-900"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
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
                    <label className="block text-sm font-medium text-gray-700">Subject</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
                    <textarea
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Type</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="IN_PERSON"
                          checked={formData.sessionType === 'IN_PERSON'}
                          onChange={(e) => setFormData({ ...formData, sessionType: e.target.value })}
                          className="mr-2"
                        />
                        In-Person
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="ASYNC"
                          checked={formData.sessionType === 'ASYNC'}
                          onChange={(e) => setFormData({ ...formData, sessionType: e.target.value })}
                          className="mr-2"
                        />
                        Async
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormData({ subject: '', notes: '', sessionType: 'IN_PERSON', asyncFile: null });
                      setError('');
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
                    {loading ? 'Submitting...' : 'Submit Request'}
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
