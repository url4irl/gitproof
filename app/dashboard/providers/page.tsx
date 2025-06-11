export default function ProvidersPage() {
  const providers = [
    {
      name: 'GitHub',
      status: 'active',
      lastSync: '2 minutes ago',
      repositories: 89,
      health: 100,
      endpoint: 'https://api.github.com',
      icon: '🐙'
    },
    {
      name: 'GitLab',
      status: 'active',
      lastSync: '5 minutes ago',
      repositories: 45,
      health: 98,
      endpoint: 'https://gitlab.com/api/v4',
      icon: '🦊'
    },
    {
      name: 'Forgejo',
      status: 'degraded',
      lastSync: '15 minutes ago',
      repositories: 12,
      health: 75,
      endpoint: 'https://forgejo.example.com',
      icon: '🔧'
    },
    {
      name: 'Custom Git Server',
      status: 'active',
      lastSync: '1 minute ago',
      repositories: 10,
      health: 100,
      endpoint: 'https://git.internal.com',
      icon: '🔗'
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Provider Status Monitor
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor the health and status of all connected Git providers
        </p>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {providers.map((provider) => (
          <div
            key={provider.name}
            className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-3xl mr-3">{provider.icon}</span>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {provider.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {provider.endpoint}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  provider.status === 'active' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : provider.status === 'degraded'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Repositories</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                    {provider.repositories}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Health Score</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                    {provider.health}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Sync</p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {provider.lastSync}
                  </p>
                </div>
              </div>

              {/* Health Bar */}
              <div className="mt-4">
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                    <div
                      style={{ width: `${provider.health}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                        provider.health >= 90 
                          ? 'bg-green-500'
                          : provider.health >= 70
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex space-x-3">
                <button className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">
                  View Details
                </button>
                <button className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">
                  Test Connection
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Provider Metrics */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow sm:p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Sync Operations (24h)
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            1,428
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow sm:p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Average Sync Time
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            2.4s
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow sm:p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Success Rate
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            99.8%
          </dd>
        </div>
      </div>
    </div>
  );
}