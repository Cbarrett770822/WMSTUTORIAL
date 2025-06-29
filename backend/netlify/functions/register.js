/**
 * Register Function
 * 
 * This serverless function handles user registration.
 * Uses middleware for database connection and CORS handling.
 */

const User = require('./models/User');
const jwt = require('jsonwebtoken');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Core handler function that will be wrapped with middleware
const registerHandler = async (event, context) => {
  // Set default headers for responses
  const headers = {
    'Content-Type': 'application/json'
  };

  // Context setup
  context.callbackWaitsForEmptyEventLoop = false;
  
  // Diagnostics collection for debugging and monitoring
  const diagnostics = {
    environment: process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
    requestInfo: {
      method: event.httpMethod,
      path: event.path,
      source: event.headers['user-agent'] || 'unknown'
    }
  };

  try {
    // Parse the request body
    const { username, password, role } = JSON.parse(event.body);
    
    // Validate input
    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          message: 'Username and password are required',
          error: 'Validation error'
        })
      };
    }
    
    // Log the registration attempt for debugging
    console.log(`Registration attempt for user: ${username}`);
    diagnostics.registrationAttempt = { username, timestamp: new Date().toISOString() };
    
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          message: 'Username already exists',
          error: 'Duplicate username'
        })
      };
    }
    
    // Create new user
    const newUser = new User({
      username,
      password, // Will be hashed by the pre-save hook
      role: role || 'user' // Default to 'user' if role not specified
    });
    
    // Save user to database
    await newUser.save();
    console.log(`Created new user: ${username} with role: ${newUser.role}`);
    diagnostics.userCreation = { success: true, role: newUser.role };
    
    // Create JWT token
    const token = jwt.sign(
      { userId: newUser._id, username: newUser.username, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Create a simple identifier token as well (userId:username:role)
    const simpleToken = `${newUser._id}:${newUser.username}:${newUser.role}`;
    
    // Create a consistent user object for the response
    const userResponse = {
      id: newUser._id,
      username: newUser.username,
      role: newUser.role
    };
    
    // Return success response with token and user info
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User registered successfully',
        token: isDevelopment ? simpleToken : token, // Use simple token in dev for easier debugging
        user: userResponse,
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  } catch (error) {
    console.error('Error registering user:', error);
    
    // Determine the appropriate error message and status code
    let statusCode = 500;
    let errorMessage = 'Failed to register user. Server error occurred.';
    
    // Handle specific error types
    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      statusCode = 400;
      errorMessage = 'Invalid request format. Please provide valid JSON.';
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = 'Invalid user data provided.';
    } else if (error.code === 11000) { // MongoDB duplicate key error
      statusCode = 400;
      errorMessage = 'Username already exists.';
    }
    
    // Development mode: provide more detailed error information
    if (isDevelopment) {
      console.log('Development mode: Providing detailed error information');
      return {
        statusCode: statusCode,
        headers,
        body: JSON.stringify({ 
          success: false, 
          message: errorMessage,
          error: error.message,
          stack: error.stack,
          name: error.name
        })
      };
    }
    
    // Production mode: limited error information
    return {
      statusCode: statusCode,
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: errorMessage
      })
    };
  }
};

// Export the handler with middleware applied
// withDatabase middleware handles the MongoDB connection
// withCors middleware handles CORS headers and preflight requests
exports.handler = withCors(
  withDatabase(registerHandler),
  { methods: ['POST'] } // Only allow POST requests
);
