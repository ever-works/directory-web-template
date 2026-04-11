---
id: extending
title: Расширение шаблона
sidebar_label: Расширение
sidebar_position: 9
---

# Расширение шаблона

В этом руководстве рассказывается, как расширить шаблон Ever Works новыми страницами, маршрутами API, таблицами базы данных, настраиваемыми перехватчиками, разделами администрирования и сторонними интеграциями. Каждое расширение соответствует многоуровневой архитектуре шаблона.

## Архитектура проекта для расширений

В шаблоне используется строгое разделение слоев:

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

**Основной принцип**: Бизнес-логика принадлежит `lib/services/` или `lib/repositories/` , а не компонентам или обработчикам маршрутов API.

## Добавление новых страниц

### Локализованная страница

Создайте страницы под `app/[locale]/` , чтобы воспользоваться автоматической маршрутизацией локали:

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

Макет `app/[locale]/layout.tsx` автоматически оборачивает каждую страницу:

- `NextIntlClientProvider` для переводов на стороне клиента
- `SettingsProvider` для флагов функций и конфигурации
- `Providers` для темы, React Query и HeroUI.
- Метаданные SEO и структурированные данные

### Генерация статических параметров

Для страниц, которые должны быть сгенерированы статически, экспортируйте `generateStaticParams` :

```typescript
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}
```

Корневой макет уже генерирует статические параметры для локали по умолчанию. Дополнительные локали отображаются по требованию.

## Добавление новых маршрутов API

### Базовый маршрут REST

Создайте маршруты API в `app/api/` . Следуйте шаблону тонких обработчиков, делегирующих услуги:

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

### Динамический маршрут с параметрами

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

## Добавление новых таблиц базы данных

### Шаг 1. Определите схему

Добавьте свою таблицу в `lib/db/schema.ts` , следуя существующим шаблонам:

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

### Шаг 2. Создайте и примените миграцию

```bash
pnpm db:generate   # Creates a new SQL file in lib/db/migrations/
pnpm db:migrate    # Applies it to your database
```

### Шаг 3. Создайте определения типов

Получайте типы из схемы, используя вывод Дриззла:

```typescript
// types/project.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { projects } from '@/lib/db/schema';

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
```

### Шаг 4. Создайте репозиторий

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

### Шаг 5. Создайте службу

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

## Добавление пользовательских хуков

### Перехватчик получения данных запроса React

Создайте перехватчики в каталоге `hooks/` , следуя существующему соглашению об именах ( `use-<resource>.ts` ):

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

Шаблон содержит более 100 хуков в каталоге `hooks/` . Изучите существующие перехватчики, такие как `use-admin-items.ts` или `use-favorites.ts` , на предмет шаблонов, включая нумерацию страниц, оптимистические обновления и обработку ошибок.

## Добавление новых разделов администратора

### Шаг 1. Определите разрешения

Обновление `lib/permissions/definitions.ts` :

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

### Шаг 2. Создайте страницу администратора

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

Система проверки разрешений в `lib/middleware/permission-check.ts` предоставляет помощников:

```typescript
hasPermission(userPerms, 'projects:read')     // Single permission
hasAnyPermission(userPerms, [...])             // Any of multiple
hasAllPermissions(userPerms, [...])            // All of multiple
canManageResource(userPerms, 'projects')       // Create/update/delete
isSuperAdmin(userPerms)                        // Full access check
```

### Шаг 3. Добавьте в панель администратора

Добавьте свой раздел на боковую панель администратора или в компонент навигации, чтобы он отображался на панели администратора.

## Добавление переводов

### Шаг 1. Добавьте ключи в файлы локали

Добавьте ключи в `messages/en.json` и все остальные файлы локали:

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

Шаблон поддерживает 21 локаль. Как минимум, добавьте ключи к `en.json` . Конфигурация запроса в `i18n/request.ts` использует `deepmerge` для объединения сообщений, специфичных для локали, с английскими значениями по умолчанию:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Отсутствующие ключи в неанглийских локалях будут возвращены к английским значениям.

### Шаг 2: Использование в компонентах

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

## Контрольный список расширений

| Слой | Задача | Местоположение |
|-------|------|----------|
| Схема | Определить таблицу | `lib/db/schema.ts` |
| Миграция | Генерировать SQL | `pnpm db:generate` |
| Типы | Типы TypeScript | `types/` |
| Репозиторий | Доступ к данным | `lib/repositories/` |
| Сервис | Бизнес-логика | `lib/services/` |
| Проверка | Схемы Зода | `lib/validations/` |
| API | Конечные точки REST | `app/api/` |
| Крючки | Получение данных клиента | `hooks/` |
| Компоненты | элементы пользовательского интерфейса | `components/` |
| Страницы | Страницы маршрутов | `app/[locale]/` |
| Админ | Страница управления | `app/[locale]/admin/` |
| Разрешения | РБАК | `lib/permissions/definitions.ts` |
| Переводы | ключи i18n | `messages/` |
| Проверить | Проверка типа и проверка | `pnpm tsc --noEmit && pnpm lint` |

## Лучшие практики

1. **Следуйте существующим шаблонам** — изучайте элементы, категории и пользователей, прежде чем создавать новые функции.
2. **Сохраняйте тонкие маршруты** — проверка введенных данных, вызов службы, возврат ответа.
3. **Проверка с помощью Zod** — все внешние входные данные проходят через схемы Zod.
4. **Предпочитайте серверные компоненты** — добавляйте `"use client"` только тогда, когда необходима интерактивность.
5. **Используйте динамический импорт для серверных модулей** — предотвращает проблемы с объединением веб-пакетов при инструментировании и фоновых заданиях.
6. **Зафиксировать файлы миграции** — они нужны другим разработчикам и CI.
7. **Введите все** – избегайте `any` ; получать типы из схемы Drizzle с помощью `InferSelectModel` 8. **Добавляйте переводы** – никогда не кодируйте жестко английские строки в компонентах.
