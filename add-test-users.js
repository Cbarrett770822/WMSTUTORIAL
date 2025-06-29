/**
 * Script to add test users to the MongoDB database
 * This will create admin, supervisor, and regular users
 */

// Load environment variables
require('dotenv').config({ path: './backend/.env.development.local' });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

// Define the User schema (matching the one used in the application)
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    default: '' 
  },
  role: { 
    type: String, 
    enum: ['user', 'supervisor', 'admin'], 
    default: 'user' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: { 
    type: Date 
  }
});

// Add password hashing before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified or new
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt and hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Add method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create the User model
const User = mongoose.model('User', userSchema);

// Test users to add
const testUsers = [
  {
    username: 'admin',
    password: 'password',
    name: 'Admin User',
    role: 'admin'
  },
  {
    username: 'supervisor',
    password: 'password',
    name: 'Supervisor User',
    role: 'supervisor'
  },
  {
    username: 'user',
    password: 'password',
    name: 'Regular User',
    role: 'user'
  },
  {
    username: 'john.doe',
    password: 'password',
    name: 'John Doe',
    role: 'user'
  },
  {
    username: 'jane.smith',
    password: 'password',
    name: 'Jane Smith',
    role: 'user'
  }
];

// Function to connect to MongoDB
async function connectToDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Function to add test users
async function addTestUsers() {
  try {
    await connectToDatabase();
    
    console.log('Adding test users to the database...');
    
    // Check for existing users first
    const existingUsers = await User.find({ username: { $in: testUsers.map(user => user.username) } });
    const existingUsernames = existingUsers.map(user => user.username);
    
    console.log('Existing users:', existingUsernames.length ? existingUsernames.join(', ') : 'None');
    
    // Add users that don't already exist
    for (const userData of testUsers) {
      if (!existingUsernames.includes(userData.username)) {
        const user = new User(userData);
        await user.save();
        console.log(`Created user: ${userData.username} (${userData.role})`);
      } else {
        console.log(`User ${userData.username} already exists, skipping`);
      }
    }
    
    // Display all users in the database
    const allUsers = await User.find().select('-password');
    console.log('\nAll users in database:');
    allUsers.forEach(user => {
      console.log(`- ${user.username} (${user.role}): ${user.name}`);
    });
    
    console.log('\nTest users added successfully!');
  } catch (error) {
    console.error('Error adding test users:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the script
addTestUsers();
