#!/bin/bash

# 🌿 Calm Companion - Startup Script

echo "🌿 Starting Calm Companion..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ Created .env file from template"
        echo "📝 Please edit .env file with your configuration"
    else
        echo "❌ env.example not found. Please create .env file manually."
        exit 1
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
fi

# Check if MongoDB is running (optional check)
if command -v mongod &> /dev/null; then
    if pgrep -x "mongod" > /dev/null; then
        echo "✅ MongoDB is running"
    else
        echo "⚠️  MongoDB is not running. Please start MongoDB:"
        echo "   macOS: brew services start mongodb-community"
        echo "   Ubuntu: sudo systemctl start mongod"
        echo "   Windows: net start MongoDB"
        echo "   Or use Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest"
    fi
else
    echo "⚠️  MongoDB not found. Please install MongoDB or use Docker."
fi

# Start the application
echo "🚀 Starting Calm Companion..."
echo "📱 Access the app at: http://localhost:5000"
echo "🔍 Health check: http://localhost:5000/api/health"
echo "📊 Metrics: http://localhost:5000/api/metrics"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
