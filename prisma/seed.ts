import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.failoverEvent.deleteMany();
  await prisma.conflict.deleteMany();
  await prisma.syncJob.deleteMany();
  await prisma.repositoryProvider.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.systemConfig.deleteMany();

  // Create providers
  const githubProvider = await prisma.provider.create({
    data: {
      name: 'GitHub Main',
      type: 'github',
      endpoint: 'https://api.github.com',
      icon: 'https://github.githubassets.com/favicons/favicon.svg',
      status: 'active',
      health: 98,
      authType: 'token',
      credentials: {
        token: 'ghp_mock_token_' + nanoid(16),
        encrypted: true,
      },
      capabilities: {
        supportsWebhooks: true,
        supportsPullRequests: true,
        supportsIssues: true,
        supportsProjects: true,
        supportsWiki: true,
        supportsPackages: true,
        supportsActions: true,
        supportsProtectedBranches: true,
      },
      lastSync: new Date('2024-01-15T10:30:00'),
      lastHealthCheck: new Date(),
    },
  });

  const gitlabProvider = await prisma.provider.create({
    data: {
      name: 'GitLab Cloud',
      type: 'gitlab',
      endpoint: 'https://gitlab.com/api/v4',
      icon: 'https://gitlab.com/assets/favicon-7901bd695fb93edb07975966062049829afb56cf11511236e61bcf425070e36e.png',
      status: 'active',
      health: 95,
      authType: 'token',
      credentials: {
        token: 'glpat-mock_token_' + nanoid(16),
        encrypted: true,
      },
      capabilities: {
        supportsWebhooks: true,
        supportsPullRequests: true,
        supportsIssues: true,
        supportsProjects: true,
        supportsWiki: true,
        supportsPackages: true,
        supportsActions: true,
        supportsProtectedBranches: true,
      },
      lastSync: new Date('2024-01-15T09:45:00'),
      lastHealthCheck: new Date(),
    },
  });

  const forgejoProvider = await prisma.provider.create({
    data: {
      name: 'Forgejo Self-Hosted',
      type: 'forgejo',
      endpoint: 'https://forgejo.example.com/api/v1',
      icon: '🔧',
      status: 'degraded',
      health: 75,
      authType: 'token',
      credentials: {
        token: 'forgejo_mock_token_' + nanoid(16),
        encrypted: true,
      },
      capabilities: {
        supportsWebhooks: true,
        supportsPullRequests: true,
        supportsIssues: true,
        supportsProjects: false,
        supportsWiki: true,
        supportsPackages: false,
        supportsActions: false,
        supportsProtectedBranches: true,
      },
      lastSync: new Date('2024-01-14T22:00:00'),
      lastHealthCheck: new Date(),
    },
  });

  const customProvider = await prisma.provider.create({
    data: {
      name: 'Internal Git Server',
      type: 'custom',
      endpoint: 'https://git.internal.company.com',
      icon: '🏢',
      status: 'inactive',
      health: 0,
      authType: 'ssh',
      credentials: {
        sshKey: 'ssh-rsa mock_key_' + nanoid(32),
        encrypted: true,
      },
      capabilities: {
        supportsWebhooks: false,
        supportsPullRequests: false,
        supportsIssues: false,
        supportsProjects: false,
        supportsWiki: false,
        supportsPackages: false,
        supportsActions: false,
        supportsProtectedBranches: false,
      },
      lastHealthCheck: new Date(),
    },
  });

  // Create repositories
  const repositories = await Promise.all([
    prisma.repository.create({
      data: {
        name: 'frontend-app',
        fullName: 'acme-corp/frontend-app',
        defaultBranch: 'main',
      },
    }),
    prisma.repository.create({
      data: {
        name: 'backend-api',
        fullName: 'acme-corp/backend-api',
        defaultBranch: 'main',
      },
    }),
    prisma.repository.create({
      data: {
        name: 'mobile-app',
        fullName: 'acme-corp/mobile-app',
        defaultBranch: 'develop',
      },
    }),
    prisma.repository.create({
      data: {
        name: 'documentation',
        fullName: 'acme-corp/documentation',
        defaultBranch: 'main',
      },
    }),
  ]);

  // Link repositories to providers
  for (const repo of repositories) {
    await prisma.repositoryProvider.create({
      data: {
        repositoryId: repo.id,
        providerId: githubProvider.id,
        remoteUrl: `https://github.com/${repo.fullName}.git`,
        isPrimary: true,
        syncEnabled: true,
        lastSyncedAt: new Date('2024-01-15T10:00:00'),
        lastSyncedCommit: 'abc123' + nanoid(6),
      },
    });

    await prisma.repositoryProvider.create({
      data: {
        repositoryId: repo.id,
        providerId: gitlabProvider.id,
        remoteUrl: `https://gitlab.com/${repo.fullName}.git`,
        isPrimary: false,
        syncEnabled: true,
        lastSyncedAt: new Date('2024-01-15T09:30:00'),
        lastSyncedCommit: 'def456' + nanoid(6),
      },
    });

    if (Math.random() > 0.5) {
      await prisma.repositoryProvider.create({
        data: {
          repositoryId: repo.id,
          providerId: forgejoProvider.id,
          remoteUrl: `https://forgejo.example.com/${repo.fullName}.git`,
          isPrimary: false,
          syncEnabled: true,
          lastSyncedAt: new Date('2024-01-14T20:00:00'),
        },
      });
    }
  }

  // Create sync jobs
  const syncJobs = await Promise.all([
    prisma.syncJob.create({
      data: {
        repositoryId: repositories[0].id,
        action: 'push',
        branch: 'main',
        commit: 'abc123def456',
        providerIds: [githubProvider.id, gitlabProvider.id],
        status: 'processing',
        priority: 5,
        progress: 65,
        startedAt: new Date('2024-01-15T11:00:00'),
        attempts: 1,
      },
    }),
    prisma.syncJob.create({
      data: {
        repositoryId: repositories[1].id,
        action: 'push',
        branch: 'feature/auth',
        commit: 'xyz789uvw123',
        providerIds: [githubProvider.id, gitlabProvider.id, forgejoProvider.id],
        status: 'queued',
        priority: 3,
        progress: 0,
        attempts: 0,
      },
    }),
    prisma.syncJob.create({
      data: {
        repositoryId: repositories[2].id,
        action: 'sync',
        branch: 'develop',
        providerIds: [githubProvider.id, gitlabProvider.id],
        status: 'completed',
        priority: 2,
        progress: 100,
        startedAt: new Date('2024-01-15T10:30:00'),
        completedAt: new Date('2024-01-15T10:35:00'),
        attempts: 1,
      },
    }),
    prisma.syncJob.create({
      data: {
        repositoryId: repositories[0].id,
        action: 'push',
        branch: 'hotfix/security',
        commit: 'sec456fix789',
        providerIds: [githubProvider.id, gitlabProvider.id],
        status: 'failed',
        priority: 10,
        progress: 45,
        startedAt: new Date('2024-01-15T09:00:00'),
        error: 'Authentication failed for GitLab provider',
        attempts: 3,
      },
    }),
  ]);

  // Create failover events
  await prisma.failoverEvent.create({
    data: {
      type: 'failover',
      providerId: customProvider.id,
      fallbackProvider: githubProvider.id,
      reason: 'Provider health check failed - Connection timeout',
      affectedRepos: 4,
      status: 'resolved',
      duration: 300, // 5 minutes
      metadata: {
        errorCode: 'ETIMEDOUT',
        lastHealthCheck: new Date('2024-01-15T08:00:00').toISOString(),
      },
    },
  });

  await prisma.failoverEvent.create({
    data: {
      type: 'recovery',
      providerId: forgejoProvider.id,
      reason: 'Provider recovered - Health check passed',
      affectedRepos: 2,
      status: 'completed',
      duration: 120, // 2 minutes
    },
  });

  // Create alerts
  await prisma.alert.create({
    data: {
      type: 'provider_down',
      severity: 'critical',
      title: 'Provider Offline',
      message: 'Internal Git Server is not responding to health checks',
      providerId: customProvider.id,
      status: 'active',
      metadata: {
        lastResponseTime: 0,
        consecutiveFailures: 5,
      },
    },
  });

  await prisma.alert.create({
    data: {
      type: 'sync_failed',
      severity: 'error',
      title: 'Sync Failed',
      message: 'Failed to sync repository acme-corp/frontend-app to GitLab',
      providerId: gitlabProvider.id,
      status: 'acknowledged',
      acknowledgedBy: 'admin@example.com',
      acknowledgedAt: new Date('2024-01-15T09:30:00'),
    },
  });

  // Create system configuration
  await prisma.systemConfig.create({
    data: {
      key: 'backup_config',
      value: {
        incrementalEnabled: true,
        scheduleInterval: 'daily',
        lastBackupTime: new Date('2024-01-15T02:00:00').toISOString(),
        backupLocation: '/backups/gitproof',
      },
      description: 'Backup configuration and settings',
    },
  });

  await prisma.systemConfig.create({
    data: {
      key: 'failover_rules',
      value: {
        autoFailoverEnabled: true,
        healthThreshold: 50,
        consecutiveFailuresBeforeFailover: 3,
        cooldownPeriod: 300, // 5 minutes
      },
      description: 'Automatic failover configuration',
    },
  });

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });