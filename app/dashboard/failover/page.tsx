export default function FailoverPage() {
  const recoveryEvents = [
    {
      id: 1,
      type: 'failover',
      provider: 'Forgejo',
      fallbackProvider: 'GitHub',
      reason: 'Connection timeout',
      affectedRepos: 12,
      timestamp: '2 hours ago',
      status: 'resolved',
      duration: '15 minutes'
    },
    {
      id: 2,
      type: 'recovery',
      provider: 'GitLab',
      fallbackProvider: null,
      reason: 'Service restored',
      affectedRepos: 45,
      timestamp: '6 hours ago',
      status: 'completed',
      duration: '2 minutes'
    },
    {
      id: 3,
      type: 'failover',
      provider: 'Custom Git Server',
      fallbackProvider: 'GitLab',
      reason: 'HTTP 503 Service Unavailable',
      affectedRepos: 8,
      timestamp: '1 day ago',
      status: 'resolved',
      duration: '45 minutes'
    }
  ];

  const backupStatus = {
    lastBackup: '30 minutes ago',
    backupSize: '2.4 GB',
    totalRepos: 156,
    incrementalEnabled: true,
    nextScheduled: 'in 30 minutes'
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Failover & Recovery
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor failover events and manage recovery procedures
        </p>
      </div>

      {/* Alert Banner */}
      <div className="mb-6 rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Failover Configuration Active
            </h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p>
                Automatic failover is enabled. Failed syncs will be redirected to available providers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Failover Configuration */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Failover Rules */}
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Failover Rules
            </h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Primary → Fallback Priority
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    GitHub → GitLab → Forgejo → Local Backup
                  </p>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-500">
                  Edit
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Retry Attempts
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    3 attempts with exponential backoff
                  </p>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-500">
                  Edit
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Health Check Interval
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Every 60 seconds
                  </p>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-500">
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Backup Status */}
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Local Backup Status
            </h3>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Last Backup</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {backupStatus.lastBackup}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Backup Size</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {backupStatus.backupSize}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Repositories</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {backupStatus.totalRepos}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Next Scheduled</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {backupStatus.nextScheduled}
                </span>
              </div>
              <div className="mt-4 flex space-x-3">
                <button className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500">
                  Run Backup Now
                </button>
                <button className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">
                  View Backups
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Events */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Recent Failover Events
        </h3>
        <div className="overflow-hidden bg-white dark:bg-gray-800 shadow sm:rounded-md">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {recoveryEvents.map((event) => (
              <li key={event.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {event.type === 'failover' ? (
                        <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                          <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.type === 'failover' ? 'Failover triggered' : 'Recovery completed'} for {event.provider}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {event.reason} • {event.affectedRepos} repositories affected
                        {event.fallbackProvider && ` • Fallback: ${event.fallbackProvider}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {event.timestamp} • Duration: {event.duration}
                      </p>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      event.status === 'resolved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}