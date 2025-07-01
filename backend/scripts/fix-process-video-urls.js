/**
 * Script to fix process step video URLs in MongoDB
 * 
 * This script updates any old or invalid video URLs in process steps with new, 
 * working URLs. Similar to how we fixed the PowerPoint presentation URLs.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// Get MongoDB connection string from environment
const uri = process.env.MONGODB_URI || "mongodb+srv://username:password@cluster.mongodb.net/wms?retryWrites=true&w=majority";
const dbName = 'wms';

// URL validator
function isValidUrl(url) {
  if (!url) return false;
  
  try {
    // Check if URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }
    
    // Check if it's not a placeholder
    if (url.includes('example.com') || url.includes('placeholder')) {
      return false;
    }
    
    return true;
  } catch (e) {
    return false;
  }
}

// Working video URLs to use as replacements
const replacementUrls = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
];

// Function to get a random URL from the replacement list
function getRandomUrl() {
  const randomIndex = Math.floor(Math.random() * replacementUrls.length);
  return replacementUrls[randomIndex];
}

async function main() {
  // Connect to MongoDB
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    
    const database = client.db(dbName);
    const processes = database.collection('processes');
    
    // Find all processes
    const allProcesses = await processes.find({}).toArray();
    console.log(`Found ${allProcesses.length} processes in the database`);
    
    let updatedProcessCount = 0;
    let updatedStepCount = 0;
    
    // Process each document
    for (const process of allProcesses) {
      let processUpdated = false;
      
      // Check if process has steps
      if (!process.steps || !Array.isArray(process.steps)) {
        console.log(`Process ${process._id} has no steps array. Creating empty steps array.`);
        process.steps = [];
        processUpdated = true;
      }
      
      // Process each step
      for (const step of process.steps) {
        // Check if step has a videoUrl and if it's valid
        if (!step.videoUrl || !isValidUrl(step.videoUrl)) {
          console.log(`Fixing invalid video URL in process ${process._id}, step ${step.id || 'unknown'}`);
          
          // Old URL for logging
          const oldUrl = step.videoUrl || 'none';
          
          // Set to a new valid URL
          step.videoUrl = getRandomUrl();
          
          console.log(`  Changed URL from: ${oldUrl}`);
          console.log(`  To new URL: ${step.videoUrl}`);
          
          processUpdated = true;
          updatedStepCount++;
        }
      }
      
      // Save the updated process if changes were made
      if (processUpdated) {
        console.log(`Saving updates for process ${process._id}...`);
        
        const updateResult = await processes.updateOne(
          { _id: process._id },
          { $set: { steps: process.steps } }
        );
        
        console.log(`Update result: ${updateResult.modifiedCount} document(s) modified`);
        updatedProcessCount++;
      }
    }
    
    console.log('\n--- Summary ---');
    console.log(`Total processes found: ${allProcesses.length}`);
    console.log(`Processes updated: ${updatedProcessCount}`);
    console.log(`Total steps with updated URLs: ${updatedStepCount}`);
    
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

// Run the script
main().catch(console.error);
