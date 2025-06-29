/**
 * Authenticate Function
 * 
 * This serverless function verifies authentication tokens and returns user information.
 * It supports both JWT tokens and simplified tokens (userId:username:role format).
 * It's used to validate authentication state and retrieve user data.
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Import middleware
const withCors = require('./middleware/withCors');
const withDatabase = require('./middleware/withDatabase');

// Import models
const User = require('./models/User');
const UserSettings = require('./models/UserSettings').model;

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Debug information
console.log('Authenticate function initialized');
console.log('Environment:', process.env.NODE_ENV || 'not set');
console.log('JWT Secret available:', !!JWT_SECRET);
console.log('Development mode:', isDevelopment ? 'yes' : 'no');

// Function to validate token and extract user information
async function validateToken(token) {
  // Check if it's our simplified token format (userId:username:role)
  if (token.includes(':')) {
    try {
      const parts = token.split(':');
      if (parts.length >= 3) {
        return {
          userId: parts[0],
          username: parts[1],
          role: parts[2]
        };
      }
    } catch (error) {
      console.error('Simplified token parsing failed:', error);
      return null;
    }
  }
  
  // Try JWT verification
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      userId: decoded.userId || decoded.sub,
      username: decoded.username || decoded.name,
      role: decoded.role
    };
  } catch (error) {
    console.log('JWT verification failed:', error.message);
    
    // Try base64 decoding for development tokens
    try {
      const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
      if (tokenData.exp && tokenData.exp < Date.now()) {
        return null; // Token expired
      }
      
      return {
        userId: tokenData.userId || tokenData.sub,
        username: tokenData.username || tokenData.name,
        role: tokenData.role
      };
    } catch (error) {
      // Check for development fallback tokens
      if (isDevelopment && token.startsWith('dev-fallback')) {
        if (token === 'dev-fallback') {
          return {
            userId: 'admin-dev-id',
            username: 'admin',
            role: 'admin'
          };
        } else if (token.startsWith('dev-fallback-')) {
          const parts = token.split('-');
          if (parts.length >= 3) {
            const username = parts[2];
            const role = username === 'admin' ? 'admin' : (username === 'supervisor' ? 'supervisor' : 'user');
            return {
              userId: `${username}-dev-id`,
              username,
              role
            };
          }
        }
      }
    }
  }
  
  return null;
}

exports.handler = withCors(withDatabase(async (event, context) => {
  // Set default headers for responses
  const headers = {
    'Content-Type': 'application/json'
  };
  
  // Context setup
  context.callbackWaitsForEmptyEventLoop = false;
  
  // Collect diagnostic information
  const diagnostics = {
    environment: process.env.NODE_ENV || 'unknown',
    jwtSecret: {
      present: !!JWT_SECRET,
      usingDefault: !process.env.JWT_SECRET
    },
    database: {
      connected: true // Connection is handled by withDatabase middleware
    },
    timestamp: new Date().toISOString(),
    requestInfo: {
      method: event.httpMethod,
      path: event.path,
      hasAuthHeader: !!(event.headers.authorization || event.headers.Authorization),
      queryStringParameters: event.queryStringParameters || {}
    }
  };
  
  let user = null;
  let decoded = null;
  let userSettings = null;

  try {
    // Extract the token from the Authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          authenticated: false,
          error: 'No authentication token provided',
          message: 'Authentication token is missing. Please include a Bearer token in the Authorization header.',
          diagnostics
        })
      };
    }

    const token = authHeader.split(' ')[1];
    diagnostics.token = {
      present: true,
      length: token.length
    };
    
    // Validate the token using our centralized function
    const tokenData = await validateToken(token);
    
    if (!tokenData) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          authenticated: false,
          error: 'Invalid token',
          message: 'The provided authentication token is invalid or expired.',
          diagnostics
        })
      };
    }
    
    // Set decoded data for compatibility with the rest of the function
    decoded = { userId: tokenData.userId };
    
    // Check if we're using a development fallback token
    const usingDevFallback = isDevelopment && (
      token.startsWith('dev-fallback') || 
      token.includes(':') || 
      (tokenData.userId && tokenData.userId.includes('dev-id'))
    );

    // If using development fallback, create a user object without database
    if (usingDevFallback) {
      user = {
        _id: tokenData.userId,
        id: tokenData.userId,
        username: tokenData.username,
        role: tokenData.role,
        createdAt: new Date()
      };
      
      // Create default settings for fallback user
      userSettings = {
        settings: {
          theme: 'light',
          fontSize: 'medium',
          notifications: true,
          autoSave: true,
          presentationViewMode: 'embed',
          lastVisitedSection: null
        }
      };
      diagnostics.settingsCreated = true;
      diagnostics.usingDevFallback = true;
    } else {
      // Database connection is handled by withDatabase middleware
      diagnostics.dbConnected = true;
      
      // Find user by ID from the decoded token
      const userId = decoded.userId;
      diagnostics.userId = userId;
      
      try {
        user = await User.findById(userId);
        diagnostics.userLookup = { attempted: true, found: !!user };
        
        if (!user) {
          // If in development mode and user not found, create a fallback user
          if (isDevelopment) {
            diagnostics.usingDbFallback = true;
            
            // If we have a token in userId:username:role format, extract the username and role
            let username = 'user';
            let role = 'user';
            
            if (token.includes(':')) {
              const parts = token.split(':');
              if (parts.length >= 3) {
                username = parts[1];
                role = parts[2];
              }
            }
            
            user = {
              _id: userId,
              id: userId,
              username: username,
              role: role,
              createdAt: new Date().toISOString()
            };
            diagnostics.userFound = true;
          } else {
            diagnostics.errors.push(`User not found with ID: ${userId}`);
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({
                success: false,
                message: 'User not found',
                diagnostics
              })
            };
          }
        } else {
          diagnostics.userFound = true;
          
          // Ensure admin user always has admin role
          if (user.username === 'admin' && user.role !== 'admin') {
            user.role = 'admin';
            await user.save();
            diagnostics.adminRoleFixed = true;
          }
          
          // Try to find user settings
          try {
            userSettings = await UserSettings.findOne({ userId: user._id });
            if (userSettings) {
              diagnostics.settingsFound = true;
            } else {
              // Create default settings if not found
              userSettings = new UserSettings({
                userId: user._id,
                settings: {
                  theme: 'light',
                  fontSize: 'medium',
                  notifications: true,
                  autoSave: true,
                  presentationViewMode: 'embed',
                  lastVisitedSection: null
                }
              });
              await userSettings.save();
              diagnostics.settingsCreated = true;
            }
          } catch (settingsError) {
            diagnostics.errors.push(`Error finding/creating user settings: ${settingsError.message}`);
            // Continue without settings
          }
        }
      } catch (dbError) {
        diagnostics.errors.push(`Database error: ${dbError.message}`);
        
        // If in development mode, fall back to default users
        if (isDevelopment) {
          diagnostics.usingDbFallback = true;
          
          // Extract username and role from token if possible
          let username = 'user';
          let role = 'user';
          
          if (token && token.includes(':')) {
            const parts = token.split(':');
            if (parts.length >= 3) {
              username = parts[1];
              role = parts[2];
            }
          }
          
          user = {
            _id: userId,
            id: userId,
            username: username,
            role: role,
            createdAt: new Date().toISOString()
          };
          
          // Create default settings for fallback user
          userSettings = {
            settings: {
              theme: 'light',
              fontSize: 'medium',
              notifications: true,
              autoSave: true,
              presentationViewMode: 'embed',
              lastVisitedSection: null
            }
          };
          diagnostics.settingsCreated = true;
        } else {
          // In production, return error
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Database error',
              error: dbError.message,
              diagnostics
            })
          };
        }
      }
    }

    // Generate simplified token format
    const simplifiedToken = `${user._id}:${user.username}:${user.role || 'user'}`;
    
    // Return successful response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        authenticated: true,
        message: 'Authentication successful',
        token: simplifiedToken, // Include the simplified token format
        user: {
          id: user._id,
          username: user.username,
          role: user.role || 'user', // Ensure role is always set, default to 'user'
          createdAt: user.createdAt
        },
        settings: userSettings ? userSettings.settings : null, // Include settings in the response if available
        diagnostics
      })
    };
  } catch (error) {
    // Handle any unexpected errors
    diagnostics.errors.push(`Unexpected error: ${error.message}`);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Server error',
        error: error.message,
        diagnostics
      })
    };
  }
}), { methods: ['GET', 'POST'] });
