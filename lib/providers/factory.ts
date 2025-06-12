import { Provider } from '@prisma/client';
import { BaseProviderAdapter, ProviderAdapterFactory } from './base';
import { GitHubAdapter } from './github';
import { GitLabAdapter } from './gitlab';
import { ForgejoAdapter } from './forgejo';
import { CustomProviderAdapter } from './custom';

// Register all available providers
ProviderAdapterFactory.register('github', GitHubAdapter as any);
ProviderAdapterFactory.register('gitlab', GitLabAdapter as any);
ProviderAdapterFactory.register('forgejo', ForgejoAdapter as any);
ProviderAdapterFactory.register('custom', CustomProviderAdapter as any);

export class ProviderFactory {
  /**
   * Create a provider adapter from a database provider model
   */
  static create(provider: Provider): BaseProviderAdapter {
    const credentials = provider.credentials as Record<string, any>;
    
    return ProviderAdapterFactory.create(
      provider.type.toLowerCase(),
      provider.name,
      provider.endpoint,
      credentials
    );
  }

  /**
   * Get all registered provider types
   */
  static getAvailableTypes(): string[] {
    return ProviderAdapterFactory.getRegisteredTypes();
  }

  /**
   * Validate if a provider type is supported
   */
  static isSupported(type: string): boolean {
    return ProviderAdapterFactory.getRegisteredTypes().includes(type.toLowerCase());
  }
}