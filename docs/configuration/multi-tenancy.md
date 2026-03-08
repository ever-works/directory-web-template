---
id: multi-tenancy
title: Multi-Tenancy Configuration
sidebar_label: Multi-Tenancy
sidebar_position: 13
---

# Multi-Tenancy Configuration

This document explains how multi-tenant support works in the Ever Works Website Template.

## Overview

The template uses a **shared-database, row-level isolation** approach:
- A single PostgreSQL database serves multiple **tenants** (directory websites).
- Every table has a `tenant_id` column that scopes data to a specific tenant.
- All queries automatically filter by the current tenant — no cross-tenant data leaks.

## Quick Setup

### 1. Set the Environment Variable

In your deployment platform (Vercel, Docker, etc.) or `.env.local`:

```bash
TENANT_ID="your-unique-tenant-id"
```

This can be any unique string (e.g. a UUID or a readable slug like `"my-directory"`).

### 2. Deploy

On first startup, the application will:
1. Run database migrations (adds `tenant_id` column if not present)
2. Create a tenant row matching your `TENANT_ID` value
3. Migrate any existing NULL `tenant_id` data to your tenant
4. Seed default data (admin user, roles, permissions)

No manual SQL is needed — everything is automatic.

### 3. Verify

Check the server logs for:
```
[DB Init] Ensured environment tenant 'your-unique-tenant-id' exists
[Tenant Migration] ✓ users: updated 3 rows
[Tenant Migration] ✅ Migration complete: 15 total rows updated across all tables.
```

## How Tenant Resolution Works

When the application needs to determine the current tenant, it uses a **waterfall** strategy:

| Priority | Source | Description |
|----------|--------|-------------|
| 1 | **Session** | `user.tenantId` from the JWT token (authenticated users) |
| 2 | **Env Var** | `TENANT_ID` environment variable |
| 3 | **HTTP Header** | `x-tenant-domain` header (for subdomain routing) |
| 4 | **Database** | First active tenant row (ultimate fallback) |

The function `getTenantId()` from `lib/auth/tenant.ts` implements this chain and is called by every database query.

## Architecture

### Key Files

| File | Purpose |
|------|---------|
| `lib/auth/tenant.ts` | `getTenantId()` — server-side tenant resolution with caching |
| `lib/config/env.ts` | `TENANT_ID` environment variable validation |
| `lib/db/schema.ts` | Tenant table + `tenant_id` FK on all tables |
| `lib/db/initialize.ts` | Auto-creates env tenant + runs data migration on startup |
| `lib/db/migrate-tenant-data.ts` | Assigns NULL `tenant_id` rows to the current tenant |
| `lib/auth/index.ts` | JWT/session callbacks inject `tenantId` |
| `components/context/tenant-provider.tsx` | React context for client-side tenant access |
| `app/api/tenant/route.ts` | `GET /api/tenant` — returns current tenant info |

### Data Flow

```
User Request → getTenantId() → Resolve from session/env/headers/DB
                                         ↓
                              All DB queries filter by this tenant_id
                                         ↓
                              Only data for this tenant is returned
```

### Authentication Integration

- **Credentials login**: Admin and client users get their `tenantId` from their `users.tenant_id` column.
- **OAuth login**: The Drizzle adapter is wrapped to inject `tenantId` on user creation.
- **JWT callback**: Reads `tenantId` from the user record and embeds it in the token.
- **Session callback**: Propagates `tenantId` to `session.user.tenantId`.
- **Client components**: Use `useTenant()` hook from `TenantProvider` for tenant info.

## Multiple Directories (Multi-Tenant)

To run multiple directory websites on a single database:

1. **Each website** sets a different `TENANT_ID` in its environment:
   - Website A: `TENANT_ID="directory-a-uuid"`
   - Website B: `TENANT_ID="directory-b-uuid"`

2. **All websites** connect to the **same database** (`DATABASE_URL`).

3. **Data isolation** is automatic — Website A only sees rows where `tenant_id = 'directory-a-uuid'`.

4. **Users, roles, comments, subscriptions**, and all other data are completely isolated per tenant.

## Existing Data Handling

When upgrading from a non-tenant version:

- The `tenant_id` column is added as **nullable** (won't break existing data)
- On first startup, `migrateNullTenantIds()` automatically assigns NULL rows to the resolved tenant
- This migration is **idempotent** — safe to run multiple times
- After migration, all existing data is visible under the current tenant

## Subdomain Routing (Advanced)

For subdomain-based tenant routing (e.g. `tenant-a.example.com`):

1. Configure your reverse proxy to add the `x-tenant-domain` header
2. Create tenant records with the `domain` or `slug` fields set:
   ```sql
   INSERT INTO tenant (id, name, domain, slug, status)
   VALUES ('uuid', 'Tenant A', 'tenant-a.example.com', 'tenant-a', 'active');
   ```
3. The `resolveFromHeaders()` strategy will match the domain and resolve the tenant

## Tenant Table Schema

```sql
CREATE TABLE tenant (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  domain TEXT UNIQUE,
  slug TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'inactive'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```
