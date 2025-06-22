import Redis from 'ioredis';

class RedisService {
  private client: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      console.log('Redis connected');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      console.error('Redis connection error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('Redis connection closed');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  // Basic operations
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  // JSON operations
  async setJSON(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const json = JSON.stringify(value);
      return await this.set(key, json, ttl);
    } catch (error) {
      console.error(`Redis setJSON error for key ${key}:`, error);
      return false;
    }
  }

  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Redis getJSON error for key ${key}:`, error);
      return null;
    }
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<boolean> {
    try {
      await this.client.hset(key, field, value);
      return true;
    } catch (error) {
      console.error(`Redis HSET error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      console.error(`Redis HGET error for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    try {
      const result = await this.client.hgetall(key);
      return Object.keys(result).length > 0 ? result : null;
    } catch (error) {
      console.error(`Redis HGETALL error for key ${key}:`, error);
      return null;
    }
  }

  async hdel(key: string, field: string): Promise<boolean> {
    try {
      const result = await this.client.hdel(key, field);
      return result > 0;
    } catch (error) {
      console.error(`Redis HDEL error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  // List operations
  async lpush(key: string, value: string): Promise<boolean> {
    try {
      await this.client.lpush(key, value);
      return true;
    } catch (error) {
      console.error(`Redis LPUSH error for key ${key}:`, error);
      return false;
    }
  }

  async rpush(key: string, value: string): Promise<boolean> {
    try {
      await this.client.rpush(key, value);
      return true;
    } catch (error) {
      console.error(`Redis RPUSH error for key ${key}:`, error);
      return false;
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.lrange(key, start, stop);
    } catch (error) {
      console.error(`Redis LRANGE error for key ${key}:`, error);
      return [];
    }
  }

  async ltrim(key: string, start: number, stop: number): Promise<boolean> {
    try {
      await this.client.ltrim(key, start, stop);
      return true;
    } catch (error) {
      console.error(`Redis LTRIM error for key ${key}:`, error);
      return false;
    }
  }

  // Set operations
  async sadd(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.sadd(key, member);
      return result > 0;
    } catch (error) {
      console.error(`Redis SADD error for key ${key}:`, error);
      return false;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      console.error(`Redis SMEMBERS error for key ${key}:`, error);
      return [];
    }
  }

  async srem(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.srem(key, member);
      return result > 0;
    } catch (error) {
      console.error(`Redis SREM error for key ${key}:`, error);
      return false;
    }
  }

  // Cache operations with TTL
  async cache<T>(key: string, data: T, ttl: number = 3600): Promise<boolean> {
    return await this.setJSON(key, data, ttl);
  }

  async getCached<T>(key: string): Promise<T | null> {
    return await this.getJSON<T>(key);
  }

  // Bulk operations
  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      return await this.client.mget(keys);
    } catch (error) {
      console.error('Redis MGET error:', error);
      return new Array(keys.length).fill(null);
    }
  }

  async mset(keyValues: Record<string, string>): Promise<boolean> {
    try {
      await this.client.mset(keyValues);
      return true;
    } catch (error) {
      console.error('Redis MSET error:', error);
      return false;
    }
  }

  // Pattern operations
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`Redis KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  async scan(cursor: number = 0, pattern?: string, count?: number): Promise<{ cursor: number; keys: string[] }> {
    try {
      const args: any[] = [cursor];
      if (pattern) {
        args.push('MATCH', pattern);
      }
      if (count) {
        args.push('COUNT', count);
      }
      
      const result = await this.client.scan(cursor, 'MATCH', pattern || '*', 'COUNT', count || 10);
      return {
        cursor: parseInt(result[0]),
        keys: result[1]
      };
    } catch (error) {
      console.error('Redis SCAN error:', error);
      return { cursor: 0, keys: [] };
    }
  }

  // Utility methods
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis PING error:', error);
      return false;
    }
  }

  async flushall(): Promise<boolean> {
    try {
      await this.client.flushall();
      return true;
    } catch (error) {
      console.error('Redis FLUSHALL error:', error);
      return false;
    }
  }

  async info(): Promise<string | null> {
    try {
      return await this.client.info();
    } catch (error) {
      console.error('Redis INFO error:', error);
      return null;
    }
  }

  // Connection status
  isHealthy(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }

  getConnectionInfo() {
    return {
      status: this.client.status,
      connected: this.isConnected,
      host: this.client.options.host,
      port: this.client.options.port,
    };
  }
}

// Singleton instance
export const redisService = new RedisService();
export default redisService; 