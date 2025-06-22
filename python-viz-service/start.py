#!/usr/bin/env python3
"""
Cival Dashboard - Python Visualization Service Startup Script

This script starts the FastAPI visualization service with proper configuration
and validation for integration with the Next.js dashboard.
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def check_dependencies():
    """Check if all required dependencies are installed."""
    try:
        import fastapi
        import uvicorn
        import plotly
        import pandas
        import numpy
        import redis
        print("✅ All dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Run: pip install -r requirements.txt")
        return False

def check_redis():
    """Check if Redis is available."""
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, decode_responses=True)
        r.ping()
        print("✅ Redis connection successful")
        return True
    except Exception as e:
        print(f"⚠️  Redis not available: {e}")
        print("Redis is optional but recommended for caching")
        return False

def validate_environment():
    """Validate the environment setup."""
    print("🔍 Validating environment...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ required")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}")
    
    # Check dependencies
    if not check_dependencies():
        return False
    
    # Check Redis (optional)
    check_redis()
    
    # Check main.py exists
    main_file = Path(__file__).parent / "main.py"
    if not main_file.exists():
        print("❌ main.py not found")
        return False
    print("✅ main.py found")
    
    return True

def start_service():
    """Start the FastAPI service."""
    print("\n🚀 Starting Cival Visualization Service...")
    print("📊 Service will be available at: http://localhost:8002")
    print("📚 API documentation at: http://localhost:8002/docs")
    print("🔄 Real-time charts will be served to Next.js dashboard")
    print("\nPress Ctrl+C to stop the service\n")
    
    # Set environment variables
    os.environ.setdefault("PYTHONUNBUFFERED", "1")
    
    try:
        # Start the service
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--host", "0.0.0.0", 
            "--port", "8002", 
            "--reload",
            "--log-level", "info"
        ], cwd=Path(__file__).parent)
    except KeyboardInterrupt:
        print("\n🛑 Service stopped by user")
    except Exception as e:
        print(f"❌ Error starting service: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("🎯 CIVAL DASHBOARD - PYTHON VISUALIZATION SERVICE")
    print("=" * 60)
    
    if validate_environment():
        start_service()
    else:
        print("\n❌ Environment validation failed")
        print("Please fix the issues above and try again")
        sys.exit(1) 