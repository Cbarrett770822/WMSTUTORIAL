require('dotenv').config();
const mongoose = require('mongoose');
const Process = require('../netlify/functions/models/Process');

// MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charlesbtt7722:8LwMaauBS4Opqody@cluster0.eslgbjq.mongodb.net/wms-tutorial?retryWrites=true&w=majority';

async function testProcessDeletion() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');
    
    // Count processes before deletion
    const beforeCount = await Process.countDocuments({});
    console.log(`Found ${beforeCount} processes before deletion`);
    
    if (beforeCount === 0) {
      console.log('No processes to delete. Testing insertion and then deletion...');
      
      // Create a test process
      const testProcess = new Process({
        id: 'test-deletion-process',
        title: 'Test Process for Deletion',
        name: 'Test Process',
        description: 'This process was created to test deletion',
        steps: [
          {
            id: 'test-step',
            title: 'Test Step',
            videoUrl: 'https://example.com/test-video'
          }
        ]
      });
      
      await testProcess.save();
      console.log('Test process created successfully');
      
      const afterInsertCount = await Process.countDocuments({});
      console.log(`Now have ${afterInsertCount} processes`);
    }
    
    // List all processes before deletion
    const processes = await Process.find({}).lean();
    console.log('\nExisting processes before deletion:');
    processes.forEach(process => {
      console.log(`ID: ${process.id}, Title: ${process.title || process.name || 'Unnamed'}, Steps: ${process.steps?.length || 0}`);
    });
    
    // Attempt to delete all processes with different methods
    console.log('\nTesting different deletion methods...');
    
    // Method 1: deleteMany with empty filter
    console.log('\nMethod 1: Process.deleteMany({})');
    try {
      const deleteResult1 = await Process.deleteMany({});
      console.log(`Result: Deleted ${deleteResult1.deletedCount} processes`);
      
      // Check if deletion was successful
      const afterDelete1 = await Process.countDocuments({});
      console.log(`Remaining processes: ${afterDelete1}`);
      
      if (afterDelete1 === 0) {
        console.log('✅ Method 1 successfully deleted all processes');
      } else {
        console.log('❌ Method 1 failed to delete all processes');
        
        // If method 1 failed, reset by adding test processes back
        if (processes.length > 0) {
          await Process.insertMany(processes);
          console.log('Restored original processes for next test');
        }
      }
    } catch (error) {
      console.error('Error with Method 1:', error.message);
    }
    
    // Method 2: remove all
    console.log('\nMethod 2: Process.collection.deleteMany({})');
    try {
      const deleteResult2 = await Process.collection.deleteMany({});
      console.log(`Result: Deleted ${deleteResult2.deletedCount} processes`);
      
      // Check if deletion was successful
      const afterDelete2 = await Process.countDocuments({});
      console.log(`Remaining processes: ${afterDelete2}`);
      
      if (afterDelete2 === 0) {
        console.log('✅ Method 2 successfully deleted all processes');
      } else {
        console.log('❌ Method 2 failed to delete all processes');
      }
    } catch (error) {
      console.error('Error with Method 2:', error.message);
    }
    
    // Final check
    const finalCount = await Process.countDocuments({});
    console.log(`\nFinal process count: ${finalCount}`);
    if (finalCount === 0) {
      console.log('✅ SUCCESS: All processes were deleted');
    } else {
      console.log('❌ FAILURE: Failed to delete all processes');
      
      // List remaining processes
      const remainingProcesses = await Process.find({}).lean();
      console.log('\nRemaining processes:');
      remainingProcesses.forEach(process => {
        console.log(`ID: ${process.id}, Title: ${process.title || process.name || 'Unnamed'}`);
      });
    }
    
  } catch (error) {
    console.error('Error testing process deletion:', error);
  } finally {
    if (mongoose.connection) {
      await mongoose.connection.close();
      console.log('\nMongoDB connection closed');
    }
  }
}

// Run the test
testProcessDeletion();
