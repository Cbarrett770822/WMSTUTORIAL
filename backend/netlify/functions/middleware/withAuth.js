/**
 * Authentication Middleware
 * 
 * Provides consistent authentication handling for Netlify Functions.
 * This eliminates redundant authentication code across API endpoints.
 */

const jwt = require('jsonwebtoken');

// Debug mode for detailed logging
const DEBUG_AUTH = process.env.DEBUG_AUTH === 'true' || true;

// JWT secret key - in production, this should be an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Extract and validate authentication token from request
 * @param {Object} event - Netlify Function event object
 * @returns {Object} - Authentication result with userId, username, role, and token
 */
const extractAndValidateToken = (event) => {
  // Get token from Authorization header
  const authHeader = event.headers.authorization || '';
  
  if (DEBUG_AUTH) {
    console.log('Raw Authorization header:', authHeader);
  }
  
  // Extract token, handling both "Bearer token" and direct token formats
  let token;
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim(); // Remove 'Bearer ' prefix
    if (DEBUG_AUTH) {
      console.log('Bearer prefix detected and removed');
    }
  } else {
    token = authHeader.trim(); // Use the entire header as the token
    if (DEBUG_AUTH) {
      console.log('No Bearer prefix detected');
    }
  }
  
  // Handle case where the token itself might start with 'Bearer '
  if (token && token.toLowerCase().startsWith('bearer ')) {
    token = token.substring(7).trim();
    if (DEBUG_AUTH) {
      console.log('Secondary Bearer prefix detected and removed');
    }
  }
  
  if (!token) {
    console.error('No token provided in Authorization header');
    return { 
      isAuthenticated: false,
      error: 'Authorization token is missing or invalid',
      message: 'Please log in to access this resource'
    };
  }
  
  if (DEBUG_AUTH) {
    console.log('Extracted token:', token);
  }
  
  // Try to verify token - support multiple token formats
  let userId;
  let username;
  let role;
  
  // Check if it's our simplified token format (userId:username:role)
  if (token.includes(':')) {
    try {
      const parts = token.split(':');
      if (parts.length >= 3) {
        userId = parts[0];
        username = parts[1];
        role = parts[2];
        if (DEBUG_AUTH) {
          console.log('Simplified token parsed successfully:', { userId, username, role });
        }
        return { isAuthenticated: true, userId, username, role, token };
      } else {
        throw new Error('Invalid simplified token format');
      }
    } catch (tokenError) {
      console.error('Simplified token parsing failed:', tokenError);
      return {
        isAuthenticated: false,
        error: 'Invalid token format',
        message: 'The authentication token is invalid or malformed'
      };
    }
  } else {
    // Try JWT verification for legacy tokens
    try {
      const decodedToken = jwt.verify(token, JWT_SECRET);
      userId = decodedToken.userId || decodedToken.sub;
      username = decodedToken.username || decodedToken.name;
      role = decodedToken.role;
      if (DEBUG_AUTH) {
        console.log('JWT token verified successfully:', { userId, username, role });
      }
      return { isAuthenticated: true, userId, username, role, token };
    } catch (jwtError) {
      // If JWT verification fails, try base64 decoding (for dev mode)
      try {
        const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
        
        // Check if token is expired
        if (tokenData.exp && tokenData.exp < Date.now()) {
          return {
            isAuthenticated: false,
            error: 'Token expired',
            message: 'Your session has expired. Please log in again.'
          };
        }
        
        userId = tokenData.userId || tokenData.sub;
        username = tokenData.username || tokenData.name;
        role = tokenData.role;
        if (DEBUG_AUTH) {
          console.log('Base64 token decoded successfully:', { userId, username, role });
        }
        return { isAuthenticated: true, userId, username, role, token };
      } catch (base64Error) {
        // Check if it's a development fallback token
        if (token.startsWith('dev-fallback')) {
          // Extract username from token if present
          if (token === 'dev-fallback') {
            // Handle legacy dev-fallback token without username
            username = 'admin';
            userId = 'admin-dev-id';
            role = 'admin';
            if (DEBUG_AUTH) {
              console.log('Legacy development fallback token parsed successfully:', { userId, username, role });
            }
            return { isAuthenticated: true, userId, username, role, token };
          } else if (token.startsWith('dev-fallback-')) {
            // Extract username from token
            const parts = token.split('-');
            if (parts.length >= 3) {
              username = parts[2];
              userId = `${username}-dev-id`;
              role = username === 'admin' ? 'admin' : (username === 'supervisor' ? 'supervisor' : 'user');
              if (DEBUG_AUTH) {
                console.log('Development fallback token parsed successfully:', { userId, username, role });
              }
              return { isAuthenticated: true, userId, username, role, token };
            }
          }
        }
        
        console.error('Token verification failed for all formats');
        return {
          isAuthenticated: false,
          error: 'Invalid token format',
          message: 'The authentication token is invalid or malformed'
        };
      }
    }
  }
};

/**
 * Authentication middleware for Netlify Functions
 * @param {Function} handler - The handler function to wrap
 * @param {Object} options - Options for the middleware
 * @param {boolean} options.requireAuth - Whether authentication is required (default: true)
 * @param {Array<string>} options.allowedRoles - Roles allowed to access this endpoint (optional)
 * @returns {Function} - Wrapped handler function with authentication
 */
const withAuth = (handler, options = {}) => {
  const { requireAuth = true, allowedRoles = null } = options;
  
  return async (event, context) => {
    // Set up CORS headers for cross-origin requests
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json'
    };
    
    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers
      };
    }
    
    // Skip authentication if not required
    if (!requireAuth) {
      return handler(event, context, { headers });
    }
    
    // Extract and validate token
    const authResult = extractAndValidateToken(event);
    
    // If authentication failed, return error response
    if (!authResult.isAuthenticated) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: authResult.error,
          message: authResult.message
        })
      };
    }
    
    // Check if user has required role
    if (allowedRoles && !allowedRoles.includes(authResult.role)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource'
        })
      };
    }
    
    // Add auth info to context for the handler
    const authContext = {
      userId: authResult.userId,
      username: authResult.username,
      role: authResult.role,
      token: authResult.token,
      headers
    };
    
    // Call the handler with auth context
    return handler(event, context, authContext);
  };
};

module.exports = withAuth;
