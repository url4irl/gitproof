import 'dotenv/config';
import { createSyncWorker } from './lib/queue';

async function main() {
  console.log('Starting GitProof worker...');
  
  // Get worker configuration from environment
  const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
  
  // Create and start the sync worker
  const syncWorker = createSyncWorker({ concurrency });

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    await syncWorker.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await syncWorker.start();
    console.log(`Worker started with concurrency: ${concurrency}`);
    
    // Keep the process alive
    process.stdin.resume();
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

// Run the worker
main().catch((error) => {
  console.error('Worker error:', error);
  process.exit(1);
});