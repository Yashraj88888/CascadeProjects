#!/bin/bash
# Start Real OWASP ZAP Daemon

echo "🔷 Starting Real OWASP ZAP Daemon"
echo ""

# Check if ZAP is already running
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 8080 is already in use!"
    echo "   Kill existing process? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "   Killing process on port 8080..."
        sudo kill -9 $(lsof -t -i:8080)
        sleep 2
    else
        echo "   Exiting..."
        exit 1
    fi
fi

# Check for ZAP installation
ZAP_PATH=""

# Check if downloaded ZAP exists
if [ -f "$HOME/zap/ZAP_2.15.0/zap.sh" ]; then
    ZAP_PATH="$HOME/zap/ZAP_2.15.0/zap.sh"
    echo "✅ Found downloaded ZAP at: $ZAP_PATH"
elif command -v zaproxy &> /dev/null; then
    ZAP_PATH="zaproxy"
    echo "✅ Found system ZAP: zaproxy"
elif command -v zap.sh &> /dev/null; then
    ZAP_PATH="zap.sh"
    echo "✅ Found system ZAP: zap.sh"
else
    echo "❌ ZAP not found!"
    echo "   Install it with: sudo apt install zaproxy"
    echo "   Or download from: https://www.zaproxy.org/download/"
    exit 1
fi

echo "🚀 Starting ZAP daemon..."
echo "   Mode: No API Key (easy for development)"
echo "   Port: 8080"
echo "   Config: Allows connections from any host"
echo ""

# Start ZAP in daemon mode without API key
"$ZAP_PATH" -daemon \
    -port 8080 \
    -config api.disablekey=true \
    -config api.addrs.addr.name=.* \
    -config api.addrs.addr.regex=true \
    &

ZAP_PID=$!
echo "   PID: $ZAP_PID"
echo ""
echo "⏳ Waiting for ZAP to start (this takes 15-30 seconds)..."

# Wait for ZAP to be ready
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:8080/JSON/core/view/version/ > /dev/null 2>&1; then
        echo ""
        echo "✅ ZAP is ready!"
        VERSION=$(curl -s http://localhost:8080/JSON/core/view/version/ | grep -oP '"version":"\K[^"]+')
        echo "   Version: $VERSION"
        echo "   URL: http://localhost:8080"
        echo ""
        echo "🎉 You can now use OWASP ZAP in LinkLens!"
        echo "   Test it: curl http://localhost:8080/JSON/core/view/version/"
        exit 0
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    echo -n "."
done

echo ""
echo "❌ ZAP failed to start within $MAX_WAIT seconds"
echo "   Check logs or try manually: zaproxy -daemon -port 8080"
exit 1
