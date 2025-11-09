#!/bin/bash
# Start all LinkLens services

echo "🚀 Starting LinkLens - Information Security Portal"
echo ""

# Check if mock ZAP is already running
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Mock ZAP Server already running on port 8080"
else
    echo "🔷 Starting Mock ZAP Server on port 8080..."
    node mock-zap-server.js > /dev/null 2>&1 &
    ZAP_PID=$!
    sleep 2
    if curl -s http://localhost:8080/JSON/core/view/version/ > /dev/null 2>&1; then
        echo "✅ Mock ZAP Server started (PID: $ZAP_PID)"
    else
        echo "❌ Failed to start Mock ZAP Server"
    fi
fi

echo ""
echo "📋 Services Status:"
echo "  - Mock ZAP: http://localhost:8080"
echo "  - Backend: http://localhost:5000 (start manually: cd server && npm run dev)"
echo "  - Frontend: http://localhost:3000 (start manually: cd client && npm start)"
echo ""
echo "💡 To start backend & frontend, open two more terminals and run:"
echo "   Terminal 1: cd server && npm run dev"
echo "   Terminal 2: cd client && npm start"
echo ""
echo "✅ Mock ZAP is ready! Visit http://localhost:3000 when all services are up."
