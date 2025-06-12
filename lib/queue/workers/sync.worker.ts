import { Worker, Job } from 'bullmq';
import { createConnection } from '../connection';
import { SYNC_QUEUE_NAME, SyncJobData } from '../queues/sync.queue';
import { SyncProcessor } from '../processors/sync.processor';

export interface WorkerOptions {
  concurrency?: number;
  maxRetries?: number;
}

export class SyncWorker {
  private worker: Worker<SyncJobData>;

  constructor(options: WorkerOptions = {}) {
    const { concurrency = 5 } = options;

    this.worker = new Worker<SyncJobData>(
      SYNC_QUEUE_NAME,
      async (job: Job<SyncJobData>) => {
        console.log(`Processing sync job ${job.id} - Action: ${job.data.action}`);
        
        try {
          const result = await SyncProcessor.processSyncJob(job);
          console.log(`Job ${job.id} completed successfully`);
          return result;
        } catch (error) {
          console.error(`Job ${job.id} failed:`, error);
          throw error;
        }
      },
      {
        connection: createConnection(),
        concurrency,
        autorun: false,
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for the worker
   */
  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err.message);
      
      // Log retry information
      if (job && job.attemptsMade < (job.opts.attempts || 3)) {
        console.log(`Job ${job.id} will be retried. Attempts: ${job.attemptsMade}/${job.opts.attempts}`);
      } else if (job) {
        console.error(`Job ${job.id} failed after ${job.attemptsMade} attempts`);
      }
    });

    this.worker.on('active', (job) => {
      console.log(`Job ${job.id} started processing`);
    });

    this.worker.on('stalled', (jobId) => {
      console.warn(`Job ${jobId} stalled and will be retried`);
    });

    this.worker.on('progress', (job, progress) => {
      console.log(`Job ${job.id} progress: ${progress}%`);
    });

    this.worker.on('error', (err) => {
      console.error('Worker error:', err);
    });

    this.worker.on('ready', () => {
      console.log('Sync worker is ready');
    });

    this.worker.on('closing', () => {
      console.log('Sync worker is closing');
    });

    this.worker.on('closed', () => {
      console.log('Sync worker closed');
    });
  }

  /**
   * Start the worker
   */
  async start() {
    if (this.worker.isRunning()) {
      console.log('Worker is already running');
      return;
    }

    await this.worker.run();
    console.log('Sync worker started');
  }

  /**
   * Stop the worker gracefully
   */
  async stop() {
    if (!this.worker.isRunning()) {
      console.log('Worker is not running');
      return;
    }

    console.log('Stopping sync worker...');
    await this.worker.close();
    console.log('Sync worker stopped');
  }

  /**
   * Pause the worker
   */
  async pause() {
    await this.worker.pause();
    console.log('Sync worker paused');
  }

  /**
   * Resume the worker
   */
  async resume() {
    await this.worker.resume();
    console.log('Sync worker resumed');
  }

  /**
   * Get worker statistics
   */
  async getStats() {
    const isPaused = await this.worker.isPaused();
    const isRunning = this.worker.isRunning();

    return {
      name: SYNC_QUEUE_NAME,
      isPaused,
      isRunning,
      concurrency: this.worker.opts.concurrency,
    };
  }
}

// Export a factory function to create workers
export function createSyncWorker(options?: WorkerOptions) {
  return new SyncWorker(options);
}