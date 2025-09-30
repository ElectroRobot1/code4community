"use client";
import { useState, useEffect } from 'react';
import { getAppCheckToken } from '@/utils/apiClient';
import { apiGet, apiPost } from '@/utils/apiClient';

export default function DebugAppCheckPage() {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkAppCheckToken();
  }, []);

  const checkAppCheckToken = async () => {
    try {
      console.log('Checking App Check token...');
      const token = await getAppCheckToken();
      
      if (token) {
        // Decode the token to see its contents
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          setTokenInfo({
            hasToken: true,
            token: token.substring(0, 20) + '...',
            payload: payload,
            exp: new Date(payload.exp * 1000).toISOString(),
            iss: payload.iss
          });
        } else {
          setTokenInfo({
            hasToken: true,
            token: token.substring(0, 20) + '...',
            payload: null,
            error: 'Invalid token format'
          });
        }
      } else {
        setTokenInfo({
          hasToken: false,
          error: 'No token available'
        });
      }
    } catch (error) {
      console.error('Error checking App Check token:', error);
      setTokenInfo({
        hasToken: false,
        error: error.message
      });
    }
  };

  const testApiCalls = async () => {
    setIsLoading(true);
    setTestResults(null);

    try {
      console.log('Testing API calls...');
      
      // Test GET request
      const getResponse = await apiGet('/api/test-appcheck');
      const getData = await getResponse.json();

      // Test POST request
      const postResponse = await apiPost('/api/test-appcheck', { test: true });
      const postData = await postResponse.json();

      setTestResults({
        success: true,
        getTest: {
          status: getResponse.status,
          ok: getResponse.ok,
          data: getData
        },
        postTest: {
          status: postResponse.status,
          ok: postResponse.ok,
          data: postData
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('API test failed:', error);
      setTestResults({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">App Check Debug Page</h1>
        
        {/* Token Information */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">App Check Token Status</h2>
          <button
            onClick={checkAppCheckToken}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
          >
            Check Token
          </button>
          
          {tokenInfo && (
            <div className="bg-gray-100 p-4 rounded">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(tokenInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* API Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API Test</h2>
          <button
            onClick={testApiCalls}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 mb-4"
          >
            {isLoading ? 'Testing...' : 'Test API Calls'}
          </button>
          
          {testResults && (
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-medium mb-2">
                {testResults.success ? '✅ Test Results' : '❌ Test Failed'}
              </h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Debug Instructions</h3>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Check the browser console for detailed logs</li>
            <li>If no token is available, check Firebase App Check configuration</li>
            <li>Make sure reCAPTCHA v3 is properly configured</li>
            <li>Verify the domain is registered in Firebase Console</li>
            <li>Check that App Check is enabled in your Firebase project</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
