import axios, { AxiosInstance } from 'axios';
import {
  BaseProviderAdapter,
  ProviderCapabilities,
  ProviderOperationResult,
  RepositoryInfo,
  BranchInfo,
  CommitInfo,
  WebhookConfig,
  ProviderAdapterFactory,
} from './base';

export class CustomGitAdapter extends BaseProviderAdapter {
  private client: AxiosInstance;

  constructor(name: string, endpoint: string, credentials: Record<string, any>) {
    super(name, endpoint, credentials);
    
    this.client = axios.create({
      baseURL: this.endpoint,
      headers: this.getAuthHeaders(),
      timeout: 30000,
    });
  }

  getCapabilities(): ProviderCapabilities {
    // Custom Git servers typically have limited capabilities
    // These can be overridden via configuration
    return {
      supportsWebhooks: false,
      supportsPullRequests: false,
      supportsIssues: false,
      supportsProjects: false,
      supportsWiki: false,
      supportsPackages: false,
      supportsActions: false,
      supportsProtectedBranches: false,
      maxFileSize: 100, // 100 MB default
      maxRepoSize: 10 * 1024, // 10 GB default
    };
  }

  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Support various authentication methods
    if (this.credentials.token) {
      // Bearer token authentication
      headers['Authorization'] = `Bearer ${this.credentials.token}`;
    } else if (this.credentials.username && this.credentials.password) {
      // Basic authentication
      const auth = Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else if (this.credentials.apiKey) {
      // API key authentication (custom header)
      headers['X-API-Key'] = this.credentials.apiKey;
    }

    return headers;
  }

  async validateCredentials(): Promise<ProviderOperationResult<boolean>> {
    try {
      // For custom Git servers, we'll try to access the info/refs endpoint
      // This is a standard Git HTTP endpoint
      const testRepo = this.credentials.testRepository || 'test.git';
      const response = await this.client.get(`/${testRepo}/info/refs`, {
        params: { service: 'git-upload-pack' },
        validateStatus: (status) => status < 500,
      });

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      return {
        success: true,
        data: true,
        details: {
          authenticated: response.status !== 401,
          serverType: 'custom',
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getRepository(owner: string, repo: string): Promise<ProviderOperationResult<RepositoryInfo>> {
    try {
      // For custom Git servers, we have limited information
      // We'll construct what we can from the available data
      const repoPath = `${owner}/${repo}.git`;
      const fullUrl = `${this.endpoint}/${repoPath}`;
      
      // Try to get refs to verify repository exists
      const response = await this.client.get(`/${repoPath}/info/refs`, {
        params: { service: 'git-upload-pack' },
        validateStatus: (status) => status < 500,
      });

      if (response.status === 404) {
        return {
          success: false,
          error: 'Repository not found',
        };
      }

      // Parse refs to find default branch
      const refs = this.parseRefs(response.data);
      const defaultBranch = this.findDefaultBranch(refs);

      const repoInfo: RepositoryInfo = {
        name: repo,
        fullName: `${owner}/${repo}`,
        description: undefined, // Not available in basic Git
        private: true, // Assume private by default
        defaultBranch: defaultBranch || 'master',
        cloneUrl: fullUrl,
        sshUrl: fullUrl.replace(/^https?:\/\//, 'git@').replace(/\//, ':'),
        webUrl: fullUrl,
        size: undefined, // Not available
        createdAt: new Date(), // Not available, using current date
        updatedAt: new Date(), // Not available, using current date
        language: undefined, // Not available
        topics: [], // Not available
      };

      return { success: true, data: repoInfo };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listBranches(owner: string, repo: string): Promise<ProviderOperationResult<BranchInfo[]>> {
    try {
      const repoPath = `${owner}/${repo}.git`;
      const response = await this.client.get(`/${repoPath}/info/refs`, {
        params: { service: 'git-upload-pack' },
      });

      const refs = this.parseRefs(response.data);
      const branches: BranchInfo[] = [];

      for (const [ref, sha] of Object.entries(refs)) {
        if (ref.startsWith('refs/heads/')) {
          branches.push({
            name: ref.replace('refs/heads/', ''),
            commit: sha,
            protected: false, // Not available in basic Git
          });
        }
      }

      return { success: true, data: branches };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getCommit(owner: string, repo: string, sha: string): Promise<ProviderOperationResult<CommitInfo>> {
    try {
      // Custom Git servers don't typically expose commit details via HTTP
      // We'll return a minimal commit info
      const repoPath = `${owner}/${repo}.git`;
      
      // We can only verify the commit exists by checking refs
      const commitInfo: CommitInfo = {
        sha: sha,
        message: 'Commit details not available via HTTP',
        author: {
          name: 'Unknown',
          email: 'unknown@example.com',
          date: new Date(),
        },
        committer: {
          name: 'Unknown',
          email: 'unknown@example.com',
          date: new Date(),
        },
        parents: [],
        url: `${this.endpoint}/${repoPath}/commit/${sha}`,
      };

      return { success: true, data: commitInfo };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async push(
    owner: string,
    repo: string,
    branch: string,
    files: Array<{ path: string; content: string; encoding?: string }>,
    message: string,
    author?: { name: string; email: string }
  ): Promise<ProviderOperationResult<CommitInfo>> {
    // Basic Git HTTP protocol doesn't support file-level operations
    // This would require implementing the Git pack protocol
    return {
      success: false,
      error: 'Push operations are not supported for custom Git servers via HTTP. Please use Git CLI or SSH.',
    };
  }

  async pull(owner: string, repo: string, branch: string): Promise<ProviderOperationResult<any>> {
    try {
      const repoPath = `${owner}/${repo}.git`;
      
      // Get refs
      const refsResponse = await this.client.get(`/${repoPath}/info/refs`, {
        params: { service: 'git-upload-pack' },
      });

      const refs = this.parseRefs(refsResponse.data);
      const branchRef = `refs/heads/${branch}`;
      const commitSha = refs[branchRef];

      if (!commitSha) {
        return {
          success: false,
          error: `Branch '${branch}' not found`,
        };
      }

      return {
        success: true,
        data: {
          commit: commitSha,
          branch: {
            name: branch,
            commit: commitSha,
          },
          refs: refs,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createWebhook(owner: string, repo: string, config: WebhookConfig): Promise<ProviderOperationResult<any>> {
    return {
      success: false,
      error: 'Webhooks are not supported for custom Git servers',
    };
  }

  async deleteWebhook(owner: string, repo: string, webhookId: string): Promise<ProviderOperationResult<boolean>> {
    return {
      success: false,
      error: 'Webhooks are not supported for custom Git servers',
    };
  }

  async getHealth(): Promise<ProviderOperationResult<{ healthy: boolean; latency: number; details?: any }>> {
    try {
      const start = Date.now();
      
      // Try to access the base endpoint
      const response = await this.client.get('/', {
        validateStatus: (status) => status < 500,
      });
      
      const latency = Date.now() - start;
      const healthy = response.status < 400;

      return {
        success: true,
        data: {
          healthy,
          latency,
          details: {
            status: response.status,
            serverType: 'custom',
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          healthy: false,
          latency: -1,
        },
        error: this.handleError(error).error,
      };
    }
  }

  // Helper methods specific to custom Git servers
  private parseRefs(data: string): Record<string, string> {
    const refs: Record<string, string> = {};
    const lines = data.split('\n');
    
    for (const line of lines) {
      // Skip empty lines and service advertisements
      if (!line || line.startsWith('#')) continue;
      
      // Parse ref format: "SHA ref-name"
      const match = line.match(/^([0-9a-f]{40})\s+(.+)$/);
      if (match) {
        refs[match[2]] = match[1];
      }
    }
    
    return refs;
  }

  private findDefaultBranch(refs: Record<string, string>): string | null {
    // Check for HEAD reference
    if (refs['HEAD']) {
      // HEAD might be a symbolic ref
      for (const [ref, sha] of Object.entries(refs)) {
        if (ref.startsWith('refs/heads/') && sha === refs['HEAD']) {
          return ref.replace('refs/heads/', '');
        }
      }
    }
    
    // Fall back to common default branch names
    const commonDefaults = ['main', 'master', 'develop', 'trunk'];
    for (const branch of commonDefaults) {
      if (refs[`refs/heads/${branch}`]) {
        return branch;
      }
    }
    
    // Return the first branch found
    for (const ref of Object.keys(refs)) {
      if (ref.startsWith('refs/heads/')) {
        return ref.replace('refs/heads/', '');
      }
    }
    
    return null;
  }
}

// Register the custom Git adapter
ProviderAdapterFactory.register('custom', CustomGitAdapter);