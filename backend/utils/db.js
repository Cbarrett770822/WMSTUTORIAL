/**
 * Database Connection Utility
 * 
 * This file re-exports the database connection functionality from the
 * netlify/functions/utils/mongodb.js file to maintain compatibility
 * with functions that import from '../utils/db'.
 */

// Import the database connection functionality from the existing file
const { connectToDatabase } = require('../netlify/functions/utils/mongodb');

// Re-export the functionality
module.exports = { connectToDatabase };
