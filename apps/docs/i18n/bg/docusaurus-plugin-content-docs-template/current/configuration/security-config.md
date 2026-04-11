---
id: security-config
title: "Конфигурация за Сигурност"
sidebar_label: "Конф. за сигурност"
sidebar_position: 5
---

# Конфигурация за Сигурност

Шаблонът реализира стратегия за сигурност на дълбочина с контрол на достъпа, базиран на разрешения, валидиране на входни данни, безопасни отговори при грешки и почистване на URL адреси. Това ръководство документира всеки слой на сигурност и как да го конфигурирате.

## Система за Разрешения

Шаблонът използва гранулиран модел за разрешения ресурс-действие, дефиниран в `lib/permissions/definitions.ts` и прилаган чрез `lib/middleware/permission-check.ts`.

### Формат на Разрешенията

Разрешенията следват формата `resource:action`:

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

### Функции за Проверка на Разрешения

Middleware за разрешения в `lib/middleware/permission-check.ts` предоставя обширен набор от помощници за оторизация:

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

### Проверки Специфични за Роля

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

### Откриване на Супер Администратор

Функцията `isSuperAdmin` проверява две условия:

1. Потребителят има роля `'super-admin'` (предпочитано), ИЛИ
2. Потребителят притежава всяко системно разрешение (резервен вариант)

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

### Валидация на Разрешенията

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

## Защита на API Маршрути

API маршрутите използват удостоверяване, базирано на сесии, с проверки на роля на администратор:

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

## Валидация на Входни Данни

Шаблонът използва Zod схеми навсякъде за валидиране на входни данни:

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

## Почистване на URL

Модулът на редактора включва почистване на URL адреси в `lib/editor/utils/utils.ts`:

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

Това предотвратява вграждането на `javascript:` и други опасни URL протоколи в съдържанието на редактора.

## Защита от Замърсяване на Прототип

`ConfigManager` предпазва от замърсяване на прототипа при актуализиране на вложени конфигурационни ключове:

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

## Сигурност на Бисквитките

Конфигурацията на бисквитките се валидира чрез Zod схема:

```ts
const cookieConfigSchema = z.object({
  secret: z.string().optional(),
  domain: z.string().default('localhost'),
  secure: z.boolean().default(false),
});
```

За продукционна среда задайте:

```bash
COOKIE_SECRET=<random-32-byte-base64>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

## Заглавия за Сигурност в Next.js

Файлът `next.config.ts` конфигурира заглавия за сигурност. Често използвани заглавия:

| Заглавие | Цел |
|----------|-----|
| `X-Frame-Options` | Предотвратяване на clickjacking |
| `X-Content-Type-Options` | Предотвратяване на MIME type sniffing |
| `Referrer-Policy` | Контрол на информацията за препращащия |
| `X-XSS-Protection` | Активиране на XSS филтриране в браузъра |
| `Strict-Transport-Security` | Принудително използване на HTTPS |
| `Permissions-Policy` | Ограничаване на функциите на браузъра |

## Сигурност на Променливите на Средата

Системата за конфигурация осигурява, че чувствителните променливи са само на страната на сървъра:

```ts
// lib/config/config-service.ts
import 'server-only';  // Prevents importing in client bundles
```

Променливите с префикс `NEXT_PUBLIC_` са достъпни за клиента. Всички останали (тайни ключове, URL адреси на бази данни, API токени) остават изключително на страната на сървъра:

- `STRIPE_SECRET_KEY` -- само на страната на сървъра
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -- безопасно за клиента
- `DATABASE_URL` -- само на страната на сървъра
- `AUTH_SECRET` -- само на страната на сървъра

## Най-добри Практики

1. **Винаги валидирайте входните данни** със Zod схеми преди обработка
2. **Проверявайте удостоверяването** в началото на всеки обработчик на API маршрут
3. **Използвайте проверки за разрешения** за контрол на достъпа, базиран на роля
4. **Почиствайте URL адресите** преди вграждането им в съдържание
5. **Пазете тайните само на страната на сървъра** като използвате защита за импортиране `server-only`
6. **Задавайте `COOKIE_SECURE=true`** в продукция
7. **Използвайте силни тайни** за `AUTH_SECRET` и `COOKIE_SECRET` (минимум 32 байта base64)
8. **Преглеждайте модела на разрешенията** при добавяне на нови ресурси или действия

## Свързани Файлове

| Път | Описание |
|-----|---------|
| `lib/middleware/permission-check.ts` | Функции за прилагане на разрешения |
| `lib/permissions/definitions.ts` | Дефиниции на разрешения и роли |
| `lib/config/config-service.ts` | Синглтон на конфигурацията само за сървъра |
| `lib/config/schemas/auth.schema.ts` | Схеми за конфигурация на auth/cookie |
| `lib/editor/utils/utils.ts` | Помощни програми за почистване на URL |
| `lib/config-manager.ts` | YAML мениджър на конфигурацията със защита от замърсяване на прототипа |
| `auth.config.ts` | Конфигурация на NextAuth |
| `next.config.ts` | Заглавия за сигурност и CSP |
