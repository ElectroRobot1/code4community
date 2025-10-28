"use client";
import { useAuth } from "../../components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";
import Footer from "../../components/Footer";

export default function GradeCalculator() {
  const authContext = useAuth();
  const { user, userData, isEmailVerified, loading: authLoading } = authContext;
  const router = useRouter();
  
  const [pastedText, setPastedText] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [courseName, setCourseName] = useState("");
  const [currentGrade, setCurrentGrade] = useState("");
  const [currentPercent, setCurrentPercent] = useState(0);
  const [categoryWeights, setCategoryWeights] = useState({
    "Major Summative": 50,
    "Minor Summative": 30,
    "Graded Formative": 20,
    "Extra Credit": 0,
    "Other": 0
  });
  const [useWeightedGrading, setUseWeightedGrading] = useState(true);
  const [visibleCategories, setVisibleCategories] = useState({
    "Major Summative": true,
    "Minor Summative": true,
    "Graded Formative": true,
    "Extra Credit": true,
    "Other": true
  });
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterMenu && !event.target.closest('.filter-menu-container')) {
        setShowFilterMenu(false);
      }
    };

    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilterMenu]);

  // Check email verification status and redirect if needed
  useEffect(() => {
    if (userData && !isEmailVerified) {
      router.push('/verify-email?email=' + encodeURIComponent(userData.email));
    }
  }, [userData, isEmailVerified, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirectTo=/grade-calculator');
    }
  }, [user, authLoading, router]);

  const parseGradebook = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    let parsedCourseName = "";
    let parsedCurrentGrade = "";
    let parsedCurrentPercent = 0;
    const parsedAssignments = [];
    const parsedWeights = {};
    
    // Common navigation items to filter out
    const navigationItems = ['Home', 'Synergy', 'Mail', 'Calendar', 'Attendance', 'Class Schedule', 
                            'Course History', 'Grade Book', 'MTSS', 'School Information', 
                            'Student Info', 'Test History', 'Documents', 'Totals'];

    // Find course name and overall grade (appears early in the text)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for overall grade like "A- (91%)" or "A+ (100%)"
      // Try to find it in the header area
      if (i < 20) {
        const gradeMatch = line.match(/([A-F][+-]?)\s*(\d+)%/);
        if (gradeMatch && !parsedCurrentGrade) {
          parsedCurrentGrade = gradeMatch[1];
          parsedCurrentPercent = parseInt(gradeMatch[2]);
        }
      }

      // Look for course name (usually before "Marking Period")
      if (line.includes("Marking Period") && i > 0) {
        parsedCourseName = lines[i - 1].trim();
      }
    }
    
    // Parse Grade Calculation Summary for category weights
    let foundSummary = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes("Grade Calculation Summary")) {
        foundSummary = true;
        continue;
      }
      
      if (foundSummary) {
        // Stop parsing summary when we hit "Assignments" or a blank line
        if (line.includes("Assignments") || line.trim() === "") {
          foundSummary = false;
          continue;
        }
        
        // Skip TOTAL line
        if (line.includes("TOTAL")) {
          continue;
        }
        
        // Parse category weight lines: "Major Summative	60%	299.00	300.00"
        const weightMatch = line.match(/^([A-Za-z\s]+?)\s+(\d+)%\s+[\d.]+\s+[\d.]+$/);
        if (weightMatch) {
          const categoryName = weightMatch[1].trim();
          const weight = parseInt(weightMatch[2]);
          
          // Map to our category names
          if (categoryName.includes("Major Summative")) {
            parsedWeights["Major Summative"] = weight;
          } else if (categoryName.includes("Minor Summative")) {
            parsedWeights["Minor Summative"] = weight;
          } else if (categoryName.includes("Graded Formative")) {
            parsedWeights["Graded Formative"] = weight;
          }
        }
      }
    }
    
    // Also check the "Totals" section at the end for overall grade
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
      const line = lines[i];
      const gradeMatch = line.match(/([A-F][+-]?)\s*\((\d+)%\)/);
      if (gradeMatch) {
        parsedCurrentGrade = gradeMatch[1];
        parsedCurrentPercent = parseInt(gradeMatch[2]);
        break;
      }
    }

    // Parse assignments
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for date pattern MM/DD/YYYY
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
      
      if (dateMatch) {
        const date = dateMatch[1];
        let assignmentName = "";
        let category = "Other";
        let earned = 0;
        let possible = 0;
        let foundScore = false;
        
        // Check next few lines for assignment data
        const contextLines = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');
        
        // Extract assignment name (usually first text after date)
        const linesAfterDate = lines.slice(i + 1, i + 6);
        if (linesAfterDate.length > 0) {
          assignmentName = linesAfterDate[0].split(/\t|\s{2,}/)[0].trim();
        }
        
        // Skip if this is a navigation item or invalid entry
        if (navigationItems.includes(assignmentName)) {
          continue;
        }
        
        // Extract category
        const categoryMatch = contextLines.match(/(Major Summative|Minor Summative|Graded Formative)/);
        if (categoryMatch) {
          category = categoryMatch[1];
        }
        
        // Skip diagnostic formatives (not graded)
        if (category === "Diagnostic Formative" || contextLines.includes("Diagnostic Formative")) {
          continue;
        }
        
        // Try multiple score formats:
        
        // Format 1: Look for "Raw Score	X.XX/Y.YYY" or "Percentage	X.XX/Y.YYY" patterns
        const rawScoreLineMatch = contextLines.match(/(?:Raw\s+Score|Percentage)\s+(\d+\.?\d*)\/(\d+\.?\d*)/i);
        if (rawScoreLineMatch) {
          earned = parseFloat(rawScoreLineMatch[1]);
          possible = parseFloat(rawScoreLineMatch[2]);
          foundScore = true;
        }
        
        // Format 2: "X out of Y" - example: "15 out of 15.0000"
        if (!foundScore) {
          const outOfMatch = contextLines.match(/(\d+\.?\d*)\s+out\s+of\s+(\d+\.?\d*)/i);
          if (outOfMatch) {
            earned = parseFloat(outOfMatch[1]);
            possible = parseFloat(outOfMatch[2]);
            foundScore = true;
          }
        }
        
        // Format 3: Any "X/Y" - example: "15.00/15.0000" or "78.00/100.0000"
        if (!foundScore) {
          const rawScoreMatch = contextLines.match(/(\d+\.?\d*)\/(\d+\.?\d*)/);
          if (rawScoreMatch) {
            earned = parseFloat(rawScoreMatch[1]);
            possible = parseFloat(rawScoreMatch[2]);
            foundScore = true;
          }
        }
        
        // Format 4: Percentage with points total - example: "91% / 100"
        if (!foundScore) {
          const percentMatch = contextLines.match(/(\d+)%[\/\s]+(\d+)/);
          if (percentMatch) {
            const percent = parseFloat(percentMatch[1]);
            possible = parseFloat(percentMatch[2]);
            earned = (percent / 100) * possible;
            foundScore = true;
          }
        }
        
        // Format 5: Just percentage, infer 100 as total - example: "91%"
        if (!foundScore) {
          const justPercent = contextLines.match(/(\d+)%/);
          if (justPercent) {
            const percent = parseFloat(justPercent[1]);
            earned = percent;
            possible = 100;
            foundScore = true;
          }
        }
        
        // Only add if we found a valid score AND either have a category or assignment name
        if (foundScore && possible > 0 && (assignmentName || category !== "Other")) {
          // Filter out entries with very generic names that might be navigation
          if (assignmentName && assignmentName.length < 3) {
            continue;
          }
          
          parsedAssignments.push({
            id: parsedAssignments.length,
            date,
            name: assignmentName || `Assignment ${parsedAssignments.length + 1}`,
            category,
            earned: earned,
            possible: possible,
            originalEarned: earned,
            originalPossible: possible
          });
        }
      }
    }

    // If we couldn't find course name, try to find it elsewhere
    if (!parsedCourseName) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("Grade Book") && i + 1 < lines.length) {
          parsedCourseName = lines[i + 1].trim();
          break;
        }
      }
    }

    return {
      courseName: parsedCourseName || "Unknown Course",
      currentGrade: parsedCurrentGrade,
      currentPercent: parsedCurrentPercent,
      assignments: parsedAssignments,
      weights: parsedWeights
    };
  };

  const handleParse = () => {
    if (!pastedText.trim()) {
      alert("Please paste your gradebook data first");
      return;
    }
    
    const parsed = parseGradebook(pastedText);
    setCourseName(parsed.courseName);
    setCurrentGrade(parsed.currentGrade);
    setCurrentPercent(parsed.currentPercent);
    setAssignments(parsed.assignments);
    
    // Update category weights if found in the gradebook
    if (parsed.weights && Object.keys(parsed.weights).length > 0) {
      setCategoryWeights(prev => ({
        ...prev,
        ...parsed.weights
      }));
      setUseWeightedGrading(true);
    }
  };

  const updateAssignment = (id, field, value) => {
    setAssignments(assignments.map(a => 
      a.id === id 
        ? { ...a, [field]: value }
        : a
    ));
  };

  const updateAssignmentScore = (id, newEarned, newPossible) => {
    setAssignments(assignments.map(a => 
      a.id === id 
        ? { ...a, earned: newEarned, possible: newPossible }
        : a
    ));
  };

  const resetAssignment = (id) => {
    setAssignments(assignments.map(a => 
      a.id === id 
        ? { ...a, earned: a.originalEarned, possible: a.originalPossible }
        : a
    ));
  };

  const resetAll = () => {
    setAssignments(assignments.map(a => ({
      ...a,
      earned: a.originalEarned,
      possible: a.originalPossible
    })));
  };

  const addNewAssignment = () => {
    const indices = Date.now();
    const newAssignment = {
      id: indices,
      date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      name: "New Assignment",
      category: "Minor Summative",
      earned: 0,
      possible: 100,
      originalEarned: 0,
      originalPossible: 100
    };
    setAssignments([newAssignment, ...assignments]);
  };

  const deleteAssignment = (id) => {
    setAssignments(assignments.filter(a => a.id !== id));
  };

  // Calculate new grade based on edited assignments
  const calculateNewGrade = () => {
    if (assignments.length === 0) return 0;
    
    if (useWeightedGrading) {
      // Calculate weighted grade by category
      const categoryGroups = {};
      
      // Group assignments by category
      assignments.forEach(assignment => {
        if (!categoryGroups[assignment.category]) {
          categoryGroups[assignment.category] = { earned: 0, possible: 0 };
        }
        categoryGroups[assignment.category].earned += assignment.earned;
        categoryGroups[assignment.category].possible += assignment.possible;
      });
      
      // Calculate weighted average
      let totalWeightedScore = 0;
      let totalWeight = 0;
      
      Object.keys(categoryGroups).forEach(category => {
        const { earned, possible } = categoryGroups[category];
        const weight = categoryWeights[category] || 0;
        
        if (possible > 0 && weight > 0) {
          const categoryPercent = (earned / possible) * 100;
          totalWeightedScore += categoryPercent * weight;
          totalWeight += weight;
        }
      });
      
      const baseGrade = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
      // Add extra credit from assignments
      const extraCreditTotal = assignments
        .filter(a => a.category === "Extra Credit")
        .reduce((sum, a) => sum + (a.earned || 0), 0);
      
      return Math.min(100, Math.round(baseGrade + extraCreditTotal));
    } else {
      // Simple average (all points equal weight)
      const regularAssignments = assignments.filter(a => a.category !== "Extra Credit");
      const extraCreditTotal = assignments
        .filter(a => a.category === "Extra Credit")
        .reduce((sum, a) => sum + (a.earned || 0), 0);
      
      const totalEarned = regularAssignments.reduce((sum, a) => sum + a.earned, 0);
      const totalPossible = regularAssignments.reduce((sum, a) => sum + a.possible, 0);
      
      const baseGrade = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
      return Math.min(100, Math.round(baseGrade + extraCreditTotal));
    }
  };

  const getLetterGrade = (percent) => {
    if (percent >= 97) return "A+";
    if (percent >= 93) return "A";
    if (percent >= 90) return "A-";
    if (percent >= 87) return "B+";
    if (percent >= 83) return "B";
    if (percent >= 80) return "B-";
    if (percent >= 77) return "C+";
    if (percent >= 73) return "C";
    if (percent >= 70) return "C-";
    if (percent >= 67) return "D+";
    if (percent >= 63) return "D";
    if (percent >= 60) return "D-";
    return "F";
  };

  const hasChanges = assignments.some(a => a.earned !== a.originalEarned || a.possible !== a.originalPossible);
  const newPercent = calculateNewGrade();
  const newGrade = getLetterGrade(newPercent);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardTopBar title="Grade Calculator" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar title="Grade Calculator" />
      
      <div className="flex-1 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-6">Grade Calculator</h1>
          
          {/* Paste Area */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-foreground mb-2">
              Paste your gradebook data from Synergy:
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your gradebook data here... (Right-click and paste from the gradebook page)"
              className="w-full h-32 px-4 py-2 text-sm text-foreground bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
            />
            <button
              onClick={handleParse}
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Parse Grades
            </button>
          </div>

          {/* Results */}
          {assignments.length > 0 && (
            <div className="space-y-6">
              {/* Grade Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-elevated p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{courseName}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-muted-foreground">{currentGrade}</span>
                    <span className="text-xl text-muted-foreground">{currentPercent}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Current Grade</p>
                </div>
                
                {hasChanges && (
                  <div className="card-elevated p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Projected Grade</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-primary">{newGrade}</span>
                      <span className={`text-xl ${newPercent > currentPercent ? 'text-green-500' : newPercent < currentPercent ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {newPercent}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {newPercent > currentPercent 
                        ? `+${newPercent - currentPercent}% increase` 
                        : newPercent < currentPercent 
                        ? `${currentPercent - newPercent}% decrease`
                        : "No change"}
                    </p>
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex gap-3">
                {hasChanges && (
                  <button
                    onClick={resetAll}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
                  >
                    Reset All Changes
                  </button>
                )}
                <button
                  onClick={addNewAssignment}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  + Add Assignment
                </button>
              </div>

              {/* Assignments Table */}
              <div className="card-elevated rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Assignment</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground relative">
                          <div className="flex items-center gap-2 filter-menu-container">
                            Category
                            <button
                              onClick={() => setShowFilterMenu(!showFilterMenu)}
                              className="relative text-muted-foreground hover:text-foreground transition-colors"
                              title="Filter categories"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                              </svg>
                            </button>
                            
                            {/* Filter Menu */}
                            {showFilterMenu && (
                              <div className="absolute left-0 top-full mt-2 w-48 bg-background border border-border rounded-md shadow-lg z-50">
                                <div className="p-2 space-y-1">
                                  {Object.keys(visibleCategories).map(category => (
                                    <label key={category} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 rounded cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={visibleCategories[category]}
                                        onChange={(e) => setVisibleCategories({
                                          ...visibleCategories,
                                          [category]: e.target.checked
                                        })}
                                        className="w-4 h-4"
                                      />
                                      <span className="text-sm text-foreground">{category}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Score</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Possible</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground">%</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.filter(assignment => visibleCategories[assignment.category]).map((assignment) => {
                        const percent = assignment.possible > 0 
                          ? Math.round((assignment.earned / assignment.possible) * 100) 
                          : 0;
                        const isChanged = assignment.earned !== assignment.originalEarned || assignment.possible !== assignment.originalPossible;
                        
                        return (
                          <tr key={assignment.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-sm text-foreground">{assignment.date}</td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={assignment.name}
                                onChange={(e) => updateAssignment(assignment.id, 'name', e.target.value)}
                                className="w-full px-2 py-1 text-sm text-foreground bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={assignment.category}
                                onChange={(e) => updateAssignment(assignment.id, 'category', e.target.value)}
                                className="w-full px-2 py-1 text-sm text-foreground bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                              >
                                <option value="Major Summative">Major Summative</option>
                                <option value="Minor Summative">Minor Summative</option>
                                <option value="Graded Formative">Graded Formative</option>
                                <option value="Extra Credit">Extra Credit</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={assignment.earned}
                                onChange={(e) => updateAssignmentScore(assignment.id, parseFloat(e.target.value) || 0, assignment.possible)}
                                className={`w-20 px-2 py-1 text-sm text-foreground bg-background border border-border rounded ${isChanged ? 'border-primary ring-1 ring-primary' : 'focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary'}`}
                                step="0.01"
                                min="0"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={assignment.possible}
                                onChange={(e) => updateAssignmentScore(assignment.id, assignment.earned, parseFloat(e.target.value) || 0)}
                                className={`w-20 px-2 py-1 text-sm text-foreground bg-background border border-border rounded ${isChanged ? 'border-primary ring-1 ring-primary' : 'focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary'}`}
                                step="0.01"
                                min="0"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-foreground">{percent}%</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {isChanged && (
                                  <button
                                    onClick={() => resetAssignment(assignment.id)}
                                    className="text-sm text-primary hover:text-primary/80"
                                  >
                                    Reset
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteAssignment(assignment.id)}
                                  className="text-sm text-red-500 hover:text-red-600"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
