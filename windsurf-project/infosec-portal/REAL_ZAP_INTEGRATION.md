# 🔷 Real OWASP ZAP Integration Guide

## Current Status

You have `python3-zapv2` installed, which is the Python API for OWASP ZAP. However, the main ZAP application needs to be installed separately.

## Installation Options

### Option 1: Download Pre-built Package (Recommended)

1. **Download ZAP manually:**
   ```bash
   # Go to official website
   firefox https://www.zaproxy.org/download/
   ```

2. **Or use direct download link:**
   ```bash
   cd ~/Downloads
   wget https://github.com/zaproxy/zaproxy/releases/download/v2.15.0/ZAP_2.15.0_Linux.tar.gz
   ```

3. **Extract and install:**
   ```bash
   tar -xzf ZAP_2.15.0_Linux.tar.gz
   sudo mv ZAP_2.15.0 /opt/zaproxy
   sudo ln -s /opt/zaproxy/zap.sh /usr/local/bin/zaproxy
   ```

4. **Verify installation:**
   ```bash
   zaproxy -version
   ```

### Option 2: Fix APT and Install

```bash
# Fix repository issues
sudo apt clean
sudo rm /var/lib/apt/lists/* -rf
sudo apt update --fix-missing

# Try installing again
sudo apt install zaproxy -y
```

### Option 3: Use Docker (Easy & Isolated)

```bash
# Install Docker (if not installed)
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker

# Run ZAP in Docker
sudo docker run -u zap -p 8080:8080 \
  -d zaproxy/zap-stable \
  zap.sh -daemon -port 8080 \
  -config api.disablekey=true \
  -config api.addrs.addr.name=.* \
  -config api.addrs.addr.regex=true

# Test it
curl http://localhost:8080/JSON/core/view/version/
```

### Option 4: Use Snap (if available)

```bash
sudo snap install zaproxy --classic
```

## After Installation

### 1. Start ZAP Daemon (Easy Mode - No API Key)

```bash
./start-real-zap.sh
```

Or manually:
```bash
zaproxy -daemon \
  -port 8080 \
  -config api.disablekey=true \
  -config api.addrs.addr.name=.* \
  -config api.addrs.addr.regex=true
```

### 2. Start ZAP Daemon (Secure Mode - With API Key)

```bash
./start-real-zap-secure.sh
```

Or manually:
```bash
zaproxy -daemon \
  -port 8080 \
  -config api.key=YOUR_SECRET_KEY \
  -config api.addrs.addr.name=.* \
  -config api.addrs.addr.regex=true
```

### 3. Test ZAP Connection

```bash
# Without API key
curl http://localhost:8080/JSON/core/view/version/

# With API key
curl "http://localhost:8080/JSON/core/view/version/?apikey=YOUR_SECRET_KEY"
```

### 4. Use in LinkLens

1. Open http://localhost:3000
2. Click "OWASP ZAP"
3. **ZAP URL**: `http://localhost:8080`
4. **API Key**: (leave empty if using easy mode, or enter your key)
5. Click "Check ZAP" - should see green success

## Integration Details

### Backend Configuration

The LinkLens backend (`server/server.js`) is already configured to work with real ZAP:

- **Default ZAP URL**: `http://localhost:8080` (configurable via `ZAP_API_URL` env var)
- **API Key Support**: Optional (configurable via `ZAP_API_KEY` env var)
- **Endpoints Available**:
  - `/api/zap/health` - Check ZAP status
  - `/api/zap/spider` - Start spider scan
  - `/api/zap/spider/:scanId` - Check spider progress
  - `/api/zap/activescan` - Start active scan
  - `/api/zap/activescan/:scanId` - Check active scan progress
  - `/api/zap/alerts` - Get vulnerability alerts

### Environment Variables (Optional)

Create `server/.env`:
```bash
ZAP_API_URL=http://localhost:8080
ZAP_API_KEY=your_api_key_here  # Optional
PORT=5000
```

### Frontend Configuration

The frontend (`client/src/components/tools/ZapScanner.tsx`) supports:
- **Custom ZAP URL** input
- **API Key** input
- **Real-time logging** of scan progress
- **Live timing** information
- **Detailed alerts** with risk levels

## Troubleshooting

### "ZAP not reachable"

1. **Check if ZAP is running:**
   ```bash
   lsof -i :8080
   ```

2. **Test connection directly:**
   ```bash
   curl http://localhost:8080/JSON/core/view/version/
   ```

3. **Check ZAP logs:**
   ```bash
   tail -f ~/.ZAP/zap.log
   ```

4. **Restart ZAP:**
   ```bash
   pkill -f zaproxy
   ./start-real-zap.sh
   ```

### Port 8080 Already in Use

```bash
# Kill process on port 8080
sudo kill -9 $(lsof -t -i:8080)

# Or use a different port
zaproxy -daemon -port 8090 ...
# Then update ZAP URL in LinkLens UI to http://localhost:8090
```

### API Key Issues

If using API key:
1. Make sure key matches in ZAP startup command and LinkLens UI
2. Check logs for "invalid API key" errors
3. Try without API key first (easier for development)

### Java Issues

ZAP requires Java. Install if missing:
```bash
sudo apt install default-jre -y
java -version
```

## Docker-based Solution (Recommended for Quick Start)

If installation is difficult, use Docker:

### 1. Create Docker Compose file

Create `docker-compose.zap.yml`:
```yaml
version: '3.8'
services:
  zap:
    image: zaproxy/zap-stable
    ports:
      - "8080:8080"
    command: zap.sh -daemon -port 8080 -config api.disablekey=true -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true
    container_name: linklens-zap
```

### 2. Start ZAP

```bash
sudo docker-compose -f docker-compose.zap.yml up -d
```

### 3. Check Status

```bash
sudo docker logs linklens-zap
curl http://localhost:8080/JSON/core/view/version/
```

### 4. Stop ZAP

```bash
sudo docker-compose -f docker-compose.zap.yml down
```

## Comparison: Mock vs Real ZAP

| Feature | Mock ZAP Server | Real OWASP ZAP |
|---------|-----------------|----------------|
| Installation | ✅ None needed | ❌ Requires installation |
| Speed | ⚡ Instant | 🐢 15-30s startup |
| Results | 🎭 Fake data | ✅ Real vulnerabilities |
| Testing | ✅ UI/UX testing | ✅ Security testing |
| Production | ❌ No | ✅ Yes |

## Recommended Workflow

1. **Development**: Use Mock ZAP (`node mock-zap-server.js`)
2. **Testing**: Use Real ZAP for actual security scans
3. **Production**: Use Real ZAP with API key

## Current LinkLens Setup

Your LinkLens application is already fully configured for real ZAP:

✅ Backend endpoints ready
✅ Frontend UI supports real ZAP
✅ Output console shows detailed logs
✅ Progress tracking with timing
✅ Alert display with risk levels
✅ API key support built-in

**All you need is to install and start real OWASP ZAP!**

## Next Steps

1. Choose an installation method above
2. Install OWASP ZAP
3. Run `./start-real-zap.sh`
4. Test with `curl http://localhost:8080/JSON/core/view/version/`
5. Use LinkLens UI to run scans!

---

**Need Help?** Check the scripts:
- `./check-status.sh` - Verify all services
- `./diagnose-zap.sh` - Diagnose ZAP issues
- `./start-real-zap.sh` - Start ZAP (easy mode)
- `./start-real-zap-secure.sh` - Start ZAP (secure mode)
