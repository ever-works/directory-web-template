# Code Review Report - February 2026

> Deep review of the Directory Web Template codebase covering security, architecture, performance, SEO, i18n, accessibility, and code quality.

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Findings by Severity](#2-findings-by-severity)
- [3. Implementation Plan (Jira Issues)](#3-implementation-plan-jira-issues)
- [4. Detailed Findings](#4-detailed-findings)

---

## 1. Executive Summary

| Area                  | Critical | High  | Medium | Low    | Total  |
| --------------------- | -------- | ----- | ------ | ------ | ------ |
| Security & Auth       | 2        | 1     | 5      | 3      | 11     |
| Configuration & Build | 0        | 0     | 4      | 4      | 8      |
| Performance           | 0        | 0     | 5      | 2      | 7      |
| SEO & Metadata        | 0        | 1     | 3      | 1      | 5      |
| Internationalization  | 0        | 2     | 2      | 2      | 6      |
| Accessibility         | 0        | 1     | 3      | 4      | 8      |
| Component Quality     | 0        | 0     | 4      | 5      | 9      |
| **Total**             | **2**    | **5** | **26** | **21** | **54** |

**Overall assessment:** The project is well-structured with good architectural patterns (Drizzle ORM, next-intl, proper ISR, Zod validation in many places). However, there are critical security gaps (IDOR, auth bypass), a broken i18n foundation (`<html lang>` hardcoded), and inconsistent patterns across the 140+ API routes.

---

## 2. Findings by Severity

### CRITICAL (Fix Immediately)

| ID     | Finding                                                                          | Location                                            |
| ------ | -------------------------------------------------------------------------------- | --------------------------------------------------- |
| SEC-01 | IDOR: Payment account endpoint exposes any user's data without ownership check   | `app/api/payment/account/[userId]/route.ts:125-173` |
| SEC-02 | Cron endpoints allow unauthenticated access when `CRON_SECRET` is not configured | `app/api/cron/subscription-reminders/route.ts:6-31` |

### HIGH

| ID      | Finding                                                                                       | Location                                                      |
| ------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| SEC-03  | `allowDangerousEmailAccountLinking: true` enables OAuth account takeover                      | `auth.config.ts:17`                                           |
| I18N-01 | Root `<html>` hardcoded to `lang="en"` — breaks screen readers and SEO for all non-EN locales | `app/layout.tsx:38`                                           |
| I18N-02 | RTL layouts (Arabic, Hebrew) not implemented — `dir` attribute missing, no RTL CSS            | `app/layout.tsx:38`, all components                           |
| SEO-01  | 26+ public pages missing `generateMetadata` — no titles, descriptions, OG tags                | `/pricing`, `/help`, `/submit`, dashboard pages               |
| A11Y-01 | No heading hierarchy on key pages (`/help`, `/pricing`) — missing `<h1>` tags                 | `app/[locale]/help/page.tsx`, `app/[locale]/pricing/page.tsx` |

### MEDIUM

| ID      | Finding                                                                     | Location                                              |
| ------- | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| SEC-04  | Rate limiting uses in-memory Map — bypassed in serverless/multi-instance    | `lib/utils/rate-limit.ts`                             |
| SEC-05  | Error messages leak implementation details to clients                       | `app/api/admin/items/route.ts:298-306` + others       |
| SEC-06  | Inconsistent password validation (create user vs change-password)           | `app/api/admin/users/route.ts:486`                    |
| SEC-07  | ReCAPTCHA auto-bypassed in development mode                                 | `app/api/verify-recaptcha/route.ts:159-162`           |
| SEC-08  | Missing CORS configuration for API routes                                   | Global                                                |
| SEC-09  | Missing Content Security Policy (CSP) headers                               | Global                                                |
| CFG-01  | `next-auth` beta version `5.0.0-beta.30` in production                      | `package.json:116`                                    |
| CFG-02  | Stale `yarn.lock` (11,837 lines) committed but project uses pnpm            | `yarn.lock`                                           |
| CFG-03  | Drizzle config silently falls back to dummy DB URL                          | `drizzle.config.ts:8`                                 |
| CFG-04  | ESLint `no-unused-vars` disabled — dead code accumulates                    | `eslint.config.mjs:44,68-69`                          |
| PERF-01 | `item.tsx` not memoized; inline sub-components re-created every render      | `components/item.tsx:276-328`                         |
| PERF-02 | Header `useMemo` has 15 deps including translation fns — likely ineffective | `components/header/index.tsx:199-283`                 |
| PERF-03 | `<img>` tag used instead of `next/image` in map popup                       | `components/maps/map-item-popup.tsx:136-140`          |
| PERF-04 | Font only loads `latin` subset — non-Latin locales get fallback fonts       | `app/layout.tsx:13-21`                                |
| PERF-05 | N+1 query: re-fetches all comments after creating one                       | `app/api/items/[slug]/comments/route.ts:398-399`      |
| SEO-02  | Missing hreflang alternates on most pages (only item detail has them)       | Various                                               |
| SEO-03  | Missing heading hierarchy on help/pricing pages                             | `app/[locale]/help/page.tsx`                          |
| I18N-03 | Font subsets missing for CJK, Arabic, Hebrew, Thai, Hindi, etc.             | `app/layout.tsx:13-21`                                |
| I18N-04 | Locale-specific OG metadata not translated                                  | Various pages                                         |
| A11Y-02 | Empty `alt=""` on content images (map popup icon, site favicon)             | `map-item-popup.tsx:138`, `site-logo.tsx:99`          |
| A11Y-03 | Missing form accessibility (`aria-required`, `aria-invalid`)                | Submit/auth forms                                     |
| A11Y-04 | Insufficient focus indicators in dark mode                                  | Various components                                    |
| CQ-01   | Header component too large (494 lines, 6 callbacks, mixed concerns)         | `components/header/index.tsx`                         |
| CQ-02   | 63 files use `animate-ping`/`animate-pulse` — contradicts design system     | Various                                               |
| CQ-03   | Duplicate tooltip logic in tag-item and category-item                       | `tag-item.tsx`, `category-item.tsx`                   |
| CQ-04   | Index-based keys in footer lists                                            | `footer-link-group.tsx:28`, `social-link-item.tsx:90` |
| DB-01   | Missing database indexes on frequently queried fields                       | `lib/db/schema.ts`                                    |

### LOW

| ID      | Finding                                                                      | Location                                        |
| ------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| CFG-05  | `legacy-peer-deps=true` masks dependency conflicts                           | `.npmrc:2`                                      |
| CFG-06  | Engine field specifies `yarn >=1.13.0` but project uses pnpm                 | `package.json:189`                              |
| CFG-07  | tsconfig references `.js` but actual file is `.ts`                           | `tsconfig.json:36`                              |
| CFG-08  | No test framework (Jest/Vitest) configured                                   | `package.json`                                  |
| SEC-10  | `JSON.parse()` on untrusted Stripe metadata without try-catch                | `lib/services/stripe-products.service.ts`       |
| SEC-11  | Inconsistent `console.log` vs structured `Logger` usage                      | Multiple API routes                             |
| PERF-06 | Unnecessary `'use client'` on help page                                      | `app/[locale]/help/page.tsx:1`                  |
| PERF-07 | Missing dynamic imports for heavy components (PricingSection)                | `app/[locale]/pricing/page.tsx`                 |
| SEO-04  | `next.config.ts` rewrites `/:path` could catch unintended routes             | `next.config.ts:56-67`                          |
| I18N-05 | Hardcoded English strings in some components                                 | Various                                         |
| I18N-06 | Inconsistent locale detection patterns                                       | Various                                         |
| A11Y-05 | Hero section uses `<div>` instead of `<section>`                             | `components/hero.tsx`                           |
| A11Y-06 | `t: any` type on translation props                                           | `social-link-item.tsx:76`                       |
| A11Y-07 | Some icon-only buttons lack descriptive aria-labels                          | Various                                         |
| A11Y-08 | No color contrast verification for slate dark mode palette                   | Various                                         |
| CQ-05   | Magic numbers (`slice(0, 4)`, truncation lengths) not extracted to constants | `item.tsx:222`, `category-item.tsx:17`          |
| CQ-06   | Missing error boundaries around critical UI sections                         | Item cards, filters, item detail                |
| CQ-07   | Duplicate HeroUI imports (individual packages + monolithic `@heroui/react`)  | `package.json:48-54`                            |
| CQ-08   | `any` types in item-detail and social-link-item                              | `item-detail.tsx:36`, `social-link-item.tsx:76` |
| CQ-09   | Missing `React.memo` on list-rendered components (tag-item, category-item)   | `tag-item.tsx`, `category-item.tsx`             |

---

## 3. Implementation Plan (Jira Issues)

Issues are grouped by logical branch scope. Each branch addresses closely related findings that should be shipped together.

---

### Branch 1: `fix/security-critical`

**Jira: SEC-CRITICAL — Fix IDOR vulnerability, cron auth bypass, and OAuth account linking**

> Fix three critical/high security issues: (1) add ownership verification to payment account endpoint preventing users from accessing other users' payment data, (2) require CRON_SECRET in all environments and remove development-mode bypass, (3) disable allowDangerousEmailAccountLinking for Google OAuth.

| Finding IDs            | Files to modify                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01, SEC-02, SEC-03 | `app/api/payment/account/[userId]/route.ts`, `app/api/cron/subscription-reminders/route.ts`, `app/api/cron/subscription-expiration/route.ts`, `app/api/cron/sync/route.ts`, `auth.config.ts` |

**Priority:** P0 — Deploy immediately

---

### Branch 2: `fix/api-hardening`

**Jira: SEC-API-HARDENING — Harden API routes: error messages, password policy, input validation, CORS/CSP**

> Prevent error message leakage across all API routes by returning generic messages in production. Standardize password validation using a shared Zod schema. Add coordinate range validation to location endpoints. Add CORS and CSP headers to next.config.ts. Wrap unsafe JSON.parse calls in try-catch.

| Finding IDs                                            | Files to modify                                                                                                                                                                                                                  |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10 | `lib/utils/rate-limit.ts`, `app/api/admin/items/route.ts` + other routes, `app/api/admin/users/route.ts`, `app/api/verify-recaptcha/route.ts`, `next.config.ts`, `lib/services/stripe-products.service.ts`, location route files |

**Priority:** P1 — Next sprint

---

### Branch 3: `fix/html-lang-and-rtl`

**Jira: I18N-LANG-RTL — Fix HTML lang/dir attributes and implement RTL layout support**

> Fix the root `<html>` element to dynamically set `lang` and `dir` attributes from the current locale. Implement RTL CSS support for Arabic (ar) and Hebrew (he) locales. This is currently a WCAG 3.1.1 violation and breaks screen readers + search engine locale detection for all 20 supported languages.

| Finding IDs      | Files to modify                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------ |
| I18N-01, I18N-02 | `app/layout.tsx`, `app/[locale]/layout.tsx`, potentially Tailwind config for RTL utilities |

**Priority:** P0 — Deploy immediately

---

### Branch 4: `fix/seo-metadata`

**Jira: SEO-METADATA — Add generateMetadata to 26+ pages and fix heading hierarchy**

> Add proper `generateMetadata` exports with translated titles, descriptions, and OG tags to all public pages (pricing, help, submit, auth pages). Fix heading hierarchy by adding `<h1>` tags to help and pricing pages. Extend hreflang alternates to all public pages, not just item detail.

| Finding IDs                              | Files to modify                                                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEO-01, SEO-02, SEO-03, A11Y-01, I18N-04 | `app/[locale]/pricing/page.tsx`, `app/[locale]/help/page.tsx`, `app/[locale]/submit/page.tsx`, `app/[locale]/pricing/success/page.tsx`, `app/[locale]/client/dashboard/page.tsx`, auth pages, dashboard pages |

**Priority:** P1 — Next sprint

---

### Branch 5: `fix/font-subsets-i18n`

**Jira: I18N-FONTS — Load proper font subsets for non-Latin locales (CJK, Arabic, Thai, etc.)**

> The current font configuration only loads the `latin` subset of Geist. Users on Chinese, Arabic, Hebrew, Thai, Hindi, Japanese, Korean locales get system fallback fonts. Load extended subsets or configure locale-specific font loading to support all 20 locales properly.

| Finding IDs      | Files to modify                                         |
| ---------------- | ------------------------------------------------------- |
| I18N-03, PERF-04 | `app/layout.tsx`, potentially `app/[locale]/layout.tsx` |

**Priority:** P1 — Next sprint

---

### Branch 6: `fix/component-performance`

**Jira: PERF-COMPONENTS — Memoize list-rendered components and fix ineffective useMemo**

> Wrap `item.tsx` with `React.memo`, extract inline `CategoryFilterButton` and `TagFilterButton` to separate files, memoize `tag-item.tsx` and `category-item.tsx`. Fix header's 15-dependency useMemo by extracting translation calls. Replace `<img>` with `next/image` in map popup. Fix index-based keys in footer lists.

| Finding IDs                               | Files to modify                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PERF-01, PERF-02, PERF-03, PERF-05, CQ-04 | `components/item.tsx`, `components/header/index.tsx`, `components/maps/map-item-popup.tsx`, `components/filters/components/tags/tag-item.tsx`, `components/filters/components/categories/category-item.tsx`, `components/footer/footer-link-group.tsx`, `components/footer/social-link-item.tsx`, `app/api/items/[slug]/comments/route.ts` |

**Priority:** P2 — Planned

---

### Branch 7: `fix/accessibility`

**Jira: A11Y-IMPROVEMENTS — Fix alt text, form accessibility, focus indicators, semantic HTML**

> Add proper alt text to content images in map popup and site logo. Add `aria-required` and `aria-invalid` to submit/auth forms. Improve focus indicators for dark mode. Change hero `<div>` to `<section>`. Add descriptive aria-labels to icon-only buttons.

| Finding IDs                                          | Files to modify                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| A11Y-02, A11Y-03, A11Y-04, A11Y-05, A11Y-06, A11Y-07 | `components/maps/map-item-popup.tsx`, `components/shared/site-logo/site-logo.tsx`, `components/hero.tsx`, submit/auth form components |

**Priority:** P2 — Planned

---

### Branch 8: `chore/config-cleanup`

**Jira: CHORE-CONFIG — Clean up project config: remove yarn.lock, fix engines, enable lint rules**

> Remove stale `yarn.lock`, fix `package.json` engines to reference pnpm instead of yarn, fix tsconfig `.js` reference to `.ts`, re-enable ESLint `no-unused-vars` rule, fix Drizzle fallback to fail loudly on missing DATABASE_URL, remove `legacy-peer-deps` from `.npmrc` and resolve actual conflicts.

| Finding IDs                                    | Files to modify                                                                                           |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| CFG-02, CFG-03, CFG-04, CFG-05, CFG-06, CFG-07 | `yarn.lock` (delete), `package.json`, `tsconfig.json`, `eslint.config.mjs`, `drizzle.config.ts`, `.npmrc` |

**Priority:** P2 — Planned

---

### Branch 9: `chore/code-quality`

**Jira: CQ-REFACTOR — Extract header sub-components, deduplicate tooltips, add error boundaries, fix types**

> Refactor header into smaller components (extract mobile menu, navigation rendering). Extract shared tooltip logic from tag-item and category-item into a reusable hook. Add error boundaries around item cards and filters. Replace `any` types with proper types. Extract magic numbers into named constants.

| Finding IDs                                     | Files to modify                                                                                                                                                                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CQ-01, CQ-02, CQ-03, CQ-05, CQ-06, CQ-08, CQ-09 | `components/header/index.tsx`, `components/filters/components/tags/tag-item.tsx`, `components/filters/components/categories/category-item.tsx`, `components/item-detail/item-detail.tsx`, `components/footer/social-link-item.tsx` |

**Priority:** P3 — Backlog

---

### Branch 10: `chore/db-indexes`

**Jira: DB-INDEXES — Add missing database indexes on frequently queried fields**

> Review and add indexes on `items.slug`, `items.status`, and `client_profiles.user_id` to improve query performance on admin listing, item lookup, and profile resolution endpoints.

| Finding IDs | Files to modify                        |
| ----------- | -------------------------------------- |
| DB-01       | `lib/db/schema.ts`, new migration file |

**Priority:** P2 — Planned

---

### Not scoped (requires separate decision)

| ID      | Finding                           | Notes                                                 |
| ------- | --------------------------------- | ----------------------------------------------------- |
| CFG-01  | Upgrade `next-auth` from beta     | Wait for stable v5 release; breaking changes possible |
| CFG-08  | Add test framework (Vitest)       | Needs team alignment on test strategy                 |
| SEC-04  | Distributed rate limiting (Redis) | Needs infrastructure decision                         |
| CQ-07   | Deduplicate HeroUI imports        | Needs bundle analysis first                           |
| A11Y-08 | Color contrast audit              | Needs design review with tooling                      |

---

## 4. Detailed Findings

### 4.1 Security & Authentication

#### SEC-01: IDOR in Payment Account Endpoint (CRITICAL)

**File:** `app/api/payment/account/[userId]/route.ts` lines 125-173

The GET handler accepts a `userId` from the URL path and directly queries the database without verifying the authenticated user matches:

```typescript
const { userId } = await params;
// No ownership check — any authenticated user can query any userId
const paymentAccount = await getUserPaymentAccountByProvider(userId, provider);
```

**Fix:** Add `const session = await auth()` and verify `session.user.id === userId` before querying.

#### SEC-02: Cron Auth Bypass (CRITICAL)

**File:** `app/api/cron/subscription-reminders/route.ts` lines 6-31

When `CRON_SECRET` is not configured, the handler allows unauthenticated access:

```typescript
if (!cronSecret && process.env.NODE_ENV === 'development') {
	return true; // Bypasses all auth
}
```

**Fix:** Always require `CRON_SECRET`. Throw an error at startup if it's missing in production.

#### SEC-03: Dangerous Email Account Linking (HIGH)

**File:** `auth.config.ts` line 17

`allowDangerousEmailAccountLinking: true` allows an attacker who controls a Google account with a matching email to link it to an existing account without verification.

**Fix:** Set to `false` and implement proper account linking flow with email verification.

---

### 4.2 Internationalization

#### I18N-01: Hardcoded HTML lang (HIGH)

**File:** `app/layout.tsx` line 38

```tsx
<html lang="en" ...>
```

This is always `"en"` regardless of locale. Violates WCAG 3.1.1 and confuses search engines for 19 of 20 supported locales.

**Fix:** Pass locale from `[locale]` param to root layout, set `lang={locale}` and `dir={isRTL(locale) ? 'rtl' : 'ltr'}`.

#### I18N-02: RTL Not Implemented (HIGH)

Arabic and Hebrew are listed as supported locales with `isRTL: true` in the language switcher, but:

- No `dir="rtl"` attribute on `<html>`
- No `[dir="rtl"]` CSS overrides
- All layouts are LTR-only

These locales are effectively broken for layout.

---

### 4.3 SEO

#### SEO-01: Missing Metadata on 26+ Pages (HIGH)

Pages without `generateMetadata`:

- `/pricing` — public, SEO-critical
- `/help` — public, SEO-critical
- `/submit` — public
- `/pricing/success`
- All `/client/dashboard/*` pages
- All `/admin/*` pages
- Auth pages (`/signin`, `/signup`, etc.)

**Impact:** No page titles, descriptions, or OG tags. Social shares show blank previews.

---

### 4.4 Performance

#### PERF-01: Item Component Not Memoized (MEDIUM)

**File:** `components/item.tsx`

The item card is rendered in lists (potentially 100+ items) but:

- Not wrapped with `React.memo`
- Contains inline `CategoryFilterButton` and `TagFilterButton` components (lines 276-328) that are re-created on every render
- No `useCallback`/`useMemo` anywhere in the component

#### PERF-04: Latin-only Font Subset (MEDIUM)

**File:** `app/layout.tsx` lines 13-21

```typescript
const geistSans = Geist({ subsets: ['latin'] });
```

Users on Chinese, Arabic, Japanese, Korean, Thai, Hindi locales see system fallback fonts since Geist doesn't include those character sets.

---

### 4.5 Configuration

#### CFG-02: Stale yarn.lock (MEDIUM)

An 11,837-line `yarn.lock` is committed but the project uses pnpm exclusively with `pnpm-lock.yaml`. This causes confusion and potential CI issues if workflows reference the wrong lockfile.

#### CFG-04: Unused Variable Detection Disabled (MEDIUM)

**File:** `eslint.config.mjs` lines 44, 68-69

Both `no-unused-vars` and `@typescript-eslint/no-unused-vars` are set to `"off"`, allowing dead code to accumulate silently across the codebase.

---

### 4.6 Accessibility

#### A11Y-02: Empty Alt on Content Images (MEDIUM)

```tsx
// map-item-popup.tsx:138 — item icon is content, not decorative
<img src={item.icon} alt="" />

// site-logo.tsx:99 — favicon is meaningful content
<Image src={logoSettings.favicon} alt="" />
```

**Fix:** Use descriptive alt text: `alt={item.name}`, `alt={config.company_name}`.
