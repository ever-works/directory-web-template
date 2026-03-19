---
id: admin-deep-dive
title: Admin Dashboard Deep Dive
sidebar_label: Admin Deep Dive
sidebar_position: 9
---

# Admin Dashboard Deep Dive

The admin dashboard is the central management interface for the Ever Works template. It provides over 18 distinct sections for managing content, users, analytics, and platform settings. All admin routes are protected by role-based access control and organized under `app/[locale]/admin/`.

## Admin Route Structure

```
app/[locale]/admin/
  page.tsx                    # Main dashboard (stats, charts, activity)
  auth/signin/page.tsx        # Admin-specific sign-in
  categories/page.tsx         # Category management
  clients/page.tsx            # Client listing with advanced search
  clients/[id]/page.tsx       # Individual client detail
  collections/page.tsx        # Collection management
  comments/page.tsx           # Comment moderation
  companies/page.tsx          # Company management
  featured-items/page.tsx     # Featured item curation
  items/page.tsx              # Item management (CRUD, review, filters)
  reports/page.tsx            # Report review and moderation
  roles/page.tsx              # Role and permission management
  settings/page.tsx           # Platform settings
  sponsorships/page.tsx       # Sponsor ad management
  surveys/page.tsx            # Survey listing
  surveys/create/page.tsx     # Create new survey
  surveys/[slug]/edit/page.tsx     # Edit survey
  surveys/[slug]/preview/page.tsx  # Preview survey
  surveys/[slug]/responses/page.tsx # View responses
  tags/page.tsx               # Tag management
  users/page.tsx              # User administration
```

## Admin Sections

### Dashboard Home (`/admin`)

The main dashboard displays real-time platform statistics organized into tabs: **Overview**, **Analytics**, **Performance**, **Reports**, and **Tools**. Key widgets include:

- **Stats Overview** -- Total items, users, submissions, engagement metrics
- **Activity Chart** -- 7-day activity trend with submissions, views, and engagement
- **Submission Status** -- Status breakdown (approved, pending, rejected)
- **Recent Activity** -- Latest platform events
- **Top Items** -- Highest-engagement items
- **Geographic Section** -- Distribution map and location statistics
- **Performance Monitor** -- System performance metrics
- **Data Export** -- Export platform data in various formats

### Content Management

| Section | Path | Description |
|---------|------|-------------|
| **Items** | `/admin/items` | Full CRUD operations, bulk actions, multi-step forms, filtering by status/category/tags, review workflows with approval and rejection |
| **Categories** | `/admin/categories` | Create, edit, delete categories with a form dialog |
| **Tags** | `/admin/tags` | Manage tags used for item classification |
| **Collections** | `/admin/collections` | Curate collections with item assignment via modal |
| **Featured Items** | `/admin/featured-items` | Select and reorder items for homepage featuring |
| **Comments** | `/admin/comments` | Moderate user comments with delete confirmation dialog |

### User & Client Management

| Section | Path | Description |
|---------|------|-------------|
| **Users** | `/admin/users` | User administration with creation form and delete dialog |
| **Clients** | `/admin/clients` | Advanced search panel, saved filters, multi-step client form (basic info, contact, profile, preferences) |
| **Companies** | `/admin/companies` | Company table with filters, search, modal editor, and statistics |
| **Roles** | `/admin/roles` | Role CRUD with granular permission checkboxes grouped by category |

### Reports & Moderation

| Section | Path | Description |
|---------|------|-------------|
| **Reports** | `/admin/reports` | Review user-submitted reports with a review dialog |
| **Surveys** | `/admin/surveys/*` | Full survey lifecycle: create, edit, preview, publish, view responses |
| **Sponsorships** | `/admin/sponsorships` | Manage sponsor ads with approval, rejection (with reason), filtering, and statistics |

### Settings

The settings page (`/admin/settings`) provides a comprehensive configuration interface built with dedicated input components:

- `SettingInput` -- Text and number inputs
- `SettingSelect` -- Dropdown selectors
- `SettingSwitch` -- Boolean toggles
- `SettingSlider` -- Range sliders
- `SettingCurrencyInput` -- Currency-formatted inputs
- `SettingApiStatus` -- API connection status indicators
- `MapPreview` -- Geographic map preview
- `CustomNavigationManager` -- Custom navigation link configuration

## Permission-Gated Access

Admin routes are protected by a multi-layer authorization system:

1. **Authentication** -- Only signed-in users can access admin routes
2. **Role check** -- Users must have an admin or super-admin role
3. **Permission granularity** -- Individual features check specific permissions

The permission system uses a checkbox-based UI organized into permission groups. Each role (defined in `/admin/roles`) can be assigned specific permissions for:

- Content management (items, categories, tags, collections)
- User management (users, clients, roles)
- Platform settings
- Report moderation
- Survey management
- Sponsorship management

## Layout System

The admin layout is separate from the public-facing layout:

- Admin pages use their own layout defined in `app/[locale]/admin/layout.tsx`
- The admin sidebar navigation provides section-based grouping
- The layout includes a responsive design with mobile hamburger menu
- Breadcrumb navigation tracks the admin path hierarchy

## Data Fetching

Admin dashboard data is fetched through:

- **`useAdminStats` hook** -- React Query-based hook for dashboard statistics
- **Server components** -- Direct database queries for page-level data
- **API routes** -- `app/api/admin/*` endpoints for client-side mutations

The admin stats hook provides loading, error, and refetching states, enabling the pull-to-refresh pattern on mobile devices.

## Related Files

- `app/[locale]/admin/` -- All admin page routes
- `app/api/admin/` -- Admin API endpoints
- `components/admin/` -- 80+ admin-specific components
- `hooks/use-admin-stats.ts` -- Dashboard data hook
- `lib/repositories/` -- Data access layer used by admin pages
