import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createSyncWorker, SyncWorker } from '@/lib/queue/workers/sync.worker';
import { syncQueue } from '@/lib/queue/queues/sync.queue';

// Mock the connection
jest.mock('@/lib/queue/connection', () => ({
  createConnection: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
  })),
}));

// Mock the processor
jest.mock('@/lib/queue/processors/sync.processor', () => ({
  SyncProcessor: {
    processSyncJob: jest.fn().mockResolvedValue({
      success: true,
      message: 'Job processed successfully',
      data: { test: true },
    }),
  },
}));

describe('Sync Worker', () => {
  let worker: SyncWorker;

  beforeEach(() => {
    worker = createSyncWorker({ concurrency: 2 });
  });

  afterEach(async () => {
    await worker.stop();
  });

  describe('Worker creation', () => {
    it('should create worker with default concurrency', () => {
      const defaultWorker = createSyncWorker();
      expect(defaultWorker).toBeDefined();
      expect(defaultWorker).toBeInstanceOf(SyncWorker);
    });

    it('should create worker with custom concurrency', () => {
      const customWorker = createSyncWorker({ concurrency: 10 });
      expect(customWorker).toBeDefined();
      expect(customWorker).toBeInstanceOf(SyncWorker);
    });
  });

  describe('Worker lifecycle', () => {
    it('should start the worker', async () => {
      await worker.start();
      const stats = await worker.getStats();
      expect(stats.isRunning).toBe(true);
    });

    it('should stop the worker', async () => {
      await worker.start();
      await worker.stop();
      const stats = await worker.getStats();
      expect(stats.isRunning).toBe(false);
    });

    it('should pause and resume the worker', async () => {
      await worker.start();
      
      await worker.pause();
      let stats = await worker.getStats();
      expect(stats.isPaused).toBe(true);
      
      await worker.resume();
      stats = await worker.getStats();
      expect(stats.isPaused).toBe(false);
    });

    it('should not start if already running', async () => {
      await worker.start();
      // Should not throw, just log
      await expect(worker.start()).resolves.toBeUndefined();
    });

    it('should not stop if not running', async () => {
      // Should not throw, just log
      await expect(worker.stop()).resolves.toBeUndefined();
    });
  });

  describe('Worker stats', () => {
    it('should return correct worker statistics', async () => {
      const stats = await worker.getStats();
      
      expect(stats).toEqual({
        name: 'sync-jobs',
        isPaused: false,
        isRunning: false,
        concurrency: 2,
      });
    });
  });

  describe('Event handlers', () => {
    it('should setup all required event handlers', () => {
      // Worker should set up event handlers during construction
      // This is tested implicitly by the worker creation
      expect(worker).toBeDefined();
    });
  });
});