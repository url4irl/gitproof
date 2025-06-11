import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { failoverEventFilterSchema } from '@/lib/validations';
import { FailoverEvent } from '@/lib/types';
import { z } from 'zod';
import { differenceInSeconds, formatDuration } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const filters = failoverEventFilterSchema.parse(searchParams);

    const where: any = {};

    // Apply filters
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.provider) {
      where.providerId = filters.provider;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    // Get total count
    const total = await prisma.failoverEvent.count({ where });

    // Get paginated results
    const events = await prisma.failoverEvent.findMany({
      where,
      include: {
        provider: {
          select: { name: true },
        },
      },
      orderBy: { [filters.orderBy || 'createdAt']: filters.order },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    });

    // Get fallback provider names
    const fallbackProviderIds = events
      .map(e => e.fallbackProvider)
      .filter(Boolean) as string[];
    
    const fallbackProviders = await prisma.provider.findMany({
      where: { id: { in: fallbackProviderIds } },
      select: { id: true, name: true },
    });
    const fallbackProviderMap = new Map(fallbackProviders.map(p => [p.id, p.name]));

    // Transform to match frontend expectations
    const transformedEvents: FailoverEvent[] = events.map(event => {
      let duration = 'N/A';
      if (event.duration) {
        duration = formatDuration({ seconds: event.duration });
      } else if (event.status === 'active') {
        const seconds = differenceInSeconds(new Date(), event.createdAt);
        duration = formatDuration({ seconds });
      }

      return {
        id: event.id,
        type: event.type as FailoverEvent['type'],
        provider: event.provider.name,
        fallbackProvider: event.fallbackProvider 
          ? fallbackProviderMap.get(event.fallbackProvider)
          : undefined,
        reason: event.reason,
        affectedRepos: event.affectedRepos,
        status: event.status as FailoverEvent['status'],
        duration,
        timestamp: event.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      data: transformedEvents,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failover events fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch failover events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Create a new failover event
    const event = await prisma.failoverEvent.create({
      data: {
        type: body.type,
        providerId: body.providerId,
        fallbackProvider: body.fallbackProvider,
        reason: body.reason,
        affectedRepos: body.affectedRepos || 0,
        status: 'active',
        metadata: body.metadata,
      },
    });

    // TODO: Trigger actual failover logic
    // TODO: Send alerts/notifications

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Failover event creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create failover event' },
      { status: 500 }
    );
  }
}