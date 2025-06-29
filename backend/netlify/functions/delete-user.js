/**
 * Delete User Function
 * 
 * This serverless function deletes a user from the system.
 * It requires admin authentication to access.
 * Uses middleware for authentication, database connection, and CORS handling.
 */

const User = require('./models/User');
const withAuth = require('./middleware/withAuth');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');

// Core handler function that will be wrapped with middleware
const deleteUserHandler = async (event, context, user) => {
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
          message: 'You must have admin privileges to delete users.'
        })
      };
    }
    
    // Parse the request body
    const { username } = JSON.parse(event.body);
    
    if (!username) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid request',
          message: 'Username is required.'
        })
      };
    }
    
    // Prevent deleting the current user
    if (username === user.username) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid operation',
          message: 'You cannot delete your own account.'
        })
      };
    }
    
    // Find the user to delete
    const userToDelete = await User.findOne({ username });
    
    if (!userToDelete) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'User not found',
          message: `User with username ${username} not found.`
        })
      };
    }
    
    // Delete the user
    await User.deleteOne({ username });
    
    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User deleted successfully'
      })
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    
    // Standardized error handling
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const errorMessage = isDevelopment ? error.message : 'An error occurred while deleting the user';
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Failed to delete user', 
        message: errorMessage,
        details: isDevelopment ? error.stack : undefined
      })
    };
  }
};

// Export the handler with middleware applied
exports.handler = withCors(
  withAuth(
    withDatabase(deleteUserHandler),
    { requiredRole: 'admin' } // Require admin role for this endpoint
  ),
  { methods: ['POST'] } // Only allow POST requests
);
