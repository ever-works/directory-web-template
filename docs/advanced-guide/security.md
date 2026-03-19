---
id: security
title: Security Hardening
sidebar_label: Security
sidebar_position: 6
---

# Security Hardening

The Ever Works Template includes multiple layers of security by default. This guide documents the built-in protections and provides recommendations for further hardening your production deployment.

## Security Headers

The template configures security headers globally in `next.config.ts` for all routes:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: "..." },
      ],
    },
  ];
},
```

### Header Breakdown

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing attacks |
| `X-Frame-Options` | `DENY` | Blocks the site from being embedded in iframes (clickjacking protection) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer information sent to external origins |
| `X-DNS-Prefetch-Control` | `on` | Enables DNS prefetching for performance |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforces HTTPS for ~2 years, covers all subdomains, eligible for HSTS preload list |
| `Content-Security-Policy` | See below | Restricts resource loading sources |

### Content Security Policy

The CSP is configured as:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https:;
frame-ancestors 'none';
```

| Directive | Value | Notes |
|---|---|---|
| `default-src` | `'self'` | Only allow resources from the same origin by default |
| `script-src` | `'self' 'unsafe-inline'` + LemonSqueezy | Required for inline scripts and payment widget |
| `style-src` | `'self' 'unsafe-inline'` | Required for CSS-in-JS and Tailwind |
| `img-src` | `'self' data: https:` | Allows images from same origin, data URIs, and any HTTPS source |
| `font-src` | `'self'` | Only self-hosted fonts |
| `connect-src` | `'self' https:` | API calls to same origin and any HTTPS endpoint |
| `frame-ancestors` | `'none'` | Prevents embedding in any iframe (equivalent to `X-Frame-Options: DENY`) |

### SVG Image Security

SVG images receive additional sandboxing:

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
},
```

SVGs are served as attachments with scripts completely disabled and sandboxed, preventing SVG-based XSS attacks.

### Additional Hardening

The `poweredByHeader` is disabled:

```typescript
poweredByHeader: false,
```

This removes the `X-Powered-By: Next.js` header, preventing technology fingerprinting.

## Authentication Security

### NextAuth.js Integration

The template uses NextAuth.js (Auth.js) for authentication. Key security features include:

- **JWT or database sessions** with configurable session strategy
- **CSRF protection** on all form submissions
- **Secure cookie configuration** with `httpOnly`, `secure`, and `sameSite` flags
- **Input validation** with Zod schemas on all form actions

### Validated Actions

Server actions are protected using validated action wrappers defined in `lib/auth/middleware.ts`:

```typescript
// Validate input with Zod before processing
export function validatedAction<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData);
  };
}

// Validate input AND require authentication
export function validatedActionWithUser<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("User is not authenticated");
    }
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData, session.user);
  };
}
```

**Always use `validatedActionWithUser`** for authenticated operations. This ensures both input validation and session verification occur before any business logic executes.

## RBAC Enforcement

The template includes a full Role-Based Access Control system in `lib/middleware/permission-check.ts`.

### Permission Format

Permissions follow a `resource:action` pattern:

```
items:read, items:create, items:update, items:delete
users:read, users:create, users:assignRoles
analytics:read, analytics:export
system:settings
```

### Permission Check Functions

| Function | Purpose | Example |
|---|---|---|
| `hasPermission` | Check single permission | `hasPermission(user, 'items:create')` |
| `hasAnyPermission` | Check if user has at least one | `hasAnyPermission(user, ['items:review', 'items:approve'])` |
| `hasAllPermissions` | Check if user has all listed | `hasAllPermissions(user, ['users:read', 'users:update'])` |
| `hasResourcePermission` | Check by resource + action strings | `hasResourcePermission(user, 'items', 'delete')` |
| `canManageResource` | Check create/update/delete | `canManageResource(user, 'categories')` |
| `canReviewItems` | Check item review permissions | `canReviewItems(user)` |
| `canManageUsers` | Check user management permissions | `canManageUsers(user)` |
| `canManageRoles` | Check role management permissions | `canManageRoles(user)` |
| `canViewAnalytics` | Check analytics access | `canViewAnalytics(user)` |
| `isSuperAdmin` | Check for super-admin role or all permissions | `isSuperAdmin(user)` |

### Using Permissions in API Routes

```typescript
import { hasPermission, UserPermissions } from '@/lib/middleware/permission-check';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userPerms: UserPermissions = {
    userId: session.user.id,
    roles: session.user.roles,
    permissions: session.user.permissions,
  };

  if (!hasPermission(userPerms, 'items:create')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with authorized logic
}
```

### Super Admin Detection

The `isSuperAdmin` function uses a dual approach for maximum security:

1. **Role check**: Checks if user has the `super-admin` role
2. **Permission fallback**: Verifies the user possesses every defined system permission

This ensures no partial permission set can accidentally grant super-admin access.

## Rate Limiting

### API Route Protection

Implement rate limiting for public-facing API routes to prevent abuse:

```typescript
// Example using a simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record || now > record.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;
  record.count++;
  return true;
}
```

For production deployments, consider using:
- **Vercel Edge Middleware** with `@vercel/edge` rate limiting
- **Upstash Redis** for distributed rate limiting across serverless instances
- **Cloudflare Rate Limiting** at the CDN layer

### Cron Endpoint Protection

Cron API endpoints should verify a shared secret to prevent unauthorized invocation:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Execute cron job
}
```

The `CRON_SECRET` is set via environment variables and configured during deployment (see the CI/CD pipeline's Vercel deployment workflow).

## Input Validation

### Zod Schema Validation

All form inputs and API payloads should be validated with Zod schemas:

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  url: z.string().url(),
  categoryId: z.string().uuid(),
});
```

### SQL Injection Prevention

The template uses Drizzle ORM for all database queries, which parameterizes all values automatically. Never construct raw SQL strings with user input.

### XSS Prevention

- Server Components render on the server and do not expose raw HTML to the client.
- All user-generated content should be escaped using React's built-in escaping (JSX automatically escapes strings).
- The CSP header blocks inline scripts from untrusted sources.

## Environment Variable Security

### Required Secrets

| Variable | Purpose | Generation |
|---|---|---|
| `AUTH_SECRET` | Signs JWT tokens and session cookies | `openssl rand -base64 32` |
| `COOKIE_SECRET` | Encrypts cookie values | `openssl rand -base64 32` |
| `CRON_SECRET` | Authenticates cron endpoint requests | `openssl rand -base64 32` |
| `DATABASE_URL` | Database connection string | Provided by database host |

### Best Practices

1. **Never commit secrets** to version control. Use `.env.local` for development and platform-level secrets for production.
2. **Rotate secrets regularly**, especially `AUTH_SECRET` and `COOKIE_SECRET`.
3. **Use separate secrets per environment** -- do not share production secrets with staging or development.
4. **Limit access** to production environment variables using your platform's RBAC (Vercel team roles, GitHub environment protection rules).

## Security Checklist for Production

| Category | Item | Status |
|---|---|---|
| **Headers** | All security headers configured in `next.config.ts` | Built-in |
| **Headers** | `poweredByHeader` disabled | Built-in |
| **Headers** | HSTS preload enabled with 2-year max-age | Built-in |
| **Auth** | `AUTH_SECRET` is a strong random value | Manual |
| **Auth** | Session cookies use `httpOnly`, `secure`, `sameSite` | Built-in |
| **Auth** | All server actions use `validatedActionWithUser` | Review |
| **RBAC** | Permissions checked on every protected route | Review |
| **RBAC** | Super-admin access requires explicit role assignment | Built-in |
| **Input** | Zod validation on all form inputs and API payloads | Review |
| **Input** | No raw SQL queries (Drizzle ORM only) | Review |
| **Cron** | Cron endpoints verify `CRON_SECRET` | Review |
| **Secrets** | All secrets rotated and environment-specific | Manual |
| **CSP** | Content Security Policy reviewed for production domains | Manual |
| **Deps** | CodeQL analysis runs weekly on the codebase | Built-in |
| **Deps** | Dependencies audited (`pnpm audit`) | Manual |

## Reporting Security Issues

If you discover a security vulnerability, report it privately:

- **Email**: security@ever.co
- **Do not** open a public GitHub issue for security vulnerabilities.
- Include reproduction steps and impact assessment when possible.
