---
id: extending
title: Extending the Template
sidebar_label: Extending
sidebar_position: 9
---

# Extending the Template

This guide covers how to extend the Ever Works Template with new pages, API routes, database tables, custom hooks, admin sections, and third-party integrations. Each extension follows the template's layered architecture.

## Project Architecture for Extensions

The template uses a strict layer separation:

```
app/             -- Routes and pages (thin, data-fetching layer)
  [locale]/      -- Localized pages under App Router
  api/           -- API route handlers
components/      -- React components (presentational + interactive)
hooks/           -- Custom React hooks (client-side data fetching)
lib/
  db/            -- Schema definitions, connection, migrations
  repositories/  -- Data access layer (queries)
  services/      -- Business logic layer
  middleware/     -- Permission checks, validation
  permissions/   -- RBAC permission definitions
  validations/   -- Zod schemas for input validation
  background-jobs/ -- Scheduled and triggered tasks
utils/           -- Pure utility functions
types/           -- Shared TypeScript type definitions
messages/        -- Translation files (one per locale)
```

**Key principle**: Business logic belongs in `lib/services/` or `lib/repositories/`, not in components or API route handlers.

## Adding New Pages

### Localized Page

Create pages under `app/[locale]/` to benefit from automatic locale routing:

```typescript
// app/[locale]/projects/page.tsx
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';

export default async function ProjectsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('projects');

  return (
    <div>
      <h1>{t('title')}</h1>
      {/* Page content */}
    </div>
  );
}
```

The layout at `app/[locale]/layout.tsx` automatically wraps every page with:

- `NextIntlClientProvider` for client-side translations
- `SettingsProvider` for feature flags and configuration
- `Providers` for theme, React Query, and HeroUI
- SEO metadata and structured data

### Static Params Generation

For pages that should be statically generated, export `generateStaticParams`:

```typescript
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}
```

The root layout already generates static params for the default locale. Additional locales are rendered on-demand.

## Adding New API Routes

### Basic REST Route

Create API routes in `app/api/`. Follow the pattern of thin handlers that delegate to services:

```typescript
// app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { projectService } from '@/lib/services/project.service';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  isPublic: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projects = await projectService.getUserProjects(session.user.id);
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const project = await projectService.createProject(
    session.user.id,
    parsed.data
  );
  return NextResponse.json(project, { status: 201 });
}
```

### Dynamic Route with Parameters

```typescript
// app/api/projects/[id]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { projectRepository } from '@/lib/repositories/project.repository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const project = await projectRepository.findById(id);

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(project);
}
```

## Adding New Database Tables

### Step 1: Define the Schema

Add your table to `lib/db/schema.ts`, following existing patterns:

```typescript
export const projects = pgTable(
  'projects',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    description: text('description'),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    status: text('status', {
      enum: ['draft', 'active', 'archived']
    }).default('draft'),
    isPublic: boolean('is_public').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    ownerIndex: index('projects_owner_id_idx').on(table.ownerId),
    statusIndex: index('projects_status_idx').on(table.status),
  })
);
```

### Step 2: Generate and Apply Migration

```bash
pnpm db:generate   # Creates a new SQL file in lib/db/migrations/
pnpm db:migrate    # Applies it to your database
```

### Step 3: Create Type Definitions

Derive types from the schema using Drizzle's inference:

```typescript
// types/project.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { projects } from '@/lib/db/schema';

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
```

### Step 4: Create a Repository

```typescript
// lib/repositories/project.repository.ts
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { NewProject, Project } from '@/types/project';

export class ProjectRepository {
  async findById(id: string): Promise<Project | undefined> {
    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return result[0];
  }

  async findByOwner(ownerId: string): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, ownerId));
  }

  async create(data: NewProject): Promise<Project> {
    const result = await db
      .insert(projects)
      .values(data)
      .returning();
    return result[0];
  }

  async update(
    id: string,
    data: Partial<NewProject>
  ): Promise<Project> {
    const result = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }
}

export const projectRepository = new ProjectRepository();
```

### Step 5: Create a Service

```typescript
// lib/services/project.service.ts
import { projectRepository } from '@/lib/repositories/project.repository';
import type { NewProject } from '@/types/project';

export class ProjectService {
  async createProject(
    ownerId: string,
    data: Omit<NewProject, 'ownerId'>
  ) {
    if (!data.name?.trim()) {
      throw new Error('Project name is required');
    }
    return projectRepository.create({ ...data, ownerId });
  }

  async getUserProjects(userId: string) {
    return projectRepository.findByOwner(userId);
  }
}

export const projectService = new ProjectService();
```

## Adding Custom Hooks

### React Query Data Fetching Hook

Create hooks in the `hooks/` directory following the existing naming convention (`use-<resource>.ts`):

```typescript
// hooks/use-projects.ts
'use client';

import {
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query';
import type { Project, NewProject } from '@/types/project';

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<NewProject, 'ownerId'>) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
```

The template has over 100 hooks in the `hooks/` directory. Study existing hooks like `use-admin-items.ts` or `use-favorites.ts` for patterns including pagination, optimistic updates, and error handling.

## Adding New Admin Sections

### Step 1: Define Permissions

Update `lib/permissions/definitions.ts`:

```typescript
export const PERMISSIONS = {
  // ... existing permissions
  projects: {
    read: 'projects:read',
    create: 'projects:create',
    update: 'projects:update',
    delete: 'projects:delete',
  },
} as const;
```

### Step 2: Create the Admin Page

```typescript
// app/[locale]/admin/projects/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/middleware/permission-check';

export default async function AdminProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');

  const userPerms = {
    userId: session.user.id,
    roles: session.user.roles || [],
    permissions: session.user.permissions || [],
  };

  if (!hasPermission(userPerms, 'projects:read')) {
    redirect('/unauthorized');
  }

  return (
    <div>
      <h1>Project Management</h1>
      {/* Admin data table, filters, actions */}
    </div>
  );
}
```

The permission check system in `lib/middleware/permission-check.ts` provides helpers:

```typescript
hasPermission(userPerms, 'projects:read')     // Single permission
hasAnyPermission(userPerms, [...])             // Any of multiple
hasAllPermissions(userPerms, [...])            // All of multiple
canManageResource(userPerms, 'projects')       // Create/update/delete
isSuperAdmin(userPerms)                        // Full access check
```

### Step 3: Add to Admin Navigation

Add your section to the admin sidebar or navigation component so it appears in the admin dashboard.

## Adding Translations

### Step 1: Add Keys to Locale Files

Add keys to `messages/en.json` and all other locale files:

```json
{
  "projects": {
    "title": "Projects",
    "create": "Create Project",
    "name": "Project Name",
    "description": "Description",
    "status": {
      "draft": "Draft",
      "active": "Active",
      "archived": "Archived"
    }
  }
}
```

The template supports 21 locales. At minimum, add keys to `en.json`. The request configuration in `i18n/request.ts` uses `deepmerge` to merge locale-specific messages with English defaults:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Missing keys in non-English locales will fall back to the English value.

### Step 2: Use in Components

```typescript
import { useTranslations } from 'next-intl';

export function ProjectForm() {
  const t = useTranslations('projects');
  return (
    <form>
      <label>{t('name')}</label>
      <input type="text" placeholder={t('name')} />
    </form>
  );
}
```

## Extension Checklist

| Layer | Task | Location |
|-------|------|----------|
| Schema | Define table | `lib/db/schema.ts` |
| Migration | Generate SQL | `pnpm db:generate` |
| Types | TypeScript types | `types/` |
| Repository | Data access | `lib/repositories/` |
| Service | Business logic | `lib/services/` |
| Validation | Zod schemas | `lib/validations/` |
| API | REST endpoints | `app/api/` |
| Hooks | Client data fetching | `hooks/` |
| Components | UI elements | `components/` |
| Pages | Route pages | `app/[locale]/` |
| Admin | Management page | `app/[locale]/admin/` |
| Permissions | RBAC | `lib/permissions/definitions.ts` |
| Translations | i18n keys | `messages/` |
| Verify | Type check and lint | `pnpm tsc --noEmit && pnpm lint` |

## Best Practices

1. **Follow existing patterns** -- study items, categories, and users before creating new features
2. **Keep routes thin** -- validate input, call a service, return response
3. **Validate with Zod** -- all external input goes through Zod schemas
4. **Prefer server components** -- only add `"use client"` when interactivity is needed
5. **Use dynamic imports for server modules** -- prevents webpack bundling issues in instrumentation and background jobs
6. **Commit migration files** -- other developers and CI need them
7. **Type everything** -- avoid `any`; derive types from Drizzle schema with `InferSelectModel`
8. **Add translations** -- never hardcode English strings in components
