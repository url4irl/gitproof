import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  createAndQueueSyncJob,
  updateSyncJobFromQueue,
  cancelSyncJob,
  getSyncJobMetrics,
  getRetryableJobs,
  bulkRetryFailedJobs,
} from '@/lib/queue/utils/job-helpers';
import { db } from '@/lib/db';

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    repository: {
      findUnique: jest.fn(),
    },
    repositoryProvider: {
      findMany: jest.fn(),
    },
    syncJob: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

// Mock the queue functions
jest.mock('@/lib/queue/queues/sync.queue', () => ({
  addSyncJob: jest.fn().mockResolvedValue({ id: 'queue-job-1' }),
  getSyncJobStatus: jest.fn(),
  removeSyncJob: jest.fn(),
}));

describe('Job Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAndQueueSyncJob', () => {
    it('should create and queue a sync job', async () => {
      const mockRepository = { id: 'repo-1', name: 'test-repo' };
      const mockSyncJob = {
        id: 'sync-job-1',
        repositoryId: 'repo-1',
        action: 'push',
        status: 'queued',
      };

      (db.repository.findUnique as jest.Mock).mockResolvedValue(mockRepository);
      (db.repositoryProvider.findMany as jest.Mock).mockResolvedValue([
        { providerId: 'provider-1' },
        { providerId: 'provider-2' },
      ]);
      (db.syncJob.create as jest.Mock).mockResolvedValue(mockSyncJob);

      const result = await createAndQueueSyncJob({
        repositoryId: 'repo-1',
        action: 'push',
        priority: 5,
        sourceRef: 'main',
        commitHash: 'abc123',
      });

      expect(result.syncJob).toEqual(mockSyncJob);
      expect(result.queueJob).toEqual({ id: 'queue-job-1' });
      expect(db.syncJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          repositoryId: 'repo-1',
          action: 'push',
          branch: 'main',
          commit: 'abc123',
          status: 'queued',
          priority: 5,
        }),
      });
    });

    it('should throw error if repository not found', async () => {
      (db.repository.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        createAndQueueSyncJob({
          repositoryId: 'non-existent',
          action: 'push',
        })
      ).rejects.toThrow('Repository non-existent not found');
    });

    it('should use provided providers if specified', async () => {
      const mockRepository = { id: 'repo-1' };
      const mockSyncJob = { id: 'sync-job-1' };

      (db.repository.findUnique as jest.Mock).mockResolvedValue(mockRepository);
      (db.syncJob.create as jest.Mock).mockResolvedValue(mockSyncJob);

      await createAndQueueSyncJob({
        repositoryId: 'repo-1',
        action: 'sync',
        providers: ['provider-1', 'provider-2'],
      });

      expect(db.syncJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          providerIds: ['provider-1', 'provider-2'],
        }),
      });
    });
  });

  describe('updateSyncJobFromQueue', () => {
    it('should update job status from queue', async () => {
      const { getSyncJobStatus } = require('@/lib/queue/queues/sync.queue');
      
      getSyncJobStatus.mockResolvedValue({
        state: 'active',
        progress: 50,
        failedReason: null,
        attemptsMade: 1,
      });

      (db.syncJob.update as jest.Mock).mockResolvedValue({
        id: 'sync-job-1',
        status: 'processing',
        progress: 50,
      });

      const result = await updateSyncJobFromQueue('sync-job-1');

      expect(result).toEqual({
        id: 'sync-job-1',
        status: 'processing',
        progress: 50,
      });
      expect(db.syncJob.update).toHaveBeenCalledWith({
        where: { id: 'sync-job-1' },
        data: {
          status: 'processing',
          progress: 50,
          error: null,
          attempts: 1,
        },
      });
    });

    it('should return null if job not found in queue', async () => {
      const { getSyncJobStatus } = require('@/lib/queue/queues/sync.queue');
      getSyncJobStatus.mockResolvedValue(null);

      const result = await updateSyncJobFromQueue('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('cancelSyncJob', () => {
    it('should cancel a sync job', async () => {
      const { getSyncJobStatus, removeSyncJob } = require('@/lib/queue/queues/sync.queue');
      
      getSyncJobStatus.mockResolvedValue({ state: 'waiting' });
      (db.syncJob.update as jest.Mock).mockResolvedValue({
        id: 'sync-job-1',
        status: 'cancelled',
      });

      const result = await cancelSyncJob('sync-job-1');

      expect(result.status).toBe('cancelled');
      expect(removeSyncJob).toHaveBeenCalledWith('sync-job-1');
    });
  });

  describe('getSyncJobMetrics', () => {
    it('should return job metrics', async () => {
      (db.syncJob.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20)  // queued
        .mockResolvedValueOnce(5)   // processing
        .mockResolvedValueOnce(70)  // completed
        .mockResolvedValueOnce(5);  // failed

      const metrics = await getSyncJobMetrics();

      expect(metrics).toEqual({
        total: 100,
        pending: 20,
        processing: 5,
        completed: 70,
        failed: 5,
        successRate: 70,
      });
    });

    it('should handle zero total jobs', async () => {
      (db.syncJob.count as jest.Mock).mockResolvedValue(0);

      const metrics = await getSyncJobMetrics();

      expect(metrics.successRate).toBe(0);
    });
  });

  describe('getRetryableJobs', () => {
    it('should get failed jobs that can be retried', async () => {
      const mockJobs = [
        { id: 'job-1', status: 'failed', attempts: 1 },
        { id: 'job-2', status: 'failed', attempts: 2 },
      ];

      (db.syncJob.findMany as jest.Mock).mockResolvedValue(mockJobs);

      const jobs = await getRetryableJobs();

      expect(jobs).toEqual(mockJobs);
      expect(db.syncJob.findMany).toHaveBeenCalledWith({
        where: {
          status: 'failed',
          attempts: { lt: 3 },
        },
        include: {
          repository: {
            include: { provider: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });
  });

  describe('bulkRetryFailedJobs', () => {
    it('should retry specified failed jobs', async () => {
      const { addSyncJob } = require('@/lib/queue/queues/sync.queue');
      
      const mockJobs = [
        {
          id: 'job-1',
          repositoryId: 'repo-1',
          providerId: 'provider-1',
          action: 'PUSH',
          priority: 5,
          config: {},
        },
      ];

      (db.syncJob.findMany as jest.Mock).mockResolvedValue(mockJobs);
      (db.syncJob.update as jest.Mock).mockResolvedValue({});
      addSyncJob.mockResolvedValue({ id: 'queue-job-1' });

      const results = await bulkRetryFailedJobs(['job-1']);

      expect(results).toEqual([
        {
          jobId: 'job-1',
          success: true,
          queueJobId: 'queue-job-1',
        },
      ]);
      expect(db.syncJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: {
          status: 'queued',
          error: null,
          progress: 0,
        },
      });
    });

    it('should handle errors during retry', async () => {
      const { addSyncJob } = require('@/lib/queue/queues/sync.queue');
      
      const mockJobs = [{ id: 'job-1' }];
      (db.syncJob.findMany as jest.Mock).mockResolvedValue(mockJobs);
      (db.syncJob.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

      const results = await bulkRetryFailedJobs(['job-1']);

      expect(results).toEqual([
        {
          jobId: 'job-1',
          success: false,
          error: 'Update failed',
        },
      ]);
    });
  });
});