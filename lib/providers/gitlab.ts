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

export class GitLabAdapter extends BaseProviderAdapter {
  private client: AxiosInstance;

  constructor(name: string, endpoint: string, credentials: Record<string, any>) {
    super(name, endpoint || 'https://gitlab.com/api/v4', credentials);
    
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
      supportsPullRequests: true, // Merge requests in GitLab
      supportsIssues: true,
      supportsProjects: true,
      supportsWiki: true,
      supportsPackages: true,
      supportsActions: true, // GitLab CI/CD
      supportsProtectedBranches: true,
      maxFileSize: 100, // 100 MB
      maxRepoSize: 10 * 1024, // 10 GB
    };
  }

  protected getAuthHeaders(): Record<string, string> {
    if (this.credentials.token) {
      return {
        'PRIVATE-TOKEN': this.credentials.token,
        'Content-Type': 'application/json',
      };
    }
    throw new Error('GitLab adapter requires a token for authentication');
  }

  async validateCredentials(): Promise<ProviderOperationResult<boolean>> {
    try {
      const response = await this.client.get('/user');
      return {
        success: true,
        data: true,
        details: {
          user: response.data.username,
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
      // GitLab uses project ID or URL-encoded path
      const projectPath = encodeURIComponent(`${owner}/${repo}`);
      const response = await this.client.get(`/projects/${projectPath}`);
      const data = response.data;
      
      const repoInfo: RepositoryInfo = {
        name: data.name,
        fullName: data.path_with_namespace,
        description: data.description,
        private: data.visibility === 'private',
        defaultBranch: data.default_branch,
        cloneUrl: data.http_url_to_repo,
        sshUrl: data.ssh_url_to_repo,
        webUrl: data.web_url,
        size: Math.round(data.statistics?.repository_size / 1024) || 0, // Convert bytes to KB
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        language: data.languages ? Object.keys(data.languages)[0] : undefined,
        topics: data.topics || [],
      };

      return { success: true, data: repoInfo };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listBranches(owner: string, repo: string): Promise<ProviderOperationResult<BranchInfo[]>> {
    try {
      const projectPath = encodeURIComponent(`${owner}/${repo}`);
      const response = await this.client.get(`/projects/${projectPath}/repository/branches`, {
        params: { per_page: 100 },
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
      const projectPath = encodeURIComponent(`${owner}/${repo}`);
      const response = await this.client.get(`/projects/${projectPath}/repository/commits/${sha}`);
      const data = response.data;
      
      const commitInfo: CommitInfo = {
        sha: data.id,
        message: data.message,
        author: {
          name: data.author_name,
          email: data.author_email,
          date: new Date(data.authored_date),
        },
        committer: {
          name: data.committer_name,
          email: data.committer_email,
          date: new Date(data.committed_date),
        },
        parents: data.parent_ids || [],
        url: data.web_url,
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
      const projectPath = encodeURIComponent(`${owner}/${repo}`);
      
      // Prepare actions for commit
      const actions = files.map(file => ({
        action: 'create', // or 'update' - GitLab will handle it appropriately
        file_path: file.path,
        content: file.content,
        encoding: file.encoding === 'base64' ? 'base64' : 'text',
      }));

      // Create commit with multiple files
      const commitData: any = {
        branch,
        commit_message: message,
        actions,
      };

      if (author) {
        commitData.author_name = author.name;
        commitData.author_email = author.email;
      }

      const response = await this.client.post(
        `/projects/${projectPath}/repository/commits`,
        commitData
      );

      // Get full commit info
      return this.getCommit(owner, repo, response.data.id);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async pull(owner: string, repo: string, branch: string): Promise<ProviderOperationResult<any>> {
    try {
      const projectPath = encodeURIComponent(`${owner}/${repo}`);
      
      // Get branch info
      const branchResponse = await this.client.get(
        `/projects/${projectPath}/repository/branches/${encodeURIComponent(branch)}`
      );
      
      // Get repository tree
      const treeResponse = await this.client.get(
        `/projects/${projectPath}/repository/tree`,
        { 
          params: { 
            ref: branch,
            recursive: true,
            per_page: 100 
          } 
        }
      );

      return {
        success: true,
        data: {
          commit: branchResponse.data.commit.id,
          tree: treeResponse.data,
          branch: branchResponse.data,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createWebhook(owner: string, repo: string, config: WebhookConfig): Promise<ProviderOperationResult<any>> {
    try {
      const projectPath = encodeURIComponent(`${owner}/${repo}`);
      
      // Map generic events to GitLab-specific events
      const gitlabEvents: Record<string, boolean> = {};
      config.events.forEach(event => {
        switch (event) {
          case 'push':
            gitlabEvents.push_events = true;
            break;
          case 'pull_request':
            gitlabEvents.merge_requests_events = true;
            break;
          case 'issues':
            gitlabEvents.issues_events = true;
            break;
          case 'release':
            gitlabEvents.releases_events = true;
            break;
          default:
            // Handle other events as needed
            break;
        }
      });

      const response = await this.client.post(`/projects/${projectPath}/hooks`, {
        url: config.url,
        token: config.secret,
        enable_ssl_verification: true,
        ...gitlabEvents,
      });

      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteWebhook(owner: string, repo: string, webhookId: string): Promise<ProviderOperationResult<boolean>> {
    try {
      const projectPath = encodeURIComponent(`${owner}/${repo}`);
      await this.client.delete(`/projects/${projectPath}/hooks/${webhookId}`);
      return { success: true, data: true };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getHealth(): Promise<ProviderOperationResult<{ healthy: boolean; latency: number; details?: any }>> {
    try {
      const start = Date.now();
      const response = await this.client.get('/version');
      const latency = Date.now() - start;

      return {
        success: true,
        data: {
          healthy: true,
          latency,
          details: {
            version: response.data.version,
            revision: response.data.revision,
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

  // Override updateRateLimitInfo for GitLab-specific headers
  protected updateRateLimitInfo(headers: any): void {
    const remaining = headers['ratelimit-remaining'] || headers['x-ratelimit-remaining'];
    const reset = headers['ratelimit-reset'] || headers['x-ratelimit-reset'];
    const limit = headers['ratelimit-limit'] || headers['x-ratelimit-limit'];

    if (remaining && reset && limit) {
      this.rateLimitInfo = {
        remaining: parseInt(remaining),
        reset: new Date(parseInt(reset) * 1000),
        limit: parseInt(limit),
      };
    }
  }
}

// Register the GitLab adapter
ProviderAdapterFactory.register('gitlab', GitLabAdapter);