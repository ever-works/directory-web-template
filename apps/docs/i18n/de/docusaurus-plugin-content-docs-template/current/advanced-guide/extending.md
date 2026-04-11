---
id: extending
title: Erweitern der Vorlage
sidebar_label: Erweitern
sidebar_position: 9
---

# Erweiterung der Vorlage

In diesem Leitfaden erfahren Sie, wie Sie die Ever Works-Vorlage um neue Seiten, API-Routen, Datenbanktabellen, benutzerdefinierte Hooks, Admin-Abschnitte und Integrationen von Drittanbietern erweitern. Jede Erweiterung folgt der mehrschichtigen Architektur der Vorlage.

## Projektarchitektur für Erweiterungen

Die Vorlage verwendet eine strikte Ebenentrennung:

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

**Grundprinzip**: Geschäftslogik gehört in `lib/services/` oder `lib/repositories/` , nicht in Komponenten oder API-Routenhandler.

## Neue Seiten hinzufügen

### Lokalisierte Seite

Erstellen Sie Seiten unter `app/[locale]/` , um vom automatischen Locale-Routing zu profitieren:

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

Das Layout bei `app/[locale]/layout.tsx` umschließt automatisch jede Seite mit:

- `NextIntlClientProvider` für kundenseitige Übersetzungen
- `SettingsProvider` für Feature-Flags und Konfiguration
- `Providers` für Theme, React Query und HeroUI
- SEO-Metadaten und strukturierte Daten

### Generierung statischer Parameter

Für Seiten, die statisch generiert werden sollen, exportieren Sie `generateStaticParams` :

```typescript
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}
```

Das Root-Layout generiert bereits statische Parameter für das Standardgebietsschema. Zusätzliche Gebietsschemata werden bei Bedarf gerendert.

## Neue API-Routen hinzufügen

### Grundlegende REST-Route

Erstellen Sie API-Routen in `app/api/` . Folgen Sie dem Muster von Thin-Handlern, die an Dienste delegieren:

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

### Dynamische Route mit Parametern

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

## Neue Datenbanktabellen hinzufügen

### Schritt 1: Definieren Sie das Schema

Fügen Sie Ihre Tabelle zu `lib/db/schema.ts` hinzu und folgen Sie dabei den vorhandenen Mustern:

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

### Schritt 2: Migration generieren und anwenden

```bash
pnpm db:generate   # Creates a new SQL file in lib/db/migrations/
pnpm db:migrate    # Applies it to your database
```

### Schritt 3: Typdefinitionen erstellen

Leiten Sie mithilfe der Drizzle-Inferenz Typen aus dem Schema ab:

```typescript
// types/project.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { projects } from '@/lib/db/schema';

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
```

### Schritt 4: Erstellen Sie ein Repository

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

### Schritt 5: Erstellen Sie einen Dienst

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

## Benutzerdefinierte Hooks hinzufügen

### Hook zum Abrufen von Abfragedaten reagieren

Erstellen Sie Hooks im Verzeichnis `hooks/` gemäß der bestehenden Namenskonvention ( `use-<resource>.ts` ):

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

Die Vorlage verfügt über 100 Hooks im Verzeichnis `hooks/` . Studieren Sie vorhandene Hooks wie `use-admin-items.ts` oder `use-favorites.ts` für Muster wie Paginierung, optimistische Aktualisierungen und Fehlerbehandlung.

## Neue Admin-Bereiche hinzufügen

### Schritt 1: Berechtigungen definieren

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

### Schritt 2: Erstellen Sie die Admin-Seite

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

Das Berechtigungsprüfungssystem in `lib/middleware/permission-check.ts` bietet Helfer:

```typescript
hasPermission(userPerms, 'projects:read')     // Single permission
hasAnyPermission(userPerms, [...])             // Any of multiple
hasAllPermissions(userPerms, [...])            // All of multiple
canManageResource(userPerms, 'projects')       // Create/update/delete
isSuperAdmin(userPerms)                        // Full access check
```

### Schritt 3: Zur Admin-Navigation hinzufügen

Fügen Sie Ihren Abschnitt zur Admin-Seitenleiste oder Navigationskomponente hinzu, damit er im Admin-Dashboard angezeigt wird.

## Übersetzungen hinzufügen

### Schritt 1: Schlüssel zu Gebietsschemadateien hinzufügen

Fügen Sie Schlüssel zu `messages/en.json` und allen anderen Gebietsschemadateien hinzu:

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

Die Vorlage unterstützt 21 Gebietsschemas. Fügen Sie mindestens Schlüssel zu `en.json` hinzu. Die Anforderungskonfiguration in `i18n/request.ts` verwendet `deepmerge` , um gebietsschemaspezifische Nachrichten mit englischen Standardeinstellungen zusammenzuführen:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Bei fehlenden Schlüsseln in nicht-englischen Gebietsschemata wird auf den englischen Wert zurückgegriffen.

### Schritt 2: Verwendung in Komponenten

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

## Erweiterungs-Checkliste

| Schicht | Aufgabe | Standort |
|-------|------|----------|
| Schema | Tabelle definieren | `lib/db/schema.ts` |
| Migration | SQL generieren | `pnpm db:generate` |
| Typen | TypeScript-Typen | `types/` |
| Repository | Datenzugriff | `lib/repositories/` |
| Service | Geschäftslogik | `lib/services/` |
| Validierung | Zod-Schemata | `lib/validations/` |
| API | REST-Endpunkte | `app/api/` |
| Haken | Abrufen von Kundendaten | `hooks/` |
| Komponenten | UI-Elemente | `components/` |
| Seiten | Routenseiten | `app/[locale]/` |
| Admin | Verwaltungsseite | `app/[locale]/admin/` |
| Berechtigungen | RBAC | `lib/permissions/definitions.ts` |
| Übersetzungen | i18n-Schlüssel | `messages/` |
| Überprüfen | Typprüfung und Flusen | `pnpm tsc --noEmit && pnpm lint` |

## Best Practices

1. **Folgen Sie bestehenden Mustern** – studieren Sie Elemente, Kategorien und Benutzer, bevor Sie neue Funktionen erstellen
2. **Routen dünn halten** – Eingabe validieren, einen Dienst aufrufen, Antwort zurückgeben
3. **Mit Zod validieren** – alle externen Eingaben durchlaufen Zod-Schemata
4. **Serverkomponenten bevorzugen** – fügen Sie `"use client"` nur hinzu, wenn Interaktivität erforderlich ist
5. **Verwenden Sie dynamische Importe für Servermodule** – verhindert Webpack-Bündelungsprobleme bei Instrumentierung und Hintergrundjobs
6. **Migrationsdateien festschreiben** – andere Entwickler und CI benötigen sie
7. **Alles eingeben** – `any` vermeiden; Leiten Sie Typen aus dem Drizzle-Schema mit `InferSelectModel` ab
8. **Übersetzungen hinzufügen** – kodieren Sie niemals englische Zeichenfolgen in Komponenten fest
