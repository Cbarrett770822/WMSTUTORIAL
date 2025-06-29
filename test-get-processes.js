const http = require('http');

// Get authentication token from localStorage if running in browser
const getAuthToken = () => {
  // For Node.js testing, use a hardcoded development token
  // Format: userId:username:role
  return 'admin-dev-id:admin:admin';
};

function testGetProcesses() {
  const token = getAuthToken();
  console.log('Using auth token:', token);
  
  // Use the direct Netlify Functions URL
  console.log('Fetching processes from Netlify Functions endpoint');
  
  const options = {
    hostname: 'localhost',
    port: 8889,
    path: '/.netlify/functions/getProcesses',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('API Response:', JSON.stringify(jsonData, null, 2));
        
        // Check if processes have steps
        if (jsonData.processes && Array.isArray(jsonData.processes)) {
          console.log(`Found ${jsonData.processes.length} processes`);
          
          // Check each process for steps
          jsonData.processes.forEach((process, index) => {
            console.log(`
Process ${index + 1}: ${process.title || process.name}`);
            console.log(`ID: ${process.id}`);
            
            if (process.steps && Array.isArray(process.steps)) {
              console.log(`Steps: ${process.steps.length}`);
              
              // Log first step details if available
              if (process.steps.length > 0) {
                console.log('First step:', {
                  title: process.steps[0].title,
                  hasDescription: !!process.steps[0].description,
                  hasVideoUrl: !!process.steps[0].videoUrl
                });
              }
            } else {
              console.log('Steps: MISSING or NOT AN ARRAY');
            }
          });
        } else {
          console.log('No processes found in the response');
        }
      } catch (error) {
        console.error('Error parsing JSON response:', error);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('Error testing getProcesses API:', error);
  });
  
  req.end();
}

// Run the test
testGetProcesses();
