import { db } from '@/lib/db';
import { addSyncJob, getSyncJobStatus } from '../queues/sync.queue';
import { Prisma } from '@prisma/client';

export interface CreateSyncJobOptions {
  repositoryId: string;
  action: 'push' | 'pull' | 'sync';
  priority?: number;
  sourceRef?: string;
  targetRef?: string;
  commitHash?: string;
  metadata?: Record<string, any>;
  providers?: string[];
}

/**
 * Create a sync job and add it to the queue
 */
export async function createAndQueueSyncJob(options: CreateSyncJobOptions) {
  const {
    repositoryId,
    action,
    priority = 0,
    sourceRef,
    targetRef,
    commitHash,
    metadata,
    providers,
  } = options;

  // Get repository
  const repository = await db.repository.findUnique({
    where: { id: repositoryId },
  });

  if (!repository) {
    throw new Error(`Repository ${repositoryId} not found`);
  }

  // If providers not specified, get all associated providers
  const providerIds = providers || [];
  if (providerIds.length === 0) {
    const repoProviders = await db.repositoryProvider.findMany({
      where: { repositoryId },
      select: { providerId: true },
    });
    providerIds.push(...repoProviders.map(rp => rp.providerId));
  }

  // Create job in database
  const syncJob = await db.syncJob.create({
    data: {
      repositoryId,
      action,
      branch: sourceRef || 'main',
      commit: commitHash,
      providerIds,
      status: 'queued',
      priority,
      metadata: {
        sourceRef,
        targetRef,
        ...metadata,
      },
    },
  });

  // Add job to queue for each provider
  const queueJob = await addSyncJob({
    syncJobId: syncJob.id,
    repositoryId,
    providerId: providerIds[0], // Use first provider for now
    action,
    sourceRef,
    targetRef,
    commitHash,
    metadata,
  }, priority);

  return {
    syncJob,
    queueJob,
  };
}

/**
 * Update sync job status from queue
 */
export async function updateSyncJobFromQueue(syncJobId: string) {
  const queueStatus = await getSyncJobStatus(syncJobId);
  
  if (!queueStatus) {
    return null;
  }

  // Map queue state to database status
  const statusMap: Record<string, string> = {
    'waiting': 'queued',
    'active': 'processing',
    'completed': 'completed',
    'failed': 'failed',
    'delayed': 'queued',
    'paused': 'queued',
  };

  const dbStatus = statusMap[queueStatus.state] || 'queued';

  // Update database
  const syncJob = await db.syncJob.update({
    where: { id: syncJobId },
    data: {
      status: dbStatus as any,
      progress: queueStatus.progress || 0,
      error: queueStatus.failedReason,
      attempts: queueStatus.attemptsMade || 0,
    },
  });

  return syncJob;
}

/**
 * Cancel a sync job
 */
export async function cancelSyncJob(syncJobId: string) {
  // Update database status
  const syncJob = await db.syncJob.update({
    where: { id: syncJobId },
    data: {
      status: 'cancelled',
      completedAt: new Date(),
    },
  });

  // Remove from queue
  const queueJob = await getSyncJobStatus(syncJobId);
  if (queueJob && ['waiting', 'delayed', 'paused'].includes(queueJob.state)) {
    const { removeSyncJob } = await import('../queues/sync.queue');
    await removeSyncJob(syncJobId);
  }

  return syncJob;
}

/**
 * Get sync job metrics
 */
export async function getSyncJobMetrics() {
  const [total, pending, processing, completed, failed] = await Promise.all([
    db.syncJob.count(),
    db.syncJob.count({ where: { status: 'queued' } }),
    db.syncJob.count({ where: { status: 'processing' } }),
    db.syncJob.count({ where: { status: 'completed' } }),
    db.syncJob.count({ where: { status: 'failed' } }),
  ]);

  return {
    total,
    pending,
    processing,
    completed,
    failed,
    successRate: total > 0 ? (completed / total) * 100 : 0,
  };
}

/**
 * Get failed jobs that can be retried
 */
export async function getRetryableJobs() {
  const failedJobs = await db.syncJob.findMany({
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

  return failedJobs;
}

/**
 * Bulk retry failed jobs
 */
export async function bulkRetryFailedJobs(jobIds?: string[]) {
  const whereClause = jobIds
    ? { id: { in: jobIds }, status: 'failed' }
    : { status: 'failed', attempts: { lt: 3 } };

  const failedJobs = await db.syncJob.findMany({
    where: whereClause,
    include: {
      repository: true,
    },
  });

  const results = [];

  for (const job of failedJobs) {
    try {
      // Reset job status
      await db.syncJob.update({
        where: { id: job.id },
        data: {
          status: 'queued',
          error: null,
          progress: 0,
        },
      });

      // Re-queue the job
      const queueJob = await addSyncJob({
        syncJobId: job.id,
        repositoryId: job.repositoryId,
        providerId: job.providerId,
        action: job.action.toLowerCase() as any,
        ...job.config,
      }, job.priority);

      results.push({
        jobId: job.id,
        success: true,
        queueJobId: queueJob.id,
      });
    } catch (error) {
      results.push({
        jobId: job.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}