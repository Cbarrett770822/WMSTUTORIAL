/**
 * Add Default Presentations Script
 * 
 * This script adds default presentations to the database
 * to ensure the application has initial data to work with.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wms-tutorial';
const DEFAULT_ADMIN_ID = process.env.DEFAULT_ADMIN_ID || 'admin-dev-id';

console.log('Starting add-default-presentations script...');
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
    required: false, // Optional to support global presentations
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

// Pre-save middleware to detect source type and file type
PresentationSchema.pre('save', function(next) {
  // Update the updatedAt timestamp
  this.updatedAt = new Date();
  
  // Detect file type from URL
  const url = this.url.toLowerCase();
  if (url.endsWith('.ppt')) this.fileType = 'ppt';
  else if (url.endsWith('.pptx')) this.fileType = 'pptx';
  else if (url.endsWith('.pdf')) this.fileType = 'pdf';
  else if (url.endsWith('.doc')) this.fileType = 'doc';
  else if (url.endsWith('.docx')) this.fileType = 'docx';
  else if (url.endsWith('.xls')) this.fileType = 'xls';
  else if (url.endsWith('.xlsx')) this.fileType = 'xlsx';
  else this.fileType = 'other';
  
  // Detect source type from URL
  if (this.isLocal) {
    this.sourceType = 'local';
  } else if (url.includes('s3.amazonaws.com')) {
    this.sourceType = 's3';
  } else if (url.includes('dropbox.com')) {
    this.sourceType = 'dropbox';
  } else if (url.includes('drive.google.com')) {
    this.sourceType = 'gdrive';
  } else if (url.includes('docs.google.com/presentation')) {
    this.sourceType = 'gslides';
  } else if (url.includes('onedrive.live.com') || url.includes('sharepoint.com')) {
    this.sourceType = 'onedrive';
  } else {
    this.sourceType = 'other';
  }
  
  next();
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');
  addDefaultPresentations();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Define the Presentation model
const Presentation = mongoose.model('Presentation', PresentationSchema);

// Default presentations data
const defaultPresentations = [
  {
    id: uuidv4(),
    title: 'WMS Introduction',
    description: 'An introduction to Warehouse Management Systems',
    url: 'https://docs.google.com/presentation/d/1Kp2MHsAcYNAUMRQC2nxWAQt9-PmjGKKBMU5WVZNJ4Vo/edit?usp=sharing',
    isLocal: false
  },
  {
    id: uuidv4(),
    title: 'Inventory Management Best Practices',
    description: 'Learn about best practices for inventory management in warehouses',
    url: 'https://docs.google.com/presentation/d/1qJLUZJLwZcG7BxDYEGX5SZZ8J3vH4KrMQvLQHbX2lWQ/edit?usp=sharing',
    isLocal: false
  },
  {
    id: uuidv4(),
    title: 'Warehouse Optimization Techniques',
    description: 'Advanced techniques for optimizing warehouse operations',
    url: 'https://docs.google.com/presentation/d/1XgXbXMUX7Zl5NJmABGgQHKS0DMbj9xQ2aNX9QZJZJHs/edit?usp=sharing',
    isLocal: false
  },
  {
    id: uuidv4(),
    userId: DEFAULT_ADMIN_ID,
    title: 'Admin Training Materials',
    description: 'Training materials for system administrators',
    url: 'https://docs.google.com/presentation/d/1YZ9LmNLo8YX7KYZ8JYZ9YZ9LmNLo8YX7KYZ8JYZ9YZ9/edit?usp=sharing',
    isLocal: false
  }
];

// Function to add default presentations
async function addDefaultPresentations() {
  try {
    // Check if presentations already exist
    const existingCount = await Presentation.countDocuments();
    console.log(`Found ${existingCount} existing presentations in the database`);
    
    if (existingCount > 0) {
      console.log('Database already has presentations, skipping default data creation');
    } else {
      console.log('Adding default presentations...');
      
      // Create presentations
      for (const presentationData of defaultPresentations) {
        const presentation = new Presentation(presentationData);
        await presentation.save();
        console.log(`Added presentation: ${presentation.title}`);
      }
      
      console.log(`Successfully added ${defaultPresentations.length} default presentations`);
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    console.log('Script completed successfully');
    
  } catch (error) {
    console.error('Error adding default presentations:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}
