#!/usr/bin/env python3
"""
Service startup script for Cival Dashboard
Starts both AI services and Next.js dashboard
"""
import subprocess
import time
import os
import sys
import signal
import threading
from pathlib import Path

class ServiceManager:
    """Manages multiple services"""
    
    def __init__(self):
        self.processes = {}
        self.running = True
        
    def start_ai_services(self):
        """Start AI services"""
        print("🚀 Starting AI Services on port 9000...")
        
        # Change to python-ai-services directory
        ai_dir = Path(__file__).parent / "python-ai-services"
        
        # Start the basic server
        try:
            process = subprocess.Popen(
                [sys.executable, "basic_server.py"],
                cwd=ai_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            self.processes["ai_services"] = process
            
            # Monitor output
            def monitor_ai_output():
                for line in iter(process.stdout.readline, ''):
                    if line:
                        print(f"[AI] {line.strip()}")
                
            threading.Thread(target=monitor_ai_output, daemon=True).start()
            return True
            
        except Exception as e:
            print(f"❌ Failed to start AI services: {e}")
            return False
    
    def start_dashboard(self):
        """Start Next.js dashboard"""
        print("🌐 Starting Next.js Dashboard on port 3000...")
        
        try:
            process = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=Path(__file__).parent,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            self.processes["dashboard"] = process
            
            # Monitor output
            def monitor_dashboard_output():
                for line in iter(process.stdout.readline, ''):
                    if line:
                        print(f"[DASH] {line.strip()}")
                
            threading.Thread(target=monitor_dashboard_output, daemon=True).start()
            return True
            
        except Exception as e:
            print(f"❌ Failed to start dashboard: {e}")
            return False
    
    def check_services(self):
        """Check if services are running"""
        status = {}
        for name, process in self.processes.items():
            if process and process.poll() is None:
                status[name] = "running"
            else:
                status[name] = "stopped"
        return status
    
    def stop_services(self):
        """Stop all services"""
        print("\n🛑 Stopping services...")
        self.running = False
        
        for name, process in self.processes.items():
            if process and process.poll() is None:
                print(f"Stopping {name}...")
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
        
        print("✅ All services stopped")

def main():
    """Main startup function"""
    print("🚀 Starting Cival Dashboard Services")
    print("=" * 50)
    
    manager = ServiceManager()
    
    # Handle Ctrl+C
    def signal_handler(sig, frame):
        manager.stop_services()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    # Start AI services first
    if not manager.start_ai_services():
        print("❌ Failed to start AI services")
        return
    
    # Wait a moment for AI services to start
    time.sleep(3)
    
    # Start dashboard
    if not manager.start_dashboard():
        print("❌ Failed to start dashboard")
        manager.stop_services()
        return
    
    # Wait for dashboard to start
    time.sleep(5)
    
    print("\n✅ Services Started Successfully!")
    print("=" * 50)
    print("🤖 AI Services: http://localhost:9000")
    print("🌐 Dashboard: http://localhost:3000")
    print("📊 Health Check: http://localhost:9000/health")
    print("🔗 Agents: http://localhost:9000/agents")
    print("=" * 50)
    print("Press Ctrl+C to stop all services")
    
    # Monitor services
    while manager.running:
        time.sleep(10)
        status = manager.check_services()
        
        # Check if any service died
        for name, state in status.items():
            if state == "stopped":
                print(f"⚠️  {name} has stopped")
        
        # Print status update
        running_services = [name for name, state in status.items() if state == "running"]
        if running_services:
            timestamp = time.strftime("%H:%M:%S")
            print(f"[{timestamp}] Services running: {', '.join(running_services)}")

if __name__ == "__main__":
    main()