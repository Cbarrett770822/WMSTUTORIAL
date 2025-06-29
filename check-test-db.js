// Script to check MongoDB test database
const mongoose = require('mongoose');

// MongoDB connection URI for test database in Atlas
const MONGODB_URI = 'mongodb+srv://charlesbtt7722:8LwMaauBS4Opqody@cluster0.eslgbjq.mongodb.net/test?retryWrites=true&w=majority';

async function checkTestDb() {
  try {
    // Connect to MongoDB test database
    console.log('Connecting to MongoDB test database...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB test database successfully');
    
    // Get list of collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('No collections found in the test database');
    } else {
      console.log('Collections found in the test database:');
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
      
      // Check if there's a users collection
      const hasUsersCollection = collections.some(c => c.name === 'users');
      if (hasUsersCollection) {
        // Define a temporary User model to query the users collection
        const UserSchema = new mongoose.Schema({}, { strict: false });
        const User = mongoose.model('User', UserSchema);
        
        // Count and list users
        const userCount = await User.countDocuments();
        console.log(`\nTotal users in 'users' collection: ${userCount}`);
        
        if (userCount > 0) {
          const users = await User.find().limit(10);
          console.log('Sample users (up to 10):');
          users.forEach((user, index) => {
            console.log(`\nUser ${index + 1}:`);
            console.log(JSON.stringify(user, null, 2));
          });
        }
      }
    }
  } catch (error) {
    console.error('Error connecting to MongoDB test database:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
checkTestDb();
