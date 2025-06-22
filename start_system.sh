#!/bin/bash

# Cival Dashboard System Startup Script
echo "🚀 Starting Cival Dashboard System"
echo "=================================="

# Function to check if port is available
check_port() {
    local port=$1
    if ss -tulpn | grep ":$port " > /dev/null; then
        echo "⚠️  Port $port is already in use"
        return 1
    else
        echo "✅ Port $port is available"
        return 0
    fi
}

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
pkill -f "python3 basic_server.py" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Check ports
echo "🔍 Checking ports..."
check_port 3000
check_port 9000

# Start AI Services
echo "🤖 Starting AI Services on port 9000..."
cd python-ai-services
nohup python3 basic_server.py > ../logs/ai-services.log 2>&1 &
AI_PID=$!
cd ..

# Wait for AI services to start
echo "⏳ Waiting for AI services to initialize..."
sleep 5

# Check if AI services started successfully
if kill -0 $AI_PID 2>/dev/null; then
    echo "✅ AI Services started successfully (PID: $AI_PID)"
else
    echo "❌ AI Services failed to start"
    exit 1
fi

# Test AI services
echo "🧪 Testing AI services..."
if curl -s http://localhost:9000/health > /dev/null; then
    echo "✅ AI Services responding on port 9000"
else
    echo "⚠️  AI Services not responding yet, continuing anyway..."
fi

# Start Next.js Dashboard
echo "🌐 Starting Next.js Dashboard on port 3000..."
nohup npm run dev > logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!

# Wait for dashboard to start
echo "⏳ Waiting for dashboard to initialize..."
sleep 8

# Check if dashboard started successfully
if kill -0 $DASHBOARD_PID 2>/dev/null; then
    echo "✅ Dashboard started successfully (PID: $DASHBOARD_PID)"
else
    echo "❌ Dashboard failed to start"
    cat logs/dashboard.log
    exit 1
fi

# Test dashboard
echo "🧪 Testing dashboard..."
sleep 3
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Dashboard responding on port 3000"
else
    echo "⚠️  Dashboard not responding yet, may still be starting..."
fi

echo ""
echo "🎉 System Started Successfully!"
echo "=================================="
echo "🤖 AI Services: http://localhost:9000"
echo "🌐 Dashboard: http://localhost:3000"
echo "📊 Health Check: http://localhost:9000/health"
echo "🔗 Trading Agents: http://localhost:9000/agents"
echo ""
echo "📋 Process IDs:"
echo "   AI Services: $AI_PID"
echo "   Dashboard: $DASHBOARD_PID"
echo ""
echo "📄 Logs:"
echo "   AI Services: logs/ai-services.log"
echo "   Dashboard: logs/dashboard.log"
echo ""
echo "🛑 To stop services:"
echo "   kill $AI_PID $DASHBOARD_PID"
echo ""
echo "✨ Your trading system is ready!"