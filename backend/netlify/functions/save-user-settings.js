/**
 * Save User Settings API
 * 
 * Endpoint for saving user-specific settings to the database.
 * Uses middleware pattern for authentication, database connection, and CORS handling.
 * Supports admin users saving settings for other users.
 */

const mongoose = require('mongoose');
const withAuth = require('./middleware/withAuth');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');
const { UserSettings } = require('./models/UserSettings');

// Environment variables
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

/**
 * Core handler function for saving user settings
 */
const saveUserSettingsHandler = async (event, context, { userId, username, role, headers, mongoose }) => {
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

  // Parse request body
  let requestData;
  try {
    requestData = JSON.parse(event.body);
    diagnostics.requestParsing = { success: true };
  } catch (parseError) {
    console.error('Error parsing request body:', parseError);
    diagnostics.requestParsing = { success: false, error: parseError.message };
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        message: 'Invalid JSON in request body',
        error: 'Parse error',
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  }
  
  // Extract settings and handle different request formats
  let settings;
  let requestUserId = userId; // Default to the token's userId
  
  if (requestData.settings && typeof requestData.settings === 'object') {
    // New format: { userId, settings }
    settings = requestData.settings;
    diagnostics.requestFormat = { type: 'new', hasSettings: true };
    
    if (requestData.userId) {
      // If a userId is provided in the request, verify it matches the token
      // Only allow overriding userId if user has admin role
      diagnostics.adminRequest = { 
        requested: true, 
        targetUserId: requestData.userId,
        isAdmin: role === 'admin'
      };
      
      if (requestData.userId !== userId && role !== 'admin') {
        console.warn(`User ${userId} attempted to save settings for ${requestData.userId} without admin privileges`);
        diagnostics.adminRequest.authorized = false;
        
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ 
            success: false,
            message: 'Not authorized to save settings for another user',
            error: 'Insufficient privileges',
            diagnostics: isDevelopment ? diagnostics : undefined
          })
        };
      }
      
      requestUserId = requestData.userId;
      diagnostics.adminRequest.authorized = true;
    }
  } else if (typeof requestData === 'object') {
    // Legacy format: direct settings object
    settings = requestData;
    diagnostics.requestFormat = { type: 'legacy', directObject: true };
  } else {
    diagnostics.requestFormat = { type: 'invalid', value: typeof requestData };
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        message: 'Settings object is required',
        error: 'Validation error',
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  }
  
  if (!settings || typeof settings !== 'object') {
    diagnostics.validation = { valid: false, reason: 'settings_not_object' };
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false,
        message: 'Valid settings object is required',
        error: 'Validation error',
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  }
  
  diagnostics.validation = { valid: true };
  
  // Add metadata to settings
  const settingsWithMetadata = {
    ...settings,
    _metadata: {
      ...(settings._metadata || {}),
      lastUpdated: new Date().toISOString(),
      updatedBy: userId,
      username: username || 'unknown'
    }
  };
  
  try {
    // Update or create user settings
    const updatedSettings = await UserSettings.findOneAndUpdate(
      { userId: requestUserId }, // Use the potentially admin-overridden userId
      { 
        userId: requestUserId,
        settings: settingsWithMetadata,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    console.log(`Settings saved successfully for user ${requestUserId}`);
    diagnostics.dbOperation = { success: true, operation: 'findOneAndUpdate', upsert: true };
    
    // Return updated settings
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Settings saved successfully',
        settings: updatedSettings.settings,
        userId: requestUserId,
        timestamp: new Date().toISOString(),
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  } catch (dbOperationError) {
    console.error('Error during database operation:', dbOperationError);
    diagnostics.dbOperation = { 
      success: false, 
      error: dbOperationError.message,
      errorName: dbOperationError.name,
      code: dbOperationError.code
    };
    
    // Determine appropriate error message based on environment
    const errorMessage = isDevelopment 
      ? `Database operation failed: ${dbOperationError.message}` 
      : 'An error occurred while saving user settings';
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        message: errorMessage,
        error: isDevelopment ? {
          name: dbOperationError.name,
          message: dbOperationError.message,
          stack: dbOperationError.stack
        } : 'Internal server error',
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  }
};

// Apply middleware to handler function
// 1. Apply CORS middleware
// 2. Apply authentication middleware with role-based access control
// 3. Apply database connection middleware
// 4. Handle POST method restriction
exports.handler = withCors(
  withAuth(
    withDatabase(
      async (event, context, handlerContext) => {
        // Only allow POST requests
        if (event.httpMethod !== 'POST') {
          return { 
            statusCode: 405, 
            headers: handlerContext.headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
          };
        }
        
        return saveUserSettingsHandler(event, context, handlerContext);
      }
    ),
    { requireAuth: true, allowedRoles: ['admin', 'supervisor', 'user'] }
  )
);
