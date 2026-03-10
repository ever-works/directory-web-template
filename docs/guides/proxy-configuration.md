---
id: proxy-configuration
title: Middleware and Proxy Configuration
sidebar_label: Proxy Configuration
sidebar_position: 26
---

# Middleware and Proxy Configuration

This page documents the unified middleware in `proxy.ts`, which handles locale routing, authentication guards, route protection, and request proxying for the template.

## Overview

The `proxy.ts` file at the project root serves as the Next.js middleware. It combines internationalization (i18n) routing with authentication guards that support NextAuth, Supabase, or both providers simultaneously. The middleware protects admin routes, client dashboard routes, and manages authenticated user redirects.

## File Structure

```ts
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth/config";
import { updateSession as supabaseUpdate } from "@/lib/auth/supabase/middleware";
import { getToken } from "next-auth/jwt";
import { createSafeCallbackUrl } from "@/lib/auth/validate-callback-url";

const intl = createIntlMiddleware(routing);

const ADMIN_PREFIX = "/admin";
const ADMIN_SIGNIN = "/admin/auth/signin";
```

## Route Matching

The middleware applies to all routes except static assets, API routes, and Next.js internals:

```ts
export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
```

This regex excludes:
- `/api/*` -- API route handlers
- `/trpc/*` -- tRPC endpoints
- `/_next/*` -- Next.js internal assets
- `/_vercel/*` -- Vercel platform routes
- Any path with a file extension (e.g., `.js`, `.css`, `.png`)

## Locale Resolution

The middleware starts by resolving the locale prefix from the URL:

```ts
function resolveLocalePrefix(pathname: string): {
  prefix: string;
  hasLocale: boolean;
  locale?: string;
  pathWithoutLocale: string;
} {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  const hasLocale = routing.locales.includes(
    maybeLocale as any
  );
  const pathWithoutLocale = hasLocale
    ? `/${segments.slice(1).join("/")}`
    : pathname;
  return {
    prefix: hasLocale ? `/${maybeLocale}` : "",
    hasLocale,
    locale: hasLocale ? maybeLocale : undefined,
    pathWithoutLocale,
  };
}
```

For a URL like `/fr/admin/dashboard`, this returns:
- `prefix`: `"/fr"`
- `hasLocale`: `true`
- `locale`: `"fr"`
- `pathWithoutLocale`: `"/admin/dashboard"`

## Authentication Provider Detection

The middleware reads the auth provider configuration at runtime:

```ts
export default async function proxy(req: NextRequest) {
  const cfg = getAuthConfig();
  // cfg.provider is "next-auth" | "supabase" | "both"
  // ...
}
```

This allows the same middleware to handle different authentication backends depending on your project configuration.

## Protected Route Types

The middleware protects three categories of routes.

### Admin Routes (`/admin/*`)

All routes under `/admin` (except the sign-in page) require admin-level authentication:

```ts
if (
  pathWithoutLocale.startsWith(ADMIN_PREFIX) &&
  pathWithoutLocale !== ADMIN_SIGNIN
) {
  if (cfg.provider === "supabase") {
    return supabaseGuard(req, intlResponse);
  } else if (cfg.provider === "next-auth") {
    return nextAuthGuard(req, intlResponse);
  } else if (cfg.provider === "both") {
    // Try NextAuth first, fall back to Supabase
    const nextAuthRes = await nextAuthGuard(
      req,
      intlResponse
    );
    const isRedirect =
      nextAuthRes.redirected ||
      (nextAuthRes.status >= 300 && nextAuthRes.status < 400);
    if (!isRedirect) return nextAuthRes;
    return supabaseGuard(req, intlResponse);
  }
}
```

**NextAuth admin check:** Verifies the JWT token contains `isAdmin === true`.

**Supabase admin check:** Reads `user_metadata.isAdmin` or `user_metadata.role === 'admin'` from the Supabase user object.

### Client Routes (`/client/*`)

Client dashboard routes require basic authentication (any logged-in user). Admin users are automatically redirected to `/admin`:

```ts
if (
  pathWithoutLocale === "/client" ||
  pathWithoutLocale.startsWith("/client/")
) {
  if (cfg.provider === "next-auth") {
    const authRedirect = await nextAuthClientGuard(
      req,
      intlResponse
    );
    if (authRedirect) return authRedirect;

    // Redirect admins to /admin
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
    });
    if (token?.isAdmin === true) {
      const url = req.nextUrl.clone();
      url.pathname = `${localePrefix}/admin`;
      return NextResponse.redirect(url);
    }
  }
  // Similar logic for supabase and both providers...
}
```

### Auth Routes (`/auth/*`)

Already-authenticated users visiting sign-in or registration pages are redirected to their appropriate dashboard:

- Admin users go to `/admin`
- Regular users go to `/client/dashboard`

```ts
if (pathWithoutLocale.startsWith("/auth/")) {
  if (cfg.provider === "next-auth") {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
    });
    if (token) {
      const target = token.isAdmin
        ? "/admin"
        : "/client/dashboard";
      const url = req.nextUrl.clone();
      url.pathname = `${localePrefix}${target}`;
      return NextResponse.redirect(url);
    }
  }
  // Similar for supabase and both...
}
```

## Guard Functions

### `nextAuthGuard`

Checks JWT token for admin status using `next-auth/jwt`:

```ts
async function nextAuthGuard(
  req: NextRequest,
  baseRes: NextResponse
): Promise<NextResponse> {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });
  if (token?.isAdmin === true) {
    return baseRes; // Allow access
  }
  // Redirect to admin sign-in
}
```

### `nextAuthClientGuard`

Checks if the user has any valid token (not necessarily admin):

```ts
async function nextAuthClientGuard(
  req: NextRequest,
  baseRes: NextResponse
): Promise<NextResponse | null> {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });
  if (token) return null; // null means "allow access"
  // Redirect to sign-in
}
```

### `supabaseGuard` and `supabaseClientGuard`

Similar to the NextAuth guards but use Supabase server client to check authentication state and user metadata.

## Callback URL Safety

All redirect responses use `createSafeCallbackUrl` to prevent open redirect vulnerabilities:

```ts
url.searchParams.set(
  "callbackUrl",
  createSafeCallbackUrl(
    req.nextUrl.pathname,
    req.nextUrl.search
  )
);
```

This function validates and sanitizes the callback URL before embedding it in the redirect, ensuring users cannot be redirected to external malicious sites after authentication.

## Cookie Preservation

When the middleware creates redirect responses, it preserves cookies from the internationalization response:

```ts
const redirectRes = NextResponse.redirect(url);
baseRes.cookies
  .getAll()
  .forEach((c) => redirectRes.cookies.set(c));
return redirectRes;
```

This ensures locale preferences and session cookies survive the redirect chain.

## Dual Provider Mode

When `cfg.provider === "both"`, the middleware implements a cascading authentication check:

1. **Try NextAuth first** -- Check for a valid JWT token
2. **Fall back to Supabase** -- If NextAuth denies access, check Supabase session
3. **Redirect if neither succeeds** -- Send to the sign-in page

This allows organizations to gradually migrate between authentication providers without disrupting existing users.

## Request Flow Diagram

```
Incoming Request
  |
  +-- Match route pattern? No --> Skip middleware
  |
  +-- Apply i18n middleware (locale detection/redirect)
  |
  +-- Resolve locale prefix and path
  |
  +-- Is /client/* route?
  |     +-- Check authentication (provider-specific)
  |     +-- Redirect admins to /admin
  |     +-- Redirect unauthenticated to /auth/signin
  |
  +-- Is /admin/* route (not signin)?
  |     +-- Check admin authentication
  |     +-- Redirect non-admins to /admin/auth/signin
  |
  +-- Is /auth/* route?
  |     +-- Redirect authenticated users to dashboard
  |
  +-- Return i18n response (default)
```

## Related Resources

- [Auth Config Reference](/template/configuration/auth-config-reference) -- NextAuth provider setup
- [Provider Configuration](/template/configuration/provider-config) -- Choosing auth providers
- [Security Configuration](/template/configuration/security-config) -- Security headers and CSP
