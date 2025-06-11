import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSyncJobSchema, syncQueueFilterSchema } from '@/lib/validations';
import { SyncJob } from '@/lib/types';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const filters = syncQueueFilterSchema.parse(searchParams);

    const where: any = {};

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }
    if (filters.repository) {
      where.repository = {
        fullName: { contains: filters.repository },
      };
    }
    if (filters.provider) {
      where.providerIds = {
        has: filters.provider,
      };
    }
    if (filters.branch) {
      where.branch = filters.branch;
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
    const total = await prisma.syncJob.count({ where });

    // Get paginated results
    const jobs = await prisma.syncJob.findMany({
      where,
      include: {
        repository: true,
      },
      orderBy: { [filters.orderBy || 'createdAt']: filters.order },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    });

    // Get provider details for each job
    const providerIds = [...new Set(jobs.flatMap(job => 
      (job.providerIds as string[]) || []
    ))];
    const providers = await prisma.provider.findMany({
      where: { id: { in: providerIds } },
      select: { id: true, name: true },
    });
    const providerMap = new Map(providers.map(p => [p.id, p.name]));

    // Transform to match frontend expectations
    const transformedJobs: SyncJob[] = jobs.map(job => ({
      id: job.id,
      repository: job.repository.fullName,
      action: job.action as SyncJob['action'],
      branch: job.branch,
      commit: job.commit || undefined,
      providers: ((job.providerIds as string[]) || [])
        .map(id => providerMap.get(id) || id),
      status: job.status as SyncJob['status'],
      priority: job.priority,
      progress: job.progress,
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      error: job.error || undefined,
    }));

    return NextResponse.json({
      data: transformedJobs,
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

    console.error('Sync queue fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync queue' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createSyncJobSchema.parse(body);

    // Verify repository exists
    const repository = await prisma.repository.findUnique({
      where: { id: validatedData.repositoryId },
    });

    if (!repository) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    // Verify providers exist
    const providers = await prisma.provider.findMany({
      where: { id: { in: validatedData.providers } },
    });

    if (providers.length !== validatedData.providers.length) {
      return NextResponse.json(
        { error: 'One or more providers not found' },
        { status: 404 }
      );
    }

    // Create sync job
    const job = await prisma.syncJob.create({
      data: {
        repositoryId: validatedData.repositoryId,
        action: validatedData.action,
        branch: validatedData.branch,
        commit: validatedData.commit,
        providerIds: validatedData.providers,
        priority: validatedData.priority,
        metadata: {
          createdBy: 'api',
          timestamp: new Date().toISOString(),
        },
      },
      include: {
        repository: true,
      },
    });

    // TODO: Queue the job for processing using BullMQ

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Sync job creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create sync job' },
      { status: 500 }
    );
  }
}