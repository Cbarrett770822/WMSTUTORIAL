/**
 * Add User Function
 * 
 * This serverless function adds a new user to the database.
 * It requires admin authentication to use.
 * Uses middleware pattern for authentication, database connection, and CORS handling.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const withAuth = require('./middleware/withAuth');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');
const { User } = require('./models/User');

// Environment variables
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

/**
 * Core handler function for adding a new user
 * This is wrapped with middleware for authentication, database, and CORS
 */
const addUserHandler = async (event, context, { userId, username, role, headers, mongoose }) => {
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
    // Parse the request body
    let userData;
    try {
      userData = JSON.parse(event.body);
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
    
    // Validate required fields
    if (!userData.username || !userData.password) {
      diagnostics.validation = { valid: false, reason: 'missing_required_fields' };
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          message: 'Username and password are required',
          error: 'Validation error',
          diagnostics: isDevelopment ? diagnostics : undefined
        })
      };
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ username: userData.username });
    if (existingUser) {
      diagnostics.userExists = true;
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ 
          success: false, 
          message: 'Username already exists',
          error: 'Duplicate username',
          diagnostics: isDevelopment ? diagnostics : undefined
        })
      };
    }
    
    diagnostics.validation = { valid: true };
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    // Create new user
    const newUser = new User({
      username: userData.username,
      password: hashedPassword,
      role: userData.role || 'user',
      createdBy: userId
    });
    
    // Save user to database
    const savedUser = await newUser.save();
    diagnostics.dbOperation = { success: true, operation: 'create', userId: savedUser._id };
    
    // Return success response with user data (excluding password)
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User created successfully',
        user: {
          id: savedUser._id,
          username: savedUser.username,
          role: savedUser.role,
          createdAt: savedUser.createdAt
        },
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  } catch (error) {
    console.error('Error adding user:', error);
    diagnostics.error = { message: error.message, name: error.name };
    
    // Determine appropriate error message based on environment
    const errorMessage = isDevelopment 
      ? `Failed to add user: ${error.message}` 
      : 'An error occurred while adding the user';
    
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
    withDatabase(addUserHandler),
    { requiredRole: 'admin' } // Only allow admin users to add new users
  ),
  { methods: ['POST'] } // Only allow POST requests
);
