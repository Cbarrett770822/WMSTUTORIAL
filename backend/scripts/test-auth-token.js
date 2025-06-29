/**
 * Test Authentication Token Parsing
 * 
 * This script tests the authentication token parsing logic by making
 * direct requests to the backend API endpoints with different token formats.
 */

const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:8889';
const USER_ID = '683c2b77574c7e1e14a34655'; // Replace with your actual user ID if needed

// Test tokens
const tokens = {
  // Format: userId:username:role
  simplifiedToken: `${USER_ID}:admin:admin`,
  
  // With Bearer prefix
  bearerToken: `Bearer ${USER_ID}:admin:admin`,
  
  // Development fallback token
  devFallbackToken: 'dev-fallback-admin',
  
  // With Bearer prefix
  bearerDevFallbackToken: 'Bearer dev-fallback-admin',
  
  // Legacy dev fallback token
  legacyDevFallbackToken: 'dev-fallback'
};

// Test functions
async function testGetUserSettings(tokenType) {
  const token = tokens[tokenType];
  console.log(`\nTesting GET /api/getUserSettings with ${tokenType}:`);
  console.log(`Token: ${token}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/getUserSettings?userId=${USER_ID}`, {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success! Response:', JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testSaveUserSettings(tokenType) {
  const token = tokens[tokenType];
  console.log(`\nTesting POST /api/save-user-settings with ${tokenType}:`);
  console.log(`Token: ${token}`);
  
  const testSettings = {
    userId: USER_ID,
    settings: {
      theme: 'dark',
      language: 'en',
      notifications: true,
      testTimestamp: new Date().toISOString()
    }
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/save-user-settings`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testSettings)
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success! Response:', JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the tests
async function runTests() {
  console.log('=== AUTHENTICATION TOKEN TEST SCRIPT ===');
  console.log('Testing various token formats against backend endpoints');
  console.log('API Base URL:', API_BASE_URL);
  console.log('User ID:', USER_ID);
  
  // Test GET endpoints with different token formats
  for (const tokenType of Object.keys(tokens)) {
    await testGetUserSettings(tokenType);
  }
  
  // Test POST endpoints with different token formats
  for (const tokenType of Object.keys(tokens)) {
    await testSaveUserSettings(tokenType);
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

// Execute the tests
runTests().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});
