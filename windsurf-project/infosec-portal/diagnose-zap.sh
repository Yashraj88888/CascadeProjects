#!/bin/bash
# Diagnostic script to check ZAP installation and connectivity

echo "========================================="
echo "  LinkLens - ZAP Diagnostic Tool"
echo "========================================="
echo ""

# 1. Check if ZAP is installed
echo "1️⃣  Checking ZAP installation..."
if command -v zap.sh &> /dev/null; then
    echo "   ✅ zap.sh found at: $(which zap.sh)"
else
    echo "   ❌ zap.sh NOT FOUND"
    echo "   📋 Install ZAP:"
    echo "      - Option 1: sudo apt install zaproxy"
    echo "      - Option 2: Download from https://www.zaproxy.org/download/"
    echo "      - Option 3: Use mock server (see below)"
fi
echo ""

# 2. Check if port 8080 is in use
echo "2️⃣  Checking port 8080..."
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "   ✅ Port 8080 is IN USE (something is running)"
    echo "   Process details:"
    lsof -Pi :8080 -sTCP:LISTEN | head -2
else
    echo "   ⚠️  Port 8080 is FREE (nothing running)"
    echo "   📋 You need to start ZAP or mock server"
fi
echo ""

# 3. Test ZAP connection
echo "3️⃣  Testing ZAP connection..."
response=$(curl -s -w "\n%{http_code}" http://localhost:8080/JSON/core/view/version/ 2>&1)
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    echo "   ✅ ZAP is responding!"
    echo "   Response: $(echo "$response" | head -n1)"
else
    echo "   ❌ ZAP is NOT responding (HTTP code: $http_code)"
    echo "   Connection error - ZAP daemon not running"
fi
echo ""

# 4. Check mock server availability
echo "4️⃣  Checking mock server..."
if [ -f "mock-zap-server.js" ]; then
    echo "   ✅ Mock server available at: mock-zap-server.js"
else
    echo "   ❌ Mock server not found"
fi
echo ""

# Summary and recommendations
echo "========================================="
echo "  RECOMMENDATIONS"
echo "========================================="
echo ""

if [ "$http_code" = "200" ]; then
    echo "🎉 ZAP is working! You can use LinkLens now."
    echo ""
    echo "Next steps:"
    echo "  1. cd server && npm run dev"
    echo "  2. cd client && npm start"
    echo "  3. Open http://localhost:3000"
else
    echo "⚠️  ZAP is not running. Choose one option:"
    echo ""
    echo "OPTION A: Use Mock Server (for testing UI)"
    echo "  Terminal 1: node mock-zap-server.js"
    echo "  Terminal 2: cd server && npm run dev"
    echo "  Terminal 3: cd client && npm start"
    echo ""
    
    if command -v zap.sh &> /dev/null; then
        echo "OPTION B: Start Real ZAP (for actual scanning)"
        echo "  Terminal 1: zap.sh -daemon -port 8080 -config api.disablekey=true -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true"
        echo "  Terminal 2: cd server && npm run dev"
        echo "  Terminal 3: cd client && npm start"
    else
        echo "OPTION B: Install Real ZAP First"
        echo "  sudo apt install zaproxy"
        echo "  OR see ZAP_SETUP_GUIDE.md for other options"
    fi
fi

echo ""
echo "📚 Full documentation: ZAP_SETUP_GUIDE.md"
echo "========================================="
