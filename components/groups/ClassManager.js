"use client";

import { useState, useEffect } from "react";

export default function ClassManager({ currentClass, onClassSelect, onClassCreate }) {
  const [classes, setClasses] = useState([]);
  const [newClassName, setNewClassName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadClassesFromStorage = () => {
    const savedClasses = localStorage.getItem("schoologyClasses");
    if (savedClasses) {
      setClasses(JSON.parse(savedClasses));
    }
  };

  // Load classes from localStorage on mount
  useEffect(() => {
    loadClassesFromStorage();
  }, []);

  // Refresh list when roster sync updates schoologyClasses (see GroupGenerator)
  useEffect(() => {
    const onSync = () => loadClassesFromStorage();
    window.addEventListener("c4c-schoology-classes-updated", onSync);
    return () => window.removeEventListener("c4c-schoology-classes-updated", onSync);
  }, []);

  // Save classes to localStorage whenever they change
  useEffect(() => {
    if (classes.length > 0) {
      localStorage.setItem('schoologyClasses', JSON.stringify(classes));
    }
  }, [classes]);

  const handleCreateClass = () => {
    if (!newClassName.trim()) return;

    const newClass = {
      id: `class-${Date.now()}`,
      name: newClassName.trim(),
      students: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    setClasses([...classes, newClass]);
    setNewClassName("");
    setShowCreateForm(false);
    onClassCreate(newClass);
  };

  const handleSelectClass = (classItem) => {
    onClassSelect(classItem);
  };

  const handleDeleteClass = (classId) => {
    const updatedClasses = classes.filter(c => c.id !== classId);
    setClasses(updatedClasses);
    
    // Also delete the class roster from storage
    const rosterKey = `classRoster-${classId}`;
    localStorage.removeItem(rosterKey);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Classes</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          {showCreateForm ? 'Cancel' : '+ New Class'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <input
            type="text"
            placeholder="Enter class name (e.g., English 10H)"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateClass()}
          />
          <button
            onClick={handleCreateClass}
            disabled={!newClassName.trim()}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Class
          </button>
        </div>
      )}

      <div className="space-y-2">
        {classes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No classes yet. Create your first class to get started.</p>
          </div>
        ) : (
          classes.map((classItem) => (
            <div
              key={classItem.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                currentClass?.id === classItem.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleSelectClass(classItem)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{classItem.name}</h4>
                  <p className="text-sm text-gray-600">
                    {classItem.students?.length || 0} students
                  </p>
                  <p className="text-xs text-gray-400">
                    Last modified: {new Date(classItem.lastModified).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClass(classItem.id);
                  }}
                  className="text-red-500 hover:text-red-700 text-sm ml-2"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
