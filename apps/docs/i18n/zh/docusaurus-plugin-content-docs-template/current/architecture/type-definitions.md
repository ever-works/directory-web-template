---
id: type-definitions
title: 类型系统概述
sidebar_label: 类型定义
sidebar_position: 41
---

# 类型系统概述

该模板将其 TypeScript 类型定义集中在 `template/lib/types/` 中。该目录包含跨存储库、服务和 API 路由使用的接口、类型别名、Zod 验证模式和请求/响应 DTO。

**源码目录：** `template/lib/types/`

---

## Directory Listing

| File | Purpose |
|------|---------|
| `item.ts` | Item data model, create/update/review requests, list options, status types |
| `user.ts` | Authentication user data, create/update requests, Zod validation schemas, list options |
| `role.ts` | Role data model, create/update requests, list options, role-with-count type |
| `tag.ts` | Tag data model, create/update requests, paginated list response |
| `category.ts` | Category data model with count, create/update requests, validation constants, list options |
| `comment.ts` | Comment data structures |
| `vote.ts` | Vote data structures |
| `client.ts` | Client profile types |
| `client-item.ts` | Client-facing item types |
| `profile.ts` | User profile types |
| `survey.ts` | Survey data structures |
| `location.ts` | Location/geography types |
| `sponsor-ad.ts` | Sponsor and advertisement types |
| `twenty-crm-config.types.ts` | Twenty CRM integration configuration types |
| `twenty-crm-entities.types.ts` | Twenty CRM entity model types |
| `twenty-crm-errors.types.ts` | Twenty CRM error handling types |
| `twenty-crm-sync.types.ts` | Twenty CRM synchronization types |

---

## 核心域类型

### 项目类型 (`item.ts`)

项目类型系统是最广泛的，涵盖目录列表的整个生命周期。

**关键类型：**

- **`ItemData`** -- 主要项目数据模型，包含`id`、`name`、`slug`、`description`、`source_url`、`status`、`category`、 `tags`、`collections`、`submitted_by`、`submitted_at`、`deleted_at` 等
- **`CreateItemRequest`** -- 用于创建项目的 DTO；需要 `id`、`name`、`slug`、`description`、`source_url`
- **`UpdateItemRequest`** -- 用于项目更新的部分 DTO；所有字段可选
- **`ReviewRequest`** -- 包含`status`（`'approved'` 或`'rejected'`）和可选`review_notes`
- **`ItemListOptions`** -- 过滤和分页选项：`status`、`categories`、`tags`、`submittedBy`、`search`、`includeDeleted`、`sortBy`、`sortOrder`

### 用户类型 (`user.ts`)

具有 Zod 验证模式的身份验证级别用户类型。

**关键类型：**

- **`AuthUserData`** -- 表示经过身份验证的用户记录（id、电子邮件、created_at 等）
- **`CreateUserRequest`** -- 用于创建用户的电子邮件和密码
- **`UpdateUserRequest`** -- 部分更新字段
- **`UserListOptions`** -- 分页和过滤选项
- **`AuthUserListResponse`** -- 分页响应`users`、`total`、`page`、`limit`、`totalPages`
- **`userValidationSchema`** -- 用于完整用户创建验证的 Zod 模式
- **`updateUserValidationSchema`** -- 用于部分用户更新验证的 Zod 架构

### 角色类型 (`role.ts`)

RBAC 系统的角色数据类型。

**关键类型：**

- **`RoleData`** -- 带有`id`、`name`、`description`、`permissions`、`isDefault`、`status`、时间戳的角色记录
- **`CreateRoleRequest`** -- 创建新角色所需的字段
- **`UpdateRoleRequest`** -- 部分角色更新
- **`RoleListOptions`** -- 过滤选项，包括`status`、搜索和分页
- **`RoleWithCount`** -- 将 `RoleData` 扩展为 `userCount` 用于管理显示

### 标签类型 (`tag.ts`)

标签/标签系统的标签数据类型。

**关键类型：**

- **`TagData`** -- 带有`id`、`name` 和可选元数据的标签记录
- **`CreateTagRequest`** -- 需要 `id` 和 `name`
- **`UpdateTagRequest`** -- 部分标签更新
- **`TagListResponse`** -- 带`tags`、`total`、`page`、`limit`、`totalPages` 的分页标签列表

### 类别类型 (`category.ts`)

组织分类的类别数据类型。

**关键类型：**

- **`CategoryData`** -- 带有`id`、`name`、`description` 和元数据的类别记录
- **`CategoryWithCount`** -- 使用项目计数扩展 `CategoryData`
- **`CreateCategoryRequest`** -- 需要`id`、`name`，可选`description`
- **`UpdateCategoryRequest`** -- 部分类别更新（需要`id`）
- **`CategoryListOptions`** -- 过滤、排序和分页选项
- **`CATEGORY_VALIDATION`** -- 用于字段长度验证的常量（名称最小值/最大值、描述最大值、ID 约束）

---

## Integration Types

### Twenty CRM Types

Four files define the type system for the Twenty CRM integration:

| File | Contents |
|------|----------|
| `twenty-crm-config.types.ts` | Configuration types for CRM connection settings |
| `twenty-crm-entities.types.ts` | Entity models mapping to CRM objects |
| `twenty-crm-errors.types.ts` | Error types for CRM API error handling |
| `twenty-crm-sync.types.ts` | Synchronization state and operation types |

---

## 类型模式约定

### 请求/响应 DTO

代码库遵循数据传输对象的一致模式：

- **`Create[Entity]Request`** -- 包含创建所需的所有字段
- **`Update[Entity]Request`** -- 部分类型，其中大多数字段都是可选的；通常需要`id`
- **`[Entity]ListOptions`** -- 过滤、排序和分页参数
- **`[Entity]ListResponse`** -- 分页响应`items`、`total`、`page`、`limit`、`totalPages`

### 验证模式

Zod 模式与其相应的类型位于同一位置：

```ts
// In user.ts
export const userValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // ...
});
```

在执行突变之前，存储库在这些模式上使用 `.parse()` 或 `.pick()`。

### 验证常数

对于 Git 支持的实体（类别、集合），验证常量导出为普通对象：

```ts
export const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  // ...
};
```

这些在存储库验证方法中引用。

---

## Type Relationships

```
ItemData
  ├── references CategoryData (via category field)
  ├── references TagData (via tags field)
  ├── references Collection (via collections field)
  └── referenced by ClientDashboardRepository

AuthUserData
  ├── references RoleData (via role assignments)
  └── referenced by UserRepository

RoleData
  ├── contains Permission[] (from permissions/definitions)
  └── referenced by RoleRepository

CategoryData
  └── referenced by items (category field)

TagData
  └── referenced by items (tags field)
```

---

## 使用指南

1. **始终从 `@/lib/types/` 导入类型，而不是在组件或 API 路由中重新声明它们
2. **使用请求 DTO** 进行 API 处理程序输入验证，而不是完整的数据模型
3. **在可用的情况下使用 Zod 模式**（用户类型）进行运行时验证
4. **使用验证常量**（类别、集合）在前端和后端之间实现一致的字段约束
5. **仅当您需要不属于共享层的特定于组件的派生类型时才在本地扩展类型

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/*.ts` | Consumers of these types for data access |
| `lib/services/*.ts` | Business logic that transforms between these types |
| `lib/permissions/definitions.ts` | Permission type definitions (separate from this directory) |
| `lib/guards/plan-features.guard.ts` | Feature type definitions (in guards, not types directory) |
| `app/api/**` | API routes that accept request DTOs and return response types |
