---
id: extending
title: Het sjabloon uitbreiden
sidebar_label: Verlengen
sidebar_position: 9
---

# Het sjabloon uitbreiden

In deze handleiding wordt beschreven hoe u de Ever Works-sjabloon kunt uitbreiden met nieuwe pagina's, API-routes, databasetabellen, aangepaste hooks, beheerderssecties en integraties van derden. Elke extensie volgt de gelaagde architectuur van de sjabloon.

## Projectarchitectuur voor uitbreidingen

De sjabloon gebruikt een strikte laagscheiding:

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

**Belangrijkste principe**: Bedrijfslogica hoort thuis in `lib/services/` of `lib/repositories/` , niet in componenten of API-routehandlers.

## Nieuwe pagina's toevoegen

### Gelokaliseerde pagina

Maak pagina's onder `app/[locale]/` om te profiteren van automatische locale-routering:

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

De lay-out bij `app/[locale]/layout.tsx` laat elke pagina automatisch doorlopen met:

- `NextIntlClientProvider` voor vertalingen aan de klantzijde
- `SettingsProvider` voor functievlaggen en configuratie
- `Providers` voor thema, React Query en HeroUI
- SEO-metagegevens en gestructureerde gegevens

### Generatie van statische parameters

Voor pagina's die statisch gegenereerd moeten worden, exporteert u `generateStaticParams` :

```typescript
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}
```

De hoofdindeling genereert al statische parameters voor de standaardlandinstelling. Extra landinstellingen worden op aanvraag weergegeven.

## Nieuwe API-routes toevoegen

### Basis REST-route

Maak API-routes in `app/api/` . Volg het patroon van thin handlers die delegeren aan services:

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

### Dynamische route met parameters

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

## Nieuwe databasetabellen toevoegen

### Stap 1: Definieer het schema

Voeg uw tabel toe aan `lib/db/schema.ts` , volgens bestaande patronen:

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

### Stap 2: Migratie genereren en toepassen

```bash
pnpm db:generate   # Creates a new SQL file in lib/db/migrations/
pnpm db:migrate    # Applies it to your database
```

### Stap 3: Typedefinities maken

Leid typen af uit het schema met behulp van de gevolgtrekking van Drizzle:

```typescript
// types/project.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { projects } from '@/lib/db/schema';

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
```

### Stap 4: Maak een opslagplaats

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

### Stap 5: Creëer een dienst

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

## Aangepaste haken toevoegen

### Hook voor het ophalen van querygegevens reageren

Maak hooks in de map `hooks/` volgens de bestaande naamgevingsconventie ( `use-<resource>.ts` ):

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

De sjabloon heeft meer dan 100 hooks in de map `hooks/` . Bestudeer bestaande hooks zoals `use-admin-items.ts` of `use-favorites.ts` op patronen zoals paginering, optimistische updates en foutafhandeling.

## Nieuwe beheerderssecties toevoegen

### Stap 1: Definieer machtigingen

Update `lib/permissions/definitions.ts` :

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

### Stap 2: Maak de beheerderspagina

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

Het toestemmingscontrolesysteem in `lib/middleware/permission-check.ts` biedt hulpmiddelen:

```typescript
hasPermission(userPerms, 'projects:read')     // Single permission
hasAnyPermission(userPerms, [...])             // Any of multiple
hasAllPermissions(userPerms, [...])            // All of multiple
canManageResource(userPerms, 'projects')       // Create/update/delete
isSuperAdmin(userPerms)                        // Full access check
```

### Stap 3: Toevoegen aan beheerdersnavigatie

Voeg uw sectie toe aan de beheerderszijbalk of navigatiecomponent, zodat deze in het beheerdersdashboard verschijnt.

## Vertalingen toevoegen

### Stap 1: sleutels toevoegen aan landinstellingsbestanden

Sleutels toevoegen aan `messages/en.json` en alle andere landinstellingsbestanden:

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

De sjabloon ondersteunt 21 landinstellingen. Voeg minimaal sleutels toe tot `en.json` . De verzoekconfiguratie in `i18n/request.ts` gebruikt `deepmerge` om landspecifieke berichten samen te voegen met Engelse standaardwaarden:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Ontbrekende sleutels in niet-Engelse landinstellingen vallen terug op de Engelse waarde.

### Stap 2: Gebruik in componenten

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

## Extensiechecklist

| Laag | Taak | Locatie |
|-------|------|----------|
| Schema | Tabel definiëren | `lib/db/schema.ts` |
| Migratie | SQL genereren | `pnpm db:generate` |
| Soorten | TypeScript-typen | `types/` |
| Bewaarplaats | Gegevenstoegang | `lib/repositories/` |
| Dienst | Bedrijfslogica | `lib/services/` |
| Validatie | Zod-schema's | `lib/validations/` |
| API | REST-eindpunten | `app/api/` |
| Haken | Klantgegevens ophalen | `hooks/` |
| Componenten | UI-elementen | `components/` |
| Pagina's | Routepagina's | `app/[locale]/` |
| Beheerder | Beheerpagina | `app/[locale]/admin/` |
| Machtigingen | RBAC | `lib/permissions/definitions.ts` |
| Vertalingen | i18n-toetsen | `messages/` |
| Verifieer | Typecontrole en lint | `pnpm tsc --noEmit && pnpm lint` |

## Beste praktijken

1. **Volg bestaande patronen**: bestudeer items, categorieën en gebruikers voordat u nieuwe functies maakt
2. **Houd routes dun** - valideer invoer, bel een service, retourneer antwoord
3. **Valideren met Zod**: alle externe invoer gaat via Zod-schema's
4. **Geef de voorkeur aan servercomponenten** -- voeg alleen `"use client"` toe als interactiviteit nodig is
5. **Gebruik dynamische import voor servermodules** - voorkomt problemen met het bundelen van webpakketten in instrumentatie en achtergrondtaken
6. **Migratiebestanden vastleggen** - andere ontwikkelaars en CI hebben ze nodig
7. **Typ alles** -- vermijd `any` ; typen afleiden uit het Drizzle-schema met `InferSelectModel` 8. **Vertalingen toevoegen** -- codeer nooit Engelse tekenreeksen in componenten
