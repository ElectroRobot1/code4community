"use client";

import { useState } from "react";

export default function ExportTools({ groups, students }) {
  const [includeDetails, setIncludeDetails] = useState(true);

  const generatePrintableCards = () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Group Cards</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .card { 
            border: 2px solid #333; 
            margin: 20px; 
            padding: 20px; 
            width: 300px; 
            height: 200px; 
            page-break-inside: avoid;
            display: inline-block;
            vertical-align: top;
          }
          .card-header { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 15px; 
            text-align: center;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
          }
          .student-list { margin: 10px 0; }
          .student { margin: 5px 0; font-size: 14px; }
          .performance-high { color: #28a745; font-weight: bold; }
          .performance-medium { color: #ffc107; font-weight: bold; }
          .performance-low { color: #dc3545; font-weight: bold; }
          @media print {
            .card { margin: 10px; padding: 15px; }
          }
        </style>
      </head>
      <body>
        <h1>Student Group Cards</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        ${groups.map(group => `
          <div class="card">
            <div class="card-header">${group.name}</div>
            <div class="student-list">
              ${group.members.map(student => `
                <div class="student">
                  <strong>${student.name}</strong>
                  ${includeDetails ? `
                    <br>
                    <span class="performance-${student.performance}">${student.performance}</span>
                    ${student.skills && student.skills.length > 0 ? 
                      `<br><small>Skills: ${student.skills.join(", ")}</small>` : ""
                    }
                  ` : ""}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const generateSlideDeck = () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Group Presentation</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0;
            background: white;
          }
          .slide { 
            width: 100vw; 
            height: 100vh; 
            page-break-after: always;
            display: flex;
            flex-direction: column;
            padding: 40px;
            box-sizing: border-box;
          }
          .slide-header { 
            font-size: 36px; 
            font-weight: bold; 
            margin-bottom: 30px; 
            text-align: center;
            color: #2c3e50;
          }
          .groups-container { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 30px; 
            justify-content: center;
            flex: 1;
          }
          .group-card { 
            border: 3px solid #3498db; 
            border-radius: 10px;
            padding: 20px; 
            min-width: 250px;
            background: #ecf0f1;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .group-title { 
            font-size: 20px; 
            font-weight: bold; 
            margin-bottom: 15px; 
            text-align: center;
            color: #2c3e50;
            background: #3498db;
            color: white;
            padding: 10px;
            border-radius: 5px;
            margin: -20px -20px 15px -20px;
          }
          .student { 
            margin: 8px 0; 
            font-size: 16px;
            padding: 5px;
            background: white;
            border-radius: 3px;
          }
          .summary { 
            text-align: center; 
            margin-top: 20px; 
            font-size: 18px;
            color: #7f8c8d;
          }
        </style>
      </head>
      <body>
        ${groups.map((group, index) => `
          <div class="slide">
            <div class="slide-header">Group ${index + 1}</div>
            <div class="groups-container">
              ${groups.map(g => `
                <div class="group-card">
                  <div class="group-title">${g.name}</div>
                  ${g.members.map(student => `
                    <div class="student">
                      <strong>${student.name}</strong>
                      ${includeDetails ? `<br><small>${student.performance}</small>` : ""}
                    </div>
                  `).join('')}
                </div>
              `).join('')}
            </div>
            <div class="summary">
              Total Groups: ${groups.length} | Active Students: ${students.filter(s => !s.absent).length}
            </div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const generateEmailList = () => {
    const emailContent = groups.map(group => 
      `${group.name}:\n${group.members.map(student => 
        `  - ${student.name} (${student.performance})`
      ).join('\n')}`
    ).join('\n\n');

    const fullContent = `Student Groups - ${new Date().toLocaleDateString()}\n\n${emailContent}\n\nTotal: ${groups.length} groups, ${students.filter(s => !s.absent).length} students`;

    downloadFile(fullContent, "group-email-list.txt", "text/plain");
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Export & Communication</h3>
      
      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Printable Cards */}
        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center mb-3">
            <div className="text-2xl mr-3">🎴</div>
            <div>
              <h4 className="font-medium text-gray-900">Printable Cards</h4>
              <p className="text-sm text-gray-600">Physical cards for classroom display</p>
            </div>
          </div>
          <button
            type="button"
            onClick={generatePrintableCards}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Generate Cards
          </button>
        </div>

        {/* Slide Deck */}
        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center mb-3">
            <div className="text-2xl mr-3">📊</div>
            <div>
              <h4 className="font-medium text-gray-900">Presentation Slides</h4>
              <p className="text-sm text-gray-600">Slide-ready format for class display</p>
            </div>
          </div>
          <button
            type="button"
            onClick={generateSlideDeck}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Generate Slides
          </button>
        </div>

        {/* Email List */}
        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center mb-3">
            <div className="text-2xl mr-3">📧</div>
            <div>
              <h4 className="font-medium text-gray-900">Email List</h4>
              <p className="text-sm text-gray-600">Formatted list for communication</p>
            </div>
          </div>
          <button
            type="button"
            onClick={generateEmailList}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Generate Email List
          </button>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Export Options</h4>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={includeDetails}
            onChange={(e) => setIncludeDetails(e.target.checked)}
            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">
            Include student details (email, performance, skills) in exports
          </span>
        </label>
      </div>

      {/* Quick Stats */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Export Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{groups.length}</div>
            <div className="text-blue-700">Groups</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{students.length}</div>
            <div className="text-blue-700">Total Students</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">
              {students.filter(s => !s.absent).length}
            </div>
            <div className="text-blue-700">Active Students</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">
              {Math.round(students.filter(s => !s.absent).length / groups.length)}
            </div>
            <div className="text-blue-700">Avg Group Size</div>
          </div>
        </div>
      </div>
    </div>
  );
}
