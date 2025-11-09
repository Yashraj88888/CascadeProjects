# 📡 Wireshark Live Traffic Capture Guide

## Overview

The Wireshark tool now supports **real-time network traffic capture** for any website URL! Watch packets flow in real-time and analyze traffic patterns, protocols, and IP communications.

## Features

### 1. **Live URL-Based Capture** 🔴
- Enter any website URL
- Capture traffic to/from that specific host
- Configurable duration (10-300 seconds)
- Real-time status updates

### 2. **Real-Time Monitoring** 📊
- Live packet count updates
- Elapsed time tracking
- Progress bar visualization
- Capture status indicator (pulsing red dot)

### 3. **Comprehensive Analysis** 📦
After capture completes, view:
- **Total packets** captured
- **Protocol distribution** with percentages
- **Top source IPs** (who's sending)
- **Top destination IPs** (who's receiving)
- **Statistics** for each category

### 4. **Interactive Controls** 🎮
- Start/Stop capture anytime
- Manual stop before timeout
- Auto-completion after duration
- Clean status updates

### 5. **Legacy PCAP Upload** 📁
Original feature still works:
- Upload existing .pcap files
- Analyze pre-recorded traffic
- View protocol statistics

## How to Use

### Step 1: Enter Website URL

1. Go to **Wireshark** page in LinkLens
2. In "Live Traffic Capture" section:
   - Enter URL: `https://example.com`
   - Set duration: `30` seconds (default)

### Step 2: Start Capture

1. Click **"🎬 Start Capture"**
2. Watch the status section appear:
   - **Red pulsing dot** = actively capturing
   - **Target Host** = extracted hostname
   - **Packets Captured** = live count
   - **Progress bar** = time remaining

### Step 3: Monitor Progress

Real-time updates every 2 seconds:
```
📊 Capture Status
   Target Host: example.com
   Status: Running
   Elapsed Time: 15s / 30s
   Packets Captured: 142
```

### Step 4: View Results

When capture completes, see analysis:

**Summary Stats:**
- Total Packets: 284
- Protocols: 8
- Source IPs: 3
- Destination IPs: 5

**Protocol Distribution:**
- tcp: 180 packets (63.4%)
- udp: 68 packets (23.9%)
- dns: 24 packets (8.5%)
- ...and more

**Top Source/Destination IPs:**
- See who's communicating
- Packet counts per IP
- Color-coded display

### Step 5: Stop Early (Optional)

Don't want to wait? Click **"⏹️ Stop"** button anytime to end capture and analyze what's been collected so far.

## Use Cases

### 1. Website Traffic Analysis
```
URL: https://google.com
Duration: 30 seconds
```
**See:**
- DNS lookups
- TLS handshakes
- HTTP/HTTPS requests
- CDN connections

### 2. API Endpoint Monitoring
```
URL: https://api.example.com
Duration: 60 seconds
```
**Analyze:**
- REST API calls
- JSON data flow
- Authentication traffic
- Response patterns

### 3. Security Investigation
```
URL: https://suspicious-site.com
Duration: 120 seconds
```
**Detect:**
- Unusual protocols
- Multiple IP destinations
- Encrypted vs. unencrypted traffic
- Connection patterns

### 4. Performance Debugging
```
URL: https://slow-website.com
Duration: 45 seconds
```
**Identify:**
- Excessive requests
- Large packet counts
- Protocol inefficiencies
- Network bottlenecks

## Technical Details

### How It Works

**Backend (server.js):**
1. Extracts hostname from URL
2. Runs `tshark` with host filter:
   ```bash
   tshark -i any -f "host example.com" -w capture.pcap
   ```
3. Captures packets for specified duration
4. Stores in temporary PCAP file
5. Analyzes with `tshark -r` when complete

**Frontend (WiresharkAnalyzer.tsx):**
1. Sends capture request
2. Polls status every 2 seconds
3. Updates UI with live stats
4. Fetches packet data when done
5. Renders analysis results

### API Endpoints

**Start Capture:**
```
POST /api/wireshark/capture/start
Body: { url: "https://example.com", duration: 30 }
Response: { captureId, status, host, duration, message }
```

**Get Status:**
```
GET /api/wireshark/capture/:captureId/status
Response: { captureId, status, host, startTime, elapsed, packetCount }
```

**Stop Capture:**
```
POST /api/wireshark/capture/stop/:captureId
Response: { status, captureId }
```

**Get Packets:**
```
GET /api/wireshark/capture/:captureId/packets
Response: { packets, protocols, sources, destinations, totalPackets }
```

### Requirements

**Server-side:**
- `tshark` must be installed
- Root/sudo permissions for packet capture
- Network interface access

**Install tshark:**
```bash
sudo apt install tshark -y

# Allow non-root capture
sudo dpkg-reconfigure wireshark-common
# Select "Yes" for non-superusers to capture

# Add user to wireshark group
sudo usermod -a -G wireshark $USER
```

### Security Considerations

**⚠️ Important:**
- Packet capture requires elevated permissions
- Only capture traffic you're authorized to monitor
- Captured data may contain sensitive information
- PCAP files stored in server uploads directory
- Consider privacy and legal implications

### Limitations

1. **Permission Requirements:**
   - tshark needs network access
   - May require sudo for some interfaces

2. **Capture Scope:**
   - Only captures traffic to/from specified host
   - Local network traffic only
   - Can't capture encrypted payload content

3. **Performance:**
   - High-traffic sites generate large PCAP files
   - Analysis may take time for >1000 packets
   - UI shows first 50 packets detailed

4. **Browser Limitations:**
   - Can't capture user's browser traffic
   - Captures server-side traffic only
   - Requires server to make requests to target

## UI Components

### Live Capture Section 🔴
```
[ Website URL Input ] [ Duration ] [ Start/Stop Button ]
```

### Capture Status 📊
```
CAPTURING (pulsing red dot)
Target Host: example.com
Status: Running
Elapsed: 15s / 30s
Packets: 142
[=========>  ] Progress Bar
```

### Packet Analysis 📦
```
┌─ Summary Stats ─────────────┐
│ 284      8      3      5    │
│ Packets  Proto  Src    Dst  │
└─────────────────────────────┘

┌─ Protocol Distribution ─────┐
│ tcp  180 (63.4%)            │
│ udp   68 (23.9%)            │
│ dns   24 (8.5%)             │
└─────────────────────────────┘

┌─ Top Source IPs ────────────┐
│ 192.168.1.100  125 packets  │
│ 10.0.0.50       89 packets  │
└─────────────────────────────┘
```

## Styling

### Colors
- **Purple (#7c3aed)** - Primary theme, protocol counts
- **Blue (#3b82f6)** - Protocol count badge
- **Green (#10b981)** - Source IPs, success states
- **Orange (#f59e0b)** - Destination IPs, running state
- **Red (#ef4444)** - Capturing indicator, stop button

### Animations
- **Pulsing red dot** - Indicates active capture
- **Progress bar** - Smooth 1s transitions
- **Stats cards** - Purple borders, dark backgrounds

## Troubleshooting

### "tshark failed"
```bash
# Install tshark
sudo apt install tshark -y

# Verify installation
tshark --version
```

### "Permission denied"
```bash
# Add user to wireshark group
sudo usermod -a -G wireshark $USER

# Configure for non-root
sudo dpkg-reconfigure wireshark-common

# Log out and back in
```

### No packets captured
- Check URL is accessible from server
- Verify network connectivity
- Try longer duration
- Check firewall settings
- Ensure interface is active

### Capture hangs
- Click "Stop" button
- Refresh page
- Check backend logs
- Restart server if needed

### Analysis shows 0 packets
- PCAP file may be empty
- Network might be isolated
- Target host unreachable
- Check server network config

## Example Sessions

### Example 1: Capture Google Traffic
```
1. URL: https://www.google.com
2. Duration: 20 seconds
3. Click "Start Capture"
4. Wait 20 seconds
5. View results:
   - ~150 packets
   - tcp, udp, dns protocols
   - Multiple Google IPs
   - CDN endpoints
```

### Example 2: Monitor API
```
1. URL: https://jsonplaceholder.typicode.com
2. Duration: 30 seconds
3. Make some API requests in another tab
4. Stop capture
5. See:
   - HTTP/HTTPS traffic
   - API server IPs
   - Request/response patterns
```

### Example 3: Security Analysis
```
1. URL: http://testphp.vulnweb.com
2. Duration: 60 seconds
3. Browse the site
4. Analyze:
   - Unencrypted HTTP (security risk!)
   - Multiple endpoints
   - Protocol usage
```

## Tips

### 1. Optimal Duration
- **Quick check:** 10-20 seconds
- **Standard analysis:** 30-60 seconds
- **Deep investigation:** 2-5 minutes
- **Avoid:** >5 minutes (huge files)

### 2. Best URLs to Test
- Public websites (no auth required)
- Your own servers
- Test/demo sites
- Public APIs

### 3. Interpreting Results
- **High tcp count** = web traffic
- **High udp count** = streaming/DNS
- **Many dns packets** = lots of lookups
- **Many IPs** = CDN/distributed service

### 4. Performance
- Smaller duration = faster analysis
- Fewer packets = quicker results
- Large sites generate more traffic
- Consider server resources

## Future Enhancements

Possible future features:
- **Live packet streaming** (WebSocket)
- **Packet filtering** by protocol
- **Deep packet inspection** (payload view)
- **Export results** to CSV/JSON
- **Comparison** between captures
- **Graphical visualizations** (charts)
- **Alert rules** for suspicious patterns

---

## Summary

Wireshark Live Capture gives you:
✅ Real-time traffic monitoring
✅ URL-based capture targeting
✅ Comprehensive packet analysis
✅ Protocol distribution stats
✅ IP address tracking
✅ Interactive controls
✅ Purple-themed UI

**Start capturing network traffic now!** 📡🔍
