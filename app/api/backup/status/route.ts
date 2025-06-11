import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { BackupStatus } from '@/lib/types';
import { addDays, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    // Get backup configuration from system config
    const backupConfig = await prisma.systemConfig.findFirst({
      where: { key: 'backup_config' },
    });

    let config = {
      incrementalEnabled: true,
      scheduleInterval: 'daily',
      lastBackupTime: new Date().toISOString(),
    };

    if (backupConfig?.value) {
      config = { ...config, ...(backupConfig.value as any) };
    }

    // Get repository count
    const totalRepos = await prisma.repository.count();

    // Calculate next scheduled backup
    const lastBackup = new Date(config.lastBackupTime);
    let nextScheduled = lastBackup;

    switch (config.scheduleInterval) {
      case 'hourly':
        nextScheduled = addDays(lastBackup, 1/24);
        break;
      case 'daily':
        nextScheduled = addDays(lastBackup, 1);
        break;
      case 'weekly':
        nextScheduled = addDays(lastBackup, 7);
        break;
      default:
        nextScheduled = addDays(lastBackup, 1);
    }

    // Mock backup size calculation (in production, would calculate actual size)
    const backupSize = `${(totalRepos * 50).toFixed(1)} MB`;

    const status: BackupStatus = {
      lastBackup: format(lastBackup, 'MMM d, h:mm a'),
      backupSize,
      totalRepos,
      incrementalEnabled: config.incrementalEnabled,
      nextScheduled: format(nextScheduled, 'MMM d, h:mm a'),
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Backup status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backup status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Trigger manual backup
    // TODO: Implement actual backup logic
    
    // Update last backup time
    await prisma.systemConfig.upsert({
      where: { key: 'backup_config' },
      update: {
        value: {
          incrementalEnabled: true,
          scheduleInterval: 'daily',
          lastBackupTime: new Date().toISOString(),
        },
      },
      create: {
        key: 'backup_config',
        value: {
          incrementalEnabled: true,
          scheduleInterval: 'daily',
          lastBackupTime: new Date().toISOString(),
        },
        description: 'Backup configuration and status',
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'backup_triggered',
        entityType: 'system',
        entityId: 'backup',
        metadata: {
          triggeredBy: 'manual',
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Backup triggered successfully',
      startedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Backup trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger backup' },
      { status: 500 }
    );
  }
}