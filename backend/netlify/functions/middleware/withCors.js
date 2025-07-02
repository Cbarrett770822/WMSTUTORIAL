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
  // For local development, always allow localhost origins
  const allowedOrigin = origin && (origin.startsWith('http://localhost') || origin.includes('127.0.0.1')) ? origin : '*';
  
  console.log('CORS: Setting allowed origin to:', allowedOrigin);
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma, cache-control, pragma, content-type, authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
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
    // Log request details for debugging
    console.log('CORS: Received request with method:', event.httpMethod);
    console.log('CORS: Request headers:', JSON.stringify(event.headers));
    
    const origin = event.headers.origin || event.headers.Origin || '*';
    console.log('CORS: Detected origin:', origin);
    
    // Get CORS headers
    const headers = getCorsHeaders(origin);
    console.log('CORS: Applied headers:', JSON.stringify(headers));
    
    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      console.log('CORS: Handling OPTIONS preflight request');
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
