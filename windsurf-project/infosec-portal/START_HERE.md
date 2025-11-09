# 🚀 LinkLens - Start Here

## What is LinkLens?

LinkLens is a comprehensive **Information Security Web Application** that integrates:
- 🕷️ **OWASP ZAP** - Web application vulnerability scanner
- 🔍 **Nmap** - Network port scanner
- 📊 **Wireshark** - Network packet analyzer
- 🔐 **John the Ripper** - Password cracker

## Current Status: ✅ READY

Your application is **fully built and ready** to use!

### What's Working:
✅ Frontend UI (React + TypeScript)
✅ Backend API (Node.js + Express)  
✅ OWASP ZAP integration (needs ZAP installation)
✅ Nmap integration
✅ Wireshark integration
✅ John the Ripper integration
✅ Purple/Black themed UI
✅ Real-time scan output console
✅ Progress tracking with timing
✅ Mock ZAP server for testing

---

## 🎯 Quick Start (5 Minutes)

### Option 1: Test with Mock ZAP (No Installation)

```bash
# Terminal 1: Mock ZAP Server
node mock-zap-server.js

# Terminal 2: Backend
cd server && npm run dev

# Terminal 3: Frontend
cd client && npm start

# Open browser: http://localhost:3000
```

### Option 2: Use Real OWASP ZAP

**See:** `README_ZAP_INSTALLATION.md`

---

## 📂 Project Structure

```
infosec-portal/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Home.tsx           # Dashboard
│   │   │   └── tools/
│   │   │       ├── ZapScanner.tsx      # OWASP ZAP UI
│   │   │       ├── NmapScanner.tsx     # Nmap UI
│   │   │       ├── WiresharkAnalyzer.tsx # Wireshark UI
│   │   │       └── JohnTheRipper.tsx   # John UI
│   │   ├── App.tsx                # Main app
│   │   └── App.css                # Purple/black theme
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── server.js          # Express API
│   └── package.json
│
├── mock-zap-server.js     # Mock ZAP for testing
│
├── Scripts:
│   ├── start-real-zap.sh           # Start installed ZAP
│   ├── start-zap-docker.sh         # Start ZAP in Docker
│   ├── check-status.sh             # Check all services
│   ├── diagnose-zap.sh             # Diagnose ZAP issues
│   └── start-all.sh                # Start mock ZAP
│
└── Documentation:
    ├── START_HERE.md               # This file
    ├── README_ZAP_INSTALLATION.md  # Install real ZAP
    ├── REAL_ZAP_INTEGRATION.md     # ZAP integration details
    ├── ZAP_SETUP_GUIDE.md          # Complete ZAP guide
    ├── ZAP_SCANNER_GUIDE.md        # UI usage guide
    └── INSTALL_ZAP.md              # Quick install reference
```

---

## 🎨 Features

### 1. OWASP ZAP Scanner
- ✅ Spider scan (web crawling)
- ✅ Active scan (vulnerability testing)
- ✅ Real-time output console
- ✅ Progress bars with elapsed time
- ✅ Vulnerability alerts with:
  - Risk levels (High/Medium/Low)
  - Descriptions
  - Solutions
  - Affected URLs
  - Confidence ratings

### 2. Nmap Scanner
- Port scanning with presets
- Custom scan options
- Results display

### 3. Wireshark Analyzer
- PCAP file upload
- Protocol analysis
- Packet statistics

### 4. John the Ripper
- Hash cracking
- Wordlist support
- Various hash formats

### 5. UI Theme
- 💜 Purple and black design
- Modern Inter font
- Animated background effects
- Purple-bordered cards with shadows
- Smooth transitions

---

## 📊 API Endpoints

### Health Check
```bash
GET /api/health
```

### OWASP ZAP
```bash
GET  /api/zap/health
POST /api/zap/spider
GET  /api/zap/spider/:scanId
POST /api/zap/activescan
GET  /api/zap/activescan/:scanId
GET  /api/zap/alerts
```

### Nmap
```bash
POST /api/nmap/scan
```

### Wireshark
```bash
POST /api/wireshark/upload
```

### John the Ripper
```bash
POST /api/john/crack
```

---

## 🔧 Development

### Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd client
npm install

# Root (for mock ZAP)
npm install
```

### Run Servers

```bash
# Backend (Terminal 1)
cd server && npm run dev

# Frontend (Terminal 2)
cd client && npm start

# Mock ZAP (Terminal 3)
node mock-zap-server.js
```

### Environment Variables

Create `server/.env`:
```bash
PORT=5000
ZAP_API_URL=http://localhost:8080
ZAP_API_KEY=              # Optional
NODE_ENV=development
```

---

## 🎯 Usage Guide

### 1. Check All Services

```bash
./check-status.sh
```

Should show:
```
1️⃣  Mock ZAP Server (port 8080): ✅ RUNNING
2️⃣  Backend Server (port 5000):  ✅ RUNNING
3️⃣  Frontend Server (port 3000): ✅ RUNNING
4️⃣  Backend → ZAP Connection:    ✅ CONNECTED
```

### 2. Open LinkLens

Navigate to: **http://localhost:3000**

### 3. Test OWASP ZAP

1. Click **"OWASP ZAP"** in menu
2. Click **"Check ZAP"** button
3. Should see: ✅ "ZAP is online and ready"
4. Enter target: `http://example.com`
5. Click **"Start Spider"**
6. Watch the output console!

### 4. View Other Tools

- **Nmap** - Port scanning
- **Wireshark** - Upload .pcap files
- **John** - Crack password hashes

---

## 🚨 Important Notes

### Security Warnings
- ⚠️ **Only scan sites you own** or have permission to test
- ⚠️ **Active scans can trigger security systems**
- ⚠️ **Never scan production without authorization**

### Test Sites (Safe to Scan)
- http://testphp.vulnweb.com
- http://testhtml5.vulnweb.com
- http://testasp.vulnweb.com

### Network Tools
- **Nmap**: Requires `nmap` installed (`sudo apt install nmap`)
- **Wireshark**: Requires `tshark` installed (`sudo apt install tshark`)
- **John**: Requires `john` installed (`sudo apt install john`)

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `START_HERE.md` | Quick start guide (this file) |
| `README_ZAP_INSTALLATION.md` | Install real OWASP ZAP |
| `REAL_ZAP_INTEGRATION.md` | ZAP integration details |
| `ZAP_SETUP_GUIDE.md` | Complete ZAP setup |
| `ZAP_SCANNER_GUIDE.md` | How to use ZAP UI |
| `INSTALL_ZAP.md` | Quick install reference |

---

## 🐛 Troubleshooting

### Mock ZAP Not Working
```bash
# Check if running
lsof -i :8080

# Start it
node mock-zap-server.js
```

### Backend Not Working
```bash
# Check if running
lsof -i :5000

# Start it
cd server && npm run dev
```

### Frontend Not Working
```bash
# Check if running
lsof -i :3000

# Start it
cd client && npm start
```

### "ZAP not reachable"
```bash
# Run diagnostic
./diagnose-zap.sh

# Or manually check
curl http://localhost:8080/JSON/core/view/version/
```

---

## 🎓 Next Steps

### For Development/Testing:
1. ✅ Use mock ZAP server (already set up)
2. Test all UI features
3. Customize theme in `client/src/App.css`

### For Real Security Testing:
1. Install real OWASP ZAP (see `README_ZAP_INSTALLATION.md`)
2. Install other tools: `sudo apt install nmap tshark john`
3. Run against test environments only

### For Production:
1. Build frontend: `cd client && npm run build`
2. Set `NODE_ENV=production` in backend
3. Use HTTPS
4. Enable ZAP API key
5. Implement authentication
6. Add rate limiting

---

## 🌟 Features Showcase

### Output Console
- Real-time logging
- Color-coded messages (info/success/warning/error)
- Timestamps
- Auto-scrolling
- Clear button

### Progress Tracking
- Live progress bars
- Elapsed time counters (updates every second)
- Percentage completion
- Smooth animations

### Vulnerability Alerts
- Risk level badges with colors
- Full descriptions
- Solution recommendations
- Affected URLs (expandable)
- Confidence ratings

---

## 💡 Tips

1. **Always run Spider before Active Scan** - Active scan needs pages to test
2. **Check output console for details** - All info logged there
3. **Use mock ZAP for UI testing** - Faster than real ZAP
4. **Read solutions in alerts** - Learn how to fix issues
5. **Keep ZAP running** - Don't stop/start repeatedly

---

## 🎉 You're Ready!

Everything is set up. Just:

1. Start the servers
2. Open http://localhost:3000
3. Start scanning!

**Have fun with LinkLens! 🔍🔒**

---

Need help? Check the documentation or run:
```bash
./diagnose-zap.sh
./check-status.sh
```
