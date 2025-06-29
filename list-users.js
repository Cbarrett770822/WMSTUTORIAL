// Script to list users in the wms-tutorial database
const { MongoClient } = require('mongodb');

// MongoDB connection URI
const MONGODB_URI = 'mongodb+srv://charlesbtt7722:8LwMaauBS4Opqody@cluster0.eslgbjq.mongodb.net/wms-tutorial?retryWrites=true&w=majority';

async function listUsers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    // Get database reference
    const db = client.db('wms-tutorial');
    
    // Get all users from the users collection
    const users = await db.collection('users').find().toArray();
    
    console.log('\nUsers in wms-tutorial database:');
    console.log('-------------------------------');
    
    if (users.length === 0) {
      console.log('No users found in the database');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. Username: ${user.username}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log('-------------------------------');
      });
      
      console.log(`Total users: ${users.length}`);
    }
    
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  } finally {
    // Close the connection
    await client.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the function
listUsers();
