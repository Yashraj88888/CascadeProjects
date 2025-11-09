/**
 * Mock OWASP ZAP Server for Testing
 * This mimics ZAP's API so you can test LinkLens without installing ZAP
 * 
 * Usage: node mock-zap-server.js
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

// In-memory storage for scans
const scans = {};
let scanCounter = 0;

// Mock alerts
const mockAlerts = [
  {
    alert: 'SQL Injection',
    risk: 'High',
    confidence: 'Medium',
    description: 'SQL injection may be possible.',
    solution: 'Use parameterized queries or prepared statements.',
    instances: [{ uri: 'http://example.com/login' }]
  },
  {
    alert: 'Cross Site Scripting (XSS)',
    risk: 'High',
    confidence: 'High',
    description: 'XSS vulnerability detected.',
    solution: 'Sanitize user input and encode output.',
    instances: [{ uri: 'http://example.com/search' }]
  },
  {
    alert: 'Missing Anti-CSRF Tokens',
    risk: 'Medium',
    confidence: 'Medium',
    description: 'No Anti-CSRF tokens found.',
    solution: 'Implement CSRF protection.',
    instances: [{ uri: 'http://example.com/form' }]
  },
  {
    alert: 'Cookie Without Secure Flag',
    risk: 'Low',
    confidence: 'High',
    description: 'Cookies without secure flag detected.',
    solution: 'Set the secure flag on all cookies.',
    instances: [{ uri: 'http://example.com/' }]
  }
];

// Core API
app.get('/JSON/core/view/version/', (req, res) => {
  res.json({ version: '2.14.0 (Mock)' });
});

// Spider scan
app.get('/JSON/spider/action/scan/', (req, res) => {
  const scanId = ++scanCounter;
  const target = req.query.url || 'http://example.com';
  
  // Clear any existing scan with this ID to prevent memory leaks
  if (scans[scanId]) {
    clearInterval(scans[scanId].intervalId);
  }
  
  scans[scanId] = {
    type: 'spider',
    status: 0,
    target: target,
    urls: [],
    intervalId: null,
    mockUrls: [
      `${target}/`,
      `${target}/about`,
      `${target}/contact`,
      `${target}/products`,
      `${target}/products/item1`,
      `${target}/products/item2`,
      `${target}/services`,
      `${target}/blog`,
      `${target}/blog/post1`,
      `${target}/blog/post2`,
      `${target}/login`,
      `${target}/register`,
      `${target}/api/endpoint`,
      `${target}/admin`,
      `${target}/assets/style.css`,
      `${target}/assets/script.js`,
      `${target}/images/logo.png`
    ]
  };
  
  // Simulate progress and URL discovery
  const updateProgress = () => {
    if (!scans[scanId]) return;
    
    // Only update if not already complete
    if (scans[scanId].status < 100) {
      const increment = Math.floor(Math.random() * 15) + 5; // Random increment between 5-20%
      scans[scanId].status = Math.min(100, scans[scanId].status + increment);
      
      // Add URLs progressively as scan progresses
      const urlsToAdd = Math.floor((scans[scanId].status / 100) * scans[scanId].mockUrls.length);
      scans[scanId].urls = scans[scanId].mockUrls.slice(0, urlsToAdd);
      
      // If complete, ensure we're at 100% and clean up
      if (scans[scanId].status >= 100) {
        scans[scanId].status = 100;
        scans[scanId].urls = [...scans[scanId].mockUrls]; // Copy all URLs
        if (scans[scanId].intervalId) {
          clearInterval(scans[scanId].intervalId);
          scans[scanId].intervalId = null;
        }
      }
    }
  };
  
  // Initial update
  updateProgress();
  
  // Set up interval for updates (1-2 seconds randomly)
  scans[scanId].intervalId = setInterval(updateProgress, 1000 + Math.random() * 1000);
  
  // Clean up after 20 seconds max
  setTimeout(() => {
    if (scans[scanId] && scans[scanId].intervalId) {
      clearInterval(scans[scanId].intervalId);
      scans[scanId].intervalId = null;
      scans[scanId].status = 100;
      scans[scanId].urls = [...scans[scanId].mockUrls];
    }
  }, 20000);
  
  res.json({ scan: scanId.toString() });
});

app.get('/JSON/spider/view/status/', (req, res) => {
  const scanId = req.query.scanId;
  const scan = scans[scanId];
  res.json({ status: scan ? scan.status.toString() : '100' });
});

app.get('/JSON/spider/view/results/', (req, res) => {
  const scanId = req.query.scanId;
  const scan = scans[scanId];
  res.json({ results: scan ? scan.urls : [] });
});

// Active scan
app.get('/JSON/ascan/action/scan/', (req, res) => {
  const scanId = ++scanCounter;
  scans[scanId] = {
    type: 'ascan',
    status: 0,
    target: req.query.url
  };
  
  // Simulate progress
  const interval = setInterval(() => {
    if (scans[scanId]) {
      scans[scanId].status = Math.min(100, scans[scanId].status + 8);
      if (scans[scanId].status >= 100) {
        clearInterval(interval);
      }
    } else {
      clearInterval(interval);
    }
  }, 1500);
  
  res.json({ scan: scanId.toString() });
});

app.get('/JSON/ascan/view/status/', (req, res) => {
  const scanId = req.query.scanId;
  const scan = scans[scanId];
  res.json({ status: scan ? scan.status.toString() : '100' });
});

// Alerts
app.get('/JSON/alert/view/alerts/', (req, res) => {
  res.json({ alerts: mockAlerts });
});

app.listen(PORT, () => {
  console.log(`🔷 Mock ZAP Server running on http://localhost:${PORT}`);
  console.log(`📊 This is a test server that mimics OWASP ZAP API`);
  console.log(`⚠️  For real security testing, install actual OWASP ZAP`);
  console.log(`\nTest it: curl http://localhost:${PORT}/JSON/core/view/version/`);
});
