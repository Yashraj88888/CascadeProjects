#!/bin/bash
# Start OWASP ZAP using Docker

echo "🐳 Starting OWASP ZAP with Docker"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found!"
    echo "   Install Docker:"
    echo "   sudo apt install docker.io -y"
    echo "   sudo systemctl start docker"
    echo "   sudo usermod -aG docker $USER"
    echo "   (then log out and back in)"
    exit 1
fi

# Check if Docker daemon is running
if ! sudo docker info &> /dev/null; then
    echo "❌ Docker daemon not running!"
    echo "   Start it with: sudo systemctl start docker"
    exit 1
fi

echo "✅ Docker is ready"
echo ""

# Check if container is already running
if sudo docker ps | grep -q linklens-zap; then
    echo "⚠️  ZAP container already running!"
    echo "   Stop it? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "   Stopping container..."
        sudo docker stop linklens-zap
        sudo docker rm linklens-zap
    else
        echo "   Exiting..."
        exit 0
    fi
fi

echo "🚀 Starting ZAP container..."
echo ""

# Start ZAP using docker-compose
if [ -f "docker-compose.zap.yml" ]; then
    sudo docker-compose -f docker-compose.zap.yml up -d
else
    # Start manually if compose file not found
    sudo docker run -d \
        --name linklens-zap \
        -p 8080:8080 \
        zaproxy/zap-stable \
        zap.sh -daemon -host 0.0.0.0 -port 8080 \
        -config api.disablekey=true \
        -config api.addrs.addr.name=.* \
        -config api.addrs.addr.regex=true
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to start ZAP container!"
    exit 1
fi

echo "✅ Container started!"
echo ""
echo "⏳ Waiting for ZAP to initialize (15-30 seconds)..."

# Wait for ZAP to be ready
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:8080/JSON/core/view/version/ > /dev/null 2>&1; then
        echo ""
        echo "🎉 ZAP is ready!"
        VERSION=$(curl -s http://localhost:8080/JSON/core/view/version/ | grep -oP '"version":"\K[^"]+' || echo "unknown")
        echo "   Version: $VERSION"
        echo "   URL: http://localhost:8080"
        echo "   Container: linklens-zap"
        echo ""
        echo "📋 Useful commands:"
        echo "   View logs: sudo docker logs -f linklens-zap"
        echo "   Stop ZAP: sudo docker stop linklens-zap"
        echo "   Remove container: sudo docker rm linklens-zap"
        echo ""
        echo "✅ Ready to use in LinkLens!"
        exit 0
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    echo -n "."
done

echo ""
echo "❌ ZAP failed to start within $MAX_WAIT seconds"
echo "   Check logs: sudo docker logs linklens-zap"
exit 1
