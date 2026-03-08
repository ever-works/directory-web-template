---
id: admin-dashboard-guide
title: "Admin Dashboard Architecture"
sidebar_label: "Admin Dashboard Architecture"
sidebar_position: 33
---

# Admin Dashboard Architecture

The admin dashboard provides a full content-management interface for directory owners. This guide documents the page structure, API layer, and component patterns used throughout the admin section.

## Route Structure

All admin pages live under `app/[locale]/admin/`. The `[locale]` segment enables internationalisation so the admin UI is available in every configured language.

### Page Map

| Route | Purpose |
|-------|---------|
| `/admin` | Main dashboard with stats overview |
| `/admin/items` | Manage directory items (approve, edit, bulk actions) |
| `/admin/categories` | Category CRUD with drag-and-drop reordering |
| `/admin/tags` | Tag management |
| `/admin/collections` | Curated item collections |
| `/admin/clients` | Client / user management |
| `/admin/clients/[id]` | Individual client detail view |
| `/admin/companies` | Company profile management |
| `/admin/comments` | Comment moderation |
| `/admin/reports` | Content reports and moderation queue |
| `/admin/roles` | Role and permission management |
| `/admin/users` | User administration |
| `/admin/featured-items` | Featured / promoted items |
| `/admin/sponsorships` | Sponsorship slot management |
| `/admin/surveys` | Survey builder |
| `/admin/surveys/create` | Create new survey |
| `/admin/surveys/[slug]/edit` | Edit existing survey |
| `/admin/surveys/[slug]/preview` | Survey preview |
| `/admin/surveys/[slug]/responses` | Survey response analytics |
| `/admin/settings` | Global site settings |
| `/admin/auth/signin` | Admin sign-in page |

## Dashboard Home Page

The entry point at `/admin` renders the `AdminDashboard` component from `components/admin`:

```tsx
// app/[locale]/admin/page.tsx
"use client";
import { AdminDashboard } from "@/components/admin";

export default function AdminPage() {
  return <AdminDashboard />;
}
```

The dashboard component fetches stats from the `GET /api/admin/dashboard/stats` endpoint and displays key metrics such as total items, pending submissions, user count, and recent activity.

## Admin API Endpoints

The admin API routes mirror the page structure. Each route is protected by session authentication and an `isAdmin` check.

### Items API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/items` | List items with pagination, filtering, and sorting |
| GET | `/api/admin/items/stats` | Aggregate item statistics |
| GET | `/api/admin/items/[id]` | Single item detail |
| PUT | `/api/admin/items/[id]` | Update item |
| POST | `/api/admin/items/[id]/review` | Approve or reject a submitted item |
| GET | `/api/admin/items/[id]/history` | Audit trail for item changes |
| POST | `/api/admin/items/bulk` | Bulk operations (approve, reject, delete) |

### Categories API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/categories` | List categories |
| GET | `/api/admin/categories/all` | All categories (unfiltered) |
| POST | `/api/admin/categories` | Create category |
| PUT | `/api/admin/categories/[id]` | Update category |
| DELETE | `/api/admin/categories/[id]` | Delete category |
| POST | `/api/admin/categories/reorder` | Reorder categories (drag-and-drop) |
| POST | `/api/admin/categories/git` | Sync categories from Git-based CMS |

### Clients API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/clients` | List clients with search and pagination |
| GET | `/api/admin/clients/stats` | Client aggregate statistics |
| GET | `/api/admin/clients/dashboard` | Client dashboard data |
| POST | `/api/admin/clients/advanced-search` | Advanced client search with filters |
| POST | `/api/admin/clients/bulk` | Bulk client operations |
| GET | `/api/admin/clients/[clientId]` | Individual client detail |
| PUT | `/api/admin/clients/[clientId]` | Update client |

### Additional Admin APIs

- **Collections:** CRUD at `/api/admin/collections` with item assignment via `/api/admin/collections/[id]/items`
- **Comments:** Moderation at `/api/admin/comments` and `/api/admin/comments/[id]`
- **Companies:** CRUD at `/api/admin/companies`
- **Featured Items:** Promote items at `/api/admin/featured-items`
- **Reports:** Content moderation at `/api/admin/reports` with stats at `/api/admin/reports/stats`
- **Roles:** RBAC management at `/api/admin/roles` with permissions at `/api/admin/roles/[id]/permissions`
- **Notifications:** Admin notification feed at `/api/admin/notifications`
- **Geo Analytics:** Location-based analytics at `/api/admin/geo-analytics`
- **Navigation:** Dynamic navigation config at `/api/admin/navigation`

## Client Detail Page Pattern

The clients section demonstrates the recommended component pattern for admin detail pages. The file tree for `/admin/clients/` is:

```
admin/clients/
  components/
    client-filters.tsx      -- search and filter controls
    client-modal.tsx        -- create/edit modal
    client-stats.tsx        -- aggregate stat cards
    clients-table.tsx       -- data table with pagination
    loading-skeleton.tsx    -- placeholder during data fetch
    page-header.tsx         -- breadcrumb and action buttons
  hooks/
    use-client-filters.ts   -- filter state hook
  utils/
    client-helpers.ts       -- formatting and transformation utilities
  page.tsx                  -- server component entry point
  [id]/
    client-detail-content.tsx -- detail view (client component)
    page.tsx                  -- server component wrapper
```

### Key Patterns

1. **Server entry, client content** -- `page.tsx` is a server component that checks auth and loads initial data, then delegates to a `"use client"` content component.
2. **Co-located hooks** -- page-specific hooks (like `use-client-filters`) live next to the page rather than in the global `hooks/` directory.
3. **Utility helpers** -- formatting and data-shaping functions sit in a `utils/` folder scoped to the feature.
4. **Loading skeletons** -- each admin page ships a dedicated skeleton for instant perceived performance.

## Authentication and Authorisation

Every admin API route follows the same guard pattern:

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
if (!session.user.isAdmin) {
  return NextResponse.json(
    { success: false, error: 'Forbidden' },
    { status: 403 }
  );
}
```

Pages check the session on the server before rendering. If the user is not an admin, they are redirected to the public site.

## Extending the Admin Dashboard

To add a new admin page:

1. Create a folder at `app/[locale]/admin/<feature>/`.
2. Add a `page.tsx` server component that checks auth.
3. Create a client content component alongside it.
4. Add the corresponding API route under `app/api/admin/<feature>/`.
5. Update the admin navigation config at `/api/admin/navigation` if the page should appear in the sidebar.

## Related Pages

- [Admin Dashboard Guide](../guides/admin-dashboard.md) -- operational guide for admins
- [Admin Components](../guides/admin-components.md) -- reusable UI building blocks
- [Admin Analytics](../features/admin-analytics.md) -- analytics deep dive
- [Admin Management](../features/admin-management.md) -- management features overview
- [Reports and Moderation](../features/reports-moderation.md) -- content moderation workflow
