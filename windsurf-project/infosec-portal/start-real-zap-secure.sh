#!/bin/bash
# Start Real OWASP ZAP Daemon with API Key (More Secure)

echo "🔷 Starting Real OWASP ZAP Daemon (Secure Mode)"
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

# Check if zaproxy is installed
if ! command -v zaproxy &> /dev/null; then
    echo "❌ zaproxy not found!"
    echo "   Install it with: sudo apt install zaproxy"
    exit 1
fi

# Get API key from user or generate random one
API_KEY="${1:-LinkLensSecureKey$(date +%s)}"

echo "🔑 API Key: $API_KEY"
echo "   ⚠️  Save this key! You'll need it in LinkLens UI"
echo ""
echo "🚀 Starting ZAP daemon..."
echo "   Mode: API Key Required"
echo "   Port: 8080"
echo ""

# Start ZAP in daemon mode with API key
zaproxy -daemon \
    -port 8080 \
    -config api.key=$API_KEY \
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
    if curl -s "http://localhost:8080/JSON/core/view/version/?apikey=$API_KEY" > /dev/null 2>&1; then
        echo ""
        echo "✅ ZAP is ready!"
        VERSION=$(curl -s "http://localhost:8080/JSON/core/view/version/?apikey=$API_KEY" | grep -oP '"version":"\K[^"]+')
        echo "   Version: $VERSION"
        echo "   URL: http://localhost:8080"
        echo "   API Key: $API_KEY"
        echo ""
        echo "🎉 You can now use OWASP ZAP in LinkLens!"
        echo ""
        echo "📝 In LinkLens UI:"
        echo "   1. Go to OWASP ZAP page"
        echo "   2. Enter ZAP URL: http://localhost:8080"
        echo "   3. Enter API Key: $API_KEY"
        echo "   4. Click 'Check ZAP'"
        echo ""
        echo "💾 Save API Key to .env file? (y/n)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo "ZAP_API_KEY=$API_KEY" >> server/.env
            echo "✅ Saved to server/.env"
        fi
        exit 0
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    echo -n "."
done

echo ""
echo "❌ ZAP failed to start within $MAX_WAIT seconds"
echo "   Check logs or try manually"
exit 1
