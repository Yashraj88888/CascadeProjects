#!/bin/bash

# Set project root directory
PROJECT_ROOT="/home/ysrj/CascadeProjects/windsurf-project"

# Create logs directory if it doesn't exist
LOGS_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOGS_DIR"

# Kill any existing processes
echo "🛑 Stopping any existing services..."
pkill -f "zap.sh" || true
pkill -f "node.*server.js" || true
pkill -f "react-scripts start" || true

# Start ZAP in the background
echo "🚀 Starting ZAP..."
cd ~/zap/ZAP_2.15.0/
ZAP_LOG="$LOGS_DIR/zap.log"
nohup ./zap.sh -daemon -port 8080 -config api.disablekey=true -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true > "$ZAP_LOG" 2>&1 &

# Wait for ZAP to start
echo "⏳ Waiting for ZAP to initialize (30 seconds)..."
sleep 30

# Verify ZAP is running
if ! curl -s http://localhost:8080/JSON/core/view/version/ > /dev/null; then
  echo "❌ Failed to start ZAP. Check $ZAP_LOG for details."
  exit 1
fi

# Start backend
echo "🚀 Starting Backend..."
cd "$PROJECT_ROOT/infosec-portal/server"
BACKEND_LOG="$LOGS_DIR/backend.log"
nohup PORT=5001 ZAP_API_URL=http://localhost:8080 ZAP_API_KEY= npm run dev > "$BACKEND_LOG" 2>&1 &

# Wait for backend to start
echo "⏳ Waiting for backend to start (10 seconds)..."
sleep 10

# Start frontend
echo "🚀 Starting Frontend..."
cd "$PROJECT_ROOT/infosec-portal/client"
FRONTEND_LOG="$LOGS_DIR/frontend.log"
nohup npm start > "$FRONTEND_LOG" 2>&1 &

echo "\n✅ All services started successfully!"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:5001"
echo "   - ZAP API: http://localhost:8080"
echo "   - Logs directory: $LOGS_DIR/"
echo "\nTo stop all services, run: ./stop-all.sh"

# Show logs
echo "\nTailing logs (Ctrl+C to stop watching logs, services will continue running)..."
tail -f "$LOGS_DIR/backend.log" "$LOGS_DIR/frontend.log" "$LOGS_DIR/zap.log" 2>/dev/null || echo "Waiting for logs to be created..."

echo "\n🔍 To view logs later, run:"
echo "   tail -f $LOGS_DIR/*.log"
