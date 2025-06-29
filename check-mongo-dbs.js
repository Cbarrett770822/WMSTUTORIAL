// Script to check all MongoDB databases and collections
const { MongoClient } = require('mongodb');

// MongoDB connection URI
const MONGODB_URI = 'mongodb://localhost:27017';

async function checkAllDatabases() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    // List all databases
    const adminDb = client.db('admin');
    const dbs = await adminDb.admin().listDatabases();
    
    console.log('\nAvailable databases:');
    dbs.databases.forEach(db => {
      console.log(`- ${db.name} (${db.sizeOnDisk} bytes)`);
    });
    
    // Specifically check the test database
    console.log('\nExamining test database:');
    const testDb = client.db('test');
    
    // List all collections in test database
    const collections = await testDb.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('No collections found in the test database');
    } else {
      console.log('Collections found in the test database:');
      for (const collection of collections) {
        console.log(`- ${collection.name}`);
        
        // Count documents in this collection
        const count = await testDb.collection(collection.name).countDocuments();
        console.log(`  Documents: ${count}`);
        
        // Show sample documents if any exist
        if (count > 0) {
          const samples = await testDb.collection(collection.name).find().limit(2).toArray();
          console.log(`  Sample document:`);
          console.log(JSON.stringify(samples[0], null, 2));
        }
      }
    }
    
    // Check if there's a users collection specifically
    const usersCollection = collections.find(c => c.name === 'users');
    if (usersCollection) {
      console.log('\nExamining users collection in detail:');
      const users = await testDb.collection('users').find().toArray();
      console.log(`Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`- Username: ${user.username}, Role: ${user.role || 'N/A'}`);
      });
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
checkAllDatabases();
