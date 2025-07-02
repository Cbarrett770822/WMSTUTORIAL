// Script to create a .env file during Netlify build process
const fs = require('fs');
const path = require('path');

// Get the directory where this script is running
const currentDir = __dirname;

// Create .env content with environment variables from Netlify
const envContent = `
NODE_ENV=production
MONGODB_URI=${process.env.MONGODB_URI || 'mongodb+srv://charlesbtt7722:8LwMaauBS4Opqody@cluster0.eslgbjq.mongodb.net/wms-tutorial?retryWrites=true&w=majority'}
JWT_SECRET=${process.env.JWT_SECRET || 'your-secret-key-for-jwt-tokens-wms-tutorial'}
DEBUG_DB_CONNECTION=true
`;

// Write the .env file
fs.writeFileSync(path.join(currentDir, '.env'), envContent.trim());

console.log('Environment file created successfully for Netlify functions');
