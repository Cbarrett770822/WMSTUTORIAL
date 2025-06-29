// Script to check environment variables
require('dotenv').config({ path: './backend/.env.development.local' });

console.log('Environment Variables:');
console.log('---------------------');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 
  process.env.MONGODB_URI.substring(0, process.env.MONGODB_URI.indexOf('@') + 1) + '...' : 'not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '[HIDDEN]' : 'not set');
console.log('DISABLE_DEV_FALLBACK:', process.env.DISABLE_DEV_FALLBACK || 'not set');
console.log('DEBUG_DB_CONNECTION:', process.env.DEBUG_DB_CONNECTION || 'not set');
console.log('PORT:', process.env.PORT || 'not set');
console.log('REACT_APP_DEV_MODE:', process.env.REACT_APP_DEV_MODE || 'not set');

// Check if the .env file exists
const fs = require('fs');
const path = require('path');

const envPaths = [
  './.env',
  './.env.development',
  './.env.development.local',
  './backend/.env',
  './backend/.env.development',
  './backend/.env.development.local',
  './frontend/.env',
  './frontend/.env.development',
  './frontend/.env.development.local',
];

console.log('\nChecking for .env files:');
envPaths.forEach(envPath => {
  const fullPath = path.resolve(envPath);
  try {
    fs.accessSync(fullPath, fs.constants.F_OK);
    console.log(`✓ ${envPath} exists`);
    
    // Read and display file contents
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    console.log(`  Contents (${lines.length} variables):`);
    lines.forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (key === 'MONGODB_URI' && value) {
          console.log(`  - ${key}=${value.substring(0, value.indexOf('@') + 1)}...`);
        } else if (key === 'JWT_SECRET' && value) {
          console.log(`  - ${key}=[HIDDEN]`);
        } else {
          console.log(`  - ${key}=${value}`);
        }
      }
    });
  } catch (err) {
    console.log(`✗ ${envPath} does not exist`);
  }
});

// Check if we can connect to MongoDB with the current environment variables
const mongoose = require('mongoose');

async function testMongoConnection() {
  console.log('\nTesting MongoDB Connection:');
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('No MongoDB URI found in environment variables');
    return;
  }
  
  try {
    console.log(`Connecting to MongoDB: ${uri.substring(0, uri.indexOf('@') + 1)}...`);
    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB successfully');
    
    // Check if users collection exists and has documents
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const hasUsersCollection = collections.some(c => c.name === 'users');
    
    if (hasUsersCollection) {
      const usersCount = await db.collection('users').countDocuments();
      console.log(`✓ Users collection exists with ${usersCount} documents`);
      
      if (usersCount > 0) {
        const users = await db.collection('users').find().limit(5).toArray();
        console.log('Sample users:');
        users.forEach(user => {
          const { password, ...userWithoutPassword } = user;
          console.log(`- ${user.username} (${user.role})`);
        });
      }
    } else {
      console.log('✗ Users collection does not exist');
    }
    
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
  }
}

testMongoConnection();
