/**
 * Netlify Deployment Script with Environment Variables
 * 
 * This script deploys the backend to Netlify with the required environment variables.
 */

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to mask input (for passwords/secrets)
function promptSecret(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    
    let input = '';
    const stdin = process.stdin;
    
    // Configure stdin
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf-8');
    
    stdin.on('data', (key) => {
      const charCode = key.charCodeAt(0);
      
      // If Ctrl+C, exit
      if (charCode === 3) {
        console.log('\nDeployment cancelled');
        process.exit(1);
      }
      
      // If Enter key, finish input
      if (charCode === 13) {
        stdin.setRawMode(false);
        stdin.pause();
        console.log(''); // New line after input
        resolve(input);
        return;
      }
      
      // If backspace/delete
      if (charCode === 8 || charCode === 127) {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b'); // Erase character from terminal
        }
        return;
      }
      
      // Add character to input and show * in terminal
      input += key;
      process.stdout.write('*');
    });
  });
}

// Main function
async function deployWithEnvironmentVariables() {
  console.log('🚀 Netlify Deployment with Environment Variables');
  console.log('==============================================\n');
  
  try {
    // Check if netlify-cli is installed
    try {
      execSync('netlify --version', { stdio: 'ignore' });
    } catch (error) {
      console.log('⚠️ Netlify CLI not found. Installing...');
      execSync('npm install -g netlify-cli', { stdio: 'inherit' });
    }
    
    // Check if user is logged in to Netlify
    try {
      execSync('netlify status', { stdio: 'ignore' });
    } catch (error) {
      console.log('⚠️ You need to log in to Netlify first');
      execSync('netlify login', { stdio: 'inherit' });
    }
    
    // Collect environment variables
    console.log('\n📝 Please provide the required environment variables:');
    
    const mongodbUri = await prompt('MongoDB URI (mongodb+srv://...): ');
    if (!mongodbUri || !mongodbUri.startsWith('mongodb')) {
      throw new Error('Invalid MongoDB URI format. It should start with mongodb:// or mongodb+srv://');
    }
    
    const jwtSecret = await promptSecret('JWT Secret (will be masked): ');
    if (!jwtSecret || jwtSecret.length < 8) {
      throw new Error('JWT Secret is too short. It should be at least 8 characters.');
    }
    
    const debugDb = await prompt('Enable debug DB connection? (true/false, default: false): ') || 'false';
    const disableFallback = await prompt('Disable dev fallback users? (true/false, default: false): ') || 'false';
    
    // Create temporary .env file for deployment
    const envContent = `MONGODB_URI=${mongodbUri}
JWT_SECRET=${jwtSecret}
DEBUG_DB_CONNECTION=${debugDb}
DISABLE_DEV_FALLBACK=${disableFallback}`;
    
    const tempEnvPath = path.join(__dirname, '.env.temp');
    fs.writeFileSync(tempEnvPath, envContent);
    
    console.log('\n🔧 Environment variables set. Deploying to Netlify...');
    
    // Deploy to Netlify with environment variables
    try {
      execSync(`netlify deploy --prod --dir=public --functions=netlify/functions --env .env.temp`, { 
        stdio: 'inherit',
        cwd: __dirname
      });
      
      console.log('\n✅ Deployment successful!');
      console.log('🌐 Your backend is now deployed with the required environment variables.');
      console.log('\n⚠️ Note: The environment variables have been set in your Netlify dashboard.');
      console.log('   You can manage them there in the future.');
    } catch (error) {
      console.error('\n❌ Deployment failed:', error.message);
    }
    
    // Clean up temporary .env file
    try {
      fs.unlinkSync(tempEnvPath);
    } catch (error) {
      console.warn('Warning: Could not remove temporary .env file');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

// Run the deployment function
deployWithEnvironmentVariables();
