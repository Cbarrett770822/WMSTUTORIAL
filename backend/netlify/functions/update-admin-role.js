/**
 * Update Admin Role Function
 * 
 * This serverless function updates a user's role to admin.
 * Only existing admins can update user roles.
 * Uses middleware for authentication, database connection, and CORS handling.
 */

const User = require('./models/User');
const withAuth = require('./middleware/withAuth');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');

// Core handler function that will be wrapped with middleware
const updateAdminRoleHandler = async (event, context, authenticatedUser) => {
  // Set default headers for responses
  const headers = {
    'Content-Type': 'application/json'
  };

  // Context setup
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Check if authenticated user is admin
    if (authenticatedUser.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Permission denied',
          message: 'Only administrators can update user roles'
        })
      };
    }
    
    // Parse the request body
    const { username } = JSON.parse(event.body);
    
    // Validate input
    if (!username) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Validation error',
          message: 'Username is required'
        })
      };
    }
    
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Not found',
          message: `User '${username}' not found`
        })
      };
    }
    
    // Update user role to admin
    user.role = 'admin';
    await user.save();
    
    // Return success response with improved format
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `User '${username}' role updated successfully to admin`,
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
          updatedAt: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    console.error('Error updating user role:', error);
    
    // Standardized error handling
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Server error',
        message: isDevelopment ? error.message : 'An error occurred while updating user role',
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
    withDatabase(updateAdminRoleHandler),
    { requiredRole: 'admin' } // Require admin role for this endpoint
  ),
  { methods: ['POST'] } // Only allow POST requests
);
