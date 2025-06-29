/**
 * Update User Function
 * 
 * This serverless function updates an existing user's information.
 * It requires admin authentication to access.
 * Uses middleware for authentication, database connection, and CORS handling.
 */

const User = require('./models/User');
const bcrypt = require('bcryptjs');
const withAuth = require('./middleware/withAuth');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');

// Core handler function that will be wrapped with middleware
const updateUserHandler = async (event, context, user) => {
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
          message: 'You must have admin privileges to update users.'
        })
      };
    }
    
    // Parse the request body
    const { username, updates } = JSON.parse(event.body);
    
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
    
    if (!updates) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid request',
          message: 'No updates provided.'
        })
      };
    }
    
    // Find the user to update
    const userToUpdate = await User.findOne({ username });
    
    if (!userToUpdate) {
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
    
    // Apply updates
    if (updates.name) {
      userToUpdate.name = updates.name;
    }
    
    if (updates.role) {
      userToUpdate.role = updates.role;
    }
    
    // Handle password update if provided
    if (updates.password) {
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      userToUpdate.password = await bcrypt.hash(updates.password, salt);
    }
    
    // Save the updated user
    await userToUpdate.save();
    
    // Return success response with updated user (excluding password)
    const updatedUser = {
      id: userToUpdate._id,
      username: userToUpdate.username,
      name: userToUpdate.name,
      role: userToUpdate.role,
      updatedAt: new Date().toISOString()
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User updated successfully',
        user: updatedUser
      })
    };
  } catch (error) {
    console.error('Error updating user:', error);
    
    // Standardized error handling
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const errorMessage = isDevelopment ? error.message : 'An error occurred while updating the user';
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Failed to update user', 
        message: errorMessage,
        details: isDevelopment ? error.stack : undefined
      })
    };
  }
};

// Export the handler with middleware applied
exports.handler = withCors(
  withAuth(
    withDatabase(updateUserHandler),
    { requiredRole: 'admin' } // Require admin role for this endpoint
  ),
  { methods: ['POST'] } // Only allow POST requests
);
