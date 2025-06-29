// Script to check MongoDB users collection
const mongoose = require('mongoose');

// MongoDB connection URI
const MONGODB_URI = 'mongodb://localhost:27017/wms-tutorial';

// Define User schema to match the application's User model
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
  createdAt: Date
});

const User = mongoose.model('User', UserSchema);

async function checkUsers() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB successfully');
    
    // Count users
    const userCount = await User.countDocuments();
    console.log(`Total users in collection: ${userCount}`);
    
    // Get all users (excluding passwords)
    const users = await User.find().select('-password');
    
    if (users.length === 0) {
      console.log('No users found in the database');
    } else {
      console.log('Users found in the database:');
      users.forEach(user => {
        console.log(`- Username: ${user.username}, Role: ${user.role}, Created: ${user.createdAt}`);
      });
    }
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
checkUsers();
