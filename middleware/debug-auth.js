// Authentication debugging middleware
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const writeFileAsync = promisify(fs.writeFile);
const appendFileAsync = promisify(fs.appendFile);
const mkdirAsync = promisify(fs.mkdir);

// Directory for logs
const logsDir = path.join(__dirname, '../logs');

// Ensure logs directory exists
async function ensureLogsDir() {
  try {
    await mkdirAsync(logsDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('Failed to create logs directory:', error);
    }
  }
}

// Log authentication attempts
async function logAuthentication(req, success, error = null) {
  await ensureLogsDir();
  
  const logFile = path.join(logsDir, 'auth.log');
  const timestamp = new Date().toISOString();
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown';
  const method = req.method;
  const url = req.originalUrl;
  const userId = req.body?.uid || req.session?.user?.uid || 'Unknown';
  const email = req.body?.email || req.session?.user?.email || 'Unknown';
  
  let logEntry = `[${timestamp}] ${success ? 'SUCCESS' : 'FAILURE'} | IP: ${ip} | ${method} ${url} | User: ${email} (${userId}) | UA: ${userAgent}`;
  
  if (error) {
    logEntry += `\nERROR: ${typeof error === 'object' ? JSON.stringify(error) : error}`;
  }
  
  logEntry += '\n-----------------------------------------------------\n';
  
  try {
    await appendFileAsync(logFile, logEntry);
  } catch (error) {
    console.error('Failed to write auth log:', error);
  }
}

// Debug middleware
function debugAuth(req, res, next) {
  // Store the original res.json method
  const originalJson = res.json;
  
  // Override res.json to intercept responses
  res.json = function(body) {
    // Check if this is an auth-related route
    if (req.originalUrl.includes('/api/auth/')) {
      const success = !body.error;
      logAuthentication(req, success, body.error);
    }
    
    // Call the original method
    return originalJson.call(this, body);
  };
  
  next();
}

module.exports = {
  debugAuth,
  logAuthentication
};
