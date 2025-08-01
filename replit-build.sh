#!/bin/bash

echo "Starting Replit deployment build..."

# Run the standard build
npm run build

# Check if dist/public exists and move files
if [ -d "dist/public" ]; then
    echo "Moving files from dist/public to dist..."
    
    # Create a temporary directory to hold server files
    if [ -f "dist/index.js" ]; then
        mkdir -p dist/temp
        mv dist/index.js dist/temp/
    fi
    
    # Move all files from dist/public to dist
    mv dist/public/* dist/
    
    # Remove the empty public directory
    rmdir dist/public
    
    # Move server files back
    if [ -d "dist/temp" ]; then
        mv dist/temp/index.js dist/
        rmdir dist/temp
    fi
    
    echo "Build completed successfully!"
else
    echo "No dist/public directory found, build output is already in correct location"
fi

echo "Files in dist directory:"
ls -la dist/