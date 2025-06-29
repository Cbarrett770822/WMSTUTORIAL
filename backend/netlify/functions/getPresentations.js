/**
 * Get Presentations Function
 * 
 * This serverless function retrieves presentations from the database.
 * Uses middleware pattern for authentication, database connection, and CORS handling.
 */

const mongoose = require('mongoose');
const withAuth = require('./middleware/withAuth');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');
const Presentation = require('./models/Presentation');

// Environment variables
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

/**
 * Core handler function for retrieving presentations
 * This is wrapped with middleware for authentication (optional), database, and CORS
 */
const getPresentationsHandler = async (event, context, { userId, username, role, headers, mongoose }) => {
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
      userId: userId || 'unauthenticated',
      username: username || 'anonymous',
      role: role || 'none'
    }
  };

  try {
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const requestedUserId = queryParams.userId;
    diagnostics.requestedUserId = requestedUserId || 'none';
    
    // Prepare query based on user context
    let query = {};
    
    // If specific user ID is requested and matches authenticated user or admin
    if (requestedUserId && (role === 'admin' || requestedUserId === userId)) {
      diagnostics.filterType = 'requested_user';
      query.userId = requestedUserId;
    } else if (userId) {
      // If authenticated, show presentations for this user or those without a userId (global)
      diagnostics.filterType = 'authenticated_user';
      query = { $or: [{ userId: userId }, { userId: { $exists: false } }] };
    } else {
      // If not authenticated, only show presentations without a userId (global)
      diagnostics.filterType = 'public_only';
      query = { userId: { $exists: false } };
    }
    
    diagnostics.query = query;
    
    // Get presentations with query
    let presentations = await Presentation.find(query).lean();
    diagnostics.presentationsFound = presentations.length;
    
    // If no presentations are found, return an empty array
    if (!presentations || presentations.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          presentations: [],
          source: 'database-empty',
          count: 0,
          message: 'No presentations found in the database',
          timestamp: new Date().toISOString(),
          diagnostics: isDevelopment ? diagnostics : undefined
        })
      };
    }
    
    // Process presentations to add direct URLs and viewer URLs
    const processedPresentations = presentations.map(presentation => {
      // Create a temporary model instance to use the methods
      const tempModel = new Presentation(presentation);
      
      return {
        ...presentation,
        directUrl: tempModel.getDirectUrl ? tempModel.getDirectUrl() : presentation.url,
        viewerUrl: tempModel.getViewerUrl ? tempModel.getViewerUrl() : presentation.url
      };
    });
    
    // Return presentations
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        presentations: processedPresentations,
        source: 'database',
        count: processedPresentations.length,
        timestamp: new Date().toISOString(),
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  } catch (error) {
    console.error('Error getting presentations:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    diagnostics.error = { 
      message: error.message, 
      name: error.name,
      stack: isDevelopment ? error.stack : undefined
    };
    
    // Determine appropriate error message based on environment
    const errorMessage = isDevelopment 
      ? `Failed to retrieve presentations: ${error.message}` 
      : 'An error occurred while retrieving presentations';
    
    // Return a proper error response
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
        timestamp: new Date().toISOString(),
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  }
};

// Export the handler with middleware applied
// withAuth middleware handles authentication but allows unauthenticated requests
// withDatabase middleware handles the MongoDB connection
// withCors middleware handles CORS headers and preflight requests
exports.handler = withCors(
  withAuth(
    withDatabase(getPresentationsHandler),
    { requireAuth: false } // Allow unauthenticated requests for read-only operation
  ),
  { 
    methods: ['GET'],
    headers: {
      'Cache-Control': 'max-age=300' // Cache for 5 minutes
    }
  }
);
