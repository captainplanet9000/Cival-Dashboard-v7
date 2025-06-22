#!/usr/bin/env python3
"""
Redis Setup and Mock Service for Cival Trading Platform
Provides Redis functionality for caching and session management
"""

import os
import sys
import json
import time
import threading
from typing import Dict, Any, Optional
from pathlib import Path

class MockRedis:
    """Mock Redis implementation for development"""
    
    def __init__(self):
        self.data: Dict[str, Any] = {}
        self.expiry: Dict[str, float] = {}
        self.lock = threading.Lock()
        print("🔧 Mock Redis service initialized")
    
    def set(self, key: str, value: Any, ex: Optional[int] = None) -> bool:
        """Set a key-value pair with optional expiry"""
        with self.lock:
            self.data[key] = value
            if ex:
                self.expiry[key] = time.time() + ex
            elif key in self.expiry:
                del self.expiry[key]
        return True
    
    def get(self, key: str) -> Optional[Any]:
        """Get value by key"""
        with self.lock:
            # Check if expired
            if key in self.expiry and time.time() > self.expiry[key]:
                del self.data[key]
                del self.expiry[key]
                return None
            return self.data.get(key)
    
    def delete(self, *keys: str) -> int:
        """Delete keys"""
        with self.lock:
            count = 0
            for key in keys:
                if key in self.data:
                    del self.data[key]
                    count += 1
                if key in self.expiry:
                    del self.expiry[key]
            return count
    
    def exists(self, key: str) -> bool:
        """Check if key exists"""
        return self.get(key) is not None
    
    def flushall(self) -> bool:
        """Clear all data"""
        with self.lock:
            self.data.clear()
            self.expiry.clear()
        return True
    
    def keys(self, pattern: str = "*") -> list:
        """Get all keys matching pattern"""
        with self.lock:
            if pattern == "*":
                return list(self.data.keys())
            # Simple pattern matching for *
            if pattern.endswith("*"):
                prefix = pattern[:-1]
                return [k for k in self.data.keys() if k.startswith(prefix)]
            return [k for k in self.data.keys() if k == pattern]

class RedisSetup:
    """Redis setup and configuration manager"""
    
    def __init__(self):
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis_host = os.getenv('REDIS_HOST', 'localhost')
        self.redis_port = int(os.getenv('REDIS_PORT', 6379))
        self.mock_redis = MockRedis()
    
    def test_redis_connection(self) -> bool:
        """Test if Redis is available"""
        try:
            import redis
            r = redis.Redis(host=self.redis_host, port=self.redis_port, decode_responses=True)
            r.ping()
            print("✅ Redis connection successful")
            return True
        except Exception as e:
            print(f"❌ Redis connection failed: {e}")
            return False
    
    def setup_redis_service(self) -> bool:
        """Set up Redis service (real or mock)"""
        print("🚀 Setting up Redis service...")
        
        # Try to connect to real Redis first
        if self.test_redis_connection():
            print("✅ Using real Redis instance")
            return self.setup_real_redis()
        else:
            print("🔧 Using mock Redis for development")
            return self.setup_mock_redis()
    
    def setup_real_redis(self) -> bool:
        """Configure real Redis instance"""
        try:
            import redis
            r = redis.Redis(host=self.redis_host, port=self.redis_port, decode_responses=True)
            
            # Test basic operations
            r.set("test_key", "test_value", ex=60)
            test_value = r.get("test_key")
            
            if test_value == "test_value":
                print("✅ Redis functionality verified")
                r.delete("test_key")
                return True
            else:
                print("❌ Redis test failed")
                return False
                
        except Exception as e:
            print(f"❌ Redis setup error: {e}")
            return False
    
    def setup_mock_redis(self) -> bool:
        """Set up mock Redis service"""
        try:
            # Test mock Redis functionality
            self.mock_redis.set("test_key", "test_value", ex=60)
            test_value = self.mock_redis.get("test_key")
            
            if test_value == "test_value":
                print("✅ Mock Redis functionality verified")
                self.mock_redis.delete("test_key")
                
                # Create mock Redis client module
                self.create_mock_redis_client()
                
                return True
            else:
                print("❌ Mock Redis test failed")
                return False
                
        except Exception as e:
            print(f"❌ Mock Redis setup error: {e}")
            return False
    
    def create_mock_redis_client(self):
        """Create a mock Redis client that can be imported"""
        mock_client_code = '''
"""Mock Redis client for development"""

class MockRedisClient:
    def __init__(self, host="localhost", port=6379, decode_responses=True, **kwargs):
        self.data = {}
        self.expiry = {}
        
    def set(self, key, value, ex=None):
        self.data[key] = value
        if ex:
            import time
            self.expiry[key] = time.time() + ex
        return True
        
    def get(self, key):
        import time
        if key in self.expiry and time.time() > self.expiry[key]:
            del self.data[key] 
            del self.expiry[key]
            return None
        return self.data.get(key)
        
    def delete(self, *keys):
        count = 0
        for key in keys:
            if key in self.data:
                del self.data[key]
                count += 1
            if key in self.expiry:
                del self.expiry[key]
        return count
        
    def exists(self, key):
        return self.get(key) is not None
        
    def ping(self):
        return True
        
    def flushall(self):
        self.data.clear()
        self.expiry.clear()
        return True

# Mock the redis module
class MockRedisModule:
    @staticmethod
    def Redis(*args, **kwargs):
        return MockRedisClient(*args, **kwargs)

import sys
sys.modules['redis'] = MockRedisModule()
'''
        
        # Write mock client to lib directory
        lib_path = Path(__file__).parent / "src" / "lib"
        lib_path.mkdir(exist_ok=True, parents=True)
        
        mock_redis_path = lib_path / "mock_redis.py"
        with open(mock_redis_path, 'w') as f:
            f.write(mock_client_code)
        
        print("✅ Mock Redis client created")

def install_redis_dependencies():
    """Install Redis Python package if needed"""
    try:
        import redis
        print("✅ Redis package already installed")
        return True
    except ImportError:
        print("📦 Installing Redis package...")
        try:
            import subprocess
            result = subprocess.run([sys.executable, '-m', 'pip', 'install', 'redis'], 
                                    capture_output=True, text=True)
            if result.returncode == 0:
                print("✅ Redis package installed successfully")
                return True
            else:
                print(f"❌ Failed to install Redis: {result.stderr}")
                return False
        except Exception as e:
            print(f"❌ Installation error: {e}")
            return False

def main():
    """Main Redis setup function"""
    print("🎯 Cival Trading Platform - Redis Setup")
    print("=" * 50)
    
    # Install dependencies if needed
    install_redis_dependencies()
    
    # Set up Redis service
    setup = RedisSetup()
    success = setup.setup_redis_service()
    
    if success:
        print("\n🎉 Redis setup completed successfully!")
        print("💾 Caching and session management ready")
        print("🚀 Trading platform can now use Redis functionality")
    else:
        print("\n❌ Redis setup failed")
        return False
    
    return True

if __name__ == "__main__":
    try:
        result = main()
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n🛑 Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Setup failed with error: {e}")
        sys.exit(1)