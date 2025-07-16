import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { syncQueue, addSyncJob, getSyncJobStatus, retrySyncJob } from '@/lib/queue/queues/sync.queue';
import { Job } from 'bullmq';

// Mock Redis connection
jest.mock('@/lib/queue/connection', () => ({
  queueConnection: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
  },
}));

describe('Sync Queue', () => {
  beforeEach(async () => {
    // Clear the queue before each test
    await syncQueue.drain();
  });

  afterEach(async () => {
    // Clean up after each test
    await syncQueue.close();
  });

  describe('addSyncJob', () => {
    it('should add a sync job to the queue', async () => {
      const jobData = {
        syncJobId: 'test-sync-job-1',
        repositoryId: 'test-repo-1',
        providerId: 'test-provider-1',
        action: 'push' as const,
        sourceRef: 'main',
        targetRef: 'main',
        commitHash: 'abc123',
      };

      const job = await addSyncJob(jobData, 5);

      expect(job).toBeDefined();
      expect(job.id).toBe('test-sync-job-1');
      expect(job.data).toEqual(jobData);
      expect(job.opts.priority).toBe(5);
    });

    it('should set default priority if not specified', async () => {
      const jobData = {
        syncJobId: 'test-sync-job-2',
        repositoryId: 'test-repo-1',
        providerId: 'test-provider-1',
        action: 'pull' as const,
      };

      const job = await addSyncJob(jobData);

      expect(job.opts.priority).toBe(0);
    });

    it('should handle all action types', async () => {
      const actions = ['push', 'pull', 'sync'] as const;

      for (const action of actions) {
        const jobData = {
          syncJobId: `test-sync-job-${action}`,
          repositoryId: 'test-repo-1',
          providerId: 'test-provider-1',
          action,
        };

        const job = await addSyncJob(jobData);
        expect(job.name).toBe(`sync-${action}`);
      }
    });
  });

  describe('getSyncJobStatus', () => {
    it('should get job status for existing job', async () => {
      const jobData = {
        syncJobId: 'test-status-job',
        repositoryId: 'test-repo-1',
        providerId: 'test-provider-1',
        action: 'sync' as const,
      };

      await addSyncJob(jobData);
      const status = await getSyncJobStatus('test-status-job');

      expect(status).toBeDefined();
      expect(status?.id).toBe('test-status-job');
      expect(status?.data).toEqual(jobData);
      expect(status?.state).toBe('waiting');
    });

    it('should return null for non-existent job', async () => {
      const status = await getSyncJobStatus('non-existent-job');
      expect(status).toBeNull();
    });
  });

  describe('retrySyncJob', () => {
    it('should throw error for non-existent job', async () => {
      await expect(retrySyncJob('non-existent-job')).rejects.toThrow('Job non-existent-job not found');
    });

    it('should throw error for non-failed job', async () => {
      const jobData = {
        syncJobId: 'test-retry-job',
        repositoryId: 'test-repo-1',
        providerId: 'test-provider-1',
        action: 'push' as const,
      };

      await addSyncJob(jobData);

      await expect(retrySyncJob('test-retry-job')).rejects.toThrow('Job test-retry-job is not in failed state');
    });
  });

  describe('Queue options', () => {
    it('should have correct default job options', () => {
      const defaultOptions = syncQueue.defaultJobOptions;

      expect(defaultOptions.attempts).toBe(3);
      expect(defaultOptions.backoff).toEqual({
        type: 'exponential',
        delay: 2000,
      });
      expect(defaultOptions.removeOnComplete).toEqual({
        age: 3600,
        count: 100,
      });
      expect(defaultOptions.removeOnFail).toEqual({
        age: 86400,
        count: 500,
      });
    });
  });
});