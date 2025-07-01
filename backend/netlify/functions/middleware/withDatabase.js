/**
 * Database Connection Middleware
 * 
 * Provides consistent database connection handling for Netlify Functions.
 * This eliminates redundant connection code across API endpoints.
 */

const mongoose = require('mongoose');

// MongoDB Atlas connection URI - always use Atlas in production
const MONGODB_ATLAS_URI = 'mongodb+srv://charlesbtt7722:8LwMaauBS4Opqody@cluster0.eslgbjq.mongodb.net/wms-tutorial?retryWrites=true&w=majority';

// Always use MongoDB Atlas in Netlify environment
let MONGODB_URI;

// Check if we're in a Netlify environment
const isNetlify = process.env.NETLIFY === 'true' || process.env.CONTEXT === 'production' || process.env.CONTEXT === 'deploy-preview' || process.env.CONTEXT === 'branch-deploy';

// Force MongoDB Atlas in production or Netlify environments
if (process.env.NODE_ENV === 'production' || isNetlify) {
  console.log('Using MongoDB Atlas in production/Netlify environment');
  MONGODB_URI = MONGODB_ATLAS_URI;
} else {
  // In development, use the environment variable or fallback to Atlas
  MONGODB_URI = process.env.MONGODB_URI || MONGODB_ATLAS_URI;
  console.log(`Using ${MONGODB_URI.includes('mongodb+srv') ? 'MongoDB Atlas' : 'local MongoDB'} in development`);
}

// Track connection status to avoid multiple connections
let isConnected = false;

// Store the mongoose instance to ensure we're using the same one
let mongooseInstance = mongoose;

/**
 * Connect to MongoDB database
 * @returns {Promise<mongoose.Connection>} - Mongoose connection
 */
const connectToDatabase = async () => {
  // Log connection attempt
  console.log(`Connecting to MongoDB: ${MONGODB_URI.substring(0, 20)}... (readyState: ${mongoose.connection.readyState})`);
  
  // Check connection state
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('Using existing database connection');
    return mongoose.connection;
  }

  // If connection is in a different state, handle accordingly
  if (mongoose.connection.readyState !== 0) {
    console.log('Closing existing connection before reconnecting');
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error('Error closing existing connection:', closeError);
      // Continue with reconnection attempt regardless
    }
  }

  console.log('Creating new database connection');
  
  try {
    // Configure Mongoose connection
    mongoose.set('strictQuery', false);
    
    // Connect to MongoDB with the same URI every time
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout for server selection
      connectTimeoutMS: 10000, // 10 seconds timeout for initial connection
      socketTimeoutMS: 45000, // 45 seconds timeout for socket operations
    });
    
    // Set up error handler for connection
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error event:', err);
      console.error('Detailed connection error:', JSON.stringify(err, null, 2));
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
    });
    
    // Wait for connection to be ready
    await new Promise((resolve, reject) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('connected', resolve);
        mongoose.connection.once('error', reject);
      }
    });
    
    // Update connection status
    isConnected = true;
    console.log('Database connection established successfully');
    
    return mongoose.connection;
  } catch (error) {
    console.error('Error connecting to database:', error);
    isConnected = false;
    throw error;
  }
};

/**
 * Database middleware for Netlify Functions
 * @param {Function} handler - The handler function to wrap
 * @returns {Function} - Wrapped handler function with database connection
 */
const withDatabase = (handler, options = {}) => {
  return async (event, context, authContext = {}) => {
    // Make context callbackWaitsForEmptyEventLoop = false to reuse connection
    context.callbackWaitsForEmptyEventLoop = false;
    
    let connection;
    try {
      // Force new connection if requested
      if (options.forceNewConnection && isConnected) {
        console.log('Forcing new database connection');
        await mongoose.connection.close();
        isConnected = false;
      }
      
      // Connect to database and ensure it's ready
      connection = await connectToDatabase();
      
      // Verify connection is active before proceeding
      if (!connection || mongoose.connection.readyState !== 1) {
        throw new Error('Database connection not ready');
      }
      
      // Add database connection to context
      const dbContext = {
        ...authContext,
        db: connection,
        mongoose,
        client: mongoose.connection.getClient() // Add direct access to MongoDB client
      };
      
      // Call the handler with database context
      const result = await handler(event, context, dbContext);
      return result;
    } catch (error) {
      console.error('Database middleware error:', error);
      
      // Determine if this is a connection error or an operation error
      const errorType = !connection || mongoose.connection.readyState !== 1
        ? 'Database connection error'
        : 'Database operation error';
      
      // Log connection details on error
      console.error('Database error details:', {
        readyState: mongoose.connection.readyState,
        connectionString: MONGODB_URI.substring(0, 20) + '...',
        environment: process.env.NODE_ENV || 'not set',
        netlifyContext: process.env.CONTEXT || 'not set'
      });
      
      // Return error response with more details in development
      // Try to reconnect on next request
      isConnected = false;
      
      return {
        statusCode: 500,
        headers: authContext.headers || {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: errorType,
          message: error.message || 'Failed to perform database operation',
          details: process.env.NODE_ENV === 'development' ? {
            name: error.name,
            stack: error.stack
          } : undefined
        })
      };
    }
  };
};

module.exports = withDatabase;
