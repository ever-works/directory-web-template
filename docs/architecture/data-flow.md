---
id: data-flow
title: Data Flow & State Management
sidebar_label: Data Flow
sidebar_position: 5
---

# Data Flow & State Management

This document describes how data flows through the Ever Works template, from the database to the UI, covering server components, API routes, React Query, Zustand stores, and the repository pattern.

## Architecture Overview

The template employs a multi-layered data architecture:

```
┌─────────────────────────────────────────────────────┐
│                  Client (Browser)                    │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Zustand   │  │ React Query  │  │ React State  │  │
│  │ Stores    │  │ Cache        │  │ (local)      │  │
│  └──────────┘  └──────┬───────┘  └──────────────┘  │
│                       │                              │
│              fetch / useMutation                     │
└───────────────────────┼─────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────┐
│               Next.js Server                         │
│  ┌────────────────────┼────────────────────────┐    │
│  │     Server Components (direct DB access)     │    │
│  │     API Route Handlers (/api/*)              │    │
│  └────────────────────┼────────────────────────┘    │
│                       │                              │
│  ┌──────────┐  ┌──────┴──────┐  ┌──────────────┐   │
│  │ Services  │  │ Repositories│  │ Query Modules│   │
│  └──────────┘  └──────┬──────┘  └──────┬───────┘   │
│                       │                 │            │
│  ┌────────────────────┴─────────────────┘           │
│  │         Drizzle ORM (lib/db/drizzle.ts)          │
│  └────────────────────┬─────────────────┘           │
└───────────────────────┼─────────────────────────────┘
                        │
               ┌────────┴────────┐
               │   PostgreSQL    │
               └─────────────────┘
```

## Server-Side Data Fetching

### Server Components (Direct DB Access)

Server components in the `app/` directory can directly import and call database query functions or repository methods. This is the most efficient path because it avoids unnecessary HTTP round-trips.

```typescript
// app/[locale]/admin/items/page.tsx (simplified)
import { getItems } from '@/lib/db/queries';

export default async function AdminItemsPage() {
  const items = await getItems();
  return <ItemsList items={items} />;
}
```

### API Route Handlers

API routes in `app/api/` serve as the bridge between client components and server-side logic. They follow a thin-handler pattern: validate input, call the appropriate service or repository, and return an HTTP response.

```typescript
// Typical API route pattern
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await someRepository.findAll();
  return NextResponse.json({ success: true, data });
}
```

## Client-Side State Management

### TanStack Query (React Query 5)

React Query is the primary tool for client-side server state management. The template uses it extensively through custom hooks in the `hooks/` directory.

**Global Configuration** (`lib/react-query-config.ts`):
- Default stale time: 5 minutes
- Garbage collection time: 10 minutes
- Automatic retry with exponential backoff (up to 3 retries)
- Refetch on window focus and reconnect
- No retry on 4xx client errors

**Hook Pattern**: Each feature area has dedicated hooks that wrap React Query:

```typescript
// hooks/use-admin-items.ts (simplified pattern)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useAdminItems(params) {
  return useQuery({
    queryKey: ['admin', 'items', params],
    queryFn: () => fetch('/api/admin/items').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => fetch('/api/admin/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'items'] });
    },
  });
}
```

### Zustand Stores

Zustand is used for client-only UI state that does not need server synchronization. Examples include:

- **Theme state**: Light/dark mode preference
- **Filter state**: Active filter selections
- **Modal state**: Open/closed state for modals and overlays
- **Layout preferences**: Grid vs list view, sidebar state

### React Context

React context providers in `components/context/` and `components/providers/` supply shared state to component subtrees. The root providers wrapper (`app/[locale]/providers.tsx`) composes:

- React Query provider (with query client)
- Theme provider
- Authentication session provider
- Toast notification provider

## Data Access Layers

### Repository Pattern

Repositories in `lib/repositories/` provide a clean abstraction over database operations. Each repository encapsulates queries for a specific domain entity.

```
lib/repositories/
├── admin-analytics-optimized.repository.ts
├── admin-stats.repository.ts
├── category.repository.ts
├── client-dashboard.repository.ts
├── client-item.repository.ts
├── collection.repository.ts
├── integration-mapping.repository.ts
├── item.repository.ts
├── role.repository.ts
├── sponsor-ad.repository.ts
├── tag.repository.ts
├── twenty-crm-config.repository.ts
└── user.repository.ts
```

### Query Modules

The `lib/db/queries/` directory contains 23+ query modules organized by domain. These provide raw Drizzle ORM query functions that repositories and services consume.

### Services Layer

The `lib/services/` directory contains 30+ service files that implement business logic. Services orchestrate multiple repositories, external API calls, and side effects (email, notifications, webhooks).

## API Client Architecture

### Server-Side API Client

`lib/api/server-api-client.ts` provides a centralized HTTP client for server-side calls with:
- Automatic retry with exponential backoff
- Configurable timeouts (default 30 seconds)
- Structured logging in development
- Error normalization

### Browser-Side API Client

`lib/api/api-client.ts` and `lib/api/api-client-class.ts` provide the client-side API abstraction used by React Query hooks to call API routes.

## Content Data (Git-Based CMS)

Item content (directory listings) is stored in a Git repository and managed through `lib/content.ts` and `lib/repository.ts`. This content is cloned into `.content/` at build time and synchronized periodically. The content system uses `isomorphic-git` for Git operations directly from Node.js.

## Cache Strategy

The template implements a multi-level caching approach:

1. **React Query cache**: Client-side with configurable stale/GC times per query
2. **Next.js cache**: Server-side rendering and data cache via `lib/cache-config.ts`
3. **Cache invalidation**: Targeted invalidation through `lib/cache-invalidation.ts` using revalidation tags
4. **Database connection pooling**: Configured in `lib/db/drizzle.ts` with pool sizes between 1-50 connections
