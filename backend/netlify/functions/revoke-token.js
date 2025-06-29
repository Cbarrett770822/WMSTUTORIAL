/**
 * Revoke Token Function
 * 
 * This serverless function revokes an authentication token by adding it to a blacklist.
 * This provides better security by explicitly invalidating tokens during logout.
 * Uses middleware pattern for database connection and CORS handling.
 */

const mongoose = require('mongoose');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');

// Environment variables
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Define the token blacklist schema if it doesn't exist
let TokenBlacklist;
if (!mongoose.models.TokenBlacklist) {
  const tokenBlacklistSchema = new mongoose.Schema({
    token: {
      type: String,
      required: true,
      unique: true
    },
    revokedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    userId: {
      type: String,
      index: true
    },
    userAgent: String,
    ipAddress: String
  });

  // Create TTL index to automatically remove expired tokens
  tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  
  TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema);
} else {
  TokenBlacklist = mongoose.models.TokenBlacklist;
}

// Extract token from authorization header
const getTokenFromHeader = (event) => {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

// Parse token to get expiration time
const getTokenExpiration = (token) => {
  try {
    // Check if it's a JWT token
    const parts = token.split('.');
    if (parts.length === 3) {
      // Parse JWT payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      if (payload.exp) {
        return new Date(payload.exp * 1000); // Convert from seconds to milliseconds
      }
    }
    
    // Check if it's a simplified token (userId:username:role)
    if (token.includes(':')) {
      // For simplified tokens, set expiration to 24 hours from now
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    
    // Default expiration: 24 hours from now
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  } catch (error) {
    console.error('Error parsing token expiration:', error);
    // Default expiration: 24 hours from now
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
};

// Extract user ID from token if possible
const getUserIdFromToken = (token) => {
  try {
    // Check if it's a simplified token (userId:username:role)
    if (token.includes(':')) {
      const parts = token.split(':');
      if (parts.length >= 3) {
        return parts[0]; // First part is userId
      }
    }
    
    // Check if it's a JWT token
    const parts = token.split('.');
    if (parts.length === 3) {
      // Parse JWT payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.userId || payload.sub || 'unknown';
    }
    
    return 'unknown';
  } catch (error) {
    console.error('Error extracting user ID from token:', error);
    return 'unknown';
  }
};

// Core handler function for revoking tokens
const revokeTokenHandler = async (event, context) => {
  // Set default headers for responses
  const headers = {
    'Content-Type': 'application/json'
  };

  // Diagnostics collection for debugging and monitoring
  const diagnostics = {
    environment: isDevelopment ? 'development' : 'production',
    timestamp: new Date().toISOString(),
    requestInfo: {
      method: event.httpMethod,
      path: event.path,
      source: event.headers['user-agent'] || 'unknown',
      ip: event.headers['client-ip'] || event.requestContext?.identity?.sourceIp || 'unknown'
    }
  };

  try {
    // Extract token from authorization header
    const token = getTokenFromHeader(event);
    if (!token) {
      diagnostics.tokenExtraction = { success: false, reason: 'no_token_provided' };
      return { 
        statusCode: 401, 
        headers, 
        body: JSON.stringify({ 
          success: false, 
          message: 'No token provided',
          error: 'Authentication required',
          diagnostics: isDevelopment ? diagnostics : undefined
        }) 
      };
    }
    
    diagnostics.tokenExtraction = { success: true };
    
    // Get token expiration and user ID
    const expiresAt = getTokenExpiration(token);
    const userId = getUserIdFromToken(token);
    diagnostics.tokenInfo = { expiresAt, userId };
    
    // Add token to blacklist with additional metadata
    const blacklistEntry = await TokenBlacklist.findOneAndUpdate(
      { token },
      { 
        token, 
        revokedAt: new Date(), 
        expiresAt,
        userId,
        userAgent: event.headers['user-agent'] || 'unknown',
        ipAddress: event.headers['client-ip'] || event.requestContext?.identity?.sourceIp || 'unknown'
      },
      { upsert: true, new: true }
    );
    
    diagnostics.blacklistOperation = { success: true, entryId: blacklistEntry._id };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Token revoked successfully',
        timestamp: new Date().toISOString(),
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  } catch (error) {
    console.error('Error revoking token:', error);
    diagnostics.error = { message: error.message, name: error.name };
    
    // Determine appropriate error message based on environment
    const errorMessage = isDevelopment 
      ? `Failed to revoke token: ${error.message}` 
      : 'An error occurred while revoking the token';
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: errorMessage,
        error: isDevelopment ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Internal server error',
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  }
};

// Export the handler with middleware applied
// withDatabase middleware handles the MongoDB connection
// withCors middleware handles CORS headers and preflight requests
exports.handler = withCors(
  withDatabase(async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return { 
        statusCode: 405, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          success: false, 
          message: 'Method Not Allowed',
          error: 'Only POST requests are supported for this endpoint'
        }) 
      };
    }
    
    return revokeTokenHandler(event, context);
  }),
  { methods: ['POST'] } // Only allow POST requests
);
