const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { exec, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const os = require('os');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Enhanced CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5001'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// File uploads (for PCAP)
const uploadsDir = path.join(os.tmpdir(), 'linklens_uploads');
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Config
const ZAP_API_URL = process.env.ZAP_API_URL || 'http://localhost:8080';
const ZAP_API_KEY = process.env.ZAP_API_KEY || '';

function getZapCfg(req) {
  // Allow optional override from request for troubleshooting
  const url = (req.body?.zapUrl || req.query?.zapUrl || ZAP_API_URL).toString();
  const apikey = (req.body?.zapApiKey || req.query?.zapApiKey || ZAP_API_KEY).toString();
  return { url, apikey };
}

function withKey(params, apikey) {
  if (apikey && apikey.trim().length > 0) {
    return { ...params, apikey };
  }
  return params;
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// ===== OWASP ZAP Endpoints =====
// Health check
app.get('/api/zap/health', async (req, res) => {
  try {
    const { url, apikey } = getZapCfg(req);
    const { data } = await axios.get(`${url}/JSON/core/view/version/`, { params: withKey({}, apikey), timeout: 5000 });
    return res.json({ ok: true, version: data.version || null, zapUrl: url });
  } catch (e) {
    const isConnectionError = e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT';
    const details = e.response?.data || e.message;
    const helpMsg = isConnectionError 
      ? 'ZAP daemon not running. Start it with: zap.sh -daemon -port 8080 -config api.disablekey=true -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true OR use mock-zap-server.js for testing.'
      : 'Check ZAP configuration and API key.';
    return res.status(500).json({ 
      ok: false, 
      error: 'ZAP not reachable', 
      details,
      help: helpMsg,
      zapUrl: getZapCfg(req).url
    });
  }
});

// Start spider
app.post('/api/zap/spider', async (req, res) => {
  try {
    const { targetUrl } = req.body;
    if (!targetUrl) return res.status(400).json({ error: 'Target URL is required' });
    const { url, apikey } = getZapCfg(req);
    const params = withKey({ url: targetUrl, recurse: true, subtreeOnly: false }, apikey);
    const { data } = await axios.get(`${url}/JSON/spider/action/scan/`, { params, timeout: 5000 });
    return res.json({ scanId: data.scan, target: targetUrl });
  } catch (e) {
    const details = e.response?.data || e.message;
    return res.status(500).json({ error: 'Failed to start spider', details });
  }
});

// Spider status
app.get('/api/zap/spider/:scanId', async (req, res) => {
  try {
    const { scanId } = req.params;
    const { url, apikey } = getZapCfg(req);
    const params = withKey({ scanId }, apikey);
    const { data } = await axios.get(`${url}/JSON/spider/view/status/`, { params, timeout: 5000 });
    return res.json({ status: parseInt(data.status, 10) });
  } catch (e) {
    const details = e.response?.data || e.message;
    return res.status(500).json({ error: 'Failed to get spider status', details });
  }
});

// Spider results (URLs found)
app.get('/api/zap/spider/:scanId/results', async (req, res) => {
  try {
    const { scanId } = req.params;
    const { url, apikey } = getZapCfg(req);
    const params = withKey({ scanId }, apikey);
    const { data } = await axios.get(`${url}/JSON/spider/view/results/`, { params, timeout: 10000 });
    return res.json({ urls: data.results || [] });
  } catch (e) {
    const details = e.response?.data || e.message;
    return res.status(500).json({ error: 'Failed to get spider results', details });
  }
});

// Start active scan
app.post('/api/zap/activescan', async (req, res) => {
  try {
    const { targetUrl } = req.body;
    if (!targetUrl) return res.status(400).json({ error: 'Target URL is required' });
    const { url, apikey } = getZapCfg(req);
    const params = withKey({ url: targetUrl, recurse: true, scanPolicyName: '' }, apikey);
    const { data } = await axios.get(`${url}/JSON/ascan/action/scan/`, { params, timeout: 5000 });
    return res.json({ scanId: data.scan, target: targetUrl });
  } catch (e) {
    const details = e.response?.data || e.message;
    return res.status(500).json({ error: 'Failed to start active scan', details });
  }
});

// Active scan status
app.get('/api/zap/activescan/:scanId', async (req, res) => {
  try {
    const { scanId } = req.params;
    const { url, apikey } = getZapCfg(req);
    const params = withKey({ scanId }, apikey);
    const { data } = await axios.get(`${url}/JSON/ascan/view/status/`, { params, timeout: 5000 });
    return res.json({ status: parseInt(data.status, 10) });
  } catch (e) {
    const details = e.response?.data || e.message;
    return res.status(500).json({ error: 'Failed to get active scan status', details });
  }
});

// Alerts
app.get('/api/zap/alerts', async (req, res) => {
  try {
    const { baseUrl } = req.query;
    const { url, apikey } = getZapCfg(req);
    const params = withKey({ baseurl: baseUrl || undefined, start: 0, count: 1000 }, apikey);
    const { data } = await axios.get(`${url}/JSON/alert/view/alerts/`, { params, timeout: 5000 });
    return res.json({ alerts: data.alerts || [] });
  } catch (e) {
    const details = e.response?.data || e.message;
    return res.status(500).json({ error: 'Failed to fetch alerts', details });
  }
});

// ===== Nmap Endpoints =====
const ALLOWED_FLAGS = new Set(['-T4', '-F', '-sV', '-A', '-v', '--script=vuln']);
function sanitizeOptions(optsStr = '') {
  const parts = (optsStr || '').split(/\s+/).filter(Boolean);
  return parts.filter(p => ALLOWED_FLAGS.has(p)).join(' ');
}

app.post('/api/nmap/scan', (req, res) => {
  const { target, options = '-sV' } = req.body;
  if (!target) return res.status(400).json({ error: 'Target is required' });

  const safeOptions = sanitizeOptions(options);
  const command = `nmap ${safeOptions} ${target}`.trim();
  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Scan failed', details: stderr || error.message });
    }
    res.json({ status: 'Scan completed', command, results: stdout });
  });
});

// ===== Wireshark (tshark) Endpoints =====

// Store active captures
const activeCaptures = new Map();

// Start live traffic capture for a URL
app.post('/api/wireshark/capture/start', (req, res) => {
  console.log('Received capture start request:', req.body);
  
  let { url, duration = 30 } = req.body;
  if (!url) {
    console.error('No URL provided in request');
    return res.status(400).json({ 
      error: 'URL is required',
      message: 'Please provide a URL to capture traffic from'
    });
  }

  // Normalize URL and extract hostname
  let normalizedUrl = url.trim();
  if (!normalizedUrl.match(/^https?:\/\//i)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  let host;
  try {
    const urlObj = new URL(normalizedUrl);
    host = urlObj.hostname;
    
    if (!host) {
      throw new Error('Could not extract hostname from URL');
    }
  } catch (urlError) {
    console.error('Invalid URL:', url, 'Error:', urlError.message);
    return res.status(400).json({ 
      error: 'Invalid URL',
      message: 'Please provide a valid URL (e.g., example.com or https://example.com)'
    });
  }

  const captureId = Date.now().toString();
  const pcapFile = path.join(uploadsDir, `capture_${captureId}.pcap`);
  const startTime = Date.now();

  // Ensure the uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Build tshark capture command
  const filter = `host ${host}`;
  const cmd = `timeout ${duration} tshark -i any -f "${filter}" -w ${pcapFile} 2>&1`;

  console.log(`Starting capture for ${host} (${duration}s): ${captureId}`);
  console.log(`Command: ${cmd}`);
  console.log(`Output file: ${pcapFile}`);
  
  // Verify tshark is installed and accessible
  exec('which tshark', (tsharkCheckError, tsharkPath) => {
    if (tsharkCheckError || !tsharkPath.trim()) {
      const errorMsg = 'tshark not found. Please install Wireshark/tshark first.';
      console.error(errorMsg);
      return res.status(500).json({ 
        error: 'Dependency Missing',
        message: 'tshark is not installed. Please install Wireshark/tshark to use this feature.'
      });
    }

    // Create capture info object
    const captureInfo = {
      id: captureId,
      url: normalizedUrl,
      host,
      pcapFile,
      startTime,
      duration,
      status: 'starting',
      command: cmd,
      packets: []
    };

    // Store capture info
    activeCaptures.set(captureId, captureInfo);

    // Start the capture process
    const captureProcess = exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const endTime = Date.now();
      const elapsed = endTime - startTime;
      
      console.log(`Capture ${captureId} completed in ${elapsed}ms`);
      
      if (error) {
        const errorMsg = `Capture ${captureId} error: ${error.message}\n${stderr}`.trim();
        console.error(errorMsg);
        
        // Update capture status with error
        activeCaptures.set(captureId, {
          ...captureInfo,
          status: 'error',
          error: errorMsg,
          endTime,
          elapsed,
          stderr: stderr || null,
          stdout: stdout || null
        });
        return;
      }
      
      // Verify the capture file was created
      try {
        const stats = fs.statSync(pcapFile);
        console.log(`Capture file created: ${pcapFile} (${stats.size} bytes)`);
      } catch (fileError) {
        console.error(`Error accessing capture file: ${fileError.message}`);
      }
      
      // Update capture status to completed
      activeCaptures.set(captureId, {
        ...captureInfo,
        status: 'completed',
        endTime,
        elapsed,
        file: pcapFile,
        fileSize: fs.existsSync(pcapFile) ? fs.statSync(pcapFile).size : 0
      });
    });

    // Update capture info with process reference
    captureInfo.process = captureProcess;
    captureInfo.status = 'running';
    activeCaptures.set(captureId, captureInfo);
    
    // Handle process exit
    captureProcess.on('exit', (code, signal) => {
      console.log(`Capture ${captureId} process exited with code ${code}, signal ${signal}`);
    });
    
    // Handle process error
    captureProcess.on('error', (err) => {
      console.error(`Capture ${captureId} process error:`, err);
      activeCaptures.set(captureId, {
        ...captureInfo,
        status: 'error',
        error: `Process error: ${err.message}`,
        endTime: Date.now(),
        elapsed: Date.now() - startTime
      });
    });

    // Send success response
    return res.json({ 
      success: true,
      captureId, 
      status: 'started', 
      host,
      duration,
      message: `Capturing traffic for ${host}` 
    });
  });
});

// Error handling middleware for async routes
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Stop a capture
app.post('/api/wireshark/capture/stop/:captureId', (req, res) => {
  const { captureId } = req.params;
  const capture = activeCaptures.get(captureId);
  
  if (!capture) {
    return res.status(404).json({ error: 'Capture not found' });
  }

  if (capture.process && capture.status === 'running') {
    capture.process.kill('SIGTERM');
    capture.status = 'stopped';
    capture.endTime = Date.now();
  }

  return res.json({ status: 'stopped', captureId });
});

// Get capture status and live packets
app.get('/api/wireshark/capture/:captureId/status', (req, res) => {
  const { captureId } = req.params;
  const capture = activeCaptures.get(captureId);
  
  if (!capture) {
    return res.status(404).json({ error: 'Capture not found' });
  }

  // Always try to count packets from PCAP file if it exists
  if (fs.existsSync(capture.pcapFile)) {
    const stats = fs.statSync(capture.pcapFile);
    
    // Quick packet count - works even while file is being written
    exec(`tshark -r ${capture.pcapFile} -T fields -e frame.number 2>/dev/null | wc -l`, (err, stdout) => {
      const packetCount = parseInt(stdout.trim()) || 0;
      
      return res.json({
        captureId,
        status: capture.status,
        host: capture.host,
        startTime: capture.startTime,
        endTime: capture.endTime,
        elapsed: capture.endTime ? capture.endTime - capture.startTime : Date.now() - capture.startTime,
        packetCount,
        fileSize: stats.size,
        error: capture.error
      });
    });
  } else {
    // File doesn't exist yet
    return res.json({
      captureId,
      status: capture.status,
      host: capture.host,
      startTime: capture.startTime,
      elapsed: Date.now() - capture.startTime,
      packetCount: 0,
      fileSize: 0,
      error: capture.error
    });
  }
});

// Get live packet preview (simple format, fast)
app.get('/api/wireshark/capture/:captureId/live', (req, res) => {
  const { captureId } = req.params;
  const { limit = 20 } = req.query;
  const capture = activeCaptures.get(captureId);
  
  if (!capture) {
    return res.status(404).json({ error: 'Capture not found' });
  }

  if (!fs.existsSync(capture.pcapFile)) {
    return res.json({ packets: [], count: 0 });
  }

  // Get basic packet info quickly for live display
  const cmd = `tshark -r ${capture.pcapFile} -T fields -e frame.number -e frame.time_relative -e ip.src -e ip.dst -e _ws.col.Protocol -e frame.len -c ${limit} 2>/dev/null | tail -${limit}`;
  
  exec(cmd, { maxBuffer: 1024 * 1024 }, (err, stdout) => {
    if (err) {
      return res.json({ packets: [], count: 0 });
    }

    const lines = stdout.trim().split('\n').filter(Boolean);
    const packets = lines.map((line, idx) => {
      const parts = line.split('\t');
      return {
        num: parts[0] || idx + 1,
        time: parts[1] || '0',
        src: parts[2] || 'N/A',
        dst: parts[3] || 'N/A',
        protocol: parts[4] || 'Unknown',
        length: parts[5] || '0'
      };
    });

    return res.json({ packets, count: packets.length });
  });
});

// Get detailed packet analysis
app.get('/api/wireshark/capture/:captureId/packets', (req, res) => {
  const { captureId } = req.params;
  const { limit = 100 } = req.query;
  const capture = activeCaptures.get(captureId);
  
  if (!capture) {
    return res.status(404).json({ error: 'Capture not found' });
  }

  if (!fs.existsSync(capture.pcapFile)) {
    return res.json({ packets: [], protocols: {}, totalPackets: 0 });
  }

  // Get packet details
  const cmd = `tshark -r ${capture.pcapFile} -T json -c ${limit} 2>/dev/null`;
  
  exec(cmd, { maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
    if (err) {
      return res.json({ packets: [], protocols: {}, totalPackets: 0, error: 'Failed to read packets' });
    }

    try {
      const packets = JSON.parse(stdout || '[]');
      
      // Analyze protocols
      const protocols = {};
      const sources = {};
      const destinations = {};
      
      packets.forEach(pkt => {
        const layers = pkt._source?.layers || {};
        
        // Count protocols
        Object.keys(layers).forEach(proto => {
          if (!proto.startsWith('_')) {
            protocols[proto] = (protocols[proto] || 0) + 1;
          }
        });
        
        // Track IPs
        if (layers.ip) {
          const src = layers.ip['ip.src'];
          const dst = layers.ip['ip.dst'];
          if (src) sources[src] = (sources[src] || 0) + 1;
          if (dst) destinations[dst] = (destinations[dst] || 0) + 1;
        }
      });

      // Get total count
      exec(`tshark -r ${capture.pcapFile} -T fields -e frame.number | wc -l`, (err, countOut) => {
        const totalPackets = parseInt(countOut.trim()) || packets.length;
        
        return res.json({
          packets: packets.slice(0, 50), // Send first 50 detailed
          protocols,
          sources,
          destinations,
          totalPackets,
          shown: packets.length
        });
      });
    } catch (e) {
      return res.json({ packets: [], protocols: {}, totalPackets: 0, error: 'Failed to parse packets' });
    }
  });
});

// Upload PCAP file (original endpoint)
app.post('/api/wireshark/upload', upload.single('pcap'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'PCAP file is required' });

  const pcapPath = req.file.path;
  // Basic stats: protocol counts
  const protoCmd = `tshark -r ${pcapPath} -T fields -e _ws.col.Protocol`;
  exec(protoCmd, (err, stdout) => {
    if (err) {
      fs.unlink(pcapPath, () => {});
      return res.status(500).json({ error: 'tshark failed, ensure it is installed', details: err.message });
    }
    const lines = stdout.split(/\r?\n/).filter(Boolean);
    const counts = {};
    for (const line of lines) {
      const key = line.trim();
      if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
    }
    const total = lines.length;
    fs.unlink(pcapPath, () => {});
    return res.json({ status: 'completed', totalPackets: total, protocols: counts });
  });
});

// ===== John the Ripper Endpoints =====
app.post('/api/john/crack', (req, res) => {
  const { hash, wordlist, format } = req.body;
  if (!hash) return res.status(400).json({ error: 'Hash is required' });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'linklens_john_'));
  const hashFile = path.join(tmpDir, 'hashes.txt');
  fs.writeFileSync(hashFile, `${hash}\n`);

  const args = [];
  if (wordlist) args.push(`--wordlist=${wordlist}`);
  if (format) args.push(`--format=${format}`);
  args.push(hashFile);

  execFile('john', args, { timeout: 60 * 1000 }, (error, stdout, stderr) => {
    // Try to show results regardless
    execFile('john', ['--show', hashFile], (showErr, showOut) => {
      fs.rm(tmpDir, { recursive: true, force: true }, () => {});
      if (error && !showOut) {
        return res.status(500).json({ error: 'john failed', details: stderr || error.message });
      }
      return res.json({ status: 'completed', output: stdout, results: showOut });
    });
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✅ LinkLens Backend Server running on port ${PORT}`);
  console.log(`📡 Ready to accept requests from frontend`);
});
