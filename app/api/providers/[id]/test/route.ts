import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ProviderAdapterFactory } from '@/lib/providers/base';
// Import provider adapters to ensure they're registered
import '@/lib/providers/github';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: params.id },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Create provider adapter
    const adapter = ProviderAdapterFactory.create(
      provider.type,
      provider.name,
      provider.endpoint,
      provider.credentials as Record<string, any>
    );

    // Test the connection
    const validationResult = await adapter.validateCredentials();
    const healthResult = await adapter.getHealth();

    if (validationResult.success && healthResult.success) {
      // Update provider status and health
      await prisma.provider.update({
        where: { id: params.id },
        data: {
          status: 'active',
          health: Math.min(100, Math.max(0, 100 - Math.floor(healthResult.data.latency / 10))),
          lastHealthCheck: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Connection test successful',
        details: {
          latency: healthResult.data.latency,
          healthy: healthResult.data.healthy,
          ...validationResult.details,
          ...healthResult.data.details,
        },
      });
    } else {
      // Update provider status to degraded or inactive
      await prisma.provider.update({
        where: { id: params.id },
        data: {
          status: healthResult.data?.healthy ? 'degraded' : 'inactive',
          health: 0,
          lastHealthCheck: new Date(),
        },
      });

      return NextResponse.json({
        success: false,
        message: 'Connection test failed',
        error: validationResult.error || healthResult.error,
        details: {
          validation: validationResult,
          health: healthResult,
        },
      });
    }
  } catch (error) {
    console.error('Provider test error:', error);
    
    // Update provider status to inactive on error
    try {
      await prisma.provider.update({
        where: { id: params.id },
        data: {
          status: 'inactive',
          health: 0,
          lastHealthCheck: new Date(),
        },
      });
    } catch (updateError) {
      console.error('Failed to update provider status:', updateError);
    }

    return NextResponse.json(
      { 
        error: 'Failed to test provider connection',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}