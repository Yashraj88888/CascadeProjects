#!/bin/bash
# Quick Status Check for LinkLens

echo "========================================="
echo "  LinkLens Status Check"
echo "========================================="
echo ""

# Check Mock ZAP Server
echo "1️⃣  Mock ZAP Server (port 8080):"
if curl -s http://localhost:8080/JSON/core/view/version/ > /dev/null 2>&1; then
    VERSION=$(curl -s http://localhost:8080/JSON/core/view/version/)
    echo "   ✅ RUNNING - $VERSION"
else
    echo "   ❌ NOT RUNNING"
    echo "   Fix: node mock-zap-server.js"
fi
echo ""

# Check Backend Server
echo "2️⃣  Backend Server (port 5000):"
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "   ✅ RUNNING"
else
    echo "   ❌ NOT RUNNING"
    echo "   Fix: cd server && npm run dev"
fi
echo ""

# Check Frontend Server
echo "3️⃣  Frontend Server (port 3000):"
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "   ✅ RUNNING"
else
    echo "   ❌ NOT RUNNING"
    echo "   Fix: cd client && npm start"
fi
echo ""

# Check Backend -> ZAP Connection
echo "4️⃣  Backend → ZAP Connection:"
HEALTH_CHECK=$(curl -s http://localhost:5000/api/zap/health 2>&1)
if echo "$HEALTH_CHECK" | grep -q "ok.*true"; then
    echo "   ✅ CONNECTED"
else
    echo "   ❌ FAILED"
    echo "   Response: $HEALTH_CHECK"
fi
echo ""

echo "========================================="
echo "  Summary"
echo "========================================="
echo ""
echo "If all 4 checks pass, ZAP should work in the UI!"
echo "Navigate to: http://localhost:3000"
echo "Click: OWASP ZAP → Check ZAP button"
echo ""
