---
id: security-config
title: "Конфигурация Безопасности"
sidebar_label: "Конф. безопасности"
sidebar_position: 5
---

# Конфигурация Безопасности

Шаблон реализует стратегию безопасности «глубокой эшелонированной защиты» с контролем доступа на основе разрешений, валидацией входных данных, безопасными ответами на ошибки и санитизацией URL. Это руководство документирует каждый уровень безопасности и способы его настройки.

## Система Разрешений

Шаблон использует гранулярную модель разрешений ресурс-действие, определённую в `lib/permissions/definitions.ts` и применяемую через `lib/middleware/permission-check.ts`.

### Формат Разрешений

Разрешения следуют формату `resource:action`:

```
items:read
items:create
items:update
items:delete
items:review
items:approve
items:reject
categories:read
categories:create
users:assignRoles
analytics:read
system:settings
```

### Функции Проверки Разрешений

Middleware разрешений в `lib/middleware/permission-check.ts` предоставляет обширный набор вспомогательных функций авторизации:

```ts
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasResourcePermission,
  canManageResource,
  canReviewItems,
  canManageUsers,
  canManageRoles,
  canViewAnalytics,
  isSuperAdmin
} from '@/lib/middleware/permission-check';

// Check a single permission
hasPermission(userPermissions, 'items:create');

// Check if user has ANY of the given permissions
hasAnyPermission(userPermissions, ['items:review', 'items:approve']);

// Check if user has ALL of the given permissions
hasAllPermissions(userPermissions, ['items:read', 'items:update']);

// Check a resource:action pair (with validation)
hasResourcePermission(userPermissions, 'items', 'delete');

// Get all permissions for a resource
const itemPerms = getResourcePermissions(userPermissions, 'items');
// e.g., ['items:read', 'items:create', 'items:update']

// Check if user can manage (create/update/delete) a resource
canManageResource(userPermissions, 'categories');
```

### Интерфейс UserPermissions

```ts
interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Permission[];
}
```

### Проверки Для Конкретных Ролей

```ts
// Check if user can review items (review, approve, or reject)
canReviewItems(userPermissions);

// Check if user can manage users
canManageUsers(userPermissions);

// Check if user can manage roles
canManageRoles(userPermissions);

// Check if user can view analytics
canViewAnalytics(userPermissions);
```

### Обнаружение Супер-Администратора

Функция `isSuperAdmin` проверяет два условия:

1. Пользователь имеет роль `'super-admin'` (предпочтительно), ИЛИ
2. Пользователь обладает всеми системными разрешениями (запасной вариант)

```ts
export function isSuperAdmin(userPermissions: UserPermissions): boolean {
  if (userPermissions.roles.includes('super-admin')) {
    return true;
  }
  // Fallback: check if user has ALL system permissions
  const allPermissions: Permission[] = [
    'items:read', 'items:create', 'items:update', 'items:delete',
    'items:review', 'items:approve', 'items:reject',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'tags:read', 'tags:create', 'tags:update', 'tags:delete',
    'roles:read', 'roles:create', 'roles:update', 'roles:delete',
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:assignRoles',
    'analytics:read', 'analytics:export',
    'system:settings'
  ];
  return hasAllPermissions(userPermissions, allPermissions);
}
```

### Валидация Разрешений

```ts
// Validate a permission string is recognized
validatePermission('items:read'); // true
validatePermission('invalid:perm'); // false

// Parse a permission into resource and action
parsePermission('items:create');
// Returns: { resource: 'items', action: 'create' }

// Get a summary grouped by resource
getPermissionSummary(userPermissions);
// Returns: { items: ['read', 'create'], categories: ['read'], ... }
```

## Защита Маршрутов API

Маршруты API используют аутентификацию на основе сессий с проверкой роли администратора:

```ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  // Proceed with authorized logic...
}
```

## Валидация Входных Данных

Шаблон повсеместно использует схемы Zod для валидации входных данных:

```ts
import { z } from 'zod';

const createNotificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  userId: z.string().min(1),
  data: z.record(z.unknown()).optional(),
});

// In API route
const body = await request.json();
const parsed = createNotificationSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
}
```

## Очистка URL

Модуль редактора включает очистку URL в `lib/editor/utils/utils.ts`:

```ts
export function isAllowedUri(uri: string | undefined, protocols?: ProtocolConfig): boolean {
  const allowedProtocols = [
    "http", "https", "ftp", "ftps", "mailto", "tel",
    "callto", "sms", "cid", "xmpp"
  ];
  // Validates URI against whitelist and strips ATTR_WHITESPACE
  // ...
}

export function sanitizeUrl(inputUrl: string, baseUrl: string, protocols?: ProtocolConfig): string {
  try {
    const url = new URL(inputUrl, baseUrl);
    if (isAllowedUri(url.href, protocols)) return url.href;
  } catch { /* invalid URL */ }
  return "#";
}
```

Это предотвращает встраивание `javascript:` и других опасных протоколов URL в содержимое редактора.

## Защита от Загрязнения Прототипа

`ConfigManager` защищает от загрязнения прототипа при обновлении вложенных ключей конфигурации:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

async updateNestedKey(keyPath: string, value: any): Promise<boolean> {
  const keys = keyPath.split('.');
  for (const key of keys) {
    if (this.isPrototypePollutingKey(key)) {
      return false; // Silently reject
    }
  }
  // ...
}
```

## Безопасность Cookie

Конфигурация cookie валидируется с помощью схемы Zod:

```ts
const cookieConfigSchema = z.object({
  secret: z.string().optional(),
  domain: z.string().default('localhost'),
  secure: z.boolean().default(false),
});
```

Для продакшена установите:

```bash
COOKIE_SECRET=<random-32-byte-base64>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

## Заголовки Безопасности Next.js

Файл `next.config.ts` настраивает заголовки безопасности. Распространённые заголовки для установки:

| Заголовок | Назначение |
|-----------|-----------|
| `X-Frame-Options` | Предотвращение clickjacking |
| `X-Content-Type-Options` | Предотвращение MIME type sniffing |
| `Referrer-Policy` | Управление информацией referrer |
| `X-XSS-Protection` | Включение XSS-фильтрации браузера |
| `Strict-Transport-Security` | Принудительное использование HTTPS |
| `Permissions-Policy` | Ограничение функций браузера |

## Безопасность Переменных Окружения

Система конфигурации гарантирует, что чувствительные переменные доступны только на стороне сервера:

```ts
// lib/config/config-service.ts
import 'server-only';  // Prevents importing in client bundles
```

Переменные с префиксом `NEXT_PUBLIC_` доступны клиенту. Все остальные (секретные ключи, URL баз данных, токены API) остаются исключительно на стороне сервера:

- `STRIPE_SECRET_KEY` -- только на стороне сервера
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -- безопасно для клиента
- `DATABASE_URL` -- только на стороне сервера
- `AUTH_SECRET` -- только на стороне сервера

## Лучшие Практики

1. **Всегда валидировать входные данные** с помощью схем Zod перед обработкой
2. **Проверять аутентификацию** в начале каждого обработчика маршрута API
3. **Использовать проверки разрешений** для управления доступом на основе ролей
4. **Санитизировать URL** перед встраиванием в контент
5. **Хранить секреты только на стороне сервера** используя защиту импорта `server-only`
6. **Устанавливать `COOKIE_SECURE=true`** в продакшене
7. **Использовать надёжные секреты** для `AUTH_SECRET` и `COOKIE_SECRET` (минимум 32 байта base64)
8. **Проверять модель разрешений** при добавлении новых ресурсов или действий

## Связанные Файлы

| Путь | Описание |
|------|----------|
| `lib/middleware/permission-check.ts` | Функции применения разрешений |
| `lib/permissions/definitions.ts` | Определения разрешений и ролей |
| `lib/config/config-service.ts` | Синглтон конфигурации только для сервера |
| `lib/config/schemas/auth.schema.ts` | Схемы конфигурации auth/cookie |
| `lib/editor/utils/utils.ts` | Утилиты санитизации URL |
| `lib/config-manager.ts` | YAML-менеджер конфигурации с защитой от загрязнения прототипа |
| `auth.config.ts` | Конфигурация NextAuth |
| `next.config.ts` | Заголовки безопасности и CSP |
