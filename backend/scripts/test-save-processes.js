const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration
// Use our local test server
const API_URL = 'http://localhost:3001/api';
// Other options:
// const API_URL = 'https://wms-tutorial.netlify.app/.netlify/functions';
// const API_URL = 'http://localhost:8888/.netlify/functions';
let TEST_TOKEN = 'test-token'; // Will be replaced with generated token

// Mock localStorage for simulating frontend environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  clear() {
    this.store = {};
  }
}

// Create mock localStorage
const localStorage = new LocalStorageMock();

// Sample process data for testing
const sampleProcesses = [
  {
    id: 'test-process-1',
    title: 'Test Process 1',
    description: 'A test process for API testing',
    category: 'Test',
    steps: [
      {
        id: 'step-1',
        title: 'Step 1',
        description: 'This is step 1'
      },
      {
        id: 'step-2',
        title: 'Step 2',
        description: 'This is step 2'
      }
    ]
  },
  {
    id: 'test-process-2',
    title: 'Test Process 2',
    description: 'Another test process',
    category: 'Test',
    steps: [
      {
        id: 'step-1',
        title: 'Step 1',
        description: 'First step of process 2'
      }
    ]
  }
];

// Mock user data
const mockUser = {
  id: 'test-user-id',
  username: 'testuser',
  role: 'admin'
};

// Simulate the frontend saveProcesses function from storageService.js
async function simulateFrontendSaveProcesses() {
  try {
    console.log('\n=== SIMULATING FRONTEND SAVE PROCESSES ===');
    
    // First save to localStorage (as our frontend does)
    console.log('1. Saving processes to localStorage first...');
    const safeProcesses = JSON.parse(JSON.stringify(sampleProcesses)); // Deep copy
    localStorage.setItem('wms_processes', JSON.stringify(safeProcesses));
    console.log('✅ Successfully saved to localStorage');
    
    // Get the authentication token
    const token = localStorage.getItem('wms_token');
    if (!token) {
      console.log('⚠️ No authentication token available, would skip API save in frontend');
      console.log('Using test token for this test...');
    }
    
    // Get the current user information
    const userJson = localStorage.getItem('wms_current_user');
    let user = null;
    if (userJson) {
      try {
        user = JSON.parse(userJson);
        console.log('Current user for process save:', user.username);
      } catch (e) {
        console.warn('Error parsing current user:', e);
      }
    } else {
      console.log('No user in localStorage, using mock user');
      user = mockUser;
    }
    
    console.log('2. Attempting to save processes to database API...');
    const response = await fetch(`${API_URL}/saveProcesses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify({ 
        processes: safeProcesses,
        // Include user metadata to help with backend processing
        metadata: {
          userId: user?.id || 'unknown',
          username: user?.username || 'unknown',
          timestamp: new Date().toISOString()
        }
      })
    });
    
    // Check if the response is ok
    if (!response.ok) {
      const errorData = await response.json();
      console.log(`❌ API save failed with status ${response.status}:`, errorData);
      console.log('⚠️ In frontend, this would be fine since data is already in localStorage');
      return { success: false, error: errorData };
    }
    
    // Get the successful response data
    const responseData = await response.json();
    console.log('✅ API save successful:', responseData);
    return responseData;
  } catch (error) {
    console.error('❌ Error in frontend save process simulation:', error.message);
    console.log('⚠️ In frontend, this would be fine since data is already in localStorage');
    return { success: false, error: error.message };
  }
}

// Simulate the frontend loadProcesses function from storageService.js
async function simulateFrontendLoadProcesses() {
  try {
    console.log('\n=== SIMULATING FRONTEND LOAD PROCESSES ===');
    
    // First check localStorage (as our frontend does)
    console.log('1. Checking localStorage first...');
    const localData = localStorage.getItem('wms_processes');
    if (localData) {
      console.log('✅ Found processes in localStorage');
      try {
        const parsedData = JSON.parse(localData);
        console.log(`Found ${parsedData.length} processes in localStorage`);
      } catch (e) {
        console.warn('Error parsing localStorage data:', e);
      }
    } else {
      console.log('⚠️ No processes found in localStorage');
    }
    
    // Get the authentication token
    const token = localStorage.getItem('wms_token');
    if (!token) {
      console.log('⚠️ No authentication token available, would use localStorage data only in frontend');
      console.log('Using test token for this test...');
    }
    
    console.log('2. Attempting to load processes from database API...');
    const response = await fetch(`${API_URL}/getProcesses`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    // Check if the response is ok
    if (!response.ok) {
      const errorData = await response.json();
      console.log(`❌ API load failed with status ${response.status}:`, errorData);
      console.log('⚠️ In frontend, this would fall back to localStorage data');
      return { success: false, error: errorData };
    }
    
    // Get the successful response data
    const responseData = await response.json();
    console.log('✅ API load successful');
    console.log(`Loaded ${responseData.processes?.length || 0} processes from API`);
    
    // In frontend, we would update localStorage with the API data
    console.log('3. Updating localStorage with API data...');
    localStorage.setItem('wms_processes', JSON.stringify(responseData.processes || []));
    console.log('✅ Updated localStorage with API data');
    
    return responseData;
  } catch (error) {
    console.error('❌ Error in frontend load process simulation:', error.message);
    console.log('⚠️ In frontend, this would fall back to localStorage data');
    return { success: false, error: error.message };
  }
}

// Generate a JWT token for testing (simplified version)
function generateTestToken() {
  // Create a simple payload
  const payload = {
    id: mockUser.id,
    username: mockUser.username,
    role: mockUser.role,
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiration
  };
  
  // Convert to base64
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  
  // Create a simple JWT (header.payload.signature)
  // Note: This is NOT a secure JWT, just for testing
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64Payload}.test-signature`;
}

// Test direct API calls without frontend simulation
async function testDirectApiCalls() {
  console.log('\n=== TESTING DIRECT API CALLS ===');
  
  // Test saveProcesses API directly
  console.log('\n1. Testing saveProcesses API directly...');
  try {
    const response = await fetch(`${API_URL}/saveProcesses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify({
        processes: sampleProcesses
      })
    });
    
    const data = await response.json();
    console.log(`Response status: ${response.status}`);
    console.log('Response data:', data);
    
    if (response.ok) {
      console.log('✅ Direct API saveProcesses test PASSED');
    } else {
      console.log('❌ Direct API saveProcesses test FAILED');
    }
  } catch (error) {
    console.error('❌ Error testing saveProcesses API directly:', error.message);
  }
  
  // Test getProcesses API directly
  console.log('\n2. Testing getProcesses API directly...');
  try {
    const response = await fetch(`${API_URL}/getProcesses`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    const data = await response.json();
    console.log(`Response status: ${response.status}`);
    console.log(`Loaded ${data.processes?.length || 0} processes`);
    
    if (response.ok) {
      console.log('✅ Direct API getProcesses test PASSED');
    } else {
      console.log('❌ Direct API getProcesses test FAILED');
    }
  } catch (error) {
    console.error('❌ Error testing getProcesses API directly:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('=== Process API Test Script ===');
  console.log('This script tests the fixes for the saveProcesses API 500 error');
  
  // Setup mock localStorage with user data
  localStorage.setItem('wms_current_user', JSON.stringify(mockUser));
  
  // Generate a test token
  const jwtToken = generateTestToken();
  console.log('\nGenerated test JWT token for authentication');
  
  // Store token in localStorage and for direct API calls
  localStorage.setItem('wms_token', jwtToken);
  TEST_TOKEN = jwtToken;
  
  // Run frontend simulation tests
  console.log('\n=== STARTING TESTS ===');
  console.log('1. Testing frontend save processes simulation');
  await simulateFrontendSaveProcesses();
  
  console.log('\n2. Testing frontend load processes simulation');
  await simulateFrontendLoadProcesses();
  
  // Test direct API calls
  console.log('\n3. Testing direct API calls');
  await testDirectApiCalls();
  
  console.log('\n=== Test Complete ===');
  console.log('If all tests pass, the 500 Internal Server Error has been fixed!');
  console.log('If any test fails, check the error messages for debugging information.');
}

// Run the tests
runTests().catch(error => {
  console.error('Test script error:', error);
});
