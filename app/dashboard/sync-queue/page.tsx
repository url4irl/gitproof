export default function SyncQueuePage() {
  const queueItems = [
    {
      id: 'job-1',
      repository: 'project-alpha',
      action: 'push',
      branch: 'main',
      commit: 'a1b2c3d',
      providers: ['GitHub', 'GitLab'],
      status: 'processing',
      progress: 65,
      startedAt: '2 minutes ago'
    },
    {
      id: 'job-2',
      repository: 'project-beta',
      action: 'push',
      branch: 'feature/new-ui',
      commit: 'e4f5g6h',
      providers: ['GitHub', 'Forgejo'],
      status: 'processing',
      progress: 30,
      startedAt: '1 minute ago'
    },
    {
      id: 'job-3',
      repository: 'project-gamma',
      action: 'push',
      branch: 'main',
      commit: 'i7j8k9l',
      providers: ['GitLab', 'Custom Git Server'],
      status: 'queued',
      progress: 0,
      startedAt: null
    },
    {
      id: 'job-4',
      repository: 'project-delta',
      action: 'push',
      branch: 'develop',
      commit: 'm1n2o3p',
      providers: ['GitHub', 'GitLab', 'Forgejo'],
      status: 'queued',
      progress: 0,
      startedAt: null
    },
    {
      id: 'job-5',
      repository: 'project-epsilon',
      action: 'push',
      branch: 'hotfix/security',
      commit: 'q4r5s6t',
      providers: ['GitHub'],
      status: 'completed',
      progress: 100,
      startedAt: '5 minutes ago'
    }
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Synchronization Queue
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor and manage repository synchronization tasks
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="rounded-md bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
            Pause Queue
          </button>
          <button className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-500">
            Clear Failed
          </button>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Processing</dt>
          <dd className="mt-1 text-2xl font-semibold text-blue-600">2</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Queued</dt>
          <dd className="mt-1 text-2xl font-semibold text-yellow-600">10</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</dt>
          <dd className="mt-1 text-2xl font-semibold text-green-600">156</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Failed</dt>
          <dd className="mt-1 text-2xl font-semibold text-red-600">0</dd>
        </div>
      </div>

      {/* Queue Table */}
      <div className="overflow-hidden bg-white dark:bg-gray-800 shadow sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {queueItems.map((item) => (
            <li key={item.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.repository}
                          <span className="ml-2 text-xs text-gray-500">
                            {item.branch} • {item.commit}
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {item.action} to {item.providers.join(', ')}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'processing'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : item.status === 'queued'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : item.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                        {item.startedAt && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.startedAt}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.status === 'processing' && (
                      <div className="mt-2">
                        <div className="relative pt-1">
                          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                            <div
                              style={{ width: `${item.progress}%` }}
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
                            />
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {item.progress}% complete
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {item.status === 'queued' && (
                      <button className="text-sm text-blue-600 hover:text-blue-500">
                        Priority
                      </button>
                    )}
                    {item.status === 'processing' && (
                      <button className="text-sm text-red-600 hover:text-red-500">
                        Cancel
                      </button>
                    )}
                    {item.status === 'completed' && (
                      <button className="text-sm text-gray-600 hover:text-gray-500">
                        Details
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Load More */}
      <div className="mt-6 flex justify-center">
        <button className="rounded-md bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
          Load More
        </button>
      </div>
    </div>
  );
}