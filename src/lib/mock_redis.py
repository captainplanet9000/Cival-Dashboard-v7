
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
