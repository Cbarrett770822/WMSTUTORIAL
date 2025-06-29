// Script to fix missing process titles in the MongoDB database
require('dotenv').config({ path: './backend/.env.development.local' });
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://wms-tutorial-user:wms-tutorial-password@cluster0.mongodb.net/wms-tutorial';

// Define Process schema to match the backend
const StepSchema = new mongoose.Schema({
  id: String,
  title: String,
  description: String,
  videoUrl: String
});

const ProcessSchema = new mongoose.Schema({
  id: String,
  title: String,
  name: String,
  description: String,
  category: String,
  userId: String,
  updatedAt: Date,
  updatedBy: String,
  steps: [StepSchema]
}, { 
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add the same virtual as in the backend
ProcessSchema.virtual('displayTitle').get(function() {
  return this.title || this.name;
});

const Process = mongoose.model('Process', ProcessSchema);

// Utility function to normalize process data
const normalizeProcess = (process) => {
  if (!process) return process;
  
  const normalized = { ...process.toObject() };
  
  // Ensure title and name are synchronized
  if (!normalized.title && normalized.name) {
    normalized.title = normalized.name;
  } else if (!normalized.name && normalized.title) {
    normalized.name = normalized.title;
  } else if (!normalized.title && !normalized.name) {
    // Generate a default title if both are missing
    const category = normalized.category || 'general';
    const shortId = (normalized.id || normalized._id.toString() || '').slice(-6);
    const defaultTitle = `${category.charAt(0).toUpperCase() + category.slice(1)} Process ${shortId}`;
    normalized.title = defaultTitle;
    normalized.name = defaultTitle;
  }
  
  // Ensure process has an ID
  if (!normalized.id) {
    normalized.id = normalized._id.toString();
  }
  
  // Update timestamps
  normalized.updatedAt = new Date();
  
  return normalized;
};

async function fixProcessTitles() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
    
    // Find all processes
    const processes = await Process.find();
    console.log(`Found ${processes.length} processes in database`);
    
    // Track stats
    let updated = 0;
    let alreadyOk = 0;
    let errors = 0;
    
    // Process each process (no pun intended)
    for (const process of processes) {
      try {
        const originalTitle = process.title || process.name || '(missing)';
        const hasTitle = process.title && process.title.trim().length > 0;
        const hasName = process.name && process.name.trim().length > 0;
        
        if (!hasTitle || !hasName) {
          // Normalize the process
          const normalizedData = normalizeProcess(process);
          
          // Update the process in the database
          Object.assign(process, normalizedData);
          await process.save();
          
          console.log(`Updated process ${process._id}:`);
          console.log(`  Original title: ${originalTitle}`);
          console.log(`  New title: ${process.title}`);
          console.log(`  New name: ${process.name}`);
          updated++;
        } else {
          console.log(`Process ${process._id} already has title and name: ${process.title}`);
          alreadyOk++;
        }
      } catch (error) {
        console.error(`Error updating process ${process._id}:`, error);
        errors++;
      }
    }
    
    // Print summary
    console.log('\n--- Summary ---');
    console.log(`Total processes: ${processes.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Already OK: ${alreadyOk}`);
    console.log(`Errors: ${errors}`);
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error in script:', error);
    // Try to close MongoDB connection if it's open
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Execute the fix
fixProcessTitles();
