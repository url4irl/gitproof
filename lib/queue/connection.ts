import { Redis } from 'ioredis';

// Create a Redis connection instance for BullMQ
const createRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  connection.on('connect', () => {
    console.log('Redis connected successfully');
  });

  connection.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  return connection;
};

// Export a singleton connection for queue operations
export const queueConnection = createRedisConnection();

// Export a factory function for creating new connections (needed for workers)
export const createConnection = createRedisConnection;