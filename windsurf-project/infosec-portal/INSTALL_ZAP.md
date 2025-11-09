# OWASP ZAP Installation Guide

## Option 1: Install via apt (Kali/Debian)
```bash
sudo apt update
sudo apt install zaproxy -y
```

## Option 2: Download Official Release
```bash
# Download latest ZAP
cd ~/Downloads
wget https://github.com/zaproxy/zaproxy/releases/download/v2.14.0/ZAP_2.14.0_Linux.tar.gz

# Extract
tar -xvf ZAP_2.14.0_Linux.tar.gz
sudo mv ZAP_2.14.0 /opt/zaproxy

# Add to PATH
echo 'export PATH="/opt/zaproxy:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Option 3: Install via Snap
```bash
sudo snap install zaproxy --classic
```

## Verify Installation
```bash
# Find zap.sh
which zap.sh

# Or find it manually
find /usr /opt -name "zap.sh" 2>/dev/null
```

## Start ZAP Daemon (after installation)

### Without API Key (easier for testing):
```bash
zap.sh -daemon -port 8080 -config api.disablekey=true -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true
```

### With API Key (more secure):
```bash
zap.sh -daemon -port 8080 -config api.key=YOUR_SECRET_KEY -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true
```

## Test ZAP is Running
```bash
curl http://localhost:8080/JSON/core/view/version/
```

## Common Issues

### Port Already in Use
```bash
# Find process using port 8080
sudo lsof -i :8080

# Kill it if needed
sudo kill -9 <PID>
```

### Permission Denied
```bash
# Make zap.sh executable
sudo chmod +x /path/to/zap.sh
```
