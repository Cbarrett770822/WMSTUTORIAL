// Script to check the wms-tutorial MongoDB database and its collections
const { MongoClient } = require('mongodb');

// MongoDB connection URI from environment file
require('dotenv').config({ path: './backend/.env.development.local' });

// Get the MongoDB URI from environment variables or use the hardcoded one
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charlesbtt7722:8LwMaauBS4Opqody@cluster0.eslgbjq.mongodb.net/wms-tutorial?retryWrites=true&w=majority';

async function checkWmsTutorialDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB Atlas...');
    console.log('Using connection string:', MONGODB_URI.substring(0, MONGODB_URI.indexOf('@') + 1) + '...');
    await client.connect();
    console.log('Connected to MongoDB Atlas successfully');
    
    // Extract database name from URI
    const dbName = MONGODB_URI.split('/').pop().split('?')[0];
    console.log(`\nExamining database: ${dbName}`);
    
    const db = client.db(dbName);
    
    // List all collections in the database
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log(`No collections found in the ${dbName} database`);
    } else {
      console.log(`Collections found in the ${dbName} database:`);
      for (const collection of collections) {
        console.log(`- ${collection.name}`);
        
        // Count documents in this collection
        const count = await db.collection(collection.name).countDocuments();
        console.log(`  Documents: ${count}`);
        
        // Show sample documents if any exist
        if (count > 0) {
          const samples = await db.collection(collection.name).find().limit(2).toArray();
          console.log(`  Sample document:`);
          console.log(JSON.stringify(samples[0], null, 2));
        }
      }
    }
    
    // Check if there's a users collection specifically
    const usersCollection = collections.find(c => c.name === 'users');
    if (usersCollection) {
      console.log('\nExamining users collection in detail:');
      const users = await db.collection('users').find().toArray();
      console.log(`Found ${users.length} users:`);
      users.forEach(user => {
        // Don't show password hash for security
        const { password, ...userWithoutPassword } = user;
        console.log(`- Username: ${user.username}, Role: ${user.role || 'N/A'}, ID: ${user._id}`);
      });
    } else {
      console.log('\nNo users collection found in the database.');
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
checkWmsTutorialDatabase();
