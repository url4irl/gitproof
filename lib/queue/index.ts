// Queue connections
export { queueConnection, createConnection } from './connection';

// Queues
export {
  syncQueue,
  addSyncJob,
  getSyncJobStatus,
  retrySyncJob,
  removeSyncJob,
  SYNC_QUEUE_NAME,
  type SyncJobData,
} from './queues/sync.queue';

// Workers
export {
  SyncWorker,
  createSyncWorker,
  type WorkerOptions,
} from './workers/sync.worker';

// Processors
export {
  SyncProcessor,
  type ProcessorResult,
} from './processors/sync.processor';

// Utilities
export {
  createAndQueueSyncJob,
  updateSyncJobFromQueue,
  cancelSyncJob,
  getSyncJobMetrics,
  getRetryableJobs,
  bulkRetryFailedJobs,
  type CreateSyncJobOptions,
} from './utils/job-helpers';