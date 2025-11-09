#!/bin/bash
# Start Mock ZAP Server for Testing

echo "🔷 Starting Mock ZAP Server on port 8080..."
echo "⚠️  This is a TEST server - install real ZAP for actual security testing"
echo ""

# Check if port 8080 is already in use
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "❌ Port 8080 is already in use!"
    echo "Kill the process with: sudo kill -9 \$(lsof -t -i:8080)"
    exit 1
fi

# Start the mock server
node mock-zap-server.js
