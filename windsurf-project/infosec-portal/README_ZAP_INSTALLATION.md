# 🔷 OWASP ZAP Installation Guide for LinkLens

## ⚡ Quick Summary

LinkLens is **fully integrated** with OWASP ZAP. You just need to install and run ZAP.

**3 Ways to get ZAP working:**
1. **Docker** (Easiest - 5 minutes)
2. **Manual Download** (Moderate - 10 minutes)  
3. **APT Install** (If your network allows)

---

## Option 1: Docker Method (Recommended) 🐳

### Install Docker

```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

**Important:** Log out and back in after running the above commands.

### Start ZAP with Docker

```bash
./start-zap-docker.sh
```

Or manually:
```bash
sudo docker run -d \
  --name linklens-zap \
  -p 8080:8080 \
  zaproxy/zap-stable \
  zap.sh -daemon -host 0.0.0.0 -port 8080 \
  -config api.disablekey=true \
  -config api.addrs.addr.name=.* \
  -config api.addrs.addr.regex=true
```

### Test It

```bash
# Wait 15-20 seconds for ZAP to start, then:
curl http://localhost:8080/JSON/core/view/version/
```

---

## Option 2: Manual Download Method 📥

### Step 1: Download ZAP

Visit: **https://www.zaproxy.org/download/**

Or use command line:
```bash
cd ~/Downloads
wget https://github.com/zaproxy/zaproxy/releases/download/v2.15.0/ZAP_2.15.0_Linux.tar.gz
```

### Step 2: Extract and Install

```bash
cd ~/Downloads
tar -xzf ZAP_2.15.0_Linux.tar.gz
sudo mv ZAP_2.15.0 /opt/zaproxy
sudo ln -s /opt/zaproxy/zap.sh /usr/local/bin/zaproxy
```

### Step 3: Start ZAP

```bash
cd /home/ysrj/CascadeProjects/windsurf-project/infosec-portal
./start-real-zap.sh
```

Or manually:
```bash
zaproxy -daemon -port 8080 \
  -config api.disablekey=true \
  -config api.addrs.addr.name=.* \
  -config api.addrs.addr.regex=true
```

---

## Option 3: APT Install Method 📦

**Note:** May not work if repository has issues (as we saw).

```bash
sudo apt update
sudo apt install zaproxy -y
```

Then start with:
```bash
./start-real-zap.sh
```

---

## ✅ Verify Installation

Run this to check everything:
```bash
./check-status.sh
```

Or manually:
```bash
# 1. Check ZAP running
curl http://localhost:8080/JSON/core/view/version/

# 2. Should return something like:
# {"version":"2.15.0"}
```

---

## 🚀 Using Real ZAP in LinkLens

### 1. Start All Services

```bash
# Terminal 1: Start ZAP (choose one method above)
./start-zap-docker.sh
# OR
./start-real-zap.sh

# Terminal 2: Backend
cd server && npm run dev

# Terminal 3: Frontend  
cd client && npm start
```

### 2. Open LinkLens

Visit: **http://localhost:3000**

### 3. Go to OWASP ZAP Page

Click "OWASP ZAP" in the navigation menu

### 4. Test Connection

- **ZAP URL:** `http://localhost:8080`
- **API Key:** (leave empty)
- Click **"Check ZAP"**
- Should see: ✅ "ZAP is online and ready"

### 5. Run a Scan!

1. Enter target URL: `http://testphp.vulnweb.com` (safe test site)
2. Click **"Start Spider"**
3. Watch the output console fill with logs
4. After spider completes, click **"Start Active Scan"**
5. View vulnerability alerts when scan completes

---

## 🎯 What's Different from Mock ZAP?

| Feature | Mock ZAP | Real ZAP |
|---------|----------|----------|
| **Speed** | Instant | 15-30s startup |
| **Results** | Fake data | Real vulnerabilities |
| **Scans** | Simulated | Actual HTTP requests |
| **Alerts** | Pre-defined | Live discovery |
| **Use Case** | UI testing | Security testing |

---

## 🔧 Troubleshooting

### "ZAP not reachable" Error

```bash
# 1. Check if ZAP is running
lsof -i :8080

# 2. If nothing, start ZAP
./start-zap-docker.sh  # or ./start-real-zap.sh

# 3. Test connection
curl http://localhost:8080/JSON/core/view/version/
```

### Port 8080 Already in Use

```bash
# Kill mock ZAP server if running
pkill -f mock-zap-server

# Or kill whatever is on 8080
sudo kill -9 $(lsof -t -i:8080)
```

### Docker Issues

```bash
# Check Docker status
sudo systemctl status docker

# Start Docker
sudo systemctl start docker

# Check Docker logs
sudo docker logs linklens-zap
```

### ZAP Takes Too Long to Start

Real ZAP takes 15-30 seconds to initialize. Be patient!

```bash
# Watch logs
tail -f ~/.ZAP/zap.log

# Or with Docker
sudo docker logs -f linklens-zap
```

---

## 📋 Quick Command Reference

```bash
# Status check
./check-status.sh

# Start ZAP (Docker)
./start-zap-docker.sh

# Start ZAP (installed)
./start-real-zap.sh

# Start ZAP (secure with API key)
./start-real-zap-secure.sh

# Test ZAP
curl http://localhost:8080/JSON/core/view/version/

# Stop ZAP (Docker)
sudo docker stop linklens-zap

# Stop ZAP (installed)
pkill -f zaproxy

# View ZAP logs (Docker)
sudo docker logs -f linklens-zap

# View ZAP logs (installed)
tail -f ~/.ZAP/zap.log
```

---

## 🎓 Best Practices

### For Development:
- Use Mock ZAP for quick UI testing
- Use Real ZAP only when needed

### For Security Testing:
- Always use Real ZAP
- Run against test environments only
- Never scan production without permission

### For Performance:
- Keep ZAP running (don't stop/start repeatedly)
- Use API key in production
- Limit concurrent scans

---

## 📁 Files Created

Your LinkLens project now has these helper scripts:

- `start-real-zap.sh` - Start installed ZAP (no API key)
- `start-real-zap-secure.sh` - Start with API key
- `start-zap-docker.sh` - Start ZAP in Docker
- `docker-compose.zap.yml` - Docker Compose config
- `check-status.sh` - Check all services
- `diagnose-zap.sh` - Diagnose issues
- `mock-zap-server.js` - Mock server for testing

---

## 🎉 You're All Set!

LinkLens has:
✅ Full OWASP ZAP integration
✅ Real-time scan output console
✅ Live timing and progress tracking
✅ Detailed vulnerability alerts
✅ Risk-based color coding
✅ Solution recommendations

**Just install ZAP and start scanning!**

---

## Need Help?

1. Check `REAL_ZAP_INTEGRATION.md` for detailed info
2. Run `./diagnose-zap.sh` for diagnostics
3. Check `ZAP_SETUP_GUIDE.md` for troubleshooting
4. View `ZAP_SCANNER_GUIDE.md` for UI usage

Happy Scanning! 🔍🔒
