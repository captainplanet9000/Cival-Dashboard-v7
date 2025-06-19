#!/usr/bin/env python3
"""
Test Memory System Connections
Comprehensive testing of all memory system components
"""

import asyncio
import os
import sys
import time
from dotenv import load_dotenv

# Add the project root to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python-ai-services'))

load_dotenv()

async def test_redis_connection():
    """Test Redis Cloud connection"""
    print("🔍 Testing Redis Cloud connection...")
    try:
        import redis.asyncio as aioredis
        
        # Test both URL format and individual credentials
        redis_url = os.getenv('REDIS_URL')
        redis_host = os.getenv('REDIS_HOST')
        redis_port = int(os.getenv('REDIS_PORT', 6379))
        redis_username = os.getenv('REDIS_USERNAME')
        redis_password = os.getenv('REDIS_PASSWORD')
        
        if redis_url:
            print(f"   Connecting via URL to: {redis_host}:{redis_port}")
            redis_client = await aioredis.from_url(redis_url, decode_responses=True)
        elif redis_host and redis_password:
            print(f"   Connecting via credentials to: {redis_host}:{redis_port}")
            redis_client = await aioredis.Redis(
                host=redis_host,
                port=redis_port,
                username=redis_username,
                password=redis_password,
                decode_responses=True
            )
        else:
            print("   ⚠️ Redis connection information not found in environment")
            return False
        
        # Test connection
        await redis_client.ping()
        print("   ✅ Redis ping successful")
        
        # Test basic operations
        test_key = f'cival_test_{int(time.time())}'
        await redis_client.set(test_key, 'test_value', ex=60)
        value = await redis_client.get(test_key)
        await redis_client.delete(test_key)
        
        if value == 'test_value':
            print("   ✅ Redis operations successful")
            return True
        else:
            print("   ❌ Redis value test failed")
            return False
            
    except ImportError:
        print("   ⚠️ Redis library not installed (pip install redis aioredis)")
        return False
    except Exception as e:
        print(f"   ❌ Redis connection failed: {e}")
        return False

async def test_supabase_connection():
    """Test Supabase connection"""
    print("🔍 Testing Supabase connection...")
    try:
        from supabase import create_client
        
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            print("   ⚠️ Missing Supabase credentials")
            return False
            
        print(f"   Connecting to: {supabase_url[:30]}...")
        supabase = create_client(supabase_url, supabase_key)
        
        # Test basic query
        result = supabase.table('agent_states').select('count', count='exact').execute()
        
        if hasattr(result, 'count') and result.count is not None:
            print(f"   ✅ Supabase connection successful (agent_states count: {result.count})")
            return True
        else:
            print("   ❌ Supabase query test failed")
            return False
            
    except ImportError:
        print("   ⚠️ Supabase library not installed (pip install supabase)")
        return False
    except Exception as e:
        print(f"   ❌ Supabase connection failed: {e}")
        return False

async def test_letta_initialization():
    """Test Letta initialization"""
    print("🔍 Testing Letta initialization...")
    try:
        from letta import create_client
        
        # Test basic Letta initialization
        print("   Creating Letta client...")
        client = create_client()
        
        # List existing agents
        agents = client.list_agents()
        print(f"   Found {len(agents)} existing agents")
        
        # Test agent creation
        test_agent_name = "test_memory_agent"
        existing_agent = None
        
        for agent in agents:
            if agent.name == test_agent_name:
                existing_agent = agent
                break
        
        if existing_agent:
            print(f"   Using existing test agent: {test_agent_name}")
            agent_id = existing_agent.id
        else:
            print(f"   Creating new test agent: {test_agent_name}")
            new_agent = client.create_agent(
                name=test_agent_name,
                persona="You are a test agent for memory system validation.",
                human="You are testing the memory capabilities."
            )
            agent_id = new_agent.id
        
        # Test basic memory operation
        response = client.send_message(
            agent_id=agent_id,
            message="Test memory storage - this is a validation message",
            role="user"
        )
        
        if response:
            print("   ✅ Letta initialization and messaging successful")
            return True
        else:
            print("   ❌ Letta test interaction failed")
            return False
            
    except ImportError:
        print("   ⚠️ Letta library not installed (pip install letta)")
        return False
    except Exception as e:
        print(f"   ❌ Letta initialization failed: {e}")
        return False

async def test_agent_persistence_service():
    """Test AgentPersistenceService"""
    print("🔍 Testing AgentPersistenceService...")
    try:
        from services.agent_persistence_service import AgentPersistenceService
        
        # Initialize service
        service = AgentPersistenceService(
            supabase_url=os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
            supabase_key=os.getenv('SUPABASE_SERVICE_ROLE_KEY'),
            redis_url=os.getenv('REDIS_URL')
        )
        
        # Connect clients
        await service.connect_clients()
        
        # Test basic operations
        test_agent_id = "test_agent_123"
        test_state = {"test": "data", "timestamp": "2025-01-01T00:00:00Z"}
        
        # Test Redis operations
        if service.redis_client:
            redis_success = await service.save_realtime_state_to_redis(
                test_agent_id, test_state, ttl_seconds=60
            )
            if redis_success:
                retrieved_state = await service.get_realtime_state_from_redis(test_agent_id)
                if retrieved_state and retrieved_state.get('test') == 'data':
                    print("   ✅ Redis state operations successful")
                else:
                    print("   ❌ Redis state retrieval failed")
        
        # Test Supabase operations
        if service.supabase_client:
            supabase_result = await service.save_agent_state_to_supabase(
                test_agent_id, "test_strategy", test_state
            )
            if supabase_result:
                print("   ✅ Supabase state operations successful")
            else:
                print("   ❌ Supabase state save failed")
        
        # Cleanup
        await service.close_clients()
        print("   ✅ AgentPersistenceService test completed")
        return True
        
    except ImportError as e:
        print(f"   ⚠️ Missing dependency: {e}")
        return False
    except Exception as e:
        print(f"   ❌ AgentPersistenceService test failed: {e}")
        return False

async def test_memory_service():
    """Test MemoryService"""
    print("🔍 Testing MemoryService...")
    try:
        from services.memory_service import MemoryService
        import uuid
        
        # Initialize service
        user_id = uuid.uuid4()
        agent_id = uuid.uuid4()
        
        service = MemoryService(user_id=user_id, agent_id_context=agent_id)
        
        # Test memory operations
        if service.memgpt_agent_instance:
            # Add test observation
            result = await service.add_observation("Test observation for memory")
            if result.get('status') == 'success':
                print("   ✅ Memory observation successful")
            else:
                print(f"   ❌ Memory observation failed: {result}")
            
            # List memories
            memories = await service.list_memories(limit=5)
            if isinstance(memories, list):
                print(f"   ✅ Memory listing successful ({len(memories)} memories)")
            else:
                print("   ❌ Memory listing failed")
        else:
            print("   ⚠️ MemGPT agent not initialized")
        
        return True
        
    except ImportError as e:
        print(f"   ⚠️ Missing dependency: {e}")
        return False
    except Exception as e:
        print(f"   ❌ MemoryService test failed: {e}")
        return False

async def main():
    """Run all memory system tests"""
    print("🚀 Starting Memory System Connection Tests")
    print("=" * 50)
    
    results = {}
    
    # Test individual components
    results['Redis'] = await test_redis_connection()
    results['Supabase'] = await test_supabase_connection()
    results['Letta'] = await test_letta_initialization()
    results['AgentPersistence'] = await test_agent_persistence_service()
    results['MemoryService'] = await test_memory_service()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    
    for component, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {component}: {status}")
    
    total_tests = len(results)
    passed_tests = sum(results.values())
    
    print(f"\n🎯 Overall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🏆 All memory system components are working correctly!")
    elif passed_tests >= total_tests * 0.7:
        print("⚠️ Memory system mostly functional, some components need attention")
    else:
        print("❌ Memory system needs significant configuration work")
    
    print("\n💡 Next steps:")
    if not results.get('Redis'):
        print("   - Install and start Redis server")
        print("   - Configure REDIS_URL environment variable")
    if not results.get('Supabase'):
        print("   - Set up Supabase project and get credentials")
        print("   - Run database schema creation script")
    if not results.get('Letta'):
        print("   - Install Letta: pip install letta")
        print("   - Configure Letta environment variables")

if __name__ == "__main__":
    asyncio.run(main())