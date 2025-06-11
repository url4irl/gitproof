import { z } from 'zod';

// Provider capabilities
export interface ProviderCapabilities {
  supportsWebhooks: boolean;
  supportsPullRequests: boolean;
  supportsIssues: boolean;
  supportsProjects: boolean;
  supportsWiki: boolean;
  supportsPackages: boolean;
  supportsActions: boolean;
  supportsProtectedBranches: boolean;
  maxFileSize?: number; // in MB
  maxRepoSize?: number; // in GB
}

// Common provider operations result types
export interface ProviderOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export interface RepositoryInfo {
  name: string;
  fullName: string;
  description?: string;
  private: boolean;
  defaultBranch: string;
  cloneUrl: string;
  sshUrl: string;
  webUrl: string;
  size?: number; // in KB
  createdAt: Date;
  updatedAt: Date;
  language?: string;
  topics?: string[];
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: Date;
  };
  committer: {
    name: string;
    email: string;
    date: Date;
  };
  parents: string[];
  url: string;
}

export interface BranchInfo {
  name: string;
  commit: string; // SHA
  protected: boolean;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
}

// Base provider adapter abstract class
export abstract class BaseProviderAdapter {
  protected name: string;
  protected endpoint: string;
  protected credentials: Record<string, any>;
  protected capabilities: ProviderCapabilities;

  constructor(name: string, endpoint: string, credentials: Record<string, any>) {
    this.name = name;
    this.endpoint = endpoint;
    this.credentials = credentials;
    this.capabilities = this.getCapabilities();
  }

  // Abstract methods that each provider must implement
  abstract getCapabilities(): ProviderCapabilities;
  abstract validateCredentials(): Promise<ProviderOperationResult<boolean>>;
  abstract getRepository(owner: string, repo: string): Promise<ProviderOperationResult<RepositoryInfo>>;
  abstract listBranches(owner: string, repo: string): Promise<ProviderOperationResult<BranchInfo[]>>;
  abstract getCommit(owner: string, repo: string, sha: string): Promise<ProviderOperationResult<CommitInfo>>;
  abstract push(
    owner: string, 
    repo: string, 
    branch: string, 
    files: Array<{ path: string; content: string; encoding?: string }>,
    message: string,
    author?: { name: string; email: string }
  ): Promise<ProviderOperationResult<CommitInfo>>;
  abstract pull(owner: string, repo: string, branch: string): Promise<ProviderOperationResult<any>>;
  abstract createWebhook(owner: string, repo: string, config: WebhookConfig): Promise<ProviderOperationResult<any>>;
  abstract deleteWebhook(owner: string, repo: string, webhookId: string): Promise<ProviderOperationResult<boolean>>;
  abstract getHealth(): Promise<ProviderOperationResult<{ healthy: boolean; latency: number; details?: any }>>;

  // Common helper methods
  protected async makeRequest<T = any>(
    method: string,
    path: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    // Base implementation for HTTP requests
    // Each provider can override this if needed
    const url = `${this.endpoint}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Provider API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  protected abstract getAuthHeaders(): Record<string, string>;

  // Utility methods
  protected parseGitUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/(?:git@|https:\/\/)(?:[\w.]+)[\/:](.+)\/(.+?)(?:\.git)?$/);
    if (!match) {
      throw new Error('Invalid Git URL format');
    }
    return { owner: match[1], repo: match[2] };
  }

  protected sanitizeBranchName(branch: string): string {
    return branch.replace(/^refs\/heads\//, '');
  }

  // Rate limiting helpers
  private rateLimitInfo: {
    remaining: number;
    reset: Date;
    limit: number;
  } | null = null;

  protected updateRateLimitInfo(headers: Headers): void {
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    const limit = headers.get('x-ratelimit-limit');

    if (remaining && reset && limit) {
      this.rateLimitInfo = {
        remaining: parseInt(remaining),
        reset: new Date(parseInt(reset) * 1000),
        limit: parseInt(limit),
      };
    }
  }

  public getRateLimitInfo() {
    return this.rateLimitInfo;
  }

  // Error handling
  protected handleError(error: any): ProviderOperationResult {
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.message || error.message,
        details: error.response.data,
      };
    }
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

// Factory for creating provider adapters
export class ProviderAdapterFactory {
  private static adapters: Map<string, typeof BaseProviderAdapter> = new Map();

  static register(type: string, adapter: typeof BaseProviderAdapter) {
    this.adapters.set(type, adapter);
  }

  static create(
    type: string,
    name: string,
    endpoint: string,
    credentials: Record<string, any>
  ): BaseProviderAdapter {
    const AdapterClass = this.adapters.get(type);
    if (!AdapterClass) {
      throw new Error(`Unknown provider type: ${type}`);
    }
    return new (AdapterClass as any)(name, endpoint, credentials);
  }

  static getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }
}