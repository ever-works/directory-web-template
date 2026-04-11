---
id: extending
title: הרחבת התבנית
sidebar_label: מַאֲרִיך
sidebar_position: 9
---

# הרחבת התבנית

מדריך זה מכסה כיצד להרחיב את תבנית Ever Works עם דפים חדשים, מסלולי API, טבלאות מסד נתונים, ווים מותאמים אישית, קטעי ניהול ואינטגרציות של צד שלישי. כל הרחבה עוקבת אחר ארכיטקטורת השכבות של התבנית.

## ארכיטקטורת פרויקט עבור הרחבות

התבנית משתמשת בהפרדת שכבות קפדנית:

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

**עקרון מפתח**: ההיגיון העסקי שייך ל- `lib/services/` או `lib/repositories/` , לא לרכיבים או למטפלי נתיב API.

## הוספת דפים חדשים

### דף מקומי

צור דפים תחת `app/[locale]/` כדי ליהנות מניתוב מקומי אוטומטי:

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

הפריסה ב- `app/[locale]/layout.tsx` עוטפת כל עמוד באופן אוטומטי עם:

- `NextIntlClientProvider` לתרגומים בצד הלקוח
- `SettingsProvider` עבור דגלי תכונה ותצורה
- `Providers` עבור ערכת נושא, React Query ו-HeroUI
- מטא נתונים של SEO ונתונים מובנים

### יצירת פרמטרים סטטיים

עבור דפים שאמורים להיווצר באופן סטטי, ייצא את `generateStaticParams` :

```typescript
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}
```

פריסת השורש כבר מייצרת פרמטרים סטטיים עבור אזור ברירת המחדל. אזורים נוספים מוצגים לפי דרישה.

## הוספת נתיבי API חדשים

### מסלול REST בסיסי

צור מסלולי API ב- `app/api/` . עקוב אחר הדפוס של מטפלים דקים המחלקים לשירותים:

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

### מסלול דינמי עם פרמטרים

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

## הוספת טבלאות מסד נתונים חדשות

### שלב 1: הגדר את הסכימה

הוסף את הטבלה שלך ל- `lib/db/schema.ts` , בעקבות הדפוסים הקיימים:

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

### שלב 2: צור והחל הגירה

```bash
pnpm db:generate   # Creates a new SQL file in lib/db/migrations/
pnpm db:migrate    # Applies it to your database
```

### שלב 3: צור הגדרות סוג

הגזר טיפוסים מהסכמה באמצעות ההסקה של טפטוף:

```typescript
// types/project.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { projects } from '@/lib/db/schema';

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
```

### שלב 4: צור מאגר

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

### שלב 5: צור שירות

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

## הוספת ווים מותאמים אישית

### הוק לאחזור נתונים של שאילתת תגובה

צור הוקס בספרייה `hooks/` בהתאם למוסכמות השמות הקיימת ( `use-<resource>.ts` ):

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

לתבנית יש יותר מ-100 ווים בספרייה `hooks/` . למד ווים קיימים כמו `use-admin-items.ts` או `use-favorites.ts` עבור תבניות כולל עימוד, עדכונים אופטימיים וטיפול בשגיאות.

## הוספת קטעי ניהול חדשים

### שלב 1: הגדר הרשאות

עדכון `lib/permissions/definitions.ts` :

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

### שלב 2: צור את דף הניהול

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

מערכת בדיקת ההרשאות ב- `lib/middleware/permission-check.ts` מספקת עוזרים:

```typescript
hasPermission(userPerms, 'projects:read')     // Single permission
hasAnyPermission(userPerms, [...])             // Any of multiple
hasAllPermissions(userPerms, [...])            // All of multiple
canManageResource(userPerms, 'projects')       // Create/update/delete
isSuperAdmin(userPerms)                        // Full access check
```

### שלב 3: הוסף לניווט מנהל מערכת

הוסף את הקטע שלך לסרגל הצד של מנהל המערכת או לרכיב הניווט כך שיופיע בלוח המחוונים של מנהל המערכת.

## הוספת תרגומים

### שלב 1: הוסף מפתחות לקבצי Locale

הוסף מפתחות ל- `messages/en.json` ולכל שאר קבצי המקום:

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

התבנית תומכת ב-21 מקומות. לכל הפחות, הוסף מפתחות ל- `en.json` . תצורת הבקשה ב- `i18n/request.ts` משתמשת ב- `deepmerge` כדי למזג הודעות ספציפיות לאזור עם ברירות מחדל באנגלית:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

מפתחות חסרים במקומות שאינם באנגלית יחזרו לערך האנגלי.

### שלב 2: השתמש ברכיבים

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

## רשימת הרחבות

| שכבה | משימה | מיקום |
|-------|------|--------|
| סכימה | הגדר טבלה | `lib/db/schema.ts` |
| הגירה | צור SQL | `pnpm db:generate` |
| סוגים | סוגי TypeScript | `types/` |
| מאגר | גישה לנתונים | `lib/repositories/` |
| שירות | היגיון עסקי | `lib/services/` |
| אימות | סכימות Zod | `lib/validations/` |
| API | נקודות קצה REST | `app/api/` |
| ווים | מאחזר נתוני לקוח | `hooks/` |
| רכיבים | רכיבי ממשק משתמש | `components/` |
| דפים | דפי מסלול | `app/[locale]/` |
| אדמין | דף ניהול | `app/[locale]/admin/` |
| הרשאות | RBAC | `lib/permissions/definitions.ts` |
| תרגומים | מפתחות i18n | `messages/` |
| אמת | הקלד סימון ומוך | `pnpm tsc --noEmit && pnpm lint` |

## שיטות עבודה מומלצות

1. **עקוב אחר דפוסים קיימים** -- למד פריטים, קטגוריות ומשתמשים לפני יצירת תכונות חדשות
2. **שמור על מסלולים דקים** -- אימות קלט, התקשר לשירות, החזרת תגובה
3. **אמת עם Zod** -- כל הקלט החיצוני עובר דרך סכימות Zod
4. **העדפה רכיבי שרת** - הוסף רק `"use client"` כאשר יש צורך באינטראקטיביות
5. **השתמש בייבוא דינמי עבור מודולי שרת** -- מונע בעיות של חבילת חבילות אינטרנט במכשור ובעבודות רקע
6. **תחייב קבצי הגירה** -- מפתחים אחרים ו-CI זקוקים להם
7. **הקלד הכל** -- הימנעו מ- `any` ; גוזרים טיפוסים מסכימת טפטוף עם `InferSelectModel` 8. **הוסף תרגומים** -- לעולם אל קוד קשיח מחרוזות באנגלית ברכיבים
