/**
 * Get Notes Function
 * 
 * This serverless function retrieves user notes from the database.
 * Uses middleware pattern for database connection and CORS handling.
 */

const mongoose = require('mongoose');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');

// Environment variables
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Define the Notes schema if it doesn't exist in models
let Notes;
if (!mongoose.models.Notes) {
  const NotesSchema = new mongoose.Schema({
    userId: {
      type: String,
      required: true,
      index: true
    },
    notes: {
      type: Array,
      default: []
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  });
  
  Notes = mongoose.model('Notes', NotesSchema);
} else {
  Notes = mongoose.models.Notes;
}

/**
 * Core handler function for retrieving user notes
 * This is wrapped with middleware for database and CORS
 */
const getNotesHandler = async (event, context, { headers, mongoose }) => {
  // Diagnostics collection for debugging and monitoring
  const diagnostics = {
    environment: isDevelopment ? 'development' : 'production',
    timestamp: new Date().toISOString(),
    requestInfo: {
      method: event.httpMethod,
      path: event.path,
      source: event.headers['user-agent'] || 'unknown'
    }
  };

  try {
    // Get user ID from query parameters or use 'guest'
    const userId = event.queryStringParameters?.userId || 'guest';
    diagnostics.userId = userId;
    
    // Find notes for the user
    const userNotes = await Notes.findOne({ userId });
    diagnostics.notesFound = !!userNotes;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Notes retrieved successfully',
        notes: userNotes?.notes || [],
        timestamp: new Date().toISOString(),
        diagnostics: isDevelopment ? diagnostics : undefined
      })
    };
  } catch (error) {
    console.error('Error retrieving notes:', error);
    diagnostics.error = { message: error.message, name: error.name };
    
    // Determine appropriate error message based on environment
    const errorMessage = isDevelopment 
      ? `Failed to retrieve notes: ${error.message}` 
      : 'An error occurred while retrieving notes';
    
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
// withDatabase middleware handles the MongoDB connection
// withCors middleware handles CORS headers and preflight requests
exports.handler = withCors(
  withDatabase(getNotesHandler),
  { methods: ['GET'] } // Only allow GET requests
);
