// Export base classes and types
export * from './base';

// Import and export all provider adapters
// The imports will trigger the registration with ProviderAdapterFactory
export { GitHubAdapter } from './github';
export { GitLabAdapter } from './gitlab';
export { ForgejoAdapter } from './forgejo';
export { CustomGitAdapter } from './custom';

// Import to ensure registration happens
import './github';
import './gitlab';
import './forgejo';
import './custom';