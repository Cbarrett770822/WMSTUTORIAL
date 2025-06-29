const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const PORT = 8888;
const FUNCTIONS_DIR = path.resolve(__dirname, '../netlify/functions');

console.log('Starting Netlify Functions development server...');
console.log(`Functions directory: ${FUNCTIONS_DIR}`);
console.log(`Port: ${PORT}`);

// Set environment variables for the development server
process.env.NODE_ENV = 'development';
process.env.DEBUG_DB_CONNECTION = 'true';

// Start the Netlify CLI server
const netlify = spawn('netlify', ['dev', '--functions', FUNCTIONS_DIR, '--port', PORT], {
  shell: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    DEBUG_DB_CONNECTION: 'true'
  }
});

// Handle server events
netlify.on('error', (error) => {
  console.error('Failed to start Netlify dev server:', error);
});

netlify.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Netlify dev server exited with code ${code}`);
  }
});

// Log a message when the server is ready
console.log('Waiting for server to start...');
console.log('Once started, you can run the test script with:');
console.log('node scripts/test-save-processes.js');

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  netlify.kill();
  process.exit(0);
});
