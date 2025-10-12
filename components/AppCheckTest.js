"use client";
import { useState } from 'react';
import { apiGet, apiPost } from '@/utils/apiClient';

export default function AppCheckTest() {
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const testAppCheck = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // Test GET request
      const getResponse = await apiGet('/api/test-appcheck');
      const getData = await getResponse.json();

      // Test POST request
      const postResponse = await apiPost('/api/test-appcheck', { test: true });
      const postData = await postResponse.json();

      setTestResult({
        success: true,
        getTest: {
          status: getResponse.status,
          data: getData
        },
        postTest: {
          status: postResponse.status,
          data: postData
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">App Check Test</h3>
      
      <button
        onClick={testAppCheck}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? 'Testing...' : 'Test App Check'}
      </button>

      {testResult && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h4 className="font-medium mb-2">
            {testResult.success ? '✅ Test Passed' : '❌ Test Failed'}
          </h4>
          
          <pre className="text-sm overflow-auto">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
