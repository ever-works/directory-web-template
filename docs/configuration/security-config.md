---
id: security-config
title: "Security Configuration"
sidebar_label: "Security Config"
sidebar_position: 5
---

# Security Configuration

The template implements a defense-in-depth security strategy with permission-based access control, input validation, safe error responses, and URL sanitization. This guide documents every security layer and how to configure it.

## Permission System

The template uses a granular, resource-action permission model defined in `lib/permissions/definitions.ts` and enforced through `lib/middleware/permission-check.ts`.

### Permission Format

Permissions follow a `resource:action` format:

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

### Permission Check Functions

The permission middleware at `lib/middleware/permission-check.ts` provides a comprehensive set of authorization helpers:

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

### UserPermissions Interface

```ts
interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Permission[];
}
```

### Role-Specific Checks

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

### Super Admin Detection

The `isSuperAdmin` function checks two conditions:

1. The user has the `'super-admin'` role (preferred), OR
2. The user possesses every system permission (fallback)

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

### Permission Validation

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

## API Route Protection

API routes use session-based authentication with admin role checks:

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

## Input Validation

The template uses Zod schemas throughout for input validation:

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

## URL Sanitization

The editor module includes URL sanitization in `lib/editor/utils/utils.ts`:

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

This prevents `javascript:` and other dangerous protocol URLs from being embedded in editor content.

## Prototype Pollution Protection

The `ConfigManager` guards against prototype pollution when updating nested configuration keys:

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

## Cookie Security

Cookie configuration is validated via Zod schema:

```ts
const cookieConfigSchema = z.object({
  secret: z.string().optional(),
  domain: z.string().default('localhost'),
  secure: z.boolean().default(false),
});
```

For production, set:

```bash
COOKIE_SECRET=<random-32-byte-base64>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

## Next.js Security Headers

The `next.config.ts` file configures security headers. Common headers to set:

| Header | Purpose |
|--------|---------|
| `X-Frame-Options` | Prevent clickjacking |
| `X-Content-Type-Options` | Prevent MIME type sniffing |
| `Referrer-Policy` | Control referrer information |
| `X-XSS-Protection` | Enable browser XSS filtering |
| `Strict-Transport-Security` | Enforce HTTPS |
| `Permissions-Policy` | Restrict browser features |

## Environment Variable Security

The config system ensures sensitive variables are server-only:

```ts
// lib/config/config-service.ts
import 'server-only';  // Prevents importing in client bundles
```

Variables prefixed with `NEXT_PUBLIC_` are exposed to the client. All others (secret keys, database URLs, API tokens) remain server-side only:

- `STRIPE_SECRET_KEY` -- server only
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -- safe for client
- `DATABASE_URL` -- server only
- `AUTH_SECRET` -- server only

## Best Practices

1. **Always validate input** with Zod schemas before processing
2. **Check authentication** at the top of every API route handler
3. **Use permission checks** for role-based access control
4. **Sanitize URLs** before embedding them in content
5. **Keep secrets server-only** using the `server-only` import guard
6. **Set `COOKIE_SECURE=true`** in production
7. **Use strong secrets** for `AUTH_SECRET` and `COOKIE_SECRET` (minimum 32 bytes base64)
8. **Review the permission model** when adding new resources or actions

## Related Files

| Path | Description |
|------|-------------|
| `lib/middleware/permission-check.ts` | Permission enforcement functions |
| `lib/permissions/definitions.ts` | Permission and role definitions |
| `lib/config/config-service.ts` | Server-only config singleton |
| `lib/config/schemas/auth.schema.ts` | Auth/cookie configuration schemas |
| `lib/editor/utils/utils.ts` | URL sanitization utilities |
| `lib/config-manager.ts` | Config YAML manager with prototype pollution guard |
| `auth.config.ts` | NextAuth configuration |
| `next.config.ts` | Security headers and CSP |
