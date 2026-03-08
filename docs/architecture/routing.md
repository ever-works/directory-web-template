---
id: routing
title: Routing Architecture
sidebar_label: Routing
sidebar_position: 6
---

# Routing Architecture

The Ever Works template uses the Next.js App Router with internationalization via `next-intl`, providing locale-prefixed routes, route groups for logical organization, and a comprehensive API layer.

## App Router with Locale Segment

All user-facing pages are nested under a `[locale]` dynamic segment, enabling multi-language support for 6 locales: `en`, `fr`, `es`, `de`, `ar`, and `zh`.

```
app/
├── [locale]/           # Dynamic locale segment
│   ├── layout.tsx      # Locale layout (wraps all localized pages)
│   ├── providers.tsx   # Client providers for the locale subtree
│   ├── globals.css     # Global styles
│   └── ...pages        # All localized pages
├── api/                # API routes (not locale-prefixed)
├── layout.tsx          # Root layout (HTML, fonts, metadata)
└── not-found.tsx       # 404 page
```

URLs follow the pattern `/{locale}/path`, for example:
- `/en/pricing` -- English pricing page
- `/fr/admin/items` -- French admin items page
- `/de/categories` -- German categories page

## Next.js Configuration

The `next.config.ts` configures several routing behaviors:

### Rewrites

```typescript
async rewrites() {
  return [
    {
      source: "/:path",
      destination: "/:path/discover/1",
    },
    {
      source: "/:path/discover",
      destination: "/:path/discover/1",
    },
  ];
}
```

These rewrites redirect the root locale path and `/discover` to the first page of the discover listing (`/discover/1`), providing a clean default URL.

### Security Headers

All routes receive security headers including:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` with a 2-year max-age
- `Content-Security-Policy` with restrictive defaults
- `Referrer-Policy: strict-origin-when-cross-origin`

### next-intl Plugin

The `next-intl` plugin is applied to the Next.js config, pointing to `./i18n/request.ts` for locale resolution:

```typescript
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const configWithIntl = withNextIntl(nextConfig);
```

## Route Groups

The `[locale]` directory uses several logical groupings to organize pages:

### (listing) -- Main Listing Pages

The `(listing)` route group is a parenthesized group (no URL segment) that wraps the main directory listing pages with a shared layout.

### admin/ -- Admin Panel

The admin section provides a complete back-office interface:

```
[locale]/admin/
├── auth/               # Admin sign-in
├── categories/         # Category CRUD
├── clients/            # Client management
├── collections/        # Collection CRUD
├── comments/           # Comment moderation
├── companies/          # Company management
├── featured-items/     # Featured item management
├── items/              # Item review and management
├── reports/            # Report review
├── roles/              # Role and permission management
├── settings/           # Site settings
├── sponsorships/       # Sponsorship management
├── surveys/            # Survey builder
├── tags/               # Tag management
├── users/              # User management
├── layout.tsx          # Admin layout (sidebar, navigation)
├── layout-client.tsx   # Client-side admin layout logic
└── page.tsx            # Admin dashboard
```

### auth/ -- Authentication Pages

```
[locale]/auth/
├── signin/             # Sign in page
├── signup/             # Sign up page
├── forgot-password/    # Password reset request
├── reset-password/     # Password reset form
├── verify-email/       # Email verification
└── error/              # Authentication error page
```

### client/ -- Client Dashboard

The client section provides authenticated user features for managing their own submissions and account.

### dashboard/ -- User Dashboard

General user dashboard with account overview, activity, and settings.

## API Routes (29 Groups)

API routes live outside the `[locale]` segment at `app/api/` and are not locale-prefixed. They serve as the backend for client-side data fetching.

| Route Group | Purpose | Key Endpoints |
|-------------|---------|---------------|
| `admin/` | Admin operations | Items, users, categories, settings |
| `auth/` | Authentication | Session, OAuth callbacks |
| `categories/` | Category data | List, search |
| `client/` | Client operations | Profile, submissions, dashboard |
| `collections/` | Collection data | List, detail |
| `config/` | Site configuration | Feature flags, settings |
| `cron/` | Scheduled tasks | Subscription checks, cleanup |
| `current-user/` | Current user info | Profile, session data |
| `extract/` | URL extraction | Metadata extraction from URLs |
| `favorites/` | Favorites | Add, remove, list |
| `featured-items/` | Featured items | List active featured items |
| `geocode/` | Geocoding | Address lookup, reverse geocoding |
| `health/` | Health check | Database and service status |
| `internal/` | Internal operations | System-level endpoints |
| `items/` | Item data | List, detail, search |
| `lemonsqueezy/` | LemonSqueezy | Webhook handler |
| `location/` | Location data | Nearby items, location search |
| `payment/` | Payment operations | Checkout, payment methods |
| `polar/` | Polar | Webhook handler |
| `reference/` | Reference data | Enums, lookup values |
| `reports/` | Content reports | Submit, review reports |
| `solidgate/` | Solidgate | Webhook handler |
| `sponsor-ads/` | Sponsor ads | CRUD, activation |
| `stripe/` | Stripe | Webhook handler, checkout |
| `surveys/` | Surveys | List, respond, results |
| `user/` | User operations | Profile, settings |
| `verify-recaptcha/` | reCAPTCHA | Token verification |
| `version/` | Version info | App version and build info |

## Middleware

The application uses `next-intl` middleware for locale detection and routing. The middleware handles:

1. **Locale detection**: Determines the user's locale from the URL path, cookies, or `Accept-Language` header
2. **Locale redirects**: Redirects requests without a locale prefix to the appropriate locale
3. **Default locale**: Falls back to English (`en`) when no locale preference is detected

The middleware is configured in the `i18n/` directory with locale routing rules defined in `i18n/routing.ts` and request handling in `i18n/request.ts`.

## Static Generation and Dynamic Routes

The template uses several data-fetching strategies:

- **Static generation**: Pages like privacy policy, terms of service, and about are statically generated
- **Dynamic rendering**: Admin pages, dashboards, and authenticated pages render dynamically
- **ISR (Incremental Static Regeneration)**: Category and tag listing pages use ISR with revalidation
- **Sitemap generation**: `app/sitemap.ts` dynamically generates the sitemap from content data

The `staticPageGenerationTimeout` is set to 180 seconds in `next.config.ts` to accommodate large content repositories during builds.
