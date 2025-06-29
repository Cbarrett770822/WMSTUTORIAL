// Debug script to test the getProcesses API endpoint and check process titles
require('dotenv').config({ path: './backend/.env.development.local' });
const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://wms-tutorial-user:wms-tutorial-password@cluster0.mongodb.net/wms-tutorial';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const API_URL = 'http://localhost:8889/.netlify/functions';

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

async function testProcessesAPI() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
    
    // Find admin user for token generation
    const User = mongoose.model('User', new mongoose.Schema({
      username: String,
      role: String
    }));
    
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('No admin user found in database');
      return;
    }
    
    console.log(`Found admin user: ${adminUser.username} with role: ${adminUser.role}`);
    
    // Create simple token
    const simpleToken = `${adminUser._id}:${adminUser.username}:${adminUser.role}`;
    console.log('Created simple token:', simpleToken);
    
    // Create JWT token
    const jwtToken = jwt.sign(
      { 
        id: adminUser._id, 
        username: adminUser.username, 
        role: adminUser.role 
      }, 
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('Created JWT token:', jwtToken);
    
    // Test API with simple token
    console.log('\n--- Testing getProcesses API with Simple Token ---');
    let processesData = {};
    try {
      const processesResponse = await axios.get(`${API_URL}/getProcesses`, {
        headers: {
          'Authorization': `Bearer ${simpleToken}`
        }
      });
      
      processesData = processesResponse.data;
      console.log('API Response Status:', processesResponse.status);
      console.log('API Response Data Structure:', Object.keys(processesData));
      console.log(`Found ${processesData.processes?.length || 0} processes via API`);
      
      // Check for title/name issues
      if (processesData.processes && processesData.processes.length > 0) {
        console.log('\n--- Process Title Analysis ---');
        processesData.processes.forEach((process, index) => {
          console.log(`Process ${index + 1}:`);
          console.log(`  ID: ${process.id || process._id}`);
          console.log(`  title: ${process.title || '(missing)'}`);
          console.log(`  name: ${process.name || '(missing)'}`);
          console.log(`  displayTitle: ${process.displayTitle || '(missing)'}`);
        });
      }
    } catch (error) {
      console.error('API request failed:', error.message);
      console.log('Error response:', error.response?.data);
    }
    
    // Directly query the database
    console.log('\n--- Directly Querying Database ---');
    const processes = await Process.find().lean();
    console.log(`Found ${processes.length} processes in database`);
    
    if (processes.length > 0) {
      console.log('\n--- Database Process Title Analysis ---');
      processes.forEach((process, index) => {
        console.log(`Process ${index + 1}:`);
        console.log(`  ID: ${process.id || process._id}`);
        console.log(`  title: ${process.title || '(missing)'}`);
        console.log(`  name: ${process.name || '(missing)'}`);
        // Note: virtuals are not available in lean() queries
      });
    }
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
    return {
      apiProcesses: processesData.processes || [],
      databaseProcesses: processes
    };
  } catch (error) {
    console.error('Error in test script:', error);
    // Try to close MongoDB connection if it's open
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Execute the test
testProcessesAPI().then(results => {
  console.log('\n--- Test Results Summary ---');
  
  if (results) {
    const apiCount = results.apiProcesses.length;
    const dbCount = results.databaseProcesses.length;
    
    console.log(`API returned ${apiCount} processes`);
    console.log(`Database contains ${dbCount} processes`);
    
    if (apiCount > 0) {
      const missingTitles = results.apiProcesses.filter(p => !p.title && !p.name).length;
      console.log(`Processes with missing titles: ${missingTitles}`);
    }
  }
});
