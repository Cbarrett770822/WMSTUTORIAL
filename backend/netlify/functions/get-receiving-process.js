const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const connectToDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://charlesbtt7722:8LwMaauBS4Opqody@cluster0.eslgbjq.mongodb.net/wms-tutorial?retryWrites=true&w=majority';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
};

// Process schema
const processSchema = new mongoose.Schema({
  title: String,
  name: String,
  category: String,
  description: String,
  steps: [{
    title: String,
    description: String,
    videoUrl: String
  }]
}, { strict: false });

// Handler
exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Connect to MongoDB
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to connect to database' })
      };
    }
    
    // Define the Process model
    const Process = mongoose.models.Process || mongoose.model('Process', processSchema);
    
    // Find receiving processes
    const receivingProcesses = await Process.find({ 
      $or: [
        { category: { $regex: /receiving/i } },
        { category: { $regex: /inbound/i } },
        { title: { $regex: /receiving/i } },
        { name: { $regex: /receiving/i } },
        { description: { $regex: /receiving/i } }
      ]
    });
    
    if (!receivingProcesses || receivingProcesses.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'No receiving processes found' })
      };
    }
    
    // Extract video URLs from each process
    const processesWithUrls = receivingProcesses.map(process => {
      const videoUrls = process.steps
        .filter(step => step.videoUrl)
        .map(step => ({
          stepTitle: step.title,
          videoUrl: step.videoUrl
        }));
      
      return {
        processId: process._id,
        processTitle: process.title || process.name || 'Untitled Process',
        category: process.category,
        videoUrls
      };
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify(processesWithUrls)
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
};
