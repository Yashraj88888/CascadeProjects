#!/bin/bash

echo "🛑 Stopping all services..."

# Stop frontend
pkill -f "react-scripts start" || echo "No frontend process found"

# Stop backend
pkill -f "node.*server.js" || echo "No backend process found"

# Stop ZAP
pkill -f "zap.sh" || echo "No ZAP process found"

# Additional cleanup for ZAP if needed
pkill -f "java.*zap" || echo "No Java ZAP process found"

echo "✅ All services stopped"
echo ""
echo "Log files location:"
echo "- Backend logs: $(pwd)/backend.log"
echo "- Frontend logs: $(pwd)/frontend.log"
echo "- ZAP logs: $(pwd)/zap.log"
echo ""
echo "To start all services again, run: ./start-all.sh"
