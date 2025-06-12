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

export class ForgejoAdapter extends BaseProviderAdapter {
  private client: AxiosInstance;

  constructor(name: string, endpoint: string, credentials: Record<string, any>) {
    super(name, endpoint, credentials);
    
    // Ensure endpoint ends with /api/v1
    if (!this.endpoint.endsWith('/api/v1')) {
      this.endpoint = this.endpoint.replace(/\/$/, '') + '/api/v1';
    }
    
    this.client = axios.create({
      baseURL: this.endpoint,
      headers: this.getAuthHeaders(),
      timeout: 30000,
    });

    // Add response interceptor for rate limit tracking
    this.client.interceptors.response.use(
      (response) => {
        this.updateRateLimitInfo(response.headers as any);
        return response;
      },
      (error) => {
        if (error.response?.headers) {
          this.updateRateLimitInfo(error.response.headers);
        }
        throw error;
      }
    );
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsWebhooks: true,
      supportsPullRequests: true,
      supportsIssues: true,
      supportsProjects: false, // Forgejo doesn't have projects like GitHub
      supportsWiki: true,
      supportsPackages: true,
      supportsActions: true, // Forgejo Actions
      supportsProtectedBranches: true,
      maxFileSize: 50, // 50 MB (conservative default)
      maxRepoSize: 2 * 1024, // 2 GB (conservative default)
    };
  }

  protected getAuthHeaders(): Record<string, string> {
    if (this.credentials.token) {
      return {
        'Authorization': `token ${this.credentials.token}`,
        'Content-Type': 'application/json',
      };
    }
    throw new Error('Forgejo adapter requires a token for authentication');
  }

  async validateCredentials(): Promise<ProviderOperationResult<boolean>> {
    try {
      const response = await this.client.get('/user');
      return {
        success: true,
        data: true,
        details: {
          user: response.data.login,
          id: response.data.id,
          email: response.data.email,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getRepository(owner: string, repo: string): Promise<ProviderOperationResult<RepositoryInfo>> {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}`);
      const data = response.data;
      
      const repoInfo: RepositoryInfo = {
        name: data.name,
        fullName: data.full_name,
        description: data.description || undefined,
        private: data.private,
        defaultBranch: data.default_branch,
        cloneUrl: data.clone_url,
        sshUrl: data.ssh_url,
        webUrl: data.html_url,
        size: data.size, // Already in KB
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        language: data.language || undefined,
        topics: data.topics || [],
      };

      return { success: true, data: repoInfo };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listBranches(owner: string, repo: string): Promise<ProviderOperationResult<BranchInfo[]>> {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/branches`, {
        params: { limit: 100 },
      });
      
      const branches: BranchInfo[] = response.data.map((branch: any) => ({
        name: branch.name,
        commit: branch.commit.id,
        protected: branch.protected,
      }));

      return { success: true, data: branches };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getCommit(owner: string, repo: string, sha: string): Promise<ProviderOperationResult<CommitInfo>> {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/git/commits/${sha}`);
      const data = response.data;
      
      const commitInfo: CommitInfo = {
        sha: data.sha,
        message: data.message,
        author: {
          name: data.author.name,
          email: data.author.email,
          date: new Date(data.author.date),
        },
        committer: {
          name: data.committer.name,
          email: data.committer.email,
          date: new Date(data.committer.date),
        },
        parents: data.parents?.map((p: any) => p.sha) || [],
        url: data.html_url || `${this.endpoint.replace('/api/v1', '')}/${owner}/${repo}/commit/${data.sha}`,
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
    try {
      // For each file, we need to create or update it
      // Forgejo doesn't have a batch commit API like GitLab, so we'll use the file contents API
      
      for (const file of files) {
        // First, try to get the file to see if it exists
        let sha: string | undefined;
        try {
          const fileResponse = await this.client.get(
            `/repos/${owner}/${repo}/contents/${encodeURIComponent(file.path)}`,
            { params: { ref: branch } }
          );
          sha = fileResponse.data.sha;
        } catch (error: any) {
          // File doesn't exist, which is fine for creation
          if (error.response?.status !== 404) {
            throw error;
          }
        }

        // Create or update the file
        const requestData: any = {
          message,
          content: Buffer.from(file.content, file.encoding === 'base64' ? 'base64' : 'utf-8').toString('base64'),
          branch,
        };

        if (sha) {
          requestData.sha = sha;
        }

        if (author) {
          requestData.author = {
            name: author.name,
            email: author.email,
          };
        }

        await this.client.put(
          `/repos/${owner}/${repo}/contents/${encodeURIComponent(file.path)}`,
          requestData
        );
      }

      // Get the latest commit on the branch to return
      const branchResponse = await this.client.get(`/repos/${owner}/${repo}/branches/${branch}`);
      return this.getCommit(owner, repo, branchResponse.data.commit.id);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async pull(owner: string, repo: string, branch: string): Promise<ProviderOperationResult<any>> {
    try {
      // Get branch info
      const branchResponse = await this.client.get(`/repos/${owner}/${repo}/branches/${branch}`);
      
      // Get repository tree
      const treeResponse = await this.client.get(
        `/repos/${owner}/${repo}/git/trees/${branchResponse.data.commit.id}`,
        { params: { recursive: true } }
      );

      return {
        success: true,
        data: {
          commit: branchResponse.data.commit.id,
          tree: treeResponse.data.tree,
          branch: branchResponse.data,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createWebhook(owner: string, repo: string, config: WebhookConfig): Promise<ProviderOperationResult<any>> {
    try {
      // Map generic events to Forgejo-specific events
      const forgejoEvents = config.events.map(event => {
        switch (event) {
          case 'push':
            return 'push';
          case 'pull_request':
            return 'pull_request';
          case 'issues':
            return 'issues';
          case 'release':
            return 'release';
          case 'create':
            return 'create';
          case 'delete':
            return 'delete';
          default:
            return event;
        }
      });

      const response = await this.client.post(`/repos/${owner}/${repo}/hooks`, {
        type: 'forgejo',
        config: {
          url: config.url,
          content_type: 'json',
          secret: config.secret,
        },
        events: forgejoEvents,
        active: config.active,
      });

      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteWebhook(owner: string, repo: string, webhookId: string): Promise<ProviderOperationResult<boolean>> {
    try {
      await this.client.delete(`/repos/${owner}/${repo}/hooks/${webhookId}`);
      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getHealth(): Promise<ProviderOperationResult<{ healthy: boolean; latency: number; details?: any }>> {
    try {
      const start = Date.now();
      // Use the version endpoint to check health
      const response = await this.client.get('/version');
      const latency = Date.now() - start;

      return {
        success: true,
        data: {
          healthy: true,
          latency,
          details: {
            version: response.data.version,
          },
        },
      };
    } catch (error) {
      // If version endpoint fails, try a simple user endpoint
      try {
        const start = Date.now();
        await this.client.get('/user');
        const latency = Date.now() - start;
        
        return {
          success: true,
          data: {
            healthy: true,
            latency,
          },
        };
      } catch (fallbackError) {
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
  }
}

// Register the Forgejo adapter
ProviderAdapterFactory.register('forgejo', ForgejoAdapter);