/**
 * Clear User Settings Function
 * 
 * This serverless function deletes user settings from the database.
 * Uses middleware pattern for authentication, database connection, and CORS handling.
 */

const mongoose = require('mongoose');
const withAuth = require('./middleware/withAuth');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');
const { UserSettings } = require('./models/UserSettings');

// Environment variables
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

/**
 * Core handler function for clearing user settings
 * This is wrapped with middleware for authentication, database, and CORS
 */
const clearUserSettingsHandler = async (event, context, { userId, username, role, headers, mongoose }) => {
  // Diagnostics collection for debugging and monitoring
  const diagnostics = {
    environment: isDevelopment ? 'development' : 'production',
    timestamp: new Date().toISOString(),
    requestInfo: {
      method: event.httpMethod,
      path: event.path,
      source: event.headers['user-agent'] || 'unknown'
    },
    userInfo: {
      userId,
      username,
      role
    }
  };

  try {
    // Get target user ID from query parameters or default to authenticated user
    const targetUserId = event.queryStringParameters?.userId || userId;
    diagnostics.targetUserId = targetUserId;
    
    // Check if user has permission to clear settings for another user
    if (targetUserId !== userId && role !== 'admin') {
      console.warn(`User ${userId} attempted to clear settings for ${targetUserId} without admin privileges`);
      diagnostics.authorization = { authorized: false, reason: 'not_admin' };
      
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          success: false,
          message: 'Not authorized to clear settings for another user',
          error: 'Insufficient privileges',
          diagnostics: isDevelopment ? diagnostics : undefined
        })
      };
    }
    
    diagnostics.authorization = { authorized: true };
    
    // Delete user settings
    const result = await UserSettings.deleteOne({ userId: targetUserId });
    diagnostics.dbOperation = { 
      success: true, 
      operation: 'deleteOne', 
      deletedCount: result.deletedCount 
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User settings cleared successfully',
        userId: targetUserId,
        deletedCount: result.deletedCount,
        timestamp: new Date().toISOString(),
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  } catch (error) {
    console.error('Error clearing user settings:', error);
    diagnostics.error = { message: error.message, name: error.name };
    
    // Determine appropriate error message based on environment
    const errorMessage = isDevelopment 
      ? `Failed to clear user settings: ${error.message}` 
      : 'An error occurred while clearing user settings';
    
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
// withAuth middleware handles authentication and role enforcement
// withDatabase middleware handles the MongoDB connection
// withCors middleware handles CORS headers and preflight requests
exports.handler = withCors(
  withAuth(
    withDatabase(clearUserSettingsHandler)
  ),
  { methods: ['DELETE'] } // Only allow DELETE requests
);
