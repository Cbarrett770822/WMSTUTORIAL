/**
 * Fix Development Fallback Authentication
 * 
 * This script enables development fallback authentication by setting
 * the DISABLE_DEV_FALLBACK environment variable to false.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Path to the environment file
const envPath = path.join(__dirname, '..', '.env.development.local');

// Check if the file exists
if (!fs.existsSync(envPath)) {
  console.error(`Error: ${envPath} does not exist`);
  process.exit(1);
}

// Read the current environment variables
console.log(`Reading environment variables from ${envPath}`);
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Check the current value of DISABLE_DEV_FALLBACK
const currentValue = envConfig.DISABLE_DEV_FALLBACK;
console.log(`Current DISABLE_DEV_FALLBACK value: ${currentValue}`);

// Update the DISABLE_DEV_FALLBACK value to false
envConfig.DISABLE_DEV_FALLBACK = 'false';

// Convert the updated config back to a string
const updatedEnvContent = Object.entries(envConfig)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

// Write the updated content back to the file
fs.writeFileSync(envPath, updatedEnvContent);

console.log(`Updated DISABLE_DEV_FALLBACK to false in ${envPath}`);
console.log('Development fallback authentication is now enabled.');
console.log('\nPlease restart your backend server for the changes to take effect:');
console.log('npx netlify dev --port 8889');
