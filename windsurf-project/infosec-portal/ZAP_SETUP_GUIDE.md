# 🔷 Complete OWASP ZAP Setup Guide for LinkLens

## Problem: "ZAP not reachable"

This error means the ZAP daemon is not running on port 8080. Here are ALL solutions:

---

## ⚡ Quick Start (No Installation) - Use Mock Server

**Best for testing the UI immediately:**

```bash
# Terminal 1: Start the backend
cd infosec-portal/server
npm run dev

# Terminal 2: Start the frontend  
cd infosec-portal/client
npm start

# Terminal 3: Start Mock ZAP Server
cd infosec-portal
node mock-zap-server.js
# OR
npm run mock-zap --prefix server
```

Now visit http://localhost:3000 and test ZAP features with mock data!

---

## 🔧 Production Setup - Install Real OWASP ZAP

### Option 1: APT (Kali/Debian/Ubuntu)
```bash
sudo apt update
sudo apt install zaproxy -y
```

### Option 2: Official Download
```bash
# Download
cd ~/Downloads
wget https://github.com/zaproxy/zaproxy/releases/download/v2.14.0/ZAP_2.14.0_Linux.tar.gz

# Extract and install
tar -xvf ZAP_2.14.0_Linux.tar.gz
sudo mv ZAP_2.14.0 /opt/zaproxy

# Add to PATH
echo 'export PATH="/opt/zaproxy:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Option 3: Snap Package
```bash
sudo snap install zaproxy --classic
```

---

## 🚀 Starting Real ZAP Daemon

After installation, start ZAP daemon:

### Easy Mode (No API Key):
```bash
zap.sh -daemon -port 8080 -config api.disablekey=true -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true
```

### Secure Mode (With API Key):
```bash
zap.sh -daemon -port 8080 -config api.key=MySecretKey123 -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true
```

Then in LinkLens UI, enter:
- ZAP URL: `http://localhost:8080`
- API Key: `MySecretKey123` (if using secure mode)

---

## ✅ Verify ZAP is Running

```bash
# Check if ZAP is running
curl http://localhost:8080/JSON/core/view/version/

# Should return something like:
# {"version":"2.14.0"}
```

---

## 🐛 Troubleshooting

### 1. Port 8080 Already in Use
```bash
# Find what's using port 8080
sudo lsof -i :8080

# Kill it
sudo kill -9 $(lsof -t -i:8080)
```

### 2. Can't Find zap.sh
```bash
# Search for it
find /usr /opt ~ -name "zap.sh" 2>/dev/null

# Or check installation
which zap.sh
dpkg -l | grep zap
```

### 3. Permission Denied
```bash
# Make executable
sudo chmod +x /path/to/zap.sh

# Or run with sudo
sudo zap.sh -daemon ...
```

### 4. Still Not Working
Use the mock server for now:
```bash
cd infosec-portal
node mock-zap-server.js
```

---

## 📋 Quick Command Reference

```bash
# Check if installed
which zap.sh

# Check port
lsof -i :8080

# Start mock (for testing)
node mock-zap-server.js

# Start real ZAP (after install)
zap.sh -daemon -port 8080 -config api.disablekey=true -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true

# Test ZAP
curl http://localhost:8080/JSON/core/view/version/
```

---

## 🎯 Current Status Check

Run this to diagnose your system:
```bash
echo "=== ZAP Installation Check ==="
which zap.sh && echo "✅ zap.sh found" || echo "❌ zap.sh not found - install ZAP"

echo ""
echo "=== Port 8080 Check ==="
lsof -i :8080 && echo "✅ Something running on 8080" || echo "⚠️  Port 8080 is free - start ZAP or mock server"

echo ""
echo "=== Test Connection ==="
curl -s http://localhost:8080/JSON/core/view/version/ && echo "✅ ZAP responding" || echo "❌ ZAP not responding"
```

---

## 🌟 Recommended Workflow

**For Development/Testing:**
1. Use mock-zap-server.js (no installation needed)
2. Test all UI features
3. Get familiar with the interface

**For Real Security Testing:**
1. Install actual OWASP ZAP
2. Start daemon with API key
3. Run against test targets only (never production!)

---

Need help? Check the error message in LinkLens or browser console for more details.
