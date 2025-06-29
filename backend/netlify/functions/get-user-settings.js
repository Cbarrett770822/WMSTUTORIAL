/**
 * Get User Settings Function
 * 
 * This serverless function retrieves user settings from the database.
 * Supports admin users retrieving settings for other users.
 * Uses middleware for authentication, database connection, and CORS handling.
 */

const { UserSettings } = require('./models/UserSettings');
const withAuth = require('./middleware/withAuth');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');

// Environment variables
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

/**
 * Handler for getting user settings
 * Uses middleware pattern for authentication, database connection, and CORS
 */
exports.handler = withCors(
  withAuth(
    withDatabase(async (event, context, user) => {
      // Set default headers for responses
      const headers = {
        'Content-Type': 'application/json'
      };

      // Diagnostics collection for debugging and monitoring
      const diagnostics = {
        environment: process.env.NODE_ENV || 'unknown',
        timestamp: new Date().toISOString(),
        requestInfo: {
          method: event.httpMethod,
          path: event.path,
          source: event.headers['user-agent'] || 'unknown'
        },
        userInfo: {
          userId: user.userId,
          username: user.username,
          role: user.role
        }
      };

      try {
        // Check if we should get settings for a specific user (admin feature)
        const queryParams = event.queryStringParameters || {};
        let targetUserId = user.userId;
        
        if (queryParams.userId && queryParams.userId !== user.userId) {
          // If requesting settings for another user, check if current user is admin
          console.log(`User role check: ${user.role}, username: ${user.username}`);
          diagnostics.adminRequest = { requestedUserId: queryParams.userId };
          
          // Check if user is admin either by role or by username
          const isAdmin = user.role === 'admin' || user.username === 'admin';
          
          if (isAdmin) {
            targetUserId = queryParams.userId;
            console.log(`Admin ${user.userId} requesting settings for user ${targetUserId}`);
            diagnostics.adminAccess = { granted: true, targetUserId };
          } else {
            console.warn(`User ${user.userId} attempted to access settings for ${queryParams.userId} without admin privileges`);
            diagnostics.adminAccess = { granted: false, reason: 'insufficient_privileges' };
            
            return {
              statusCode: 403,
              headers,
              body: JSON.stringify({ 
                success: false,
                message: 'Not authorized to access settings for another user',
                error: 'Insufficient privileges',
                diagnostics: isDevelopment ? {
                  userRole: user.role,
                  username: user.username,
                  requestedUserId: queryParams.userId
                } : undefined
              })
            };
          }
        }
        
        // Find user settings
        console.log(`Retrieving settings for user: ${targetUserId}`);
        const userSettings = await UserSettings.findOne({ userId: targetUserId });
        diagnostics.settingsFound = !!userSettings;
        
        // Return settings or empty object if not found
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: userSettings ? 'User settings retrieved successfully' : 'No settings found for user',
            settings: userSettings ? userSettings.settings : {},
            userId: targetUserId,
            requestedBy: user.userId,
            timestamp: new Date().toISOString(),
            diagnostics: isDevelopment ? diagnostics : undefined
          })
        };
      } catch (error) {
        console.error('Error getting user settings:', error);
        diagnostics.error = { message: error.message, name: error.name };
        
        // Determine appropriate error message based on environment
        const errorMessage = isDevelopment 
          ? `Failed to get user settings: ${error.message}` 
          : 'An error occurred while retrieving user settings';
        
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
    }),
    { requiredRole: null } // Allow any authenticated user to access their own settings
  ),
  { methods: ['GET'] } // Only allow GET requests
);
