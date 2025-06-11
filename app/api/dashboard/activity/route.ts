import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ActivityEvent } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Get recent sync jobs for activity
    const recentJobs = await prisma.syncJob.findMany({
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        repository: true,
        providers: true,
      },
    });

    // Transform sync jobs into activity events
    const activities: ActivityEvent[] = recentJobs.map(job => {
      let type: 'success' | 'warning' | 'error' = 'success';
      let status = 'Unknown';

      switch (job.status) {
        case 'completed':
          type = 'success';
          status = 'Completed';
          break;
        case 'failed':
          type = 'error';
          status = job.error || 'Failed';
          break;
        case 'processing':
          type = 'warning';
          status = `In Progress (${job.progress}%)`;
          break;
        case 'queued':
          type = 'warning';
          status = 'Queued';
          break;
        default:
          type = 'warning';
          status = job.status;
      }

      return {
        type,
        action: job.action,
        provider: job.providers[0]?.name || 'Unknown',
        repository: job.repository.fullName,
        timestamp: job.updatedAt.toISOString(),
        status,
      };
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Dashboard activity error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard activity' },
      { status: 500 }
    );
  }
}