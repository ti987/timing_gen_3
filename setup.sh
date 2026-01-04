#!/bin/bash

# Installation script for Timing Gen 3
# This script downloads the Paper.js library for offline use

echo "==================================="
echo "Timing Gen 3 - Setup Script"
echo "==================================="
echo ""
echo "Note: The application uses Paper.js from CDN by default."
echo "This script is only needed for offline use."
echo ""

# Check if paper-full.min.js already exists
if [ -f "js/paper-full.min.js" ]; then
    echo "✓ Paper.js library already exists in js/ directory"
    echo ""
    read -p "Do you want to re-download it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing js/paper-full.min.js"
        exit 0
    fi
fi

echo "Downloading Paper.js library to js/ directory..."
echo ""

# Try to download using curl
if command -v curl &> /dev/null; then
    curl -L "https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.17/paper-full.min.js" -o js/paper-full.min.js
    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Paper.js downloaded successfully to js/paper-full.min.js!"
        echo ""
        echo "To use the local version instead of CDN:"
        echo "1. Edit index.html"
        echo "2. Replace the CDN script tag with: <script src=\"js/paper-full.min.js\"></script>"
        echo ""
        echo "Or just open index.html - it will use CDN by default."
        exit 0
    fi
fi

# Try to download using wget
if command -v wget &> /dev/null; then
    wget "https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.17/paper-full.min.js" -O js/paper-full.min.js
    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Paper.js downloaded successfully to js/paper-full.min.js!"
        echo ""
        echo "To use the local version instead of CDN:"
        echo "1. Edit index.html"
        echo "2. Replace the CDN script tag with: <script src=\"js/paper-full.min.js\"></script>"
        echo ""
        echo "Or just open index.html - it will use CDN by default."
        exit 0
    fi
fi

# If both fail
echo "✗ Failed to download Paper.js automatically."
echo ""
echo "Please download it manually:"
echo "1. Visit: https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.17/paper-full.min.js"
echo "2. Save the file as 'paper-full.min.js' in the 'js/' directory"
echo ""
echo "Or just open index.html - it will use the CDN version."
exit 1
