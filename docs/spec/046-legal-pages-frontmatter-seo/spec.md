---
id: spec-046-legal-pages-frontmatter-seo
title: Spec 046 — Legal page SEO metadata from Markdown frontmatter
sidebar_label: 046 Legal Pages Frontmatter SEO
---

# Feature spec — `046-legal-pages-frontmatter-seo`

## 1. Summary

Derive the **SEO metadata** of the dedicated Terms of Service and Privacy
Policy routes from the data repository's Markdown **frontmatter**
(`pages/<slug>.<locale>.md` → `title`, `description`) instead of from the
template's i18n bundle, and give both routes a loading state.

A new server-only helper `apps/web/lib/seo/static-page-metadata.ts` resolves
each field **frontmatter → i18n fallback**, appends the resolved site name
(Spec 042) and adds Open Graph / Twitter card tags, while keeping every field
the routes already emitted: `metadataBase`, `alternates.canonical`,
`alternates.languages` (hreflang) and the `text/markdown` mirror link.

## 2. Motivation

`/terms-of-service` and `/privacy-policy` have rendered data-repository
Markdown since PR #271 (body through `MDXRemote`, `unstable_cache` since PRs
#284 / #295, placeholder fallback + `console.warn` / `console.error` on read
failure). Their `<h1>` and the `.md` mirror (`lib/seo/markdown-mirror.ts`) both
prefer the frontmatter `title` / `description`, and the generic
`app/[locale]/pages/[slug]/page.tsx` route does the same in its
`generateMetadata`.

The two dedicated routes did not. Their `generateMetadata` returned
`tFooter('TERMS_OF_SERVICE')` / `tPages('*_META_DESCRIPTION')`, so a directory
that had published its own legal copy still shipped:

```html
<title>Terms of Service</title>
<meta name="description" content="Terms and conditions for using our directory service" />
```

— the template's generic snippet — while the visible page showed the Work's own
title. Three surfaces (`<h1>`, `.md` mirror, HTML `<head>`) resolved the same
two fields with two different rules, which is exactly the drift a shared helper
prevents.

Two smaller defects on the same surface:

- Neither route had a `loading.tsx`, so a cold ISR miss rendered nothing while
  the content repository hydrated.
- `alternates.types['text/markdown']` concatenated the base URL twice —
  `` `${appUrl}${getLocalizedUrl(path, locale)}.md` `` — but `getLocalizedUrl`
  already returns an absolute URL, so the emitted href was
  `https://hosthttps://host/terms-of-service.md`. The same copy-paste appeared
  in `about`, `cookies`, `items/[slug]` and `pages/[slug]`; `help`, `pricing`
  and `lib/seo/listing-metadata.ts` already had it right.

Ticket: [EW-17](https://evertech.atlassian.net/browse/EW-17).

## 3. Goals

- `<title>` and `<meta name="description">` on `/terms-of-service` and
  `/privacy-policy` come from the Markdown frontmatter when the data repository
  provides it.
- The i18n strings remain the fallback: a Work with no `pages/` content, or a
  build with no `DATA_REPOSITORY`, renders exactly what it rendered before.
- The `<h1>`, the `.md` mirror and the HTML `<head>` cannot drift again — one
  helper, one resolution order.
- Open Graph and Twitter card parity with `pages/[slug]`.
- Both routes have a loading state for the cold ISR path.
- The `text/markdown` alternate is a single well-formed absolute URL.

### Non-goals

- Changing the page bodies, layout or styling (unchanged).
- Renaming the data files from `.md` to `.mdx` — they already render through
  `next-mdx-remote`, so the extension carries no behaviour.
- Authoring the legal copy itself; that lives in each Work's data repository
  (`ever-works/awesome-time-tracking-data` for the demo directory).
- Migrating `about` / `cookies` to the helper. They are eligible and the helper
  is written for them, but the change is kept to the ticket's two routes; see
  `docs/questions.md`.

## 4. Approach

1. **`apps/web/lib/seo/static-page-metadata.ts`** — `buildStaticPageMetadata({
slug, path, locale, fallbackTitle, fallbackDescription })`: - `getCachedPageContent(slug, locale)` inside a `try`/`catch` so metadata
   generation degrades to the fallbacks instead of failing the route
   (`console.error` on the catch path); - `frontmatterString()` accepts only a non-empty string, so `title:` absent,
   blank or non-string (`title: 2026`) falls back rather than emitting an
   empty `<title>`; - document title suffixed with `await getSiteName()` (Spec 042) unless the
   title already names the site, so a short frontmatter title still clears
   the 10-character floor in `each-page-document-title-length.spec.ts`; - Open Graph (`title`, `description`, `url`, `siteName`, `locale`,
   `type: website`) and Twitter (`summary_large_image`) mirroring
   `pages/[slug]`; - `alternates` keeps `canonical`, `languages` and the markdown mirror.
   The route body still reads `getCachedPageContent` for its `<h1>`; both calls
   hit the same `unstable_cache` entry (`CONTENT_CACHE_TTL.PAGES`, 600 s), so
   there is no extra filesystem read.
2. **Routes** — `terms-of-service/page.tsx` and `privacy-policy/page.tsx`
   `generateMetadata` return `buildStaticPageMetadata(...)`, passing the
   existing i18n strings as fallbacks. Page bodies untouched.
3. **Loading states** — `loading.tsx` in both routes rendering the new
   `StaticPageSkeleton` (added to `components/ui/skeleton.tsx`), guarded by
   `useNavigation().isInitialLoad` like the sibling `loading.tsx` files so a
   client-side route change does not flash a skeleton.
4. **Markdown alternate** — drop the duplicated base URL in the two legal
   routes plus `about`, `cookies`, `items/[slug]` and `pages/[slug]`.
5. **Tests** — `apps/web-e2e/tests/public/legal-frontmatter-metadata.spec.ts`
   asserts, content-agnostically, that the document title contains the rendered
   `<h1>`, that the HTML metadata agrees with the `.md` mirror (whose title and
   description already come from frontmatter), that og/twitter tags are
   populated, and that the markdown alternate contains exactly one URL scheme.
   The e2e workflow now seeds `.content/pages/{terms-of-service,privacy-policy}.en.md`
   so CI exercises the frontmatter path rather than only the fallback.
6. **Docs** — `docs/guides/static-page-content.md` documents the
   data-repository file layout the ticket asks for: the `pages/` directory,
   the `<slug>.<locale>.md` naming convention with its `en` fallback, the
   frontmatter keys and what each one renders, the caching behaviour, and
   the missing-file / read-failure / invalid-frontmatter fallbacks. Indexed
   from `docs/guides/guides.md` and the Docusaurus sidebar;
   `docs/features/seo.md` gains the metadata resolution table.

## 5. Acceptance

- A Work whose `pages/terms-of-service.en.md` starts with
  `title: Nutzungsbedingungen` / `description: …` renders
  `<title>Nutzungsbedingungen | <site name></title>` and that description in
  `<meta name="description">`, `og:description` and `twitter:description`.
- With no `pages/` directory the two routes emit the previous i18n title and
  description (plus the site-name suffix and the new og/twitter tags).
- `link[rel=alternate][type="text/markdown"]` is a single absolute URL ending
  in `.md`.
- `pnpm lint` and `pnpm tsc --noEmit` clean; `pnpm build:web` succeeds;
  `legal-frontmatter-metadata.spec.ts`, `legal.spec.ts`,
  `static-info-pages-content.spec.ts` and `md-mirror-routes.spec.ts` pass.

## 6. Rollout

Ships with the normal `develop → stage → main` cascade. Deployed Works pick it
up on their next template auto-update; no data-repository change is required
because the frontmatter keys (`title`, `description`, `lastUpdated`) are the
ones the pages and the `.md` mirror already read.
