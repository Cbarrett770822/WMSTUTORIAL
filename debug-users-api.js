// Debug script to test the getUsers API endpoint
require('dotenv').config({ path: './backend/.env.development.local' });
const axios = require('axios');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-development-secret-key';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charlesbtt7722:8LwMaauBS4Opqody@cluster0.eslgbjq.mongodb.net/wms-tutorial';
const API_URL = 'http://localhost:8889/.netlify/functions';

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Create a test token for admin user
async function createTestToken() {
  try {
    // Connect to MongoDB
    const db = await connectToMongoDB();
    
    // Find the admin user
    const adminUser = await db.collection('users').findOne({ username: 'admin' });
    
    if (!adminUser) {
      throw new Error('Admin user not found in database');
    }
    
    console.log('Found admin user:', adminUser.username, 'with role:', adminUser.role);
    
    // Create a simple token (userId:username:role)
    const simpleToken = `${adminUser._id}:${adminUser.username}:${adminUser.role}`;
    console.log('Created simple token:', simpleToken);
    
    // Create a JWT token
    const jwtToken = jwt.sign(
      { 
        id: adminUser._id.toString(),
        username: adminUser.username,
        role: adminUser.role
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('Created JWT token:', jwtToken);
    
    return { simpleToken, jwtToken, user: adminUser };
  } catch (error) {
    console.error('Error creating test token:', error);
    throw error;
  }
}

// Test the getUsers API
async function testGetUsersAPI() {
  try {
    // Create a test token
    const { simpleToken, jwtToken, user } = await createTestToken();
    
    console.log('\n--- Testing getUsers API with Simple Token ---');
    // Test with simple token
    let simpleTokenData = {};
    try {
      const simpleTokenResponse = await axios.get(`${API_URL}/getUsers`, {
        headers: {
          'Authorization': `Bearer ${simpleToken}`
        }
      });
      
      simpleTokenData = simpleTokenResponse.data;
      console.log('API Response Status:', simpleTokenResponse.status);
      console.log('API Response Data:', JSON.stringify(simpleTokenData, null, 2));
    } catch (error) {
      console.error('Simple token request failed:', error.message);
      console.log('Error response:', error.response?.data);
      simpleTokenData = error.response?.data || { error: error.message };
    }
    
    console.log('\n--- Testing getUsers API with JWT Token ---');
    // Test with JWT token
    let jwtTokenData = {};
    try {
      const jwtTokenResponse = await axios.get(`${API_URL}/getUsers`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      
      jwtTokenData = jwtTokenResponse.data;
      console.log('API Response Status:', jwtTokenResponse.status);
      console.log('API Response Data:', JSON.stringify(jwtTokenData, null, 2));
    } catch (error) {
      console.error('JWT token request failed:', error.message);
      console.log('Error response:', error.response?.data);
      jwtTokenData = error.response?.data || { error: error.message };
    }
    
    // Directly query the database
    console.log('\n--- Directly Querying Database ---');
    const db = mongoose.connection;
    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
    console.log('Users in database:', users.length);
    users.forEach(user => {
      console.log(`- ${user.username} (${user.role})`);
    });
    
    // Close the MongoDB connection
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
    
    return { simpleTokenData, jwtTokenData, databaseUsers: users };
  } catch (error) {
    console.error('Error testing getUsers API:', error);
    // Make sure to close the MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('MongoDB connection closed');
    }
    throw error;
  }
}

// Execute the test
testGetUsersAPI().then(results => {
  console.log('\n--- Test Results Summary ---');
  
  // Check simple token response
  if (Array.isArray(results.simpleTokenData)) {
    console.log('Simple Token API returned users:', results.simpleTokenData.length);
  } else if (results.simpleTokenData.users && Array.isArray(results.simpleTokenData.users)) {
    console.log('Simple Token API returned users:', results.simpleTokenData.users.length);
  } else {
    console.log('Simple Token API did not return users array');
    console.log('Simple Token API response type:', typeof results.simpleTokenData);
    console.log('Simple Token API response structure:', Object.keys(results.simpleTokenData || {}));
  }
  
  // Check JWT token response
  if (Array.isArray(results.jwtTokenData)) {
    console.log('JWT Token API returned users:', results.jwtTokenData.length);
  } else if (results.jwtTokenData.users && Array.isArray(results.jwtTokenData.users)) {
    console.log('JWT Token API returned users:', results.jwtTokenData.users.length);
  } else {
    console.log('JWT Token API did not return users array');
    console.log('JWT Token API response type:', typeof results.jwtTokenData);
    console.log('JWT Token API response structure:', Object.keys(results.jwtTokenData || {}));
  }
  
  console.log('Database contains users:', results.databaseUsers.length);
  
  // Check for issues
  if (results.simpleTokenData.error) {
    console.error('Simple Token API Error:', results.simpleTokenData.error);
  }
  
  if (results.jwtTokenData.error) {
    console.error('JWT Token API Error:', results.jwtTokenData.error);
  }
  
  if (results.databaseUsers.length === 0) {
    console.error('No users found in database!');
  }
  
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
