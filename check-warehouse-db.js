// Script to check the warehouse database
const { MongoClient } = require('mongodb');

// MongoDB connection URI
const MONGODB_URI = 'mongodb://localhost:27017';

async function checkWarehouseDb() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    // Check the warehouse database
    console.log('\nExamining warehouse database:');
    const warehouseDb = client.db('warehouse');
    
    // List all collections
    const collections = await warehouseDb.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('No collections found in the warehouse database');
    } else {
      console.log('Collections found in the warehouse database:');
      for (const collection of collections) {
        console.log(`\n- Collection: ${collection.name}`);
        
        // Count documents
        const count = await warehouseDb.collection(collection.name).countDocuments();
        console.log(`  Documents: ${count}`);
        
        // Check if users collection exists
        if (collection.name === 'users' && count > 0) {
          console.log('\n  Users collection details:');
          const users = await warehouseDb.collection('users').find().toArray();
          console.log(`  Found ${users.length} users:`);
          users.forEach(user => {
            console.log(`  - Username: ${user.username || 'N/A'}, Role: ${user.role || 'N/A'}`);
          });
        }
        
        // Show sample document
        if (count > 0) {
          const sample = await warehouseDb.collection(collection.name).findOne();
          console.log('  Sample document:');
          console.log('  ' + JSON.stringify(sample, null, 2).replace(/\n/g, '\n  '));
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the function
checkWarehouseDb();
