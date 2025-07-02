const { connectToDatabase } = require('./utils/mongodb');
const mongoose = require('mongoose');

// Define the handler function
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma',
    'Content-Type': 'application/json'
  };

  try {
    console.log('Starting category fix process...');
    
    // Connect to the database using the application's connection method
    await connectToDatabase();
    console.log('Connected to MongoDB');
    
    // Categories to assign
    const categories = ['inbound', 'storage', 'outbound', 'advanced'];
    
    // Get the processes collection
    const db = mongoose.connection.db;
    const processesCollection = db.collection('processes');
    
    // Find processes with null or missing categories
    const processes = await processesCollection.find({ 
      $or: [
        { category: null },
        { category: { $exists: false } }
      ]
    }).toArray();
    
    console.log(`Found ${processes.length} processes with missing categories`);
    
    // Update processes with missing categories
    let updateCount = 0;
    const updateOperations = [];
    
    for (const process of processes) {
      // Assign a category based on index to distribute them evenly
      const categoryIndex = updateCount % categories.length;
      const newCategory = categories[categoryIndex];
      
      console.log(`Updating process ${process._id || process.id} (${process.title || process.name || 'Unnamed'}) with category: ${newCategory}`);
      
      // Add update operation to the batch
      updateOperations.push({
        updateOne: {
          filter: { _id: process._id },
          update: { $set: { category: newCategory } }
        }
      });
      
      updateCount++;
    }
    
    // Execute the bulk update if there are operations
    if (updateOperations.length > 0) {
      const result = await processesCollection.bulkWrite(updateOperations);
      console.log(`Updated ${result.modifiedCount} processes with missing categories`);
    }
    
    // Verify the updates
    const updatedProcesses = await processesCollection.find({}).toArray();
    const categoryCounts = {};
    
    // Count processes by category
    updatedProcesses.forEach(process => {
      const category = process.category || 'null';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    console.log('Category distribution after update:');
    console.log(categoryCounts);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Updated ${updateCount} processes with missing categories`,
        categoryCounts
      })
    };
    
  } catch (error) {
    console.error('Error fixing process categories:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Failed to fix categories: ${error.message}`
      })
    };
  }
};
