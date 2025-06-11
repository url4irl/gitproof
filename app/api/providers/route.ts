import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { providerSchema } from '@/lib/validations';
import { Provider } from '@/lib/types';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const providers = await prisma.provider.findMany({
      include: {
        _count: {
          select: { repositories: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform to match frontend expectations
    const transformedProviders: Provider[] = providers.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type as Provider['type'],
      endpoint: p.endpoint,
      icon: p.icon || undefined,
      status: p.status as Provider['status'],
      health: p.health,
      lastSync: p.lastSync?.toISOString(),
      repositories: p._count.repositories,
    }));

    return NextResponse.json(transformedProviders);
  } catch (error) {
    console.error('Providers fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = providerSchema.parse(body);

    // Encrypt credentials before storing
    // In production, use proper encryption
    const encryptedCredentials = {
      ...validatedData.credentials,
      encrypted: true,
    };

    const provider = await prisma.provider.create({
      data: {
        name: validatedData.name,
        type: validatedData.type,
        endpoint: validatedData.endpoint,
        icon: validatedData.icon,
        authType: validatedData.authType,
        credentials: encryptedCredentials,
        capabilities: {
          // Set default capabilities based on provider type
          supportsWebhooks: true,
          supportsPullRequests: validatedData.type !== 'custom',
          supportsIssues: validatedData.type !== 'custom',
        },
      },
    });

    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Provider creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create provider' },
      { status: 500 }
    );
  }
}