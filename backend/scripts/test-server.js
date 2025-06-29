const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Create Express app
const app = express();
const PORT = 3001;

// In-memory storage
let processesStore = [];
let presentationsStore = [];
let userSettingsStore = {};

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Test route that doesn't require authentication
app.get('/api/test', (req, res) => {
  console.log('GET /api/test - Test endpoint accessed');
  res.json({ 
    success: true, 
    message: 'Test server is running correctly',
    timestamp: new Date().toISOString()
  });
});

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ success: false, error: 'Authentication required' });
  
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  
  // For testing, we'll accept any token
  if (!token) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
  
  // Extract user info from token if it's a JWT
  try {
    // Try to decode JWT token (if it's a JWT)
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      // This looks like a JWT token, try to decode the payload
      try {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        req.user = {
          id: payload.id || payload.userId || payload.sub,
          role: payload.role
        };
        console.log(`JWT authenticated request from user ID: ${req.user.id} with role: ${req.user.role}`);
      } catch (jwtError) {
        console.warn('Failed to parse JWT token:', jwtError.message);
        // Continue anyway for testing
        req.user = { id: 'unknown', role: 'user' };
      }
    } else {
      // For our simplified token format: "userId:username:role"
      const parts = token.split(':');
      if (parts.length === 3) {
        req.user = {
          id: parts[0],
          username: parts[1],
          role: parts[2]
        };
        console.log(`Simple token authenticated request from user: ${req.user.username} with role: ${req.user.role}`);
      } else {
        console.log('Unrecognized token format, using default user');
        req.user = { id: 'test-user', role: 'user' };
      }
    }
  } catch (tokenError) {
    console.warn('Error processing token:', tokenError.message);
    req.user = { id: 'unknown', role: 'user' };
  }
  
  next();
}

// Routes
app.get('/api/getProcesses', authenticateToken, (req, res) => {
  console.log(`GET /api/getProcesses - User: ${req.user.id}`);
  res.json({ 
    success: true, 
    processes: processesStore,
    message: 'Processes retrieved successfully'
  });
});

app.post('/api/saveProcesses', authenticateToken, (req, res) => {
  console.log(`POST /api/saveProcesses - User: ${req.user.id}`);
  
  try {
    // Extract processes from request body
    let processes = [];
    let metadata = {};
    
    if (req.body.metadata) {
      metadata = req.body.metadata;
      console.log('Request metadata:', metadata);
    }
    
    // Handle both formats: direct array or {processes: [...]} object
    processes = Array.isArray(req.body) ? req.body : (req.body.processes || []);
    console.log(`Parsed ${processes.length} processes from request body`);
    
    // Add metadata to processes
    const enhancedProcesses = processes.map(process => ({
      ...process,
      userId: req.user.id,
      updatedAt: new Date(),
      updatedBy: req.user.id
    }));
    
    // Store processes
    processesStore = enhancedProcesses;
    
    res.json({ 
      success: true, 
      message: 'Processes saved successfully',
      count: processes.length
    });
  } catch (error) {
    console.error('Error saving processes:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to save processes: ${error.message}`
    });
  }
});

// Presentations endpoints
app.get('/api/getPresentations', authenticateToken, (req, res) => {
  console.log(`GET /api/getPresentations - User: ${req.user.id}`);
  res.json({ 
    success: true, 
    presentations: presentationsStore,
    message: 'Presentations retrieved successfully'
  });
});

app.post('/api/savePresentations', authenticateToken, (req, res) => {
  console.log(`POST /api/savePresentations - User: ${req.user.id}`);
  
  try {
    // Extract presentations from request body
    let presentations = [];
    
    // Handle both formats: direct array or {presentations: [...]} object
    presentations = Array.isArray(req.body) ? req.body : (req.body.presentations || []);
    console.log(`Parsed ${presentations.length} presentations from request body`);
    
    // Add metadata to presentations
    const enhancedPresentations = presentations.map(presentation => ({
      ...presentation,
      userId: req.user.id,
      updatedAt: new Date(),
      updatedBy: req.user.id
    }));
    
    // Store presentations
    presentationsStore = enhancedPresentations;
    
    res.json({ 
      success: true, 
      message: 'Presentations saved successfully',
      count: presentations.length
    });
  } catch (error) {
    console.error('Error saving presentations:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to save presentations: ${error.message}`
    });
  }
});

// User settings endpoints
app.post('/api/save-user-settings', authenticateToken, (req, res) => {
  console.log(`POST /api/save-user-settings - User: ${req.user.id}`);
  
  try {
    const userId = req.user.id;
    const settings = req.body.settings || req.body;
    
    // Store settings for this user
    userSettingsStore[userId] = {
      settings,
      updatedAt: new Date()
    };
    
    res.json({ 
      success: true, 
      message: 'User settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving user settings:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to save user settings: ${error.message}`
    });
  }
});

app.get('/api/get-user-settings', authenticateToken, (req, res) => {
  console.log(`GET /api/get-user-settings - User: ${req.user.id}`);
  const userId = req.user.id;
  
  if (userSettingsStore[userId]) {
    res.json({ 
      success: true, 
      settings: userSettingsStore[userId].settings,
      message: 'User settings retrieved successfully'
    });
  } else {
    res.json({ 
      success: true, 
      settings: {},
      message: 'No settings found for this user'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log('API endpoints:');
  console.log(`- GET  http://localhost:${PORT}/api/getProcesses`);
  console.log(`- POST http://localhost:${PORT}/api/saveProcesses`);
  console.log(`- GET  http://localhost:${PORT}/api/getPresentations`);
  console.log(`- POST http://localhost:${PORT}/api/savePresentations`);
  console.log(`- GET  http://localhost:${PORT}/api/get-user-settings`);
  console.log(`- POST http://localhost:${PORT}/api/save-user-settings`);
  console.log('\nPress Ctrl+C to stop the server');
});
