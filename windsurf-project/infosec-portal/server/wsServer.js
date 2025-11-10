const WebSocket = require('ws');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');

const wss = new WebSocket.Server({ port: 5002 });
const activeCaptures = new Map();

// Helper function to get network interfaces
function getNetworkInterfaces() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('wmic nic get NetConnectionID', (error, stdout) => {
        if (error) return resolve(['Ethernet', 'Wi-Fi']);
        const interfaces = stdout.split('\n')
          .slice(1)
          .map(iface => iface.trim())
          .filter(Boolean);
        resolve(interfaces.length ? interfaces : ['Ethernet', 'Wi-Fi']);
      });
    } else {
      exec("ls /sys/class/net", (error, stdout) => {
        if (error) return resolve(['eth0', 'wlan0', 'lo']);
        const interfaces = stdout.split('\n').filter(Boolean);
        resolve(interfaces.length ? interfaces : ['eth0', 'wlan0', 'lo']);
      });
    }
  });
}

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);

      switch (data.action) {
        case 'get_interfaces':
          const interfaces = await getNetworkInterfaces();
          ws.send(JSON.stringify({
            type: 'interfaces',
            requestId: data.requestId,
            interfaces
          }));
          break;

        case 'start':
          startCapture(ws, data);
          break;

        case 'stop':
          stopCapture(data.captureId);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Clean up any active captures for this client
    for (const [id, capture] of activeCaptures.entries()) {
      if (capture.ws === ws) {
        stopCapture(id);
      }
    }
  });
});

function startCapture(ws, options) {
  const { target, duration = 30, interface: iface = 'wlan0', requestId } = options;
  const captureId = `capture_${Date.now()}`;

  // Validate interface
  const validInterface = /^[a-zA-Z0-9]+$/.test(iface) ? iface : 'wlan0';
  
  try {
    // Build tshark command for real-time packet display
    const filter = `host ${target} and not port 5001 and not port 5002`;
    const command = `tshark \
      -i ${validInterface} \
      -f "${filter}" \
      -T fields \
      -e frame.time_relative \
      -e ip.src \
      -e ip.dst \
      -e _ws.col.Protocol \
      -e frame.len \
      -e _ws.col.Info \
      -E header=n \
      -E separator=│ \
      -E quote=n \
      -n \
      --no-promiscuous-mode \
      -a duration:${duration}`.replace(/\s+/g, ' ').trim();

  console.log(`Starting capture ${captureId}: ${command}`);

  const capture = {
    process: exec(command, { maxBuffer: 1024 * 1024 * 10 }), // 10MB buffer
    ws,
    startTime: Date.now(),
    packetCount: 0,
    lastPacketTime: 0
  };

  // Send initial status
  ws.send(JSON.stringify({
    type: 'status',
    captureId,
    status: 'starting',
    message: `Starting capture on ${validInterface} for ${target}`
  }));

  // Buffer for collecting packet data
  let buffer = '';
  
  capture.process.stdout.on('data', (data) => {
    try {
      buffer += data.toString();
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';
      
      // Process complete lines
      const packets = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const parts = line.split('│').map(part => part.trim());
        if (parts.length >= 5) {
          const [time, source, dest, protocol, length, ...infoParts] = parts;
          const info = infoParts.join('│').trim();
          
          const packet = {
            time: parseFloat(time) || 0,
            source: source || 'N/A',
            destination: dest || 'N/A',
            protocol: protocol || 'N/A',
            length: parseInt(length) || 0,
            info: info || ''
          };
          
          packets.push(packet);
        }
      }

      if (packets.length > 0) {
        capture.packetCount += packets.length;
        
        // Send packets to client
        ws.send(JSON.stringify({
          type: 'packet',
          captureId,
          packets: packets,
          packetCount: capture.packetCount,
          timestamp: Date.now()
        }));
      }
      
      // Update status every second
      const now = Date.now();
      if (!capture.lastStatusUpdate || now - capture.lastStatusUpdate > 1000) {
        ws.send(JSON.stringify({
          type: 'status',
          captureId,
          status: 'running',
          packets: capture.packetCount,
          elapsed: Math.floor((now - capture.startTime) / 1000)
        }));
        capture.lastStatusUpdate = now;
      }
    } catch (error) {
      console.error('Error processing packet data:', error);
    }
  });

  capture.process.stderr.on('data', (data) => {
    const error = data.toString().trim();
    if (error && !error.includes('tshark: The standard streams are not tty')) {
      console.error(`tshark stderr: ${error}`);
      
      // Send error to client if it's a critical error
      if (error.includes('permission') || error.includes('denied')) {
        ws.send(JSON.stringify({
          type: 'status',
          captureId,
          status: 'error',
          message: `Permission error: ${error}. Make sure tshark has the correct permissions.`
        }));
      }
    }
  });

  capture.process.on('error', (error) => {
    console.error(`Failed to start capture process: ${error.message}`);
    ws.send(JSON.stringify({
      type: 'status',
      captureId,
      status: 'error',
      message: `Failed to start capture: ${error.message}`
    }));
    activeCaptures.delete(captureId);
  });

  capture.process.on('close', (code, signal) => {
    console.log(`Capture ${captureId} ended with code ${code}, signal ${signal}`);
    activeCaptures.delete(captureId);

    const endTime = Date.now();
    const elapsed = Math.floor((endTime - capture.startTime) / 1000);
    
    let status = 'completed';
    let message = 'Capture completed';
    
    if (code !== 0 || signal) {
      status = 'error';
      message = `Capture ended with code ${code || 'unknown'}`;
      if (signal) message += `, signal ${signal}`;
    }

    ws.send(JSON.stringify({
      type: 'status',
      captureId,
      status,
      packets: capture.packetCount,
      elapsed,
      message
    }));
  });

  // Store the capture with additional metadata
  capture.startTime = Date.now();
  capture.lastPacketUpdate = 0;
  capture.lastStatusUpdate = 0;
  activeCaptures.set(captureId, capture);

  // Send confirmation after a short delay to ensure process starts
  setTimeout(() => {
    if (activeCaptures.has(captureId)) {
      ws.send(JSON.stringify({
        requestId,
        type: 'status',
        captureId,
        status: 'capture_started',
        message: `Started capturing traffic for ${target} on ${validInterface}`
      }));
    }
  }, 500);
  } catch (error) {
    console.error('Error in startCapture:', error);
    ws.send(JSON.stringify({
      type: 'status',
      captureId,
      status: 'error',
      message: `Failed to start capture: ${error.message}`
    }));
  }
}

function stopCapture(captureId) {
  if (!captureId || !activeCaptures.has(captureId)) return;

  const capture = activeCaptures.get(captureId);
  console.log(`Stopping capture ${captureId}`);

  if (capture.process) {
    capture.process.kill();
  }

  activeCaptures.delete(captureId);
}

function parseTsharkOutput(output) {
  return output
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [number, time, source, destination, protocol, length, ...infoParts] = line.split(',');
      return {
        number: parseInt(number, 10),
        time: time.trim(),
        source: source.trim(),
        destination: destination.trim(),
        protocol: protocol.trim(),
        length: parseInt(length, 10) || 0,
        info: infoParts.join(',').trim()
      };
    });
}

console.log('WebSocket server running on ws://localhost:5002');
