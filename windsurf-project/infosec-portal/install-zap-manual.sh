#!/bin/bash
# Manual OWASP ZAP Installation Script

echo "🔷 OWASP ZAP Manual Installation"
echo ""

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "❌ Java not found! Installing Java..."
    sudo apt install default-jre -y
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1)
echo "✅ Java detected: $JAVA_VERSION"
echo ""

# Download ZAP
ZAP_VERSION="2.15.0"
ZAP_URL="https://github.com/zaproxy/zaproxy/releases/download/v${ZAP_VERSION}/ZAP_${ZAP_VERSION}_Linux.tar.gz"
DOWNLOAD_DIR="$HOME/Downloads"
ZAP_ARCHIVE="ZAP_${ZAP_VERSION}_Linux.tar.gz"
INSTALL_DIR="/opt/zaproxy"

echo "📥 Downloading OWASP ZAP v${ZAP_VERSION}..."
echo "   From: $ZAP_URL"
echo ""

cd $DOWNLOAD_DIR || mkdir -p $DOWNLOAD_DIR && cd $DOWNLOAD_DIR

# Download
wget -c $ZAP_URL -O $ZAP_ARCHIVE

if [ $? -ne 0 ]; then
    echo "❌ Download failed!"
    echo "   Try downloading manually from: https://www.zaproxy.org/download/"
    exit 1
fi

echo "✅ Download complete!"
echo ""

# Extract
echo "📦 Extracting ZAP..."
tar -xzf $ZAP_ARCHIVE

if [ $? -ne 0 ]; then
    echo "❌ Extraction failed!"
    exit 1
fi

echo "✅ Extraction complete!"
echo ""

# Install
echo "📂 Installing to $INSTALL_DIR..."
sudo rm -rf $INSTALL_DIR 2>/dev/null
sudo mv ZAP_${ZAP_VERSION} $INSTALL_DIR

if [ $? -ne 0 ]; then
    echo "❌ Installation failed!"
    exit 1
fi

echo "✅ Installation complete!"
echo ""

# Create symlink
echo "🔗 Creating symlinks..."
sudo ln -sf $INSTALL_DIR/zap.sh /usr/local/bin/zaproxy
sudo ln -sf $INSTALL_DIR/zap.sh /usr/local/bin/zap.sh

echo "✅ Symlinks created!"
echo ""

# Verify
if command -v zaproxy &> /dev/null; then
    echo "🎉 OWASP ZAP installed successfully!"
    echo "   Location: $INSTALL_DIR"
    echo "   Command: zaproxy or zap.sh"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Start ZAP: ./start-real-zap.sh"
    echo "   2. Or manually: zaproxy -daemon -port 8080 -config api.disablekey=true -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true"
    echo ""
    # Clean up
    rm -f $ZAP_ARCHIVE
else
    echo "❌ Installation verification failed!"
    echo "   Try running: $INSTALL_DIR/zap.sh"
fi
