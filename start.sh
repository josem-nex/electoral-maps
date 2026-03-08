#!/bin/bash

echo "🚀 Starting Electoral Maps MVP..."
echo ""

# Check if running from project root
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Start backend in background
echo "📡 Starting backend (FastAPI)..."
cd backend

if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Creating..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q --upgrade pip

if [ ! -f ".env" ]; then
    echo "⚠️  .env not found. Creating from .env.example..."
    cp .env.example .env
fi

echo "📦 Installing backend dependencies..."
pip install -q -r requirements.txt

echo "✅ Backend ready on http://localhost:8000"
python app/main.py &
BACKEND_PID=$!

cd ..

# Start frontend
echo ""
echo "🎨 Starting frontend (Vite + React)..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies (this may take a while)..."
    npm install --legacy-peer-deps
fi

if [ ! -f ".env" ]; then
    echo "VITE_API_URL=http://localhost:8000" > .env
fi

echo "✅ Frontend ready on http://localhost:5173"
echo ""
echo "🎉 Electoral Maps is running!"
echo "   - Backend: http://localhost:8000"
echo "   - Frontend: http://localhost:5173"
echo "   - API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null" EXIT
