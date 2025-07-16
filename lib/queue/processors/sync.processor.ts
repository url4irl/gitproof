import { Job } from 'bullmq';
import { db } from '@/lib/db';
import { ProviderFactory } from '@/lib/providers/factory';
import { SyncJobData } from '../queues/sync.queue';

export interface ProcessorResult {
  success: boolean;
  message: string;
  data?: any;
  error?: Error;
}

export class SyncProcessor {
  /**
   * Process a sync job
   */
  static async processSyncJob(job: Job<SyncJobData>): Promise<ProcessorResult> {
    const { syncJobId, repositoryId, providerId, action } = job.data;

    try {
      // Update job status to processing
      await db.syncJob.update({
        where: { id: syncJobId },
        data: {
          status: 'processing',
          startedAt: new Date(),
        },
      });

      // Get repository and provider details
      const repository = await db.repository.findUnique({
        where: { id: repositoryId },
        include: { provider: true },
      });

      if (!repository) {
        throw new Error(`Repository ${repositoryId} not found`);
      }

      // Initialize provider
      const provider = ProviderFactory.create(repository.provider);

      // Process based on action type
      let result: ProcessorResult;
      switch (action) {
        case 'push':
          result = await this.processPush(job, syncJobId, repository, provider);
          break;
        case 'pull':
          result = await this.processPull(job, syncJobId, repository, provider);
          break;
        case 'sync':
          result = await this.processFullSync(job, syncJobId, repository, provider);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Update job status based on result
      await db.syncJob.update({
        where: { id: syncJobId },
        data: {
          status: result.success ? 'completed' : 'failed',
          completedAt: new Date(),
          progress: 100,
          result: result.data || {},
          error: result.error?.message,
        },
      });

      return result;
    } catch (error) {
      // Update job status to failed
      await db.syncJob.update({
        where: { id: syncJobId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Process a push operation
   */
  private static async processPush(
    job: Job<SyncJobData>,
    syncJobId: string,
    repository: any,
    provider: any
  ): Promise<ProcessorResult> {
    try {
      const { sourceRef, targetRef, commitHash, metadata } = job.data;

      // Update progress
      await job.updateProgress(20);

      // Parse repository URL to get owner and repo
      const { owner, repo } = this.parseRepositoryUrl(repository.remoteUrl);

      await job.updateProgress(30);

      // Get the current branch info
      const branchResult = await provider.listBranches(owner, repo);
      if (!branchResult.success) {
        throw new Error(`Failed to get branches: ${branchResult.error}`);
      }

      await job.updateProgress(50);

      // Prepare files from metadata (if any)
      const files = metadata?.files || [];
      const message = metadata?.message || `Sync commit ${commitHash}`;
      const author = metadata?.author || { name: 'GitProof Sync', email: 'sync@gitproof.com' };

      // Perform the push
      const pushResult = await provider.push(
        owner,
        repo,
        targetRef || 'main',
        files,
        message,
        author
      );

      if (!pushResult.success) {
        throw new Error(`Push failed: ${pushResult.error}`);
      }

      await job.updateProgress(80);

      // Update job metadata with result
      await db.syncJob.update({
        where: { id: syncJobId },
        data: {
          metadata: {
            ...(job.data.metadata || {}),
            pushResult: pushResult.data,
          },
        },
      });

      await job.updateProgress(100);

      return {
        success: true,
        message: `Successfully pushed to ${targetRef || 'main'}`,
        data: pushResult.data,
      };
    } catch (error) {
      return {
        success: false,
        message: `Push failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Process a pull operation
   */
  private static async processPull(
    job: Job<SyncJobData>,
    syncJobId: string,
    repository: any,
    provider: any
  ): Promise<ProcessorResult> {
    try {
      const { sourceRef, targetRef } = job.data;

      await job.updateProgress(20);

      // Parse repository URL to get owner and repo
      const { owner, repo } = this.parseRepositoryUrl(repository.remoteUrl);

      // Get repository info
      const repoResult = await provider.getRepository(owner, repo);
      if (!repoResult.success) {
        throw new Error(`Failed to get repository info: ${repoResult.error}`);
      }

      await job.updateProgress(40);

      // Pull changes from the specified branch
      const pullResult = await provider.pull(owner, repo, sourceRef || repoResult.data.defaultBranch);

      if (!pullResult.success) {
        throw new Error(`Pull failed: ${pullResult.error}`);
      }

      await job.updateProgress(80);

      // Update job metadata with result
      await db.syncJob.update({
        where: { id: syncJobId },
        data: {
          metadata: {
            ...(job.data.metadata || {}),
            pullResult: pullResult.data,
          },
        },
      });

      await job.updateProgress(100);

      return {
        success: true,
        message: `Successfully pulled changes from ${sourceRef || repoResult.data.defaultBranch}`,
        data: pullResult.data,
      };
    } catch (error) {
      return {
        success: false,
        message: `Pull failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Process a full sync operation
   */
  private static async processFullSync(
    job: Job<SyncJobData>,
    syncJobId: string,
    repository: any,
    provider: any
  ): Promise<ProcessorResult> {
    try {
      await job.updateProgress(10);

      // Parse repository URL to get owner and repo
      const { owner, repo } = this.parseRepositoryUrl(repository.remoteUrl);

      // Get all remote branches
      const branchesResult = await provider.listBranches(owner, repo);
      if (!branchesResult.success) {
        throw new Error(`Failed to list branches: ${branchesResult.error}`);
      }

      const remoteBranches = branchesResult.data || [];
      await job.updateProgress(30);

      // Sync each branch
      const results = [];
      const totalBranches = remoteBranches.length;
      
      for (let i = 0; i < remoteBranches.length; i++) {
        const branch = remoteBranches[i];
        const progress = 30 + Math.floor((i / totalBranches) * 60);
        await job.updateProgress(progress);

        try {
          // Pull changes for each branch
          const pullResult = await provider.pull(owner, repo, branch.name);
          
          if (pullResult.success) {
            results.push({ 
              branch: branch.name, 
              action: 'pull', 
              success: true, 
              commit: branch.commit,
              result: pullResult.data 
            });
          } else {
            results.push({
              branch: branch.name,
              action: 'pull',
              success: false,
              error: pullResult.error,
            });
          }
        } catch (error) {
          results.push({
            branch: branch.name,
            action: 'sync',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      await job.updateProgress(90);

      // Update job metadata with result
      await db.syncJob.update({
        where: { id: syncJobId },
        data: {
          metadata: {
            ...(job.data.metadata || {}),
            syncResult: {
              remoteBranches: remoteBranches.map(b => b.name),
              results,
            },
          },
        },
      });

      await job.updateProgress(100);

      const failedSyncs = results.filter(r => !r.success);
      const successMessage = failedSyncs.length === 0
        ? 'All branches synced successfully'
        : `Synced ${results.length - failedSyncs.length} of ${results.length} branches`;

      return {
        success: failedSyncs.length === 0,
        message: successMessage,
        data: { results },
      };
    } catch (error) {
      return {
        success: false,
        message: `Full sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Parse repository URL to extract owner and repo name
   */
  private static parseRepositoryUrl(url: string): { owner: string; repo: string } {
    // Handle various Git URL formats
    const patterns = [
      // HTTPS: https://github.com/owner/repo.git
      /https?:\/\/[^\/]+\/([^\/]+)\/([^\/\.]+)(?:\.git)?$/,
      // SSH: git@github.com:owner/repo.git
      /git@[^:]+:([^\/]+)\/([^\/\.]+)(?:\.git)?$/,
      // Git protocol: git://github.com/owner/repo.git
      /git:\/\/[^\/]+\/([^\/]+)\/([^\/\.]+)(?:\.git)?$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
    }

    // Fallback: try to split by slashes
    const parts = url.split('/');
    if (parts.length >= 2) {
      const repo = parts[parts.length - 1].replace(/\.git$/, '');
      const owner = parts[parts.length - 2];
      return { owner, repo };
    }

    throw new Error(`Unable to parse repository URL: ${url}`);
  }
}