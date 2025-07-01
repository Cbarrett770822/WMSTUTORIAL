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
    
    // Log authentication information
    console.log('Authentication info:', { userId, username, role });
    
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
      // If not authenticated, show all presentations (changed to match user requirements)
      diagnostics.filterType = 'all_presentations';
      query = {}; // Empty query to return all presentations
    }
    
    diagnostics.query = query;
    console.log('MongoDB query:', JSON.stringify(query));
    
    // Check if the Presentation model is properly defined
    console.log('Presentation model exists:', !!Presentation);
    console.log('Presentation collection name:', Presentation.collection.name);
    
    // First count documents to verify data exists
    const count = await Presentation.countDocuments({});
    console.log('Total presentations in database (all):', count);
    
    // Log the collection name and check if it exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Try to find presentations without any query first to see if data exists
    const allPresentations = await Presentation.find({}).lean();
    console.log('All presentations (no query):', allPresentations.length);
    if (allPresentations.length > 0) {
      console.log('Sample presentation fields:', Object.keys(allPresentations[0]));
    }
    
    // Get presentations with query - don't use lean() to keep model methods
    let presentations = await Presentation.find(query);
    console.log('Presentations found with query:', presentations.length);
    if (presentations.length > 0) {
      console.log('First presentation sample:', JSON.stringify(presentations[0].toObject()));
    }
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
      // Convert Mongoose document to plain object and add URLs
      const presentationObj = presentation.toObject();
      
      return {
        ...presentationObj,
        directUrl: presentation.getDirectUrl(),
        viewerUrl: presentation.getViewerUrl()
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
