/**
 * Fix Presentations Script
 * 
 * This script fixes any presentations in the database that are missing the userId field
 * by adding a default userId or making sure the schema validation works correctly.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wms-tutorial';
const DEFAULT_ADMIN_ID = process.env.DEFAULT_ADMIN_ID || 'admin-dev-id';

console.log('Starting fix-presentations script...');
console.log(`Using MongoDB URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

// Define the Presentation schema
const PresentationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: false, // Make userId optional to support global presentations
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  isLocal: {
    type: Boolean,
    default: false
  },
  fileType: {
    type: String,
    enum: ['ppt', 'pptx', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'other'],
    default: 'pptx'
  },
  sourceType: {
    type: String,
    enum: ['s3', 'dropbox', 'gdrive', 'gslides', 'onedrive', 'local', 'other'],
    default: 'other'
  },
  thumbnailUrl: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');
  runFix();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Define the Presentation model
const Presentation = mongoose.model('Presentation', PresentationSchema);

// Function to run the fix
async function runFix() {
  try {
    // Find all presentations
    const presentations = await Presentation.find({});
    console.log(`Found ${presentations.length} presentations in the database`);

    // Count presentations without userId
    const presentationsWithoutUserId = presentations.filter(p => !p.userId);
    console.log(`Found ${presentationsWithoutUserId.length} presentations without userId`);

    // Fix presentations without userId
    if (presentationsWithoutUserId.length > 0) {
      console.log('Fixing presentations without userId...');
      
      for (const presentation of presentationsWithoutUserId) {
        // Make these presentations global by explicitly setting userId to null
        // This is different from not having the field at all
        presentation.userId = null;
        await presentation.save();
        console.log(`Fixed presentation: ${presentation.title} (${presentation.id})`);
      }
      
      console.log('All presentations fixed successfully');
    } else {
      console.log('No presentations need fixing');
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    console.log('Script completed successfully');
    
  } catch (error) {
    console.error('Error fixing presentations:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}
