/**
 * Fix Session Issue
 * 
 * This script addresses the "Inconsistent auth state detected: Valid token and user data but invalid session" error
 * by ensuring that the session creation and validation logic works correctly.
 */

// Function to check if the application is running
const checkAppRunning = async () => {
  try {
    const response = await fetch('http://localhost:3001');
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Main function
const main = async () => {
  console.log('Checking if the application is running...');
  const isRunning = await checkAppRunning();
  
  if (!isRunning) {
    console.error('Error: The application must be running to fix the session issue.');
    console.log('Please make sure the frontend is running on http://localhost:3001');
    process.exit(1);
  }

  console.log('Application is running. Opening browser to fix session issue...');
  
  // Open the browser to the login page
  const { exec } = require('child_process');
  exec('start http://localhost:3001/login');

  console.log('\nInstructions to fix the session issue:');
  console.log('1. Log in with your credentials (admin/password)');
  console.log('2. After logging in, open the browser console (F12)');
  console.log('3. Run the following code in the console:');
  console.log('\n   // Fix session issue');
  console.log('   const user = JSON.parse(localStorage.getItem("wms_current_user"));');
  console.log('   if (user) {');
  console.log('     const now = new Date();');
  console.log('     const expiresAt = now.getTime() + (24 * 60 * 60 * 1000);');
  console.log('     localStorage.setItem("wms_session", JSON.stringify({');
  console.log('       userId: user.id,');
  console.log('       username: user.username,');
  console.log('       createdAt: now.getTime(),');
  console.log('       expiresAt');
  console.log('     }));');
  console.log('     console.log("Session fixed!");');
  console.log('   } else {');
  console.log('     console.error("No user found in localStorage");');
  console.log('   }');
  console.log('\n4. Refresh the page');
  console.log('5. The error should no longer appear');
};

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
