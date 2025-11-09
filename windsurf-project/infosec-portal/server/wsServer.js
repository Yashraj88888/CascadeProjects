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
  const { target, duration = 30, interface: iface = 'eth0', requestId } = options;
  const captureId = `capture_${Date.now()}`;

  // Build tshark command
  const filter = `host ${target}`;
  const command = `tshark -i ${iface} -f "${filter}" -T fields -e frame.number -e frame.time -e ip.src -e ip.dst -e _ws.col.Protocol -e frame.len -e _ws.col.Info -E header=n -E separator=, -E quote=n -a duration:${duration}`;

  console.log(`Starting capture ${captureId}: ${command}`);

  const capture = {
    process: exec(command, { maxBuffer: 1024 * 1024 * 10 }), // 10MB buffer
    ws,
    startTime: Date.now(),
    packetCount: 0
  };

  capture.process.stdout.on('data', (data) => {
    const packets = parseTsharkOutput(data);
    if (packets.length === 0) return;

    capture.packetCount += packets.length;

    ws.send(JSON.stringify({
      type: 'packets',
      captureId,
      packets
    }));

    // Send status update
    ws.send(JSON.stringify({
      type: 'status',
      captureId,
      status: 'running',
      packets: capture.packetCount,
      elapsed: Math.floor((Date.now() - capture.startTime) / 1000)
    }));
  });

  capture.process.stderr.on('data', (data) => {
    console.error(`tshark stderr: ${data}`);
  });

  capture.process.on('close', (code) => {
    console.log(`Capture ${captureId} ended with code ${code}`);
    activeCaptures.delete(captureId);

    ws.send(JSON.stringify({
      type: 'status',
      captureId,
      status: code === 0 ? 'completed' : 'error',
      packets: capture.packetCount,
      elapsed: Math.floor((Date.now() - capture.startTime) / 1000),
      message: code === 0 ? 'Capture completed' : `Capture failed with code ${code}`
    }));
  });

  activeCaptures.set(captureId, capture);

  // Send confirmation
  ws.send(JSON.stringify({
    requestId,
    type: 'status',
    captureId,
    status: 'capture_started',
    message: `Started capturing traffic for ${target} on ${iface}`
  }));
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
