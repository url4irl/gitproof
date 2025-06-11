# GitProof <!-- omit in toc -->

GitProof is a Next.js application designed to provide a robust, centralized system for managing Git repositories across multiple providers. It ensures that developers can push their changes to a local repository, which then synchronizes with various remote Git providers, maintaining consistency and reliability.

- [High level architecture](#high-level-architecture)
- [Getting Started](#getting-started)

## High level architecture

```mermaid
graph TD
    subgraph "Developer Workflow"
        Dev[Developer] -->|git push| LocalRepo[Local Git Repository]
        LocalRepo -->|git push| CentralRelay[Central Git Relay]
    end
    
    subgraph "Central Git-Proof System"
        CentralRelay -->|Distributes Changes| DistributionEngine[Distribution Engine]
        DistributionEngine -->|Push Updates| SyncManager[Synchronization Manager]
        SyncManager -->|Resolve Conflicts| ConflictResolver[Conflict Resolution]
        
        ProviderMonitor[Provider Status Monitor] -.->|Status Updates| DistributionEngine
        CredentialManager[Credential Manager] -.->|Auth Info| AdapterLayer
        
        SyncManager -->|Queue Jobs| JobQueue[Job Queue]
        JobQueue -->|Process Jobs| AdapterLayer[Provider Adapter Layer]
    end
    
    subgraph "Provider Adapters"
        AdapterLayer -->|API Calls| GitHub[GitHub Adapter]
        AdapterLayer -->|API Calls| GitLab[GitLab Adapter]
        AdapterLayer -->|API Calls| Forgejo[Forgejo Adapter]
        AdapterLayer -->|API Calls| Custom[Custom Provider Adapter]
    end
    
    subgraph "Git Providers"
        GitHub -->|Push/Pull| GitHubCloud[GitHub Cloud]
        GitLab -->|Push/Pull| GitLabCloud[GitLab Cloud]
        Forgejo -->|Push/Pull| ForgejoServer[Forgejo Server]
        Custom -->|Push/Pull| CustomProvider[Custom Git Provider]
    end
    
    subgraph "Fallback & Recovery"
        DistributionEngine <-->|Status Check| FailoverManager[Failover Manager]
        FailoverManager -->|Emergency Backup| LocalBackup[Local Git Backup]
        ProviderMonitor -->|Outage Alerts| AlertSystem[Alert System]
        ProviderMonitor -->|Recovery Detection| RecoveryManager[Recovery Synchronization]
    end
```

Supported Git providers include:

- GitHub
- GitLab
- Codeberg
- Self-hosted GitLab
- Self-hosted Forgejo
- Self-hosted Gitea

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
