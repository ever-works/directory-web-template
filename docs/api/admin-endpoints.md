---
id: admin-endpoints
title: Admin API Endpoints
sidebar_label: Admin Endpoints
sidebar_position: 1
---

# Admin API Endpoints

The admin API contains approximately 60 route handlers across 19 resource groups. All admin endpoints are protected by the `withAdminAuth` middleware, which verifies both authentication and admin role assignment via database query.

## Authentication

Every admin endpoint requires:

1. A valid JWT session (checked via `auth()`)
2. An admin role in the `user_roles` table (checked via `isAdmin()` from `lib/db/roles.ts`)

Unauthenticated requests receive a `401` response. Authenticated but non-admin requests receive a `403` response.

## Resource Groups

### Categories (`/api/admin/categories`)

Manage content categories with Git-based persistence.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/categories` | List categories with pagination |
| `POST` | `/api/admin/categories` | Create a new category |
| `GET` | `/api/admin/categories/all` | Get all categories (no pagination) |
| `POST` | `/api/admin/categories/git` | Sync categories with Git repository |
| `POST` | `/api/admin/categories/reorder` | Reorder category positions |
| `GET` | `/api/admin/categories/[id]` | Get category by ID |
| `PUT` | `/api/admin/categories/[id]` | Update category |
| `DELETE` | `/api/admin/categories/[id]` | Delete category |

### Clients (`/api/admin/clients`)

Manage client user accounts and profiles.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/clients` | List client profiles with pagination |
| `POST` | `/api/admin/clients/advanced-search` | Advanced client search with filters |
| `POST` | `/api/admin/clients/bulk` | Bulk operations on clients |
| `GET` | `/api/admin/clients/dashboard` | Client dashboard statistics |
| `GET` | `/api/admin/clients/stats` | Client aggregate statistics |
| `GET` | `/api/admin/clients/[clientId]` | Get client profile details |
| `PUT` | `/api/admin/clients/[clientId]` | Update client profile |
| `DELETE` | `/api/admin/clients/[clientId]` | Delete client account |

### Collections (`/api/admin/collections`)

Manage curated item collections.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/collections` | List all collections |
| `POST` | `/api/admin/collections` | Create a new collection |
| `GET` | `/api/admin/collections/[id]` | Get collection details |
| `PUT` | `/api/admin/collections/[id]` | Update collection |
| `DELETE` | `/api/admin/collections/[id]` | Delete collection |
| `GET` | `/api/admin/collections/[id]/items` | List items in a collection |
| `PUT` | `/api/admin/collections/[id]/items` | Update collection items |

### Comments (`/api/admin/comments`)

Moderate user comments.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/comments` | List comments with moderation filters |
| `GET` | `/api/admin/comments/[id]` | Get comment details |
| `PUT` | `/api/admin/comments/[id]` | Update comment (approve/reject) |
| `DELETE` | `/api/admin/comments/[id]` | Delete comment |

### Companies (`/api/admin/companies`)

Manage company profiles linked to items.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/companies` | List companies |
| `POST` | `/api/admin/companies` | Create company |
| `GET` | `/api/admin/companies/[id]` | Get company details |
| `PUT` | `/api/admin/companies/[id]` | Update company |
| `DELETE` | `/api/admin/companies/[id]` | Delete company |

### Dashboard (`/api/admin/dashboard`)

Aggregate dashboard analytics.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/dashboard/stats` | Dashboard summary statistics |

### Featured Items (`/api/admin/featured-items`)

Manage featured item highlights.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/featured-items` | List featured items |
| `POST` | `/api/admin/featured-items` | Feature an item |
| `GET` | `/api/admin/featured-items/[id]` | Get featured item details |
| `PUT` | `/api/admin/featured-items/[id]` | Update featured item settings |
| `DELETE` | `/api/admin/featured-items/[id]` | Remove from featured |

### Geo Analytics (`/api/admin/geo-analytics`)

Geographic analytics and visitor distribution data.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/geo-analytics` | Get geographic analytics data |

### Items (`/api/admin/items`)

Full item content management.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/items` | List items with filters and pagination |
| `POST` | `/api/admin/items` | Create a new item |
| `POST` | `/api/admin/items/bulk` | Bulk item operations (approve, reject, delete) |
| `GET` | `/api/admin/items/stats` | Item aggregate statistics |
| `GET` | `/api/admin/items/[id]` | Get item details |
| `PUT` | `/api/admin/items/[id]` | Update item |
| `DELETE` | `/api/admin/items/[id]` | Delete item |
| `GET` | `/api/admin/items/[id]/history` | Get item audit history |
| `POST` | `/api/admin/items/[id]/review` | Submit item review (approve/reject) |

### Location Index (`/api/admin/location-index`)

Manage geographic location search indexing.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/location-index` | Rebuild location search index |

### Navigation (`/api/admin/navigation`)

Admin navigation configuration.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/navigation` | Get navigation structure |
| `PUT` | `/api/admin/navigation` | Update navigation |

### Notifications (`/api/admin/notifications`)

Admin notification management.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/notifications` | List admin notifications |
| `POST` | `/api/admin/notifications/mark-all-read` | Mark all notifications as read |
| `POST` | `/api/admin/notifications/[id]/read` | Mark single notification as read |

### Reports (`/api/admin/reports`)

Content report management and moderation.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/reports` | List content reports |
| `GET` | `/api/admin/reports/stats` | Report statistics |
| `GET` | `/api/admin/reports/[id]` | Get report details |
| `PUT` | `/api/admin/reports/[id]` | Update report status (resolve, dismiss) |

### Roles (`/api/admin/roles`)

Role and permission management for RBAC.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/roles` | List roles with pagination |
| `POST` | `/api/admin/roles` | Create a new role |
| `GET` | `/api/admin/roles/active` | Get active roles only |
| `GET` | `/api/admin/roles/stats` | Role statistics |
| `GET` | `/api/admin/roles/[id]` | Get role details |
| `PUT` | `/api/admin/roles/[id]` | Update role |
| `DELETE` | `/api/admin/roles/[id]` | Delete role (soft delete) |
| `GET` | `/api/admin/roles/[id]/permissions` | Get role permissions |
| `PUT` | `/api/admin/roles/[id]/permissions` | Update role permissions |

### Settings (`/api/admin/settings`)

Application settings management.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/settings` | Get all settings |
| `PUT` | `/api/admin/settings` | Update settings |
| `GET` | `/api/admin/settings/map-status` | Get map feature status |

### Sponsor Ads (`/api/admin/sponsor-ads`)

Sponsor advertisement moderation.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/sponsor-ads` | List sponsor ads |
| `GET` | `/api/admin/sponsor-ads/[id]` | Get ad details |
| `PUT` | `/api/admin/sponsor-ads/[id]` | Update ad |
| `POST` | `/api/admin/sponsor-ads/[id]/approve` | Approve sponsor ad |
| `POST` | `/api/admin/sponsor-ads/[id]/reject` | Reject sponsor ad |
| `POST` | `/api/admin/sponsor-ads/[id]/cancel` | Cancel sponsor ad |

### Tags (`/api/admin/tags`)

Content tag management.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/tags` | List tags with pagination |
| `POST` | `/api/admin/tags` | Create a new tag |
| `GET` | `/api/admin/tags/all` | Get all tags (no pagination) |
| `GET` | `/api/admin/tags/[id]` | Get tag details |
| `PUT` | `/api/admin/tags/[id]` | Update tag |
| `DELETE` | `/api/admin/tags/[id]` | Delete tag |

### Twenty CRM (`/api/admin/twenty-crm`)

CRM integration configuration and testing.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/twenty-crm/config` | Get CRM configuration |
| `PUT` | `/api/admin/twenty-crm/config` | Update CRM configuration |
| `POST` | `/api/admin/twenty-crm/test-connection` | Test CRM connection |

### Users (`/api/admin/users`)

Admin user management.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/users` | List users with pagination |
| `POST` | `/api/admin/users` | Create a new user |
| `GET` | `/api/admin/users/stats` | User statistics |
| `GET` | `/api/admin/users/check-email` | Check email availability |
| `GET` | `/api/admin/users/check-username` | Check username availability |
| `GET` | `/api/admin/users/[id]` | Get user details |
| `PUT` | `/api/admin/users/[id]` | Update user |
| `DELETE` | `/api/admin/users/[id]` | Delete user |

## Common Patterns

### Bulk Operations

Several resources support bulk operations via POST with an array of IDs:

```json
POST /api/admin/items/bulk
{
  "action": "approve",
  "ids": ["item-1", "item-2", "item-3"]
}
```

### Statistics Endpoints

Most resource groups include a `/stats` endpoint returning aggregate counts:

```json
GET /api/admin/items/stats
{
  "success": true,
  "data": {
    "total": 1250,
    "published": 980,
    "pending": 120,
    "rejected": 50,
    "draft": 100
  }
}
```

### Audit History

Items support audit history tracking via the `/[id]/history` endpoint, recording who made changes and when.
