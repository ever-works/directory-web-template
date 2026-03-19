---
id: client-portal-guide
title: "Client Portal Guide"
sidebar_label: "Client Portal"
sidebar_position: 34
---

# Client Portal Guide

The client portal is the authenticated area for regular (non-admin) users. It provides a dashboard, profile management, submission tracking, and account settings. All client pages live under `app/[locale]/client/`.

## Route Structure

| Route | Purpose |
|-------|---------|
| `/client/dashboard` | Personal dashboard with stats |
| `/client/profile/[username]` | Public profile page |
| `/client/settings` | Settings hub |
| `/client/settings/profile/basic-info` | Name, bio, avatar |
| `/client/settings/profile/billing` | Billing and subscription management |
| `/client/settings/profile/location` | Location preferences |
| `/client/settings/profile/portfolio` | Portfolio showcase |
| `/client/settings/profile/submissions/trash` | Deleted submissions |
| `/client/settings/profile/theme-colors` | Personal theme customisation |
| `/client/settings/security` | Password and two-factor auth |

## Dashboard Page

The dashboard page at `/client/dashboard` is a server component that:

1. Checks the session with `auth()`.
2. Redirects unauthenticated users to `/auth/signin`.
3. Redirects admin users to `/admin` so they see the admin dashboard instead.
4. Renders the `DashboardContent` component for regular users.

```tsx
export default async function ClientDashboardPage() {
  const locale = await getLocale();
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/signin`);
  }

  if (session.user.isAdmin === true) {
    redirect(`/${locale}/admin`);
  }

  return <DashboardContent session={session} />;
}
```

The dashboard pulls statistics from the `GET /api/client/dashboard/stats` endpoint, which returns counts for the user's items, views, and other engagement metrics.

## Client API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/client/dashboard/stats` | Personal dashboard statistics |
| GET | `/api/client/geo-stats` | Geographic view distribution |
| GET | `/api/client/items` | List the user's own items |
| POST | `/api/client/items` | Submit a new item |
| GET | `/api/client/items/stats` | Item-level statistics |
| GET | `/api/client/items/coordinates` | Map coordinates for user's items |
| GET | `/api/client/items/[id]` | Single item detail |
| PUT | `/api/client/items/[id]` | Update own item |
| DELETE | `/api/client/items/[id]` | Soft-delete own item |
| POST | `/api/client/items/[id]/restore` | Restore a soft-deleted item |

All client API routes authenticate via `auth()` and scope queries to `session.user.id` to ensure users can only access their own data.

## Settings Hub

The settings page at `/client/settings` renders a card grid that links to each settings sub-page. The `SettingsContent` component uses `next-intl` for translated labels:

```tsx
const settingsCards = [
  { id: 'basic-info', icon: <FiUser />, href: '/client/settings/profile/basic-info' },
  { id: 'theme-colors', icon: <FiDroplet />, href: '/client/settings/profile/theme-colors' },
  { id: 'portfolio', icon: <FiBriefcase />, href: '/client/settings/profile/portfolio' },
  { id: 'submissions', icon: <FiFileText />, href: '/client/settings/profile/submissions/trash' },
  { id: 'billing', icon: <FiCreditCard />, href: '/client/settings/profile/billing' },
  { id: 'location', icon: <FiMapPin />, href: '/client/settings/profile/location' },
];
```

Each card is a styled link with hover effects and an arrow icon, providing a consistent navigation pattern.

### Settings Sub-pages

#### Basic Info

Allows users to update their display name, bio, avatar, and social links. The form uses `react-hook-form` with Zod validation and submits via the user profile API.

#### Billing

Displays current subscription plan, payment history, and plan upgrade options. Integrates with the configured payment provider (Stripe, Solidgate, LemonSqueezy, or Polar).

#### Location

Uses the `LocationPicker` component (see [Map Integration Guide](../guides/map-integration-guide.md)) to let users set their business address, service area, and remote-service flag.

#### Portfolio

A showcase section where users can highlight their best submissions or external projects.

#### Theme Colors

Lets users personalise their profile page accent colours using the dynamic colour system.

#### Security

Password change form and two-factor authentication setup.

## SEO and Metadata

Client pages generate metadata using Next.js `generateMetadata` with internationalised titles and `hreflang` alternates:

```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  const path = '/client/dashboard';

  return {
    title: `${t('DASHBOARD')} | ${siteConfig.name}`,
    alternates: {
      canonical: getLocalizedUrl(path, locale as Locale),
      languages: generateHreflangAlternates(path),
    },
  };
}
```

This pattern ensures each client page has proper canonical URLs and search-engine-friendly metadata across all supported languages.

## Authentication Flow

The client portal requires authentication. The guard logic runs on the server side in each `page.tsx`:

1. Call `auth()` to get the current session.
2. If no session exists, redirect to the sign-in page with the current locale.
3. If the user is an admin, redirect to the admin dashboard.
4. Otherwise, render the client content component.

This server-side check means unauthenticated users never see the client portal markup, not even briefly.

## Extending the Client Portal

To add a new client page:

1. Create a folder at `app/[locale]/client/<feature>/`.
2. Add a `page.tsx` that checks `auth()` and redirects if needed.
3. Add `generateMetadata` for SEO with `hreflang` alternates.
4. Create a corresponding API route at `app/api/client/<feature>/` scoped to `session.user.id`.
5. Use the `DashboardContent` pattern: server component for data fetching, client component for interactivity.

## Related Pages

- [Admin Dashboard Architecture](../guides/admin-dashboard-guide.md) -- the admin counterpart
- [Submission Workflow](../guides/submission-workflow.md) -- how items flow from submission to publication
- [User Profiles](../features/user-profiles.md) -- public profile feature
- [Authentication](../architecture/nextauth-configuration.md) -- auth configuration reference
