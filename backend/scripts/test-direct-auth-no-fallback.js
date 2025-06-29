/**
 * Direct authentication test script with no fallbacks
 * This script tests the authentication flow by directly accessing the serverless functions
 * with development fallbacks explicitly disabled
 */

// Set environment variables before importing modules
process.env.DISABLE_DEV_FALLBACK = 'true';
process.env.DEBUG_AUTH = 'true';
process.env.DEBUG_DB_CONNECTION = 'true';

// Import required modules
const { handler: loginHandler } = require('../netlify/functions/login');
const { handler: getUserSettingsHandler } = require('../netlify/functions/get-user-settings');
const { handler: saveUserSettingsHandler } = require('../netlify/functions/save-user-settings');

// Test credentials
const credentials = {
  username: 'admin',
  password: 'password'
};

// Test settings
const testSettings = {
  theme: 'dark',
  language: 'en',
  notifications: true,
  dashboardLayout: 'expanded',
  _metadata: {
    lastSaved: new Date().toISOString(),
    clientVersion: '1.0.0',
    tokenType: 'simplified'
  }
};

// Helper function to create mock event and context
function createMockEvent(path, method, body = null, headers = {}) {
  // Convert all header keys to lowercase to match Netlify's behavior
  const normalizedHeaders = {};
  Object.keys(headers).forEach(key => {
    normalizedHeaders[key.toLowerCase()] = headers[key];
  });
  
  return {
    path,
    httpMethod: method,
    headers: normalizedHeaders,
    body: body ? JSON.stringify(body) : null
  };
}

// Create a mock Netlify function context
function createMockContext() {
  return {
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'test-function',
    functionVersion: '1.0',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
    memoryLimitInMB: '128',
    awsRequestId: '12345678-1234-1234-1234-123456789012',
    logGroupName: '/aws/lambda/test-function',
    logStreamName: '2021/01/01/[$LATEST]12345678',
    identity: null,
    clientContext: null,
    getRemainingTimeInMillis: () => 30000,
    done: (error, result) => {},
    fail: (error) => {},
    succeed: (result) => {}
  };
}

// Main test function
async function runTests() {
  console.log('Starting Direct Authentication Tests (NO FALLBACKS)');
  console.log('==============================================');
  console.log('DISABLE_DEV_FALLBACK:', process.env.DISABLE_DEV_FALLBACK);
  
  // Step 1: Test login
  console.log('\nStep 1: Testing login');
  try {
    const loginEvent = createMockEvent('/login', 'POST', credentials);
    const mockContext = createMockContext();
    const loginResponse = await loginHandler(loginEvent, mockContext);
    
    console.log(`Status: ${loginResponse.statusCode}`);
    
    if (loginResponse.statusCode === 200) {
      const loginData = JSON.parse(loginResponse.body);
      console.log('Response:', JSON.stringify(loginData, null, 2));
      
      if (loginData.token) {
        console.log('✓ LOGIN SUCCESS');
        const token = loginData.token;
        console.log('Token:', token);
        
        // Step 2: Test getUserSettings with Bearer prefix
        console.log('\nStep 2: Testing getUserSettings with Bearer prefix');
        console.log('Using token:', token);
        const getUserSettingsEvent = createMockEvent(
          '/get-user-settings',
          'GET',
          null,
          { authorization: `Bearer ${token}` }
        );
        
        const getUserSettingsResponse = await getUserSettingsHandler(getUserSettingsEvent, createMockContext());
        console.log(`Status: ${getUserSettingsResponse.statusCode}`);
        
        if (getUserSettingsResponse.statusCode === 200) {
          const getUserSettingsData = JSON.parse(getUserSettingsResponse.body);
          console.log('Response:', JSON.stringify(getUserSettingsData, null, 2));
          console.log('✓ GET USER SETTINGS SUCCESS (Bearer prefix)');
        } else {
          console.log('Response:', getUserSettingsResponse.body);
          console.log('✗ GET USER SETTINGS FAILED (Bearer prefix)');
        }
        
        // Step 3: Test getUserSettings without Bearer prefix
        console.log('\nStep 3: Testing getUserSettings without Bearer prefix');
        console.log('Using token:', token);
        const getUserSettingsEvent2 = createMockEvent(
          '/get-user-settings',
          'GET',
          null,
          { authorization: token }
        );
        
        const getUserSettingsResponse2 = await getUserSettingsHandler(getUserSettingsEvent2, createMockContext());
        console.log(`Status: ${getUserSettingsResponse2.statusCode}`);
        
        if (getUserSettingsResponse2.statusCode === 200) {
          const getUserSettingsData2 = JSON.parse(getUserSettingsResponse2.body);
          console.log('Response:', JSON.stringify(getUserSettingsData2, null, 2));
          console.log('✓ GET USER SETTINGS SUCCESS (without Bearer prefix)');
        } else {
          console.log('Response:', getUserSettingsResponse2.body);
          console.log('✗ GET USER SETTINGS FAILED (without Bearer prefix)');
        }
        
        // Step 4: Test saveUserSettings with Bearer prefix
        console.log('\nStep 4: Testing saveUserSettings with Bearer prefix');
        // Add metadata to settings
        testSettings._metadata.userId = loginData.user.id;
        testSettings._metadata.username = loginData.user.username;
        
        const saveUserSettingsEvent = createMockEvent(
          '/save-user-settings',
          'POST',
          { settings: testSettings },
          { authorization: `Bearer ${token}` }
        );
        
        const saveUserSettingsResponse = await saveUserSettingsHandler(saveUserSettingsEvent, createMockContext());
        console.log(`Status: ${saveUserSettingsResponse.statusCode}`);
        
        if (saveUserSettingsResponse.statusCode === 200) {
          const saveUserSettingsData = JSON.parse(saveUserSettingsResponse.body);
          console.log('Response:', JSON.stringify(saveUserSettingsData, null, 2));
          console.log('✓ SAVE USER SETTINGS SUCCESS (Bearer prefix)');
        } else {
          console.log('Response:', saveUserSettingsResponse.body);
          console.log('✗ SAVE USER SETTINGS FAILED (Bearer prefix)');
        }
        
        // Step 5: Test saveUserSettings without Bearer prefix
        console.log('\nStep 5: Testing saveUserSettings without Bearer prefix');
        // Update timestamp
        testSettings._metadata.lastSaved = new Date().toISOString();
        
        const saveUserSettingsEvent2 = createMockEvent(
          '/save-user-settings',
          'POST',
          { settings: testSettings },
          { authorization: token }
        );
        
        const saveUserSettingsResponse2 = await saveUserSettingsHandler(saveUserSettingsEvent2, createMockContext());
        console.log(`Status: ${saveUserSettingsResponse2.statusCode}`);
        
        if (saveUserSettingsResponse2.statusCode === 200) {
          const saveUserSettingsData2 = JSON.parse(saveUserSettingsResponse2.body);
          console.log('Response:', JSON.stringify(saveUserSettingsData2, null, 2));
          console.log('✓ SAVE USER SETTINGS SUCCESS (without Bearer prefix)');
        } else {
          console.log('Response:', saveUserSettingsResponse2.body);
          console.log('✗ SAVE USER SETTINGS FAILED (without Bearer prefix)');
        }
        
        // Step 6: Verify saved settings
        console.log('\nStep 6: Verifying saved settings');
        const verifySettingsEvent = createMockEvent(
          '/get-user-settings',
          'GET',
          null,
          { authorization: `Bearer ${token}` }
        );
        
        const verifySettingsResponse = await getUserSettingsHandler(verifySettingsEvent, createMockContext());
        console.log(`Status: ${verifySettingsResponse.statusCode}`);
        
        if (verifySettingsResponse.statusCode === 200) {
          const verifySettingsData = JSON.parse(verifySettingsResponse.body);
          console.log('Response:', JSON.stringify(verifySettingsData, null, 2));
          
          if (verifySettingsData.settings && verifySettingsData.settings.theme === testSettings.theme) {
            console.log('✓ SETTINGS VERIFICATION SUCCESS - Theme matches');
          } else {
            console.log('✗ SETTINGS VERIFICATION FAILED - Theme does not match');
            console.log('Expected:', testSettings.theme);
            console.log('Received:', verifySettingsData.settings ? verifySettingsData.settings.theme : 'undefined');
          }
        } else {
          console.log('Response:', verifySettingsResponse.body);
          console.log('✗ SETTINGS VERIFICATION FAILED - Could not retrieve settings');
        }
      } else {
        console.log('✗ LOGIN FAILED - No token in response');
      }
    } else {
      console.log('Response:', loginResponse.body);
      console.log('✗ LOGIN FAILED');
    }
  } catch (error) {
    console.error('Test Error:', error);
  }
  
  console.log('\n==============================================');
  console.log('Tests completed');
}

// Run the tests
runTests().catch(console.error);
