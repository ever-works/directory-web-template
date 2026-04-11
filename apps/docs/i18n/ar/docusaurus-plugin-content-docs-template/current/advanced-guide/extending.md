---
id: extending
title: توسيع القالب
sidebar_label: تمديد
sidebar_position: 9
---

# تمديد القالب

يغطي هذا الدليل كيفية توسيع قالب Ever Works بصفحات جديدة، ومسارات واجهة برمجة التطبيقات (API)، وجداول قاعدة البيانات، والربطات المخصصة، وأقسام الإدارة، وعمليات تكامل الجهات الخارجية. يتبع كل ملحق بنية الطبقات للقالب.

## هندسة المشروع للملحقات

يستخدم القالب فصل طبقة صارم:

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

**المبدأ الأساسي**: ينتمي منطق الأعمال إلى `lib/services/` أو `lib/repositories/` ، وليس إلى المكونات أو معالجات مسار API.

## إضافة صفحات جديدة

### صفحة مترجمة

قم بإنشاء صفحات ضمن `app/[locale]/` للاستفادة من التوجيه المحلي التلقائي:

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

يقوم التخطيط عند `app/[locale]/layout.tsx` بالتفاف كل صفحة تلقائيًا باستخدام:

- 1- للترجمات من جانب العميل
- `SettingsProvider` لأعلام الميزات والتكوين
- `Providers` للموضوع، React Query، وHeroUI
- البيانات الوصفية لكبار المسئولين الاقتصاديين والبيانات المنظمة

### إنشاء المعلمات الثابتة

بالنسبة للصفحات التي يجب إنشاؤها بشكل ثابت، قم بالتصدير 4:

```typescript
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}
```

يقوم تخطيط الجذر بالفعل بإنشاء معلمات ثابتة للغة الافتراضية. يتم تقديم لغات إضافية عند الطلب.

## إضافة مسارات API جديدة

### طريق الراحة الأساسي

إنشاء مسارات API في `app/api/` . اتبع نمط المعالجات الرفيعة التي تفوض الخدمات:

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

### مسار ديناميكي مع المعلمات

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

## إضافة جداول قاعدة بيانات جديدة

### الخطوة 1: تحديد المخطط

أضف جدولك إلى `lib/db/schema.ts` ، باتباع الأنماط الموجودة:

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

### الخطوة 2: إنشاء الترحيل وتطبيقه

```bash
pnpm db:generate   # Creates a new SQL file in lib/db/migrations/
pnpm db:migrate    # Applies it to your database
```

### الخطوة 3: إنشاء تعريفات النوع

اشتق الأنواع من المخطط باستخدام استنتاج Drizzle:

```typescript
// types/project.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { projects } from '@/lib/db/schema';

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
```

### الخطوة 4: إنشاء مستودع

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

### الخطوة 5: إنشاء خدمة

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

## إضافة خطافات مخصصة

### خطاف جلب بيانات الاستعلام React

قم بإنشاء خطافات في الدليل `hooks/` باتباع اصطلاح التسمية الموجود ( `use-<resource>.ts` ):

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

يحتوي القالب على أكثر من 100 خطاف في الدليل 0. قم بدراسة الخطافات الموجودة مثل `use-admin-items.ts` أو `use-favorites.ts` للأنماط بما في ذلك ترقيم الصفحات والتحديثات المتفائلة ومعالجة الأخطاء.

## إضافة أقسام إدارية جديدة

### الخطوة 1: تحديد الأذونات

التحديث 3:

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

### الخطوة 2: إنشاء صفحة المسؤول

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

يوفر نظام التحقق من الأذونات في `lib/middleware/permission-check.ts` مساعدين:

```typescript
hasPermission(userPerms, 'projects:read')     // Single permission
hasAnyPermission(userPerms, [...])             // Any of multiple
hasAllPermissions(userPerms, [...])            // All of multiple
canManageResource(userPerms, 'projects')       // Create/update/delete
isSuperAdmin(userPerms)                        // Full access check
```

### الخطوة 3: إضافة إلى التنقل الإداري

أضف القسم الخاص بك إلى الشريط الجانبي للمسؤول أو مكون التنقل حتى يظهر في لوحة تحكم المشرف.

## إضافة الترجمات

### الخطوة 1: إضافة مفاتيح إلى الملفات المحلية

أضف مفاتيح إلى `messages/en.json` وجميع الملفات المحلية الأخرى:

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

يدعم القالب 21 لغة. على الأقل، قم بإضافة مفاتيح إلى `en.json` . يستخدم تكوين الطلب في 1 2 لدمج الرسائل الخاصة بالإعدادات المحلية مع الإعدادات الافتراضية باللغة الإنجليزية:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

ستعود المفاتيح المفقودة في اللغات غير الإنجليزية إلى القيمة الإنجليزية.

### الخطوة 2: الاستخدام في المكونات

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

## قائمة التحقق من الامتداد

| طبقة | مهمة | الموقع |
|-------|------|----------|
| المخطط | تحديد الجدول | `lib/db/schema.ts` |
| الهجرة | توليد SQL | `pnpm db:generate` |
| أنواع | أنواع TypeScript | `types/` |
| المستودع | الوصول إلى البيانات | `lib/repositories/` |
| الخدمة | منطق الأعمال | 4ـ |
| التحقق من الصحة | مخططات زود | 5 ــ |
| واجهة برمجة التطبيقات | نقاط النهاية REST | 6ـ |
| خطاف | جلب بيانات العميل | `hooks/` |
| المكونات | عناصر واجهة المستخدم | 8ـ |
| الصفحات | صفحات الطريق | `app/[locale]/` |
| المشرف | صفحة الإدارة | `app/[locale]/admin/` |
| أذونات | ارباك | `lib/permissions/definitions.ts` |
| الترجمات | مفاتيح i18n | ‹‹١٢› |
| تحقق | نوع الاختيار والوبر | 13 ــ |

## أفضل الممارسات

1. **اتبع الأنماط الموجودة** - ادرس العناصر والفئات والمستخدمين قبل إنشاء ميزات جديدة
2. **حافظ على المسارات رفيعة** - التحقق من صحة الإدخال، والاتصال بالخدمة، وإرجاع الاستجابة
3. **التحقق باستخدام Zod** - تمر جميع المدخلات الخارجية عبر مخططات Zod
4. **تفضيل مكونات الخادم** - أضف 14 فقط عند الحاجة إلى التفاعل
5. **استخدام الواردات الديناميكية لوحدات الخادم** - يمنع مشكلات تجميع حزمة الويب في الأجهزة ومهام الخلفية
6. **تنفيذ ملفات الترحيل** - يحتاجها المطورون الآخرون وCI
7. **اكتب كل شيء** -- تجنب 15; اشتقاق الأنواع من مخطط Drizzle بـ 16
8. **أضف ترجمات** - لا تقم أبدًا بترميز السلاسل الإنجليزية في المكونات
