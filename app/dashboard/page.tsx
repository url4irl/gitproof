import { DashboardStats, ActivityEvent } from '@/lib/types';

async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dashboard/stats`, {
    cache: 'no-store',
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }
  
  return res.json();
}

async function getRecentActivity(): Promise<ActivityEvent[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dashboard/activity?limit=5`, {
    cache: 'no-store',
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch recent activity');
  }
  
  return res.json();
}

export default async function DashboardPage() {
  const [stats, activities] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(),
  ]);
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard Overview
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor and manage your Git-Proof system
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Providers */}
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
            Active Providers
          </dt>
          <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
            <div className="flex items-baseline text-2xl font-semibold text-blue-600">
              {stats.activeProviders}
              <span className="ml-2 text-sm font-medium text-gray-500">of {stats.totalProviders}</span>
            </div>
            <div className={`inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium ${
              stats.activeProviders === stats.totalProviders 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              {stats.totalProviders > 0 
                ? `${Math.round((stats.activeProviders / stats.totalProviders) * 100)}%`
                : '0%'
              }
            </div>
          </dd>
        </div>

        {/* Sync Queue */}
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
            Sync Queue
          </dt>
          <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
            <div className="flex items-baseline text-2xl font-semibold text-blue-600">
              {stats.syncQueueCount}
              <span className="ml-2 text-sm font-medium text-gray-500">pending</span>
            </div>
            <div className={`inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium ${
              stats.syncQueueCount > 0 
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}>
              {stats.syncQueueCount > 0 ? 'Processing' : 'Idle'}
            </div>
          </dd>
        </div>

        {/* Failed Syncs */}
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
            Failed Syncs (24h)
          </dt>
          <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
            <div className="flex items-baseline text-2xl font-semibold text-blue-600">
              {stats.failedSyncs}
              <span className="ml-2 text-sm font-medium text-gray-500">errors</span>
            </div>
            <div className={`inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium ${
              stats.failedSyncs === 0 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : stats.failedSyncs < 5
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {stats.failedSyncs === 0 ? 'Healthy' : stats.failedSyncs < 5 ? 'Warning' : 'Critical'}
            </div>
          </dd>
        </div>

        {/* Repositories */}
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Repositories
          </dt>
          <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
            <div className="flex items-baseline text-2xl font-semibold text-blue-600">
              {stats.totalRepositories}
              <span className="ml-2 text-sm font-medium text-gray-500">repos</span>
            </div>
            <div className="inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Active
            </div>
          </dd>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Activity</h2>
        <div className="mt-4 overflow-hidden bg-white dark:bg-gray-800 shadow sm:rounded-md">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {activities.map((activity, index) => {
              const getIcon = () => {
                switch (activity.type) {
                  case 'success':
                    return (
                      <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    );
                  case 'error':
                    return (
                      <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    );
                  default:
                    return (
                      <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    );
                }
              };

              const getTimeAgo = (timestamp: string) => {
                const now = new Date();
                const then = new Date(timestamp);
                const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
                
                if (seconds < 60) return `${seconds} seconds ago`;
                const minutes = Math.floor(seconds / 60);
                if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
                const hours = Math.floor(minutes / 60);
                if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
                const days = Math.floor(hours / 24);
                return `${days} day${days > 1 ? 's' : ''} ago`;
              };

              const bgColor = activity.type === 'success' 
                ? 'bg-green-100 dark:bg-green-900'
                : activity.type === 'error'
                ? 'bg-red-100 dark:bg-red-900'
                : 'bg-yellow-100 dark:bg-yellow-900';

              const statusColor = activity.type === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : activity.type === 'error'
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';

              return (
                <li key={index} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`h-10 w-10 rounded-full ${bgColor} flex items-center justify-center`}>
                          {getIcon()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.action} to {activity.provider}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Repository: {activity.repository} • {getTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                        {activity.status}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
            {activities.length === 0 && (
              <li className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No recent activity
                </p>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}