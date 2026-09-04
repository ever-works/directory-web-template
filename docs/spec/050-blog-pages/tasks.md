---
id: tasks-050-blog-pages
title: Tasks 050 — Blog pages
sidebar_label: 050 Tasks
---

# Tasks — `050-blog-pages`

> **Spec:** [`spec.md`](./spec.md)
>
> **Plan:** [`plan.md`](./plan.md)

## Phase 1 — Foundation (EW-25)

- [x] T-001: add `apps/web/types/post.ts` with the post, taxonomy and result types.
- [x] T-002: add `apps/web/lib/blog/constants.ts` (default 9, ceiling 48) and
      `apps/web/lib/blog/urls.ts` (URL builders, search-param parsing, date formatting).
- [x] T-003: add the posts loader to `apps/web/lib/content.ts` on top of
      `ensureContentAvailable` / `safeReadFile` / `sanitizeFilename` /
      `mapWithConcurrency`, covering frontmatter parsing, draft filtering,
      locale-suffixed filenames, author resolution and reading-time estimation.
- [x] T-004: register `POSTS`, `POST(slug)` and `POSTS_LOCALE(locale)` cache tags
      and expose `getCachedPosts` / `getCachedPost` / `getCachedAdjacentPosts` /
      `getCachedPostTaxonomies`.
- [x] T-005: add the `hasPosts` content signal and thread it through
      `SettingsProvider` and the new `useBlogExists()` hook.
- [x] T-006: add the Blog entry to the header navigation and the footer product
      column, gated on `hasPosts`; drop the external blog shortcut from the More
      menu when the site has its own posts.
- [x] T-007: add `common.BLOG` and the `blog` namespace to all 21 locale files.
- [x] T-008: add `apps/web/app/[locale]/blog/page.tsx` with the site Hero layout,
      `generateListingMetadata()` and `BreadcrumbJsonLd`.
- [x] T-009: add `/blog` to the static sitemap routes.

## Phase 2 — Listing and pagination (EW-26)

- [x] T-010: sort newest first with undated posts last, then alphabetically.
- [x] T-011: build `PostCard` with title, excerpt, author, date, reading time
      and a "Read more" affordance.
- [x] T-012: resolve posts-per-page from `works.yml` `blog.pagination.per_page`
      (with the `posts_per_page` alias), clamped to `MAX_POSTS_PER_PAGE`.
- [x] T-013: add link-based `BlogPagination` with `rel="prev"` / `rel="next"`,
      a page window with gaps, and clamping for out-of-range pages.
- [x] T-014: add `loading.tsx` skeleton and the empty state.

## Phase 3 — Post detail (EW-27)

- [x] T-015: add `fetchPost()` / `fetchAdjacentPosts()` and their cached wrappers.
- [x] T-016: add `apps/web/app/[locale]/blog/[slug]/page.tsx` with a `prose`
      article body rendered through the existing `MDX` component.
- [x] T-017: render the post header (title, author, date, reading time) and the
      responsive featured image via `PostImage`.
- [x] T-018: add the breadcrumb, `BreadcrumbJsonLd`, back-to-listing link and
      previous/next post navigation.
- [x] T-019: emit OpenGraph `article` metadata and `BlogPosting` JSON-LD; add
      post entries to the sitemap.

## Phase 4 — Categories and tags (EW-28)

- [x] T-020: derive taxonomies from frontmatter and merge declared
      `categories.yml` / `tags.yml` when the data repository ships them.
- [x] T-021: add `BlogFilters` chip rows that toggle `?category=` / `?tag=`.
- [x] T-022: add `/blog/category/[slug]` and `/blog/tag/[slug]` archives, with
      `notFound()` for unknown terms and their own listing metadata.
- [x] T-023: render category chips above the title and tag chips below the body
      on the post page.
- [x] T-024: add non-empty category and tag archives to the sitemap.

## Phase 5 — Search (EW-29)

- [x] T-025: extend the loader with a `q` filter over title, excerpt, body,
      author and term names.
- [x] T-026: add the debounced `BlogSearch` client island bound to `?q=`.
- [x] T-027: add `HighlightText` and apply it to card titles and excerpts.
- [x] T-028: show the result count and clear control, and mark search pages
      `noindex, follow`.
- [x] T-029: add the dedicated no-results state.

## Phase 6 — Delivery

- [x] T-030: add `/blog/rss.xml` beside the existing site feed via
      `buildPostFeedEntries()`.
- [x] T-031: add Playwright coverage for the listing and the post detail page.
- [x] T-032: seed blog posts (three published, one draft, one author) in the CI
      content fixture so the data-dependent specs run instead of skipping.
- [x] T-033: document the `.content/posts/` layout and frontmatter in `README.md`.
- [x] T-034: write this spec, index it in `docs/spec/README.md`, and log the change.

## Acceptance Criteria to Task Map

| AC           | Tasks               |
| ------------ | ------------------- |
| AC-1         | T-005, T-006, T-007 |
| AC-2, AC-3   | T-008               |
| AC-4         | T-008, T-009        |
| AC-5         | T-010               |
| AC-6         | T-011               |
| AC-7         | T-012               |
| AC-8         | T-013               |
| AC-9         | T-014               |
| AC-10        | T-016               |
| AC-11, AC-12 | T-017               |
| AC-13        | T-015, T-018        |
| AC-14        | T-019               |
| AC-15        | T-020               |
| AC-16        | T-021               |
| AC-17        | T-022               |
| AC-18        | T-023               |
| AC-19        | T-024               |
| AC-20        | T-026               |
| AC-21        | T-025               |
| AC-22        | T-027               |
| AC-23        | T-028               |
| AC-24        | T-029               |

## Rollback

Remove the `/blog` routes and the two navigation entries. The loader reads a
folder nothing else touches and introduces no schema change, so removal is
local to this feature.
