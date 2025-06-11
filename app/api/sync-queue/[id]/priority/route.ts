import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { updateSyncJobPrioritySchema } from '@/lib/validations';
import { z } from 'zod';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = updateSyncJobPrioritySchema.parse(body);

    // Check if job exists and is still queued
    const job = await prisma.syncJob.findUnique({
      where: { id: params.id },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Sync job not found' },
        { status: 404 }
      );
    }

    if (job.status !== 'queued') {
      return NextResponse.json(
        { error: 'Can only update priority for queued jobs' },
        { status: 400 }
      );
    }

    // Update priority
    const updatedJob = await prisma.syncJob.update({
      where: { id: params.id },
      data: { priority: validatedData.priority },
    });

    // TODO: Update job priority in BullMQ queue

    return NextResponse.json(updatedJob);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Sync job priority update error:', error);
    return NextResponse.json(
      { error: 'Failed to update sync job priority' },
      { status: 500 }
    );
  }
}