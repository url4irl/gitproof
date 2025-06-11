import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Provider } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { 
            repositories: true,
            syncJobs: true,
            failoverEvents: true,
          },
        },
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    const transformedProvider: Provider & { 
      syncJobsCount: number;
      failoverEventsCount: number;
    } = {
      id: provider.id,
      name: provider.name,
      type: provider.type as Provider['type'],
      endpoint: provider.endpoint,
      icon: provider.icon || undefined,
      status: provider.status as Provider['status'],
      health: provider.health,
      lastSync: provider.lastSync?.toISOString(),
      repositories: provider._count.repositories,
      syncJobsCount: provider._count.syncJobs,
      failoverEventsCount: provider._count.failoverEvents,
    };

    return NextResponse.json(transformedProvider);
  } catch (error) {
    console.error('Provider fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const provider = await prisma.provider.update({
      where: { id: params.id },
      data: {
        name: body.name,
        endpoint: body.endpoint,
        icon: body.icon,
        status: body.status,
        health: body.health,
      },
    });

    return NextResponse.json(provider);
  } catch (error) {
    console.error('Provider update error:', error);
    return NextResponse.json(
      { error: 'Failed to update provider' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.provider.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Provider delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete provider' },
      { status: 500 }
    );
  }
}