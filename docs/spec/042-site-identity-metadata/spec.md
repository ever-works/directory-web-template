---
id: spec-042-site-identity-metadata
title: Spec 042 — Site identity metadata from works.yml (title / description / tagline)
sidebar_label: 042 Site Identity Metadata
---

# Feature spec — `042-site-identity-metadata`

## 1. Summary

Resolve the site **name, tagline and description** used in SEO metadata
(`<title>`, `<meta name="description">`, Open Graph `og:site_name` /
`og:title`, the WebSite JSON-LD and the dynamic OG images) **server-side from
the Work's own `.works/works.yml`** when the template user has not set the
`NEXT_PUBLIC_SITE_NAME` / `NEXT_PUBLIC_SITE_TAGLINE` /
`NEXT_PUBLIC_SITE_DESCRIPTION` env vars.

New server-only helper `apps/web/lib/seo/site-identity.ts`:

| Helper                 | Resolution order                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `getSiteName()`        | `NEXT_PUBLIC_SITE_NAME` → `company_name` → `name` → `siteConfig.name` (`Ever Works`)                          |
| `getSiteTagline()`     | `NEXT_PUBLIC_SITE_TAGLINE` → `settings.homepage.hero_title + hero_title_gradient` → `hero_badge_text` → default |
| `getSiteDescription()` | `NEXT_PUBLIC_SITE_DESCRIPTION` → `settings.homepage.hero_description` → `siteConfig.description`              |

## 2. Motivation

`siteConfig` (`apps/web/lib/config.ts`) is a **client-safe constant**: it only
knows the `NEXT_PUBLIC_SITE_*` build-time env vars and otherwise falls back to
the template's generic defaults. Every Work deployed by the Ever Works platform
(Vercel or k8s) is built without those env vars — the platform only injects
`NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` — so **all 14 production
directories shipped `<title>Discover | Ever Works</title>` and the meta
description "Discover and explore professional services and solutions on Ever
Works"**, whether the site was about gaming chairs, MCP servers or startup
books (audit of `*.ever.works`, 2026-08-22).

The data the sites needed was already in each Work's `.works/works.yml`
(`company_name`, `name`, `settings.homepage.hero_*`) — the template simply
never read it for metadata.

## 3. Goals

- Per-directory `<title>`, OG title/site name, meta description and WebSite
  JSON-LD name **without any env-var or deploy-pipeline change**.
- Explicit `NEXT_PUBLIC_SITE_*` env vars keep winning (template users who
  customised them see no change).
- Zero behaviour change for the demo/template defaults when `works.yml` has no
  `company_name`/`name`/hero fields (falls through to `siteConfig`).
- Client bundles unchanged: `siteConfig` stays client-safe; the new helper is
  only imported from server code (`generateMetadata`, server components,
  nodejs-runtime OG image routes, `lib/seo/listing-metadata.ts`).
- `generateWebSiteSchema()` accepts an optional `{ name, description }`
  override so `[locale]/layout.tsx` can pass the resolved identity while the
  client-side importers of `lib/seo/schema.ts` (`item-detail.tsx`) keep the
  old signature.

### Non-goals

- Changing the hero itself — `settings.homepage.hero_*` already drives it
  (see `docs/guides/settings-utilities.md`).
- Changing the Organization JSON-LD `brandName` (still the platform brand).
- The static `export const alt` of OG image routes (module-level, must stay a
  build-time constant).
- Reading `works.yml` from client components.

## 4. Approach

1. `apps/web/lib/seo/site-identity.ts` — three pure helpers on top of
   `configManager.getNestedValue()` with try/catch so a missing
   `.works/works.yml` (CI, fresh clone) degrades to the template default.
2. `apps/web/lib/seo/listing-metadata.ts` — `fullTitle` / `og.siteName` /
   default description use the helpers.
3. `apps/web/app/[locale]/layout.tsx` — root metadata title/description/OG use
   the helpers; WebSite JSON-LD gets the resolved name/description.
4. Every server `generateMetadata` that built `"<Page> | ${siteConfig.name}"`
   (`about`, `help`, `submit`, `pricing`, `pricing/success`, `favorites`,
   `map`, `pages/[slug]`, `items/[slug]`, `client/dashboard`, the five
   `auth/*` pages, the `(listing)/discover/[page]` description, root 404
   title) now uses `getSiteName()` / `getSiteDescription()`.
5. `app/opengraph-image.tsx` and `app/[locale]/items/[slug]/opengraph-image.tsx`
   (both `runtime = 'nodejs'`) render `getSiteName()` / `getSiteTagline()`.

## 5. Acceptance

- A Work whose `works.yml` has `company_name: Awesome Chairs` and
  `settings.homepage.hero_title: Find Your Perfect` /
  `hero_title_gradient: Computer or Gaming Chair` renders
  `<title>Discover | Awesome Chairs</title>` on `/`, `Awesome Chairs | Find Your
  Perfect Computer or Gaming Chair` as the layout/OG title, and
  `og:site_name = Awesome Chairs`.
- With `NEXT_PUBLIC_SITE_NAME=Acme` set, every title uses `Acme` regardless of
  `works.yml`.
- With no `works.yml` at all (CI / `DATA_REPOSITORY` unset) output is identical
  to the pre-change template defaults.
- `pnpm lint` and `pnpm tsc --noEmit` clean; e2e title-length spec
  (`each-page-document-title-length.spec.ts`) still passes.

## 6. Rollout

Ships with the normal `develop → stage → main` cascade; deployed Works pick it
up on their next website-template auto-update + redeploy. Data-repo side: the
platform-managed directories already carry `company_name` + `hero_*` in
`works.yml` (Workspace runbook `EVER_WORKS_DIRECTORY_BRANDING.md`).
