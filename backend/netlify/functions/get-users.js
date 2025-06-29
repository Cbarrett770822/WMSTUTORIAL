/**
 * Get Users Function
 * 
 * This serverless function retrieves a list of all users in the system.
 * It requires admin authentication to access.
 * Uses middleware for authentication, database connection, and CORS handling.
 */

const User = require('./models/User');
const withAuth = require('./middleware/withAuth');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');

// Core handler function that will be wrapped with middleware
const getUsersHandler = async (event, context, user) => {
  // Set default headers for responses
  const headers = {
    'Content-Type': 'application/json'
  };

  // Context setup
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Check if user is admin
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Admin access required',
          message: 'You must have admin privileges to view all users.'
        })
      };
    }
    
    // Find all users (exclude passwords)
    const users = await User.find().select('-password');
    
    // Return users list with improved response format
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        users: users.map(user => ({
          id: user._id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt
        })),
        count: users.length
      })
    };
  } catch (error) {
    console.error('Error getting users:', error);
    
    // Standardized error handling
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const errorMessage = isDevelopment ? error.message : 'An error occurred while retrieving users';
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Failed to get users', 
        message: errorMessage,
        details: isDevelopment ? error.stack : undefined
      })
    };
  }
};

// Export the handler with middleware applied
// withAuth middleware verifies the token and adds the user object to the request
// withDatabase middleware handles the MongoDB connection
// withCors middleware handles CORS headers and preflight requests
exports.handler = withCors(
  withAuth(
    withDatabase(getUsersHandler),
    { requiredRole: 'admin' } // Require admin role for this endpoint
  ),
  { methods: ['GET'] } // Only allow GET requests
);
