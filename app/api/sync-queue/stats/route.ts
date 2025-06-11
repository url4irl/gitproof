import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { QueueStats } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const stats = await prisma.syncJob.groupBy({
      by: ['status'],
      _count: true,
    });

    const queueStats: QueueStats = {
      processing: 0,
      queued: 0,
      completed: 0,
      failed: 0,
    };

    stats.forEach(stat => {
      switch (stat.status) {
        case 'processing':
          queueStats.processing = stat._count;
          break;
        case 'queued':
          queueStats.queued = stat._count;
          break;
        case 'completed':
          queueStats.completed = stat._count;
          break;
        case 'failed':
          queueStats.failed = stat._count;
          break;
      }
    });

    return NextResponse.json(queueStats);
  } catch (error) {
    console.error('Queue stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue stats' },
      { status: 500 }
    );
  }
}