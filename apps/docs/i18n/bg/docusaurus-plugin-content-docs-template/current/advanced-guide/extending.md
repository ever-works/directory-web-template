---
id: extending
title: Разширяване на шаблона
sidebar_label: Удължаване
sidebar_position: 9
---

# Разширяване на шаблона

Това ръководство описва как да разширите шаблона Ever Works с нови страници, API маршрути, таблици на бази данни, персонализирани кукички, администраторски секции и интеграции на трети страни. Всяко разширение следва многослойната архитектура на шаблона.

## Архитектура на проекта за разширения

Шаблонът използва стриктно разделяне на слоевете:

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

**Ключов принцип**: Бизнес логиката принадлежи към `lib/services/` или `lib/repositories/` , а не в компоненти или API манипулатори на маршрути.

## Добавяне на нови страници

### Локализирана страница

Създайте страници под `app/[locale]/` , за да се възползвате от автоматичното локално маршрутизиране:

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

Оформлението на `app/[locale]/layout.tsx` автоматично обвива всяка страница с:

- `NextIntlClientProvider` за преводи от страна на клиента
- `SettingsProvider` за флагове на функции и конфигурация
- `Providers` за тема, React Query и HeroUI
- SEO метаданни и структурирани данни

### Генериране на статични параметри

За страници, които трябва да бъдат статично генерирани, експортирайте `generateStaticParams` :

```typescript
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}
```

Основното оформление вече генерира статични параметри за локала по подразбиране. Допълнителните локали се изобразяват при поискване.

## Добавяне на нови API маршрути

### Основен REST маршрут

Създайте API маршрути в `app/api/` . Следвайте модела на тънки манипулатори, които делегират на услуги:

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

### Динамичен маршрут с параметри

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

## Добавяне на нови таблици в база данни

### Стъпка 1: Дефинирайте схемата

Добавете вашата таблица към `lib/db/schema.ts` , като следвате съществуващите модели:

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

### Стъпка 2: Генерирайте и приложете миграция

```bash
pnpm db:generate   # Creates a new SQL file in lib/db/migrations/
pnpm db:migrate    # Applies it to your database
```

### Стъпка 3: Създайте дефиниции на типове

Извлечете типове от схемата, като използвате извода на Drizzle:

```typescript
// types/project.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { projects } from '@/lib/db/schema';

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
```

### Стъпка 4: Създайте хранилище

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

### Стъпка 5: Създайте услуга

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

## Добавяне на персонализирани кукички

### Кука за извличане на данни от заявка за реакция

Създайте кукички в директорията `hooks/` , като следвате съществуващата конвенция за именуване ( `use-<resource>.ts` ):

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

Шаблонът има над 100 кукички в директорията `hooks/` . Проучете съществуващите кукички като `use-admin-items.ts` или `use-favorites.ts` за модели, включително пагинация, оптимистични актуализации и обработка на грешки.

## Добавяне на нови администраторски секции

### Стъпка 1: Дефиниране на разрешения

Актуализация `lib/permissions/definitions.ts` :

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

### Стъпка 2: Създайте страницата на администратора

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

Системата за проверка на разрешения в `lib/middleware/permission-check.ts` предоставя помощници:

```typescript
hasPermission(userPerms, 'projects:read')     // Single permission
hasAnyPermission(userPerms, [...])             // Any of multiple
hasAllPermissions(userPerms, [...])            // All of multiple
canManageResource(userPerms, 'projects')       // Create/update/delete
isSuperAdmin(userPerms)                        // Full access check
```

### Стъпка 3: Добавяне към администраторската навигация

Добавете раздела си към страничната лента на администратора или компонента за навигация, така че да се показва в таблото за управление на администратора.

## Добавяне на преводи

### Стъпка 1: Добавете ключове към локалните файлове

Добавете ключове към `messages/en.json` и всички други локални файлове:

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

Шаблонът поддържа 21 локализации. Най-малко добавете ключове към `en.json` . Конфигурацията на заявката в `i18n/request.ts` използва `deepmerge` за сливане на специфични за локала съобщения с английски по подразбиране:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Липсващите ключове в неанглийски локали ще се върнат към английската стойност.

### Стъпка 2: Използвайте в компоненти

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

## Контролен списък за разширение

| Слой | Задача | Местоположение |
|-------|------|----------|
| Схема | Дефиниране на таблица | `lib/db/schema.ts` |
| Миграция | Генериране на SQL | `pnpm db:generate` |
| Видове | TypeScript типове | `types/` |
| Хранилище | Достъп до данни | `lib/repositories/` |
| Обслужване | Бизнес логика | `lib/services/` |
| Валидиране | Схеми на Zod | `lib/validations/` |
| API | REST крайни точки | `app/api/` |
| Куки | Извличане на клиентски данни | `hooks/` |
| Компоненти | Елементи на потребителския интерфейс | `components/` |
| Страници | Страници на маршрута | `app/[locale]/` |
| Администратор | Страница за управление | `app/[locale]/admin/` |
| Разрешения | RBAC | `lib/permissions/definitions.ts` |
| Преводи | i18n ключове | `messages/` |
| Потвърдете | Проверка на типа и мъх | `pnpm tsc --noEmit && pnpm lint` |

## Най-добри практики

1. **Следвайте съществуващи модели** -- изучавайте елементи, категории и потребители, преди да създадете нови функции
2. **Поддържайте тънки маршрути** -- потвърдете въвеждането, обадете се на услуга, върнете отговор
3. **Потвърдете със Zod** -- всички външни данни минават през Zod схеми
4. **Предпочитайте сървърни компоненти** -- добавете `"use client"` само когато е необходима интерактивност
5. **Използване на динамично импортиране за сървърни модули** -- предотвратява проблеми с групирането на уебпакети в инструментариум и фонови задания
6. **Файлове за мигриране** - други разработчици и CI имат нужда от тях
7. **Въведете всичко** -- избягвайте `any` ; извлича типове от Drizzle схема с `InferSelectModel` 8. **Добавете преводи** -- никога не кодирайте английски низове в компоненти
