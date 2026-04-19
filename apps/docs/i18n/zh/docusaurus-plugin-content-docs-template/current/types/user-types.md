---
id: user-types
title: 用户和配置文件类型定义
sidebar_label: 用户类型
sidebar_position: 2
---

# 用户和配置文件类型定义

**来源：** `lib/types/user.ts` 和 `lib/types/profile.ts`

这些模块定义了管理用户（身份验证和管理）和公共用户配置文件（显示和投资组合）的类型。

## 用户类型 (`user.ts`)

### 类型别名

#### `UserStatus`

```typescript
type UserStatus = 'active' | 'inactive';
```

### 接口

#### `AuthUserData`

仅身份验证用户数据存储在 `users` 表中。这是用于身份验证流程的最小用户表示。

```typescript
interface AuthUserData {
  id: string;
  email: string;
  username?: string;
  name?: string;
  title?: string;
  avatar?: string;
  role?: string;
  roleName?: string;
  status?: UserStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
```

#### `UserData`

完整的用户数据，包括来自 `clientProfiles` 的个人资料信息。这是整个管理仪表板中使用的完整用户表示。

```typescript
interface UserData {
  id: string;
  username: string;
  email: string;
  name: string;
  title?: string;
  avatar?: string;
  role: string;
  roleName?: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
}
```

**与`AuthUserData`的区别：** 在`UserData`、`username`、`name`、`role`、`status` 和`created_by` 都是必需的（非可选）。

#### `CreateUserRequest`

用于创建新管理员用户的有效负载。

```typescript
interface CreateUserRequest {
  username: string;
  email: string;
  name: string;
  title?: string;
  avatar?: string;
  role: string;
  password: string;
}
```

#### `UpdateUserRequest`

用于更新现有用户的有效负载。所有字段都是可选的。

```typescript
interface UpdateUserRequest {
  username?: string;
  email?: string;
  name?: string;
  title?: string;
  avatar?: string;
  role?: string;
  status?: UserStatus;
}
```

#### `AuthUserListResponse`

身份验证用户列表的分页响应。

```typescript
interface AuthUserListResponse {
  users: AuthUserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

#### `UserListResponse`

完整用户列表的分页响应。

```typescript
interface UserListResponse {
  users: UserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

#### `UserResponse`

单用户响应包装器。

```typescript
interface UserResponse {
  user: UserData;
}
```

#### `UserListOptions`

用于过滤和分页用户列表的查询参数。

```typescript
interface UserListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'username' | 'email' | 'role' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: UserStatus;
}
```

#### `UserWithCount`

扩展用户数据，带有可选的统计计数字段。

```typescript
interface UserWithCount extends UserData {
  count?: number;
}
```

### Zod 验证模式

#### `userValidationSchema`

用于创建用户的完整验证架构：

```typescript
const userValidationSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, hyphens, and underscores'),
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  title: z.string()
    .max(100, 'Title must be less than 100 characters')
    .optional(),
  role: z.string()
    .min(1, 'Role is required'),
  status: z.enum(['active', 'inactive']).optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, '
      + 'one uppercase letter, and one number'),
});
```

#### `updateUserValidationSchema`

更新的部分架构（不包括密码）：

```typescript
const updateUserValidationSchema = userValidationSchema
  .partial()
  .omit({ password: true });
```

### 验证常数

```typescript
const USER_VALIDATION = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  TITLE_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 8,
  AVATAR_MAX_SIZE: 2 * 1024 * 1024, // 2MB
  AVATAR_ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;
```

### 辅助函数

#### `isValidUserStatus`

将字符串缩小为 `UserStatus` 的类型保护：

```typescript
function isValidUserStatus(status: string): status is UserStatus {
  return status === 'active' || status === 'inactive';
}
```

#### `generateUserId`

为新用户生成 UUID：

```typescript
function generateUserId(): string {
  return crypto.randomUUID();
}
```

#### `formatDateForYaml`

将 `Date` 格式化为 YAML 兼容字符串 (`YYYY-MM-DD HH:mm`)：

```typescript
function formatDateForYaml(date: Date = new Date()): string;

// Example: formatDateForYaml(new Date('2025-03-15T10:30:00'))
// => "2025-03-15 10:30"
```

---

## Profile Types (`profile.ts`)

### `Profile`

Public-facing user profile structure used for the profile display page.

```typescript
interface Profile {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  location: string;
  company: string;
  jobTitle: string;
  website: string;
  socialLinks: Array<{
    platform: string;
    url: string;
    displayName: string;
  }>;
  skills: Array<{
    name: string;
    level: number;
  }>;
  interests: string[];
  portfolio: Array<{
    id: string;
    title: 字符串；
    description: string;
    imageUrl: string;
    externalUrl: string;
    tags: string[];
    isFeatured: boolean;
  }>;
  themeColor: string;
  isPublic: boolean;
  memberSince: string;
  submissions: Array<{
    id: string;
    title: 字符串；
    description: string;
    category: string;
    status: 'approved' | 'pending' | 'rejected';
    submittedAt: string;
    updatedAt: string;
    url: string;
    imageUrl?: string;
  }>;
}
```

**Nested types explained:**

- `socialLinks` - Links to external social platforms (GitHub, LinkedIn, Twitter, etc.)
- `skills` - Skill entries with a proficiency `level` (e.g., 1-5 or 1-100)
- `portfolio` - Showcase items with optional featured flag for prominent display
- `submissions` - Items submitted by this user, with their current review status

## Usage Examples

### Creating a user with validation

```typescript
import { userValidationSchema } from '@/lib/types/user';
import type { CreateUserRequest } from '@/lib/types/user';

const input: CreateUserRequest = {
  username: 'johndoe',
  email: 'john@example.com',
  name: 'John Doe',
  role: 'editor',
  password: 'SecurePass1',
};

const result = userValidationSchema.safeParse(input);
if (!result.success) {
  console.error(result.error.flatten());
}
```

### Filtering users

```typescript
import type { UserListOptions } from '@/lib/types/user';

const options: UserListOptions = {
  role: 'editor',
  status: 'active',
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
  limit: 25,
  search: 'john',
};
```

### Using the profile type

```typescript
import type { Profile } from '@/lib/types/profile';

function renderProfile(profile: Profile) {
  const visibleSkills = profile.skills
    .filter(s => s.level >= 3)
    .sort((a, b) => b.level - a.level);

  const featuredPortfolio = profile.portfolio
    .filter(p => p.isFeatured);

  return { visibleSkills, featuredPortfolio };
}
```

## Related Types

- [`RoleData`](./category-types.md) from `role.ts` defines the roles referenced in `UserData.role`
- [`ClientProfileWithAuth`](./user-types.md) from `lib/db/queries` is the database-level user profile representation
- [`Profile`](#profile) is the public-facing profile, while `UserData` is the admin-facing representation
