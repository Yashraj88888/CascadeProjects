# ???? LinkLens - Information Security Portal

Full-featured web application for security testing with OWASP ZAP, Nmap, Wireshark, and John the Ripper.

## ???? Quick Start

```bash
# Terminal 1
node mock-zap-server.js

# Terminal 2
cd server && npm run dev

# Terminal 3
cd client && npm start

# Open: http://localhost:3000
```

## ???? Documentation

- **START_HERE.md** - Complete quick start guide
- **README_ZAP_INSTALLATION.md** - Install real OWASP ZAP
- **INSTALLATION_OPTIONS.md** - Compare installation methods
- **ZAP_SCANNER_GUIDE.md** - How to use ZAP UI features

## ??? Current Status

- ??? Frontend & Backend running
- ??? Mock ZAP Server working
- ??? All UI features complete
- ?????? Real ZAP needs installation

## ???? Install Real ZAP (Optional)

For real security scans, install OWASP ZAP:

```bash
# Option 1: Docker (Recommended)
./start-zap-docker.sh

# Option 2: Manual Download
# See README_ZAP_INSTALLATION.md
```

## ???? Features

- ??????? OWASP ZAP with real-time console output
- ???? Nmap port scanning
- ???? Wireshark PCAP analysis  
- ???? John the Ripper password cracking
- ???? Modern purple/black UI theme

Built with React, TypeScript, Node.js, and Express.
