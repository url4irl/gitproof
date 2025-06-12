import { Queue } from 'bullmq';
import { queueConnection } from '../connection';

export interface SyncJobData {
  syncJobId: string;
  repositoryId: string;
  providerId: string;
  action: 'push' | 'pull' | 'sync';
  sourceRef?: string;
  targetRef?: string;
  commitHash?: string;
  metadata?: Record<string, any>;
}

export const SYNC_QUEUE_NAME = 'sync-jobs';

// Create the sync job queue
export const syncQueue = new Queue<SyncJobData>(SYNC_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // keep completed jobs for 1 hour
      count: 100, // keep last 100 completed jobs
    },
    removeOnFail: {
      age: 24 * 3600, // keep failed jobs for 24 hours
      count: 500, // keep last 500 failed jobs
    },
  },
});

// Helper function to add a sync job to the queue
export async function addSyncJob(data: SyncJobData, priority?: number) {
  const job = await syncQueue.add(`sync-${data.action}`, data, {
    priority: priority || 0,
    // Job ID is the syncJobId for easy tracking
    jobId: data.syncJobId,
  });

  return job;
}

// Helper function to get job status
export async function getSyncJobStatus(jobId: string) {
  const job = await syncQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress;
  const failedReason = job.failedReason;

  return {
    id: job.id,
    state,
    progress,
    failedReason,
    data: job.data,
    timestamp: job.timestamp,
    attemptsMade: job.attemptsMade,
  };
}

// Helper function to retry a failed job
export async function retrySyncJob(jobId: string) {
  const job = await syncQueue.getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const state = await job.getState();
  if (state !== 'failed') {
    throw new Error(`Job ${jobId} is not in failed state`);
  }

  await job.retry();
  return job;
}

// Helper function to remove a job
export async function removeSyncJob(jobId: string) {
  const job = await syncQueue.getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  await job.remove();
  return true;
}