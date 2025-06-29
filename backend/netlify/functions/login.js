/**
 * Login Function
 * 
 * This serverless function handles user authentication.
 * It supports both database authentication and development fallback users.
 * Uses middleware for database connection and CORS handling.
 */

const User = require('./models/User');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');

// For debugging
console.log('Login function initialized');
console.log('Environment:', process.env.NODE_ENV || 'not set');
console.log('Database authentication enabled - always using database');

// Core handler function that will be wrapped with middleware
const loginHandler = async (event, context) => {
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
    },
    devMode: {
      isDevelopment,
      disableDevFallback
    }
  };

  try {
    // Parse the request body
    const { username, password } = JSON.parse(event.body);
    
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
    
    // Log the login attempt for debugging
    console.log(`Login attempt for user: ${username}`);
    diagnostics.loginAttempt = { username, timestamp: new Date().toISOString() };
    
    // Development fallback for admin user when database connection fails
    let user;
    let dbConnectionFailed = false;
    
    try {
      // Find user by username - database connection is handled by withDatabase middleware
      console.log('Searching for user:', username);
      user = await User.findOne({ username });
      console.log('User found:', !!user);
      diagnostics.userLookup = { found: !!user };
      
      // If no user found and this is the first login, create default users
      if (!user && isDevelopment && defaultUsers.includes(username) && password === 'password') {
        console.log(`User ${username} not found, creating default user...`);
        try {
          // Create default user
          const defaultRole = username === 'admin' ? 'admin' : (username === 'supervisor' ? 'supervisor' : 'user');
          const newUser = new User({
            username,
            password, // Will be hashed by the pre-save hook
            role: defaultRole
          });
          
          user = await newUser.save();
          console.log(`Created default ${defaultRole} user:`, username);
          diagnostics.userCreation = { success: true, role: defaultRole };
        } catch (createError) {
          console.error('Error creating default user:', createError);
          // Create a fallback user object since we couldn't save to the database
          user = {
            _id: `${username}-dev-id`,
            username: username,
            role: username === 'admin' ? 'admin' : (username === 'supervisor' ? 'supervisor' : 'user'),
            comparePassword: async (pwd) => pwd === 'password'
          };
          console.log('Using in-memory fallback user:', username);
          diagnostics.userCreation = { success: false, fallback: true, error: createError.message };
        }
      }
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      dbConnectionFailed = true;
      diagnostics.databaseError = { message: dbError.message, stack: dbError.stack };
      
      // In development, allow any default user to login with default password (unless disabled)
      // disableDevFallback is already defined at the top of the file
      console.log('Using disableDevFallback value in DB error handler:', disableDevFallback);
      
      if (isDevelopment && !disableDevFallback && password === 'password') {
        // Check if username matches any of our default users
        const defaultRoles = {'admin': 'admin', 'user': 'user', 'supervisor': 'supervisor'};
        console.log('Development mode enabled, checking for default users...');
        
        if (defaultUsers.includes(username)) {
          console.log(`Using development fallback for ${username} authentication`);
          user = {
            _id: `${username}-dev-id`,
            username: username,
            role: defaultRoles[username] || 'user',
            comparePassword: async (pwd) => pwd === 'password'
          };
        } else {
          throw dbError; // Re-throw for non-default users
        }
      } else {
        // Log detailed error information if debug is enabled
        if (process.env.DEBUG_DB_CONNECTION === 'true') {
          console.error('Detailed database error:', {
            name: dbError.name,
            message: dbError.message,
            stack: dbError.stack,
            code: dbError.code,
            codeName: dbError.codeName
          });
        }
        throw dbError; // Re-throw for production or when fallback is disabled
      }
    }
    
    // If no user found and not using fallback
    if (!user && !dbConnectionFailed) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          success: false, 
          message: 'Invalid credentials' 
        })
      };
    }
    
    // Check password (skip if using fallback)
    let isPasswordValid = false;
    
    // Always use database authentication
    console.log('Using database authentication for', username);
    diagnostics.authentication = { method: 'database' };

    if (user && typeof user.comparePassword === 'function') {
      try {
        console.log('Attempting to validate password with comparePassword method...');
        isPasswordValid = await user.comparePassword(password);
        console.log('Password validation result:', isPasswordValid ? 'valid' : 'invalid');
      } catch (pwdError) {
        console.error('Error comparing password:', pwdError);
        isPasswordValid = false;
      }
    } else {
      console.error('User object does not have comparePassword method');
      isPasswordValid = false;
    }
    
    if (!isPasswordValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          success: false, 
          message: 'Invalid credentials' 
        })
      };
    }
    
    // Ensure user has a role, defaulting to 'user' if not set
    const userRole = user.role || 'user';
    
    // For admin users, always ensure role is explicitly set to 'admin'
    const finalRole = username === 'admin' ? 'admin' : userRole;
    
    // Create a simple identifier instead of a JWT token
    const userId = user._id ? (user._id.toString ? user._id.toString() : user._id) : `${username}-dev-id`;
    
    // Format: userId:username:role
    const token = `${userId}:${user.username}:${finalRole}`;
    
    // Create a consistent user object for the response
    const userResponse = {
      id: userId,
      username: user.username,
      role: finalRole
    };
    
    console.log('Login successful for user:', userResponse);
    
    // Return success response with token and user info
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Login successful',
        token,
        user: userResponse,
        diagnostics: diagnostics
      })
    };
  } catch (error) {
    console.error('Error logging in:', error);
    
    // Determine the appropriate error message and status code
    let statusCode = 500;
    let errorMessage = 'Failed to login. Server error occurred.';
    
    // Handle specific error types
    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      statusCode = 400;
      errorMessage = 'Invalid request format. Please provide valid JSON.';
    } else if (error.name === 'MongoServerSelectionError') {
      errorMessage = 'Database connection error. Please try again later.';
    } else if (error.name === 'MongoNetworkError') {
      errorMessage = 'Network error connecting to database. Please try again later.';
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
  withDatabase(loginHandler),
  { methods: ['POST'] } // Only allow POST requests
);
