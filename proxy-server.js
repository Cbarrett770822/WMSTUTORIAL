const express = require('express');
const http = require('http');
const cors = require('cors');

const app = express();
const PORT = 3005;
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8889';

// Enable CORS for all routes
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Handle all requests manually
app.all('*', (req, res) => {
  const options = {
    hostname: 'localhost',
    port: 8889,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: 'localhost:8889'
    }
  };

  // Log the outgoing request
  console.log(`Proxying ${req.method} request to: ${BACKEND_URL}${req.url}`);

  // Create the proxy request
  const proxyReq = http.request(options, (proxyRes) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Copy all other headers from the backend response
    Object.keys(proxyRes.headers).forEach(key => {
      // Skip CORS headers as we've already set them
      if (!key.toLowerCase().startsWith('access-control-')) {
        res.setHeader(key, proxyRes.headers[key]);
      }
    });
    
    // Set the status code
    res.statusCode = proxyRes.statusCode;
    
    // Log the response
    console.log(`Received ${proxyRes.statusCode} response from backend`);
    
    // Pipe the response data
    proxyRes.pipe(res);
  });

  // Handle errors
  proxyReq.on('error', (error) => {
    console.error('Proxy error:', error);
    res.statusCode = 500;
    res.end('Proxy error: ' + error.message);
  });

  // If there's request data, pipe it to the proxy request
  if (req.body) {
    proxyReq.write(JSON.stringify(req.body));
  }

  // End the request
  proxyReq.end();
});

// Start server
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Proxying requests to ${BACKEND_URL}`);
});
