// Client-side configuration
const config = {
  // API base URL
  // Check if we're in production (Netlify) or development environment
  apiUrl: process.env.NODE_ENV === 'production' 
    ? '' // Empty string for same-origin requests in production
    : 'http://localhost:8889', // Local development server
  
  // Development mode settings
  development: {
    disableFallback: false, // Enable development fallbacks
    debugMode: process.env.NODE_ENV !== 'production'
  }
};

export default config;
