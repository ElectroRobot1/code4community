"use client";

import { useState, useRef, useEffect } from "react";
import StudentRosterManager from "./StudentRosterManager";
import ConstraintEngine from "./ConstraintEngine";
import GroupingAlgorithm from "./GroupingAlgorithm";
import GroupDisplay from "./GroupDisplay";
import ExportTools from "./ExportTools";
import ClassManager from "./ClassManager";

export default function GroupGenerator() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [constraints, setConstraints] = useState({
    hardBlocks: [], // [[student1, student2], ...]
    buddyPairs: [], // [[student1, student2], ...]
    avoidPrevious: false,
    previousGroups: []
  });
  const [groupingConfig, setGroupingConfig] = useState({
    mode: "byNumber", // "byNumber" or "bySize"
    numberOfGroups: 4,
    studentsPerGroup: 4,
    strategy: "balanced", // "balanced", "homogeneous", "heterogeneous", "random"
    balanceSkills: true,
    balancePerformance: true,
    balanceDiversity: false
  });
  const [activeTab, setActiveTab] = useState("roster");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);

  // Load current class and its students on mount
  useEffect(() => {
    const savedCurrentClass = localStorage.getItem('currentClass');
    if (savedCurrentClass) {
      const classData = JSON.parse(savedCurrentClass);
      setCurrentClass(classData);
      
      // Load the class roster
      const rosterKey = `classRoster-${classData.id}`;
      const savedRoster = localStorage.getItem(rosterKey);
      if (savedRoster) {
        setStudents(JSON.parse(savedRoster));
      }
    }
  }, []);

  // Save students to localStorage whenever they change (for current class)
  useEffect(() => {
    if (currentClass) {
      const rosterKey = `classRoster-${currentClass.id}`;
      localStorage.setItem(rosterKey, JSON.stringify(students));
      
      // Update the class's last modified time in localStorage without updating state
      const updatedClass = {
        ...currentClass,
        students: students,
        lastModified: new Date().toISOString()
      };
      localStorage.setItem('currentClass', JSON.stringify(updatedClass));
    }
  }, [students]);

  const handleStudentsUpdate = (newStudents) => {
    setStudents(newStudents);
    setGroups([]);
  };

  const handleConstraintsUpdate = (newConstraints) => {
    setConstraints(newConstraints);
    setGroups([]);
  };

  const handleConfigUpdate = (newConfig) => {
    setGroupingConfig(newConfig);
    setGroups([]);
  };

  const handleClassSelect = (classItem) => {
    setCurrentClass(classItem);
    localStorage.setItem('currentClass', JSON.stringify(classItem));
    
    // Load the class's roster
    const rosterKey = `classRoster-${classItem.id}`;
    const savedRoster = localStorage.getItem(rosterKey);
    if (savedRoster) {
      setStudents(JSON.parse(savedRoster));
    } else {
      setStudents([]);
    }
    
    // Reset groups when switching classes
    setGroups([]);
    setActiveTab("roster");
  };

  const handleClassCreate = (newClass) => {
    setCurrentClass(newClass);
    localStorage.setItem('currentClass', JSON.stringify(newClass));
    setStudents([]);
    setGroups([]);
    setActiveTab("roster");
  };

  const generateGroups = async () => {
    if (students.length === 0) {
      alert("Please add students first!");
      return;
    }

    setIsGenerating(true);
    try {
      // Simulate processing time for complex algorithm
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newGroups = GroupingAlgorithm.generate(
        students,
        constraints,
        groupingConfig
      );
      
      setGroups(newGroups);
      setActiveTab("results");
    } catch (error) {
      console.error("Error generating groups:", error);
      alert("Error generating groups. Please check your constraints and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStudentSwap = (fromGroup, fromIndex, toGroup, toIndex) => {
    const newGroups = [...groups];
    const temp = newGroups[fromGroup].members[fromIndex];
    newGroups[fromGroup].members[fromIndex] = newGroups[toGroup].members[toIndex];
    newGroups[toGroup].members[toIndex] = temp;
    setGroups(newGroups);
  };

  const handleStudentAbsence = (studentId) => {
    const newStudents = students.map(s => 
      s.id === studentId ? { ...s, absent: true } : s
    );
    setStudents(newStudents);
    
    // Regenerate groups if needed
    if (groups.length > 0) {
      generateGroups();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Group Generator</h1>
          <p className="text-gray-600">
            Create balanced student groups with smart constraints and flexible configurations
          </p>
        </div>

        {/* Class Management */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <ClassManager
            currentClass={currentClass}
            onClassSelect={handleClassSelect}
            onClassCreate={handleClassCreate}
          />
        </div>

        {/* Current Class Indicator */}
        {currentClass && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-blue-900">Current Class: {currentClass.name}</h3>
                <p className="text-sm text-blue-700">{students.length} students in roster</p>
              </div>
              <div className="text-sm text-blue-600">
                Last modified: {new Date(currentClass.lastModified).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: "roster", label: "Student Roster", icon: "👥" },
                { id: "constraints", label: "Constraints", icon: "⚙️" },
                { id: "config", label: "Group Settings", icon: "🔧" },
                { id: "results", label: "Results", icon: "📊" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "roster" && (
              <StudentRosterManager
                students={students}
                onStudentsUpdate={handleStudentsUpdate}
              />
            )}

            {activeTab === "constraints" && (
              <ConstraintEngine
                students={students}
                constraints={constraints}
                onConstraintsUpdate={handleConstraintsUpdate}
              />
            )}

            {activeTab === "config" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Group Configuration</h3>
                
                {/* Group Size/Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grouping Mode
                    </label>
                    <select
                      value={groupingConfig.mode}
                      onChange={(e) => handleConfigUpdate({
                        ...groupingConfig,
                        mode: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="byNumber">Number of Groups</option>
                      <option value="bySize">Students per Group</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {groupingConfig.mode === "byNumber" ? "Number of Groups" : "Students per Group"}
                    </label>
                    <input
                      type="number"
                      min="2"
                      max={groupingConfig.mode === "byNumber" ? 10 : 8}
                      value={groupingConfig.mode === "byNumber" ? (groupingConfig.numberOfGroups || 4) : (groupingConfig.studentsPerGroup || 4)}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 4;
                        handleConfigUpdate({
                          ...groupingConfig,
                          [groupingConfig.mode === "byNumber" ? "numberOfGroups" : "studentsPerGroup"]: value
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Grouping Strategy */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grouping Strategy
                  </label>
                  <select
                    value={groupingConfig.strategy}
                    onChange={(e) => handleConfigUpdate({
                      ...groupingConfig,
                      strategy: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="balanced">Balanced Groups</option>
                    <option value="heterogeneous">Heterogeneous (Mixed Levels)</option>
                    <option value="homogeneous">Homogeneous (Similar Levels)</option>
                    <option value="random">Random</option>
                  </select>
                </div>

                {/* Balance Options */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Balance Options</h4>
                  <div className="space-y-2">
                    {[
                      { key: "balanceSkills", label: "Balance Skills/Roles" },
                      { key: "balancePerformance", label: "Balance Academic Performance" },
                      { key: "balanceDiversity", label: "Balance Diversity Factors" }
                    ].map((option) => (
                      <label key={option.key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={groupingConfig[option.key]}
                          onChange={(e) => handleConfigUpdate({
                            ...groupingConfig,
                            [option.key]: e.target.checked
                          })}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="pt-4">
                  <button
                    onClick={generateGroups}
                    disabled={isGenerating || students.length === 0}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isGenerating ? "Generating Groups..." : "Generate Groups"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "results" && (
              <GroupDisplay
                groups={groups}
                students={students}
                constraints={constraints}
                onStudentSwap={handleStudentSwap}
                onStudentAbsence={handleStudentAbsence}
                onRegenerate={generateGroups}
              />
            )}
          </div>
        </div>

        {/* Export Tools */}
        {groups.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <ExportTools groups={groups} students={students} />
          </div>
        )}
      </div>
    </div>
  );
}
