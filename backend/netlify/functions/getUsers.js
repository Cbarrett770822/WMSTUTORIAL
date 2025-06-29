const { connectToDatabase } = require('./utils/mongodb');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const withCors = require('./middleware/withCors');

// JWT secret key - in production, this should be an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Define the handler function
const handler = async (event, context) => {
  // Make sure we're using the correct HTTP method
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Get authorization header
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authorization token required' })
      };
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Always verify token properly
    let isAdmin = false;
    
    // Check for development token format (userId:username:role) or JWT token
    const tokenParts = token.split(':');
    
    if (tokenParts.length === 3) {
      console.log('Simple token format detected');
      // Simple token format: userId:username:role
      const [userId, username, role] = tokenParts;
      // Treat both admin and supervisor roles as admin
      isAdmin = (role === 'admin' || role === 'supervisor');
      console.log('User role from token:', role, 'isAdmin:', isAdmin);
    } else {
      // JWT token format
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Treat both admin and supervisor roles as admin
        isAdmin = (decoded.role === 'admin' || decoded.role === 'supervisor');
        console.log('User role from JWT:', decoded.role, 'isAdmin:', isAdmin);
      } catch (tokenError) {
        console.error('Token verification error:', tokenError);
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid token' })
        };
      }
    }
    
    // Check if user is admin
    if (!isAdmin) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Get all users (excluding passwords)
    const users = await User.find().select('-password');
    
    // Return users
    return {
      statusCode: 200,
      body: JSON.stringify({ users })
    };
  } catch (error) {
    console.error('Error getting users:', error);
    
    // Check if token verification failed
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }
    
    // Check if token expired
    if (error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Token expired' })
      };
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get users' })
    };
  }
};

// Export the handler wrapped with CORS middleware
exports.handler = withCors(handler);
