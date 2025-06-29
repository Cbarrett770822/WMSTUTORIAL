/**
 * CORS Middleware
 * 
 * Provides consistent CORS handling for Netlify Functions.
 * This eliminates redundant CORS code across API endpoints.
 */

/**
 * Default CORS headers for all responses
 * @param {string} origin - Allowed origin (default: '*')
 * @returns {Object} - CORS headers
 */
const getCorsHeaders = (origin = '*') => {
  // For local development, explicitly allow localhost:3000 or localhost:3006
  const allowedOrigin = (origin === 'http://localhost:3000' || origin === 'http://localhost:3006') ? origin : '*';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };
};

/**
 * CORS middleware for Netlify Functions
 * @param {Function} handler - The handler function to wrap
 * @param {Object} options - Options for the middleware
 * @param {string} options.origin - Allowed origin (default: '*')
 * @returns {Function} - Wrapped handler function with CORS support
 */
const withCors = (handler, options = {}) => {
  // Get the origin from the request headers or use default
  return async (event, context, handlerContext = {}) => {
    const origin = event.headers.origin || event.headers.Origin || '*';
    // Get CORS headers
    const headers = getCorsHeaders(origin);
    
    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers
      };
    }
    
    // Add headers to context
    const corsContext = {
      ...handlerContext,
      headers: { ...headers, ...handlerContext.headers }
    };
    
    try {
      // Call the handler with CORS context
      const result = await handler(event, context, corsContext);
      
      // Ensure CORS headers are in the response
      return {
        ...result,
        headers: { ...headers, ...(result.headers || {}) }
      };
    } catch (error) {
      // If there's an error, still return with CORS headers
      console.error('Error in handler:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Internal Server Error' })
      };
    }
  };
};

module.exports = withCors;
