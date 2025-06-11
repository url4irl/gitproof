import { z } from 'zod';

// Provider validation schemas
export const providerSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['github', 'gitlab', 'forgejo', 'custom']),
  endpoint: z.string().url(),
  icon: z.string().optional(),
  authType: z.enum(['token', 'oauth', 'ssh']),
  credentials: z.record(z.string()), // Will be encrypted before storage
});

export const testProviderSchema = z.object({
  providerId: z.string().cuid(),
});

// Repository validation schemas
export const repositorySchema = z.object({
  name: z.string().min(1).max(100),
  fullName: z.string().regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/),
  defaultBranch: z.string().default('main'),
  providers: z.array(z.string().cuid()).min(1),
});

// Sync job validation schemas
export const createSyncJobSchema = z.object({
  repositoryId: z.string().cuid(),
  action: z.enum(['push', 'pull', 'sync']),
  branch: z.string(),
  commit: z.string().optional(),
  providers: z.array(z.string().cuid()).min(1),
  priority: z.number().int().min(0).max(10).default(0),
});

export const updateSyncJobPrioritySchema = z.object({
  priority: z.number().int().min(0).max(10),
});

// Failover validation schemas
export const failoverRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  enabled: z.boolean().default(true),
  conditions: z.object({
    providerStatus: z.array(z.enum(['inactive', 'degraded'])).optional(),
    healthThreshold: z.number().int().min(0).max(100).optional(),
    consecutiveFailures: z.number().int().min(1).optional(),
  }),
  actions: z.object({
    fallbackProvider: z.string().cuid().optional(),
    notifyChannels: z.array(z.string()).optional(),
    autoRecover: z.boolean().default(true),
  }),
});

// Alert validation schemas
export const createAlertSchema = z.object({
  type: z.enum(['provider_down', 'sync_failed', 'conflict_detected', 'backup_failed']),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  providerId: z.string().cuid().optional(),
  metadata: z.record(z.any()).optional(),
});

export const acknowledgeAlertSchema = z.object({
  acknowledgedBy: z.string(),
});

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  orderBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Search and filter schemas
export const syncQueueFilterSchema = z.object({
  status: z.array(z.enum(['queued', 'processing', 'completed', 'failed', 'cancelled'])).optional(),
  repository: z.string().optional(),
  provider: z.string().cuid().optional(),
  branch: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).merge(paginationSchema);

export const failoverEventFilterSchema = z.object({
  type: z.enum(['failover', 'recovery']).optional(),
  provider: z.string().cuid().optional(),
  status: z.enum(['active', 'resolved', 'completed']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).merge(paginationSchema);