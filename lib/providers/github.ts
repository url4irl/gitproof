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

export class GitHubAdapter extends BaseProviderAdapter {
  private client: AxiosInstance;

  constructor(name: string, endpoint: string, credentials: Record<string, any>) {
    super(name, endpoint || 'https://api.github.com', credentials);
    
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
      supportsProjects: true,
      supportsWiki: true,
      supportsPackages: true,
      supportsActions: true,
      supportsProtectedBranches: true,
      maxFileSize: 100, // 100 MB
      maxRepoSize: 5 * 1024, // 5 GB
    };
  }

  protected getAuthHeaders(): Record<string, string> {
    if (this.credentials.token) {
      return {
        'Authorization': `token ${this.credentials.token}`,
        'Accept': 'application/vnd.github.v3+json',
      };
    }
    throw new Error('GitHub adapter requires a token for authentication');
  }

  async validateCredentials(): Promise<ProviderOperationResult<boolean>> {
    try {
      const response = await this.client.get('/user');
      return {
        success: true,
        data: true,
        details: {
          user: response.data.login,
          scopes: response.headers['x-oauth-scopes']?.split(', ') || [],
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
        description: data.description,
        private: data.private,
        defaultBranch: data.default_branch,
        cloneUrl: data.clone_url,
        sshUrl: data.ssh_url,
        webUrl: data.html_url,
        size: data.size,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        language: data.language,
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
        params: { per_page: 100 },
      });
      
      const branches: BranchInfo[] = response.data.map((branch: any) => ({
        name: branch.name,
        commit: branch.commit.sha,
        protected: branch.protected,
      }));

      return { success: true, data: branches };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getCommit(owner: string, repo: string, sha: string): Promise<ProviderOperationResult<CommitInfo>> {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/commits/${sha}`);
      const data = response.data;
      
      const commitInfo: CommitInfo = {
        sha: data.sha,
        message: data.commit.message,
        author: {
          name: data.commit.author.name,
          email: data.commit.author.email,
          date: new Date(data.commit.author.date),
        },
        committer: {
          name: data.commit.committer.name,
          email: data.commit.committer.email,
          date: new Date(data.commit.committer.date),
        },
        parents: data.parents.map((p: any) => p.sha),
        url: data.html_url,
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
      // Get the current commit SHA for the branch
      const branchResponse = await this.client.get(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
      const currentCommitSha = branchResponse.data.object.sha;

      // Get the tree SHA for the current commit
      const commitResponse = await this.client.get(`/repos/${owner}/${repo}/git/commits/${currentCommitSha}`);
      const baseTreeSha = commitResponse.data.tree.sha;

      // Create blobs for each file
      const blobs = await Promise.all(
        files.map(async (file) => {
          const blobResponse = await this.client.post(`/repos/${owner}/${repo}/git/blobs`, {
            content: file.content,
            encoding: file.encoding || 'utf-8',
          });
          return {
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: blobResponse.data.sha,
          };
        })
      );

      // Create a new tree
      const treeResponse = await this.client.post(`/repos/${owner}/${repo}/git/trees`, {
        base_tree: baseTreeSha,
        tree: blobs,
      });

      // Create a new commit
      const newCommitResponse = await this.client.post(`/repos/${owner}/${repo}/git/commits`, {
        message,
        tree: treeResponse.data.sha,
        parents: [currentCommitSha],
        author: author ? {
          name: author.name,
          email: author.email,
          date: new Date().toISOString(),
        } : undefined,
      });

      // Update the branch reference
      await this.client.patch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
        sha: newCommitResponse.data.sha,
      });

      // Get full commit info
      return this.getCommit(owner, repo, newCommitResponse.data.sha);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async pull(owner: string, repo: string, branch: string): Promise<ProviderOperationResult<any>> {
    try {
      // Get the latest commit and tree for the branch
      const branchResponse = await this.client.get(`/repos/${owner}/${repo}/branches/${branch}`);
      const commitSha = branchResponse.data.commit.sha;

      // Get the tree
      const treeResponse = await this.client.get(
        `/repos/${owner}/${repo}/git/trees/${branchResponse.data.commit.commit.tree.sha}`,
        { params: { recursive: true } }
      );

      return {
        success: true,
        data: {
          commit: commitSha,
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
      const response = await this.client.post(`/repos/${owner}/${repo}/hooks`, {
        name: 'web',
        active: config.active,
        events: config.events,
        config: {
          url: config.url,
          content_type: 'json',
          secret: config.secret,
          insecure_ssl: '0',
        },
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
      const response = await this.client.get('/rate_limit');
      const latency = Date.now() - start;

      const rateLimit = response.data.rate;
      const healthy = rateLimit.remaining > 0;

      return {
        success: true,
        data: {
          healthy,
          latency,
          details: {
            rateLimit: {
              limit: rateLimit.limit,
              remaining: rateLimit.remaining,
              reset: new Date(rateLimit.reset * 1000),
            },
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
}

// Register the GitHub adapter
ProviderAdapterFactory.register('github', GitHubAdapter);