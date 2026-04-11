---
id: extending
title: Estensione del modello
sidebar_label: Estendendo
sidebar_position: 9
---

# Estendere il modello

Questa guida spiega come estendere il modello Ever Works con nuove pagine, percorsi API, tabelle di database, hook personalizzati, sezioni di amministrazione e integrazioni di terze parti. Ogni estensione segue l'architettura a strati del modello.

## Architettura del progetto per le estensioni

Il modello utilizza una rigorosa separazione dei livelli:

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

**Principio chiave**: la logica aziendale appartiene a `lib/services/` o `lib/repositories/` , non a componenti o gestori di percorsi API.

## Aggiunta di nuove pagine

### Pagina localizzata

Crea pagine sotto `app/[locale]/` per beneficiare del routing automatico delle impostazioni locali:

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

Il layout in `app/[locale]/layout.tsx` avvolge automaticamente ogni pagina con:

- `NextIntlClientProvider` per traduzioni lato client
- `SettingsProvider` per flag di funzionalità e configurazione
- `Providers` per tema, React Query e HeroUI
- Metadati SEO e dati strutturati

### Generazione di parametri statici

Per le pagine che dovrebbero essere generate staticamente, esporta `generateStaticParams` :

```typescript
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}
```

Il layout root genera già parametri statici per la locale predefinita. Ulteriori versioni locali vengono visualizzate su richiesta.

## Aggiunta di nuove rotte API

### Percorso REST di base

Crea percorsi API in `app/api/` . Segui il modello dei gestori sottili che delegano ai servizi:

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

### Percorso dinamico con parametri

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

## Aggiunta di nuove tabelle al database

### Passaggio 1: definire lo schema

Aggiungi la tua tabella a `lib/db/schema.ts` , seguendo gli schemi esistenti:

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

### Passaggio 2: genera e applica la migrazione

```bash
pnpm db:generate   # Creates a new SQL file in lib/db/migrations/
pnpm db:migrate    # Applies it to your database
```

### Passaggio 3: creare definizioni di tipo

Deriva i tipi dallo schema utilizzando l'inferenza di Drizzle:

```typescript
// types/project.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { projects } from '@/lib/db/schema';

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
```

### Passaggio 4: crea un repository

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

### Passaggio 5: crea un servizio

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

## Aggiunta di hook personalizzati

### Hook di recupero dei dati della query di reazione

Crea hook nella directory `hooks/` seguendo la convenzione di denominazione esistente ( `use-<resource>.ts` ):

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

Il modello ha oltre 100 hook nella directory `hooks/` . Studia gli hook esistenti come `use-admin-items.ts` o `use-favorites.ts` per modelli che includono impaginazione, aggiornamenti ottimistici e gestione degli errori.

## Aggiunta di nuove sezioni di amministrazione

### Passaggio 1: definire le autorizzazioni

Aggiornamento `lib/permissions/definitions.ts` :

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

### Passaggio 2: crea la pagina di amministrazione

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

Il sistema di controllo dei permessi in `lib/middleware/permission-check.ts` fornisce aiutanti:

```typescript
hasPermission(userPerms, 'projects:read')     // Single permission
hasAnyPermission(userPerms, [...])             // Any of multiple
hasAllPermissions(userPerms, [...])            // All of multiple
canManageResource(userPerms, 'projects')       // Create/update/delete
isSuperAdmin(userPerms)                        // Full access check
```

### Passaggio 3: aggiungi alla navigazione amministrativa

Aggiungi la tua sezione alla barra laterale di amministrazione o al componente di navigazione in modo che venga visualizzata nella dashboard di amministrazione.

## Aggiunta di traduzioni

### Passaggio 1: aggiungere le chiavi ai file delle impostazioni locali

Aggiungi le chiavi a `messages/en.json` e tutti gli altri file locali:

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

Il modello supporta 21 lingue. Come minimo, aggiungi le chiavi a `en.json` . La configurazione della richiesta in `i18n/request.ts` utilizza `deepmerge` per unire i messaggi specifici della locale con le impostazioni predefinite in inglese:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Le chiavi mancanti nelle impostazioni locali non inglesi torneranno al valore inglese.

### Passaggio 2: utilizzo nei componenti

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

## Elenco di controllo dell'estensione

| Strato | Compito | Posizione |
|-------|------|----------|
| Schema | Definisci tabella | `lib/db/schema.ts` |
| Migrazione | Genera SQL | `pnpm db:generate` |
| Tipi | Tipi TypeScript | `types/` |
| Deposito | Accesso ai dati | `lib/repositories/` |
| Servizio | Logica aziendale | `lib/services/` |
| Convalida | Schemi Zod | `lib/validations/` |
| API | Endpoint REST | `app/api/` |
| Ganci | Recupero dati cliente | `hooks/` |
| Componenti | Elementi dell'interfaccia utente | `components/` |
| Pagine | Pagine del percorso | `app/[locale]/` |
| Amministratore | Pagina di gestione | `app/[locale]/admin/` |
| Autorizzazioni | RBAC | `lib/permissions/definitions.ts` |
| Traduzioni | Tasti i18n | `messages/` |
| Verifica | Digitare check e lint | `pnpm tsc --noEmit && pnpm lint` |

## Migliori pratiche

1. **Segui i modelli esistenti**: studia elementi, categorie e utenti prima di creare nuove funzionalità
2. **Mantieni i percorsi sottili**: convalida l'input, chiama un servizio, restituisce una risposta
3. **Convalida con Zod**: tutti gli input esterni passano attraverso gli schemi Zod
4. **Preferisci componenti server** -- aggiungi `"use client"` solo quando è necessaria l'interattività
5. **Utilizza importazioni dinamiche per i moduli server**: previene problemi di raggruppamento di pacchetti web nella strumentazione e nei lavori in background
6. **Conferma file di migrazione**: altri sviluppatori e CI ne hanno bisogno
7. **Digita tutto** -- evita `any` ; derivare i tipi dallo schema Drizzle con `InferSelectModel` 8. **Aggiungi traduzioni**: non codificare mai le stringhe inglesi nei componenti
