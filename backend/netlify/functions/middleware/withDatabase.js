/**
 * Database Connection Middleware
 * 
 * Provides consistent database connection handling for Netlify Functions.
 * This eliminates redundant connection code across API endpoints.
 */

const mongoose = require('mongoose');

// MongoDB connection URI - in production, this should be an environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wms-tutorial';

// Track connection status to avoid multiple connections
let isConnected = false;

/**
 * Connect to MongoDB database
 * @returns {Promise<mongoose.Connection>} - Mongoose connection
 */
const connectToDatabase = async () => {
  if (isConnected) {
    console.log('Using existing database connection');
    return mongoose.connection;
  }

  console.log('Creating new database connection');
  
  try {
    // Configure Mongoose connection
    mongoose.set('strictQuery', false);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Update connection status
    isConnected = true;
    console.log('Database connection established successfully');
    
    return mongoose.connection;
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
};

/**
 * Database middleware for Netlify Functions
 * @param {Function} handler - The handler function to wrap
 * @returns {Function} - Wrapped handler function with database connection
 */
const withDatabase = (handler) => {
  return async (event, context, authContext = {}) => {
    // Make context callbackWaitsForEmptyEventLoop = false to reuse connection
    context.callbackWaitsForEmptyEventLoop = false;
    
    try {
      // Connect to database
      const connection = await connectToDatabase();
      
      // Add database connection to context
      const dbContext = {
        ...authContext,
        db: connection,
        mongoose
      };
      
      // Call the handler with database context
      return handler(event, context, dbContext);
    } catch (error) {
      console.error('Database middleware error:', error);
      
      // Return error response
      return {
        statusCode: 500,
        headers: authContext.headers || {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Database connection error',
          message: 'Failed to connect to database'
        })
      };
    }
  };
};

module.exports = withDatabase;
