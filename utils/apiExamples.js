// Example usage of the API client with App Check tokens
// This file demonstrates how to use the apiClient utility for making secure API calls

import { apiRequest, apiPost, apiGet, apiUpload } from './apiClient';

// Example: Making a GET request to an API endpoint
export async function fetchUserData(userId) {
  try {
    const response = await apiGet(`/api/users/${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw error;
  }
}

// Example: Making a POST request to an API endpoint
export async function createTutoringRequest(requestData) {
  try {
    const response = await apiPost('/api/tutoring-requests', requestData);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to create tutoring request:', error);
    throw error;
  }
}

// Example: Uploading a file with App Check protection
export async function uploadProfilePicture(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiUpload('/api/upload', formData);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to upload profile picture:', error);
    throw error;
  }
}

// Example: Making a custom API request with specific headers
export async function updateUserProfile(profileData) {
  try {
    const response = await apiRequest('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
      headers: {
        'X-Custom-Header': 'some-value'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw error;
  }
}
