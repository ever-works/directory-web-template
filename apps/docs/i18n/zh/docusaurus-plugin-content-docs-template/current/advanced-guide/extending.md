---
id: extending
title: 扩展模板
sidebar_label: 延伸
sidebar_position: 9
---

# 扩展模板

本指南介绍了如何使用新页面、API 路由、数据库表、自定义挂钩、管理部分和第三方集成来扩展 Ever Works 模板。每个扩展都遵循模板的分层架构。

## 扩展的项目架构

该模板使用严格的层分离：

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

**关键原则**：业务逻辑属于0或1，而不是组件或API 路由处理程序。

## 添加新页面

### 本地化页面

在 `app/[locale]/` 下创建页面以受益于自动区域设置路由：

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

0 处的布局自动将每个页面换行为：

- 1 用于客户端翻译
- 2 用于功能标志和配置
- 3 主题、React Query 和 HeroUI
- SEO元数据和结构化数据

### 静态参数生成

对于应静态生成的页面，导出4：

```typescript
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}
```

根布局已经为默认区域设置生成静态参数。其他区域设置按需呈现。

## 添加新的 API 路由

### 基本休息路线

在 0 中创建 API 路由。遵循委托给服务的瘦处理程序的模式：

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

### 带参数的动态路由

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

## 添加新的数据库表

### 第 1 步：定义架构

按照现有模式将您的表添加到 0：

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

### 第 2 步：生成并应用迁移

```bash
pnpm db:generate   # Creates a new SQL file in lib/db/migrations/
pnpm db:migrate    # Applies it to your database
```

### 步骤 3：创建类型定义

使用 Drizzle 的推理从架构中派生类型：

```typescript
// types/project.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { projects } from '@/lib/db/schema';

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
```

### 步骤 4：创建存储库

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

### 第 5 步：创建服务

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

## 添加自定义钩子

### React 查询数据获取钩子

按照现有命名约定 ( `use-<resource>.ts` ) 在 0 目录中创建挂钩：

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

该模板在 0 目录中有 100 多个挂钩。研究现有的钩子（如 1 或 2），以了解分页、乐观更新和错误处理等模式。

## 添加新的管理部分

### 第 1 步：定义权限

更新3：

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

### 第 2 步：创建管理页面

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

0中的权限检查系统提供了帮助：

```typescript
hasPermission(userPerms, 'projects:read')     // Single permission
hasAnyPermission(userPerms, [...])             // Any of multiple
hasAllPermissions(userPerms, [...])            // All of multiple
canManageResource(userPerms, 'projects')       // Create/update/delete
isSuperAdmin(userPerms)                        // Full access check
```

### 第 3 步：添加到管理导航

将您的部分添加到管理侧边栏或导航组件，以便它显示在管理仪表板中。

## 添加翻译

### 第 1 步：将密钥添加到区域设置文件

将密钥添加到 `messages/en.json` 和所有其他语言环境文件：

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

该模板支持 21 个区域设置。至少将键添加到0。 1 中的请求配置使用 2 将语言环境特定消息与英语默认值合并：

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

非英语语言环境中缺少的键将回退到英语值。

### 步骤 2：在组件中使用

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

## 扩展清单

|层 |任务|地点 |
|--------|------|----------|
|架构|定义表| 0 |
|移民|生成 SQL | 1 |
|类型 | TypeScript 类型 | 2 |
|存储库 |数据访问| 3 |
|服务 |业务逻辑| 4 |
|验证 | Zod 模式 | 5 |
|应用程序接口 | REST 端点 | 6 |
|挂钩|客户端数据获取 | 7 |
|组件|用户界面元素 | 8 |
|页数 |路线页面 | 9 |
|管理员 |管理页面| 10 |
|权限 |角色控制 | 11 |
|翻译 | i18n 键 | 12 |
|验证 |类型检查和 lint | 13 |

## 最佳实践

1. **遵循现有模式**——在创建新功能之前研究项目、类别和用户
2. **保持路由精简**——验证输入、调用服务、返回响应
3. **使用 Zod 验证**——所有外部输入都经过 Zod 模式
4. **首选服务器组件** - 仅在需要交互时添加14
5. **对服务器模块使用动态导入**——防止检测和后台作业中的 webpack 捆绑问题
6. **提交迁移文件**——其他开发人员和 CI 需要它们
7. **输入所有内容** -- 避免 15；从 Drizzle 模式派生类型 16
8. **添加翻译**——永远不要在组件中硬编码英文字符串
