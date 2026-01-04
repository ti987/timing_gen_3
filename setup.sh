#!/bin/bash

# Installation script for Timing Gen 3
# This script downloads the required Paper.js library

echo "==================================="
echo "Timing Gen 3 - Setup Script"
echo "==================================="
echo ""

# Check if paper-full.min.js already exists
if [ -f "paper-full.min.js" ]; then
    echo "✓ Paper.js library already exists"
    echo ""
    read -p "Do you want to re-download it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing paper-full.min.js"
        exit 0
    fi
fi

echo "Downloading Paper.js library..."
echo ""

# Try to download using curl
if command -v curl &> /dev/null; then
    curl -L "https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.17/paper-full.min.js" -o paper-full.min.js
    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Paper.js downloaded successfully!"
        echo ""
        echo "You can now open index.html in your browser."
        echo "Or run a local server with: python3 -m http.server 8000"
        exit 0
    fi
fi

# Try to download using wget
if command -v wget &> /dev/null; then
    wget "https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.17/paper-full.min.js" -O paper-full.min.js
    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Paper.js downloaded successfully!"
        echo ""
        echo "You can now open index.html in your browser."
        echo "Or run a local server with: python3 -m http.server 8000"
        exit 0
    fi
fi

# If both fail
echo "✗ Failed to download Paper.js automatically."
echo ""
echo "Please download it manually:"
echo "1. Visit: https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.17/paper-full.min.js"
echo "2. Save the file as 'paper-full.min.js' in this directory"
echo ""
echo "Then open index.html in your browser."
exit 1
