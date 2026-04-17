"use client";

import { useState } from "react";

export default function GroupDisplay({ groups, students, constraints, onStudentSwap, onToggleStudentAbsent, onRegenerate }) {
  const [draggedStudent, setDraggedStudent] = useState(null);
  const [draggedFromGroup, setDraggedFromGroup] = useState(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState(null);

  const handleDragStart = (student, groupIndex, studentIndex) => {
    setDraggedStudent(student);
    setDraggedFromGroup(groupIndex);
    setDraggedFromIndex(studentIndex);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetGroupIndex, targetStudentIndex) => {
    e.preventDefault();
    
    if (draggedStudent && draggedFromGroup !== null && draggedFromIndex !== null) {
      onStudentSwap(draggedFromGroup, draggedFromIndex, targetGroupIndex, targetStudentIndex);
    }
    
    setDraggedStudent(null);
    setDraggedFromGroup(null);
    setDraggedFromIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedStudent(null);
    setDraggedFromGroup(null);
    setDraggedFromIndex(null);
  };

  const getConstraintViolations = (group) => {
    return group.constraints || [];
  };

  const getBalanceScore = (group) => {
    if (!group.balance) return { score: 100, status: 'good' };
    
    const avgBalance = (
      (group.balance.performance || 0) + 
      (group.balance.gender || 0) + 
      (group.balance.skills || 0) + 
      (group.balance.diversity || 0)
    ) / 4;
    
    const score = Math.round((1 - avgBalance) * 100);
    
    let status = 'good';
    if (score < 70) status = 'poor';
    else if (score < 85) status = 'fair';
    
    return { score, status };
  };

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">Groups</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Groups Generated Yet</h3>
        <p className="text-gray-600 mb-6">
          Configure your students and constraints, then generate groups to see results here.
        </p>
        <button
          onClick={onRegenerate}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Generate Groups
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Generated Groups</h3>
        <div className="flex space-x-3">
          <button
            onClick={onRegenerate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group, groupIndex) => {
          const violations = getConstraintViolations(group);
          const balanceScore = getBalanceScore(group);
          const hasViolations = violations.length > 0;
          
          return (
            <div
              key={group.id}
              className={`border rounded-lg p-4 ${
                hasViolations 
                  ? 'border-red-300 bg-red-50' 
                  : balanceScore.status === 'good'
                  ? 'border-green-300 bg-green-50'
                  : balanceScore.status === 'fair'
                  ? 'border-yellow-300 bg-yellow-50'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {/* Group Header */}
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-900">{group.name}</h4>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    balanceScore.status === 'good' ? 'bg-green-100 text-green-700' :
                    balanceScore.status === 'fair' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {balanceScore.score}% Balanced
                  </span>
                  <span className="text-sm text-gray-600">
                    {group.size} members
                  </span>
                </div>
              </div>

              {/* Constraint Violations */}
              {hasViolations && (
                <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                  <h5 className="text-sm font-medium text-red-800 mb-2">Constraint Violations:</h5>
                  <div className="space-y-1">
                    {violations.map((violation, index) => (
                      <div key={index} className="text-xs text-red-700">
                        {violation.type === 'hardBlock' && (
                          <span>?? Hard Block: Students should not be together</span>
                        )}
                        {violation.type === 'buddyPair' && (
                          <span>?? Buddy Pair: Students should be together</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Students List */}
              <div className="space-y-2">
                {group.members.map((student, studentIndex) => (
                  <div
                    key={student?.id || studentIndex}
                    draggable
                    onDragStart={() => handleDragStart(student, groupIndex, studentIndex)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, groupIndex, studentIndex)}
                    onDragEnd={handleDragEnd}
                    className={`p-3 border rounded-lg cursor-move transition-colors ${
                      draggedStudent?.id === student?.id
                        ? 'opacity-50 border-blue-400'
                        : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{student?.name || 'Unknown Student'}</h5>
                        
                        {/* Student Attributes */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            student?.performance === 'high' ? 'bg-green-100 text-green-700' :
                            student?.performance === 'low' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {student?.performance || 'medium'}
                          </span>
                          
                          {student?.skills && student.skills.length > 0 && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                              {student.skills.length} skills
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-1 ml-2">
                        <button
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStudentAbsent(student?.id);
                          }}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            student?.absent
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {student?.absent ? 'Mark present' : 'Mark absent'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Drop Zone */}
              <div
                className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-sm"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, groupIndex, group.members.length)}
              >
                Drop student here to add to {group.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Group Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{groups.length}</div>
            <div className="text-gray-600">Total Groups</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {students.filter(s => !s.absent).length}
            </div>
            <div className="text-gray-600">Active Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {groups.filter(g => g.constraints?.length === 0).length}
            </div>
            <div className="text-gray-600">Valid Groups</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(groups.reduce((sum, g) => sum + getBalanceScore(g).score, 0) / groups.length)}%
            </div>
            <div className="text-gray-600">Avg Balance</div>
          </div>
        </div>
      </div>
    </div>
  );
}
