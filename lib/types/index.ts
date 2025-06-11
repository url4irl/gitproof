// Core types for the Git-Proof backend

export interface Provider {
  id: string;
  name: string;
  type: 'github' | 'gitlab' | 'forgejo' | 'custom';
  endpoint: string;
  icon?: string;
  status: 'active' | 'degraded' | 'inactive';
  health: number; // 0-100
  lastSync?: string;
  repositories?: number;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string; // owner/repo format
  defaultBranch: string;
  providers?: RepositoryProvider[];
}

export interface RepositoryProvider {
  id: string;
  repositoryId: string;
  providerId: string;
  remoteUrl: string;
  isPrimary: boolean;
  syncEnabled: boolean;
  lastSyncedAt?: Date;
  lastSyncedCommit?: string;
}

export interface SyncJob {
  id: string;
  repository: string;
  action: 'push' | 'pull' | 'sync';
  branch: string;
  commit?: string;
  providers: string[];
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  progress: number; // 0-100
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface FailoverEvent {
  id: string;
  type: 'failover' | 'recovery';
  provider: string;
  fallbackProvider?: string;
  reason: string;
  affectedRepos: number;
  status: 'active' | 'resolved' | 'completed';
  duration?: string;
  timestamp: string;
}

export interface Alert {
  id: string;
  type: 'provider_down' | 'sync_failed' | 'conflict_detected' | 'backup_failed';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  providerId?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
}

export interface DashboardStats {
  activeProviders: number;
  totalProviders: number;
  syncQueueCount: number;
  failedSyncs: number;
  totalRepositories: number;
  lastActivityTime?: string;
}

export interface QueueStats {
  processing: number;
  queued: number;
  completed: number;
  failed: number;
}

export interface BackupStatus {
  lastBackup: string;
  backupSize: string;
  totalRepos: number;
  incrementalEnabled: boolean;
  nextScheduled: string;
}

export interface ActivityEvent {
  type: 'success' | 'warning' | 'error';
  action: string;
  provider: string;
  repository: string;
  timestamp: string;
  status: string;
}

export interface FailoverRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    providerStatus?: string[];
    healthThreshold?: number;
    consecutiveFailures?: number;
  };
  actions: {
    fallbackProvider?: string;
    notifyChannels?: string[];
    autoRecover?: boolean;
  };
}