#!/bin/bash

# Calm Companion Chat App Startup Script v2.1.0

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

print_status "🌿 Starting Calm Companion Chat App v2.1.0..."

# Check system requirements
print_status "Checking system requirements..."

# Check if Node.js is installed
if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js v16 or higher first."
    print_status "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
    print_status "Please upgrade Node.js: https://nodejs.org/"
    exit 1
fi

print_success "Node.js version: $(node -v)"

# Check if npm is installed
if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "npm version: $(npm -v)"

# Check if git is installed (optional but recommended)
if command_exists git; then
    print_success "Git is available"
else
    print_warning "Git is not installed (optional but recommended for development)"
fi

# Navigate to server directory and install dependencies
print_status "📦 Installing server dependencies..."
cd server

# Check if package.json exists
if [ ! -f package.json ]; then
    print_error "package.json not found in server directory"
    exit 1
fi

# Install dependencies
if npm install; then
    print_success "Server dependencies installed successfully"
else
    print_error "Failed to install server dependencies"
    exit 1
fi

# Check if .env file exists, if not create one
if [ ! -f .env ]; then
    print_status "🔧 Creating .env file..."
    cat > .env << EOF
# Calm Companion Server Configuration
NODE_ENV=development
PORT=5000
JWT_SECRET=your-super-secret-key-here-change-this-in-production
EOF
    print_success "Created .env file with default values"
    print_warning "Please update JWT_SECRET in production!"
else
    print_success ".env file already exists"
fi

# Create logs directory if it doesn't exist
if [ ! -d logs ]; then
    mkdir -p logs
    print_success "Created logs directory"
fi

# Check if ports are available
print_status "🔍 Checking port availability..."

if port_in_use 5000; then
    print_warning "Port 5000 is already in use"
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Stopping startup process"
        exit 1
    fi
fi

if port_in_use 5500; then
    print_warning "Port 5500 is already in use"
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Stopping startup process"
        exit 1
    fi
fi

# Start the server in the background
print_status "🚀 Starting server on http://localhost:5000..."
if npm start > logs/server.log 2>&1 & then
    SERVER_PID=$!
    print_success "Server process started with PID: $SERVER_PID"
else
    print_error "Failed to start server"
    exit 1
fi

# Wait a moment for server to start
sleep 3

# Check if server started successfully
print_status "🔍 Verifying server is running..."
if curl -s http://localhost:5000/api/health > /dev/null; then
    print_success "Server is running successfully!"
    
    # Get server info
    SERVER_INFO=$(curl -s http://localhost:5000/api/health)
    VERSION=$(echo $SERVER_INFO | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    UPTIME=$(echo $SERVER_INFO | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
    
    print_success "Server version: $VERSION"
    print_success "Server uptime: ${UPTIME}s"
else
    print_error "Server failed to start. Please check the logs:"
    echo "--- Server Logs ---"
    tail -n 20 logs/server.log
    echo "------------------"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Function to start frontend server
start_frontend() {
    print_status "🌐 Starting frontend server..."
    cd ..
    
    # Check if Python 3 is available
    if command_exists python3; then
        print_status "Using Python 3 HTTP server"
        python3 -m http.server 5500 > logs/frontend.log 2>&1 &
        FRONTEND_PID=$!
        print_success "Frontend server started with PID: $FRONTEND_PID"
    elif command_exists python; then
        print_status "Using Python HTTP server"
        python -m http.server 5500 > logs/frontend.log 2>&1 &
        FRONTEND_PID=$!
        print_success "Frontend server started with PID: $FRONTEND_PID"
    else
        print_warning "Python not found. Please start frontend manually:"
        print_status "cd public && python3 -m http.server 5500"
        FRONTEND_PID=""
    fi
}

# Start frontend if Python is available
start_frontend

echo ""
print_success "🎉 Calm Companion Chat App is ready!"
echo ""
print_status "📱 To access the application:"
echo "   1. Open your browser"
echo "   2. Go to http://localhost:5500"
echo "   3. Register a new account or login"
echo "   4. Start chatting with your Calm Companion!"
echo ""
print_status "🔧 Server endpoints:"
echo "   - Health check: http://localhost:5000/api/health"
echo "   - API docs: http://localhost:5000"
echo "   - Register: POST http://localhost:5000/api/register"
echo "   - Login: POST http://localhost:5000/api/login"
echo "   - Chat: POST http://localhost:5000/api/chat (requires auth)"
echo ""
print_status "📊 Logs:"
echo "   - Server logs: server/logs/server.log"
echo "   - Frontend logs: logs/frontend.log"
echo ""
print_status "🛠️  Development commands:"
echo "   - Server dev mode: cd server && npm run dev"
echo "   - Lint code: cd server && npm run lint"
echo "   - Format code: cd server && npm run format"
echo "   - Security check: cd server && npm run security-check"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    print_status "🛑 Stopping servers..."
    
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
        print_success "Server stopped"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        print_success "Frontend server stopped"
    fi
    
    print_success "All servers stopped. Goodbye! 👋"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

print_status "🛑 To stop all servers, press Ctrl+C"
echo ""

# Keep the script running and monitor processes
while true; do
    # Check if server is still running
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        print_error "Server process has stopped unexpectedly"
        break
    fi
    
    # Check if frontend is still running (if it was started)
    if [ ! -z "$FRONTEND_PID" ] && ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_warning "Frontend server has stopped"
    fi
    
    sleep 5
done

cleanup
