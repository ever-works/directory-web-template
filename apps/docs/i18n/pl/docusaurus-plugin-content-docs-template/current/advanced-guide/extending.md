---
id: extending
title: Rozszerzanie szablonu
sidebar_label: Rozsuwalny
sidebar_position: 9
---

# Rozszerzanie szablonu

W tym przewodniku opisano, jak rozszerzać szablon Ever Works o nowe strony, trasy API, tabele bazy danych, niestandardowe hooki, sekcje administracyjne i integracje innych firm. Każde rozszerzenie jest zgodne z warstwową architekturą szablonu.

## Architektura projektu dla rozszerzeń

W szablonie zastosowano ścisłą separację warstw:

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

**Kluczowa zasada**: Logika biznesowa należy do `lib/services/` lub `lib/repositories/` , a nie do komponentów lub procedur obsługi tras API.

## Dodawanie nowych stron

### Zlokalizowana strona

Utwórz strony pod `app/[locale]/` , aby skorzystać z automatycznego routingu ustawień regionalnych:

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

Układ w pozycji `app/[locale]/layout.tsx` automatycznie zawija każdą stronę:

- `NextIntlClientProvider` dla tłumaczeń po stronie klienta
- `SettingsProvider` dla flag funkcji i konfiguracji
- `Providers` dla motywu, zapytania reakcji i HeroUI
- Metadane SEO i dane strukturalne

### Generowanie parametrów statycznych

W przypadku stron, które powinny być generowane statycznie, wyeksportuj `generateStaticParams` :

```typescript
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}
```

Układ główny generuje już statyczne parametry dla domyślnych ustawień regionalnych. Dodatkowe ustawienia regionalne są renderowane na żądanie.

## Dodawanie nowych tras API

### Podstawowa trasa REST

Twórz trasy API w `app/api/` . Postępuj zgodnie ze wzorem cienkich procedur obsługi, które delegują do usług:

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

### Dynamiczna trasa z parametrami

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

## Dodawanie nowych tabel bazy danych

### Krok 1: Zdefiniuj schemat

Dodaj swój stół do `lib/db/schema.ts` , zgodnie z istniejącymi wzorcami:

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

### Krok 2: Wygeneruj i zastosuj migrację

```bash
pnpm db:generate   # Creates a new SQL file in lib/db/migrations/
pnpm db:migrate    # Applies it to your database
```

### Krok 3: Utwórz definicje typów

Wyprowadź typy ze schematu, korzystając z wnioskowania Drizzle'a:

```typescript
// types/project.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { projects } from '@/lib/db/schema';

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
```

### Krok 4: Utwórz repozytorium

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

### Krok 5: Utwórz usługę

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

## Dodawanie niestandardowych haków

### Zaczep do pobierania danych w odpowiedzi na zapytanie

Utwórz hooki w katalogu `hooks/` zgodnie z istniejącą konwencją nazewnictwa ( `use-<resource>.ts` ):

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

Szablon posiada ponad 100 hooków w katalogu `hooks/` . Przeanalizuj istniejące zaczepy, takie jak `use-admin-items.ts` lub `use-favorites.ts` , pod kątem wzorców obejmujących paginację, optymistyczne aktualizacje i obsługę błędów.

## Dodawanie nowych sekcji administracyjnych

### Krok 1: Zdefiniuj uprawnienia

Aktualizacja `lib/permissions/definitions.ts` :

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

### Krok 2: Utwórz stronę administratora

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

System sprawdzania uprawnień w `lib/middleware/permission-check.ts` zapewnia pomocników:

```typescript
hasPermission(userPerms, 'projects:read')     // Single permission
hasAnyPermission(userPerms, [...])             // Any of multiple
hasAllPermissions(userPerms, [...])            // All of multiple
canManageResource(userPerms, 'projects')       // Create/update/delete
isSuperAdmin(userPerms)                        // Full access check
```

### Krok 3: Dodaj do nawigacji administratora

Dodaj swoją sekcję do paska bocznego administratora lub komponentu nawigacyjnego, aby pojawiła się w panelu administracyjnym.

## Dodawanie tłumaczeń

### Krok 1: Dodaj klucze do plików ustawień regionalnych

Dodaj klucze do `messages/en.json` i wszystkich innych plików ustawień regionalnych:

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

Szablon obsługuje 21 ustawień regionalnych. Dodaj klucze przynajmniej do `en.json` . Konfiguracja żądania w `i18n/request.ts` wykorzystuje `deepmerge` do łączenia komunikatów specyficznych dla ustawień regionalnych z domyślnymi angielskimi:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Brakujące klucze w ustawieniach regionalnych innych niż angielskie zostaną przywrócone do wartości angielskiej.

### Krok 2: Użyj w komponentach

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

## Lista kontrolna rozszerzenia

| Warstwa | Zadanie | Lokalizacja |
|-------|------|--------------|
| Schemat | Zdefiniuj tabelę | `lib/db/schema.ts` |
| Migracja | Wygeneruj SQL | `pnpm db:generate` |
| Typy | Typy TypeScriptu | `types/` |
| Repozytorium | Dostęp do danych | `lib/repositories/` |
| Usługa | Logika biznesowa | `lib/services/` |
| Walidacja | Schematy Zoda | `lib/validations/` |
| API | Punkty końcowe REST | `app/api/` |
| Haczyki | Pobieranie danych klienta | `hooks/` |
| Komponenty | Elementy interfejsu | `components/` |
| Strony | Strony tras | `app/[locale]/` |
| Administrator | Strona zarządzania | `app/[locale]/admin/` |
| Uprawnienia | RBAC | `lib/permissions/definitions.ts` |
| Tłumaczenia | i18n klucze | `messages/` |
| Zweryfikuj | Wpisz check i lint | `pnpm tsc --noEmit && pnpm lint` |

## Najlepsze praktyki

1. **Podążaj za istniejącymi wzorcami** — przestudiuj elementy, kategorie i użytkowników przed utworzeniem nowych funkcji
2. **Utrzymuj cienkie trasy** – sprawdź wprowadzone dane, wezwij serwis i zwróć odpowiedź
3. **Sprawdź za pomocą Zoda** — wszystkie zewnętrzne dane wejściowe przechodzą przez schematy Zoda
4. **Preferuj komponenty serwera** – dodawaj `"use client"` tylko wtedy, gdy wymagana jest interaktywność
5. **Użyj dynamicznego importu modułów serwera** – zapobiega problemom z pakowaniem pakietów internetowych w oprzyrządowaniu i zadaniach w tle
6. **Zatwierdź pliki migracji** — potrzebują ich inni programiści i CI
7. **Wpisz wszystko** – unikaj `any` ; wyprowadź typy ze schematu Drizzle z `InferSelectModel` 8. **Dodaj tłumaczenia** – nigdy nie koduj na stałe angielskich ciągów znaków w komponentach
