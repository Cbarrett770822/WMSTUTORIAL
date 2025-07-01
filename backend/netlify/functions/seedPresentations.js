/**
 * Seed Presentations Function
 * 
 * This serverless function adds sample presentations to the database.
 * It can be used to initialize the database with sample data.
 */

const mongoose = require('mongoose');
const withDatabase = require('./middleware/withDatabase');
const withCors = require('./middleware/withCors');
const Presentation = require('./models/Presentation');

// Sample presentations with real, accessible URLs
const samplePresentations = [
  {
    id: 'sample1',
    title: 'WMS Introduction',
    description: 'An introduction to Warehouse Management Systems and their benefits',
    url: 'https://www2.isye.gatech.edu/~spyros/courses/IE6202/Fall-2002/Presentations/WMS-Intro.ppt',
    isLocal: false,
    fileType: 'ppt',
    sourceType: 'other',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sample2',
    title: 'Inbound Processes',
    description: 'Detailed overview of receiving and putaway processes',
    url: 'https://www.cob.calpoly.edu/directory/wp-content/uploads/sites/2/2016/09/Warehouse-Management.pptx',
    isLocal: false,
    fileType: 'pptx',
    sourceType: 'other',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sample3',
    title: 'Inventory Management',
    description: 'Best practices for inventory management in a WMS',
    url: 'https://www.rit.edu/academicaffairs/sites/rit.edu.academicaffairs/files/docs/Inventory%20Management.pptx',
    isLocal: false,
    fileType: 'pptx',
    sourceType: 'other',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

/**
 * Core handler function for seeding presentations
 */
const seedPresentationsHandler = async (event, context, { mongoose }) => {
  // Set CORS headers for browser clients
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  try {
    console.log('Starting to seed presentations...');
    
    // First, check if there are any existing presentations
    const existingCount = await Presentation.countDocuments({});
    console.log(`Found ${existingCount} existing presentations`);
    
    // Clear existing presentations if requested via query parameter
    const queryParams = event.queryStringParameters || {};
    if (queryParams.clear === 'true') {
      console.log('Clearing existing presentations...');
      await Presentation.deleteMany({});
      console.log('Existing presentations cleared');
    }
    
    // Insert sample presentations
    console.log('Inserting sample presentations...');
    const results = [];
    
    for (const presentation of samplePresentations) {
      // Check if this presentation already exists (by id)
      const existing = await Presentation.findOne({ id: presentation.id });
      
      if (existing) {
        console.log(`Presentation with id ${presentation.id} already exists, updating...`);
        const updated = await Presentation.findOneAndUpdate(
          { id: presentation.id },
          { ...presentation, updatedAt: new Date() },
          { new: true }
        );
        results.push(updated);
      } else {
        console.log(`Adding new presentation: ${presentation.title}`);
        const newPresentation = new Presentation(presentation);
        await newPresentation.save();
        results.push(newPresentation);
      }
    }
    
    console.log(`Successfully seeded ${results.length} presentations`);
    
    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully seeded ${results.length} presentations`,
        count: results.length,
        presentations: results
      })
    };
  } catch (error) {
    console.error('Error seeding presentations:', error);
    
    // Return error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Failed to seed presentations',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

// Export the handler with middleware applied
exports.handler = withCors(withDatabase(seedPresentationsHandler));
