// Client-side configuration
const config = {
  // API base URL - use our test server for local testing
  // Use this for local testing with our test server
  apiUrl: 'http://localhost:8889',
  
  // Use this for production or with proper backend setup
  // apiUrl: '/api',
  
  // Development mode settings
  development: {
    disableFallback: false, // Enable development fallbacks
    debugMode: true
  }
};

export default config;
