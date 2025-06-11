import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { DashboardStats } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Get provider stats
    const providers = await prisma.provider.findMany({
      select: {
        status: true,
        repositories: {
          select: {
            repositoryId: true,
          },
        },
      },
    });

    const activeProviders = providers.filter(p => p.status === 'active').length;
    const totalProviders = providers.length;

    // Get unique repository count
    const repositoryCount = await prisma.repository.count();

    // Get sync queue stats
    const queueStats = await prisma.syncJob.groupBy({
      by: ['status'],
      _count: true,
    });

    const syncQueueCount = queueStats
      .filter(s => s.status === 'queued' || s.status === 'processing')
      .reduce((acc, curr) => acc + curr._count, 0);

    const failedSyncs = queueStats
      .find(s => s.status === 'failed')?._count || 0;

    // Get last activity
    const lastActivity = await prisma.syncJob.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    const stats: DashboardStats = {
      activeProviders,
      totalProviders,
      syncQueueCount,
      failedSyncs,
      totalRepositories: repositoryCount,
      lastActivityTime: lastActivity?.updatedAt.toISOString(),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}