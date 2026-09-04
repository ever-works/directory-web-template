---
id: spec-050-blog-pages
title: Spec 050 — Blog pages
sidebar_label: 050 Blog pages
---

# Feature spec — `050-blog-pages`

## 1. Summary

A directory site reads Markdown blog posts from its Git-based CMS repository
(`.content/posts/`) and publishes them as a first-class `/blog` section: a
navigation entry, a paginated newest-first listing, an individual post page,
category and tag archives, and keyword search.

## 2. Motivation

`README.md` has documented `.content/posts/  # Blog posts` since May 2025, but
nothing in the template ever read that folder — a data repository could ship
posts and the generated site would silently ignore them. Directory operators
publish release notes, tutorials and industry commentary to earn organic search
traffic; without a blog they either bolt on a separate CMS or drop the content.

## 3. Goals

- Read posts through the **existing** content pipeline in `lib/content.ts`
  (`ensureContentAvailable`, `safeReadFile`, `sanitizeFilename`,
  `mapWithConcurrency`, `unstable_cache`) — no second content system.
- Ship the whole reader surface: listing, detail, taxonomy archives, search.
- Stay entirely optional: a data repository with no posts renders a graceful
  empty state and hides the Blog navigation entry.
- Localise every string in all 21 message catalogues.
- Feed SEO surfaces: sitemap, canonical URLs, OpenGraph `article`, JSON-LD, RSS.

## 4. Non-Goals

- Authoring or editing posts in the app (posts are Git content, like every other
  content type in this template).
- Comments, reactions or subscriptions on posts.
- Per-locale post translation workflows beyond the `<slug>.<locale>.md`
  filename convention `.content/pages/` already uses.
- Full-text indexing infrastructure; search is an in-memory scan over the
  already-cached post set, matching how `filterItems()` searches directory items.

## 5. User Stories

- **EW-25** As a visitor I want a Blog link in the main navigation and a `/blog`
  landing page so I can discover articles.
- **EW-26** As a reader I want a paginated, newest-first list showing title,
  excerpt, author and date so I can browse efficiently.
- **EW-27** As a reader I want a clean post page with title, author, date,
  reading time, a responsive featured image and a way back to the listing.
- **EW-28** As a reader I want to filter posts by category and tag, and to open a
  dedicated page per category or tag.
- **EW-29** As a reader I want to search posts by keyword and see the matches
  highlighted, counted, and clearable.

## 6. Acceptance Criteria

### EW-25 — structure and navigation

- [x] AC-1: `Blog` appears in the header navigation and the footer product
      column, using the localised `common.BLOG` key, and is hidden when the data
      repository ships no posts.
- [x] AC-2: `/blog` (and `/<locale>/blog`) renders with the site's `Hero` +
      `Container` + `DecorativeBg` layout, responsive from mobile to desktop.
- [x] AC-3: the listing emits a title, description, canonical URL, OpenGraph and
      Twitter metadata through the shared `generateListingMetadata()` helper.
- [x] AC-4: `/blog` is present in `sitemap.xml`, and `BreadcrumbJsonLd` describes
      the Home to Blog trail.

### EW-26 — listing with pagination

- [x] AC-5: posts render newest first; undated posts sort last, then by title.
- [x] AC-6: each card shows title, excerpt, author, publication date, reading
      time and a "Read more" affordance linking to the post.
- [x] AC-7: posts-per-page is configurable through `works.yml`
      (`blog.pagination.per_page`, matching the platform's `blogSpec` schema),
      defaults to 9 and is clamped to at most 48.
- [x] AC-8: pagination is rendered as real `<a href="?page=N">` links with
      `rel="prev"` / `rel="next"`; an out-of-range page clamps instead of erroring.
- [x] AC-9: `loading.tsx` renders a skeleton matching the real grid, and an empty
      state is shown when the repository has no posts.

### EW-27 — individual post page

- [x] AC-10: `/blog/[slug]` renders the body through the existing `MDX`
      component inside a `prose` container with a constrained measure.
- [x] AC-11: the header shows title, author, publication date (`<time dateTime>`)
      and estimated reading time.
- [x] AC-12: a featured image renders responsively via `next/image` with `fill`
      and a `sizes` hint, falling back to `unoptimized` for hosts that are not
      allow-listed.
- [x] AC-13: a breadcrumb (Home / Blog / title) plus an explicit
      "Back to blog" link and previous/next post navigation are present.
- [x] AC-14: metadata uses OpenGraph `type: article` with `publishedTime` and
      authors, and the page emits `BlogPosting` JSON-LD.

### EW-28 — categories and tags

- [x] AC-15: categories and tags are read from post frontmatter and, when the
      data repository declares `categories.yml` / `tags.yml` beside the posts,
      those files supply canonical names and ordering.
- [x] AC-16: the listing renders category and tag chip rows that toggle
      `?category=` / `?tag=` on the current path; clicking an active chip clears it.
- [x] AC-17: `/blog/category/[slug]` and `/blog/tag/[slug]` render the same
      listing with the term pinned, and return 404 for an unknown term.
- [x] AC-18: a post page shows its categories above the title and its tags below
      the body, each linking to the corresponding archive.
- [x] AC-19: category and tag archives with at least one post appear in the sitemap.

### EW-29 — search

- [x] AC-20: the listing carries a labelled search box bound to `?q=`.
- [x] AC-21: the query matches title, excerpt, Markdown body, author name and
      term names, case-insensitively.
- [x] AC-22: matches are highlighted with `<mark>` in card titles and excerpts,
      built by splitting in React — never `dangerouslySetInnerHTML`.
- [x] AC-23: a result count and a clear control are shown while a filter is
      active, and search pages are `noindex, follow`.
- [x] AC-24: a query with no matches renders a dedicated no-results message.

## 7. Out-of-Scope Considerations

Search runs in memory over the cached post set. That is the right trade at the
scale a Git content repository implies (tens to low hundreds of posts); a site
that outgrows it should move to the search-plugin surface rather than grow this
loader.

## 8. UX Notes

Every visible string is localised into all 21 catalogues under
`apps/web/messages/`. The blog uses the existing chip, card, hero and pagination
visual language rather than introducing a new one, so a generated site looks the
same with or without a blog.

## 9. Data and API Surface

Posts are files, not database rows. No new HTTP API is introduced. The reader
routes are:

| Route                   | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `/blog`                 | listing; `?page=`, `?q=`, `?category=`, `?tag=` |
| `/blog/[slug]`          | one post                                        |
| `/blog/category/[slug]` | per-category archive                            |
| `/blog/tag/[slug]`      | per-tag archive                                 |
| `/blog/rss.xml`         | RSS 2.0 feed of posts                           |

Post files live at `.content/posts/<slug>.<locale>.md` (or `<slug>.md`), with
`.content/blog/posts/` and `.content/blog/` accepted as fallbacks. Recognised
frontmatter:

| Key                                           | Meaning                                                 |
| --------------------------------------------- | ------------------------------------------------------- |
| `title`                                       | post title (falls back to the slug)                     |
| `description` / `excerpt` / `summary`         | excerpt (derived from the body when absent)             |
| `date` / `publishedAt` / `published_at`       | publication date                                        |
| `author`                                      | author name, resolved against `posts/authors/<slug>.md` |
| `category` / `categories`                     | one or many categories                                  |
| `tag` / `tags`                                | one or many tags                                        |
| `image` / `heroImage` / `cover` / `thumbnail` | featured image                                          |
| `draft: true`, `published: false`, `status`   | hides the post                                          |
| `reading_time` / `readingTime`                | overrides the computed estimate                         |

Site configuration adds one optional block to `works.yml`:

```yaml
blog:
    pagination:
        per_page: 9
```

## 10. Plugin / Adapter Impact

None. The blog is a reader surface over the existing Git content adapter.

## 11. Risks and Open Questions

- A data repository can point `image` at an arbitrary host. `next/image` returns
  400 for hosts outside `remotePatterns`, so `PostImage` falls back to
  `unoptimized` rather than breaking the page.
- Cached listing payloads must stay under the Next.js Data Cache entry limit; the
  `MAX_POSTS_PER_PAGE` ceiling and the body-stripping `PostSummary` shape are
  what keep them small.
- Post caches are pinned to the content revision as well as tagged. Tag
  invalidation alone is not sufficient: `invalidateContentCaches()` is skipped
  when a sync lands during a render phase, and a cold-started instance that
  missed that call would keep serving a pre-sync post list until the TTL
  expired. `getCachedItems()` already takes this precaution.
- An undated post is deliberately excluded from `/blog/rss.xml`. Feed items need
  a stable `pubDate`; stamping "now" would re-announce the same post as new on
  every regeneration. Such posts still appear on `/blog` and at their own URL.
- A section feed must advertise its own `atom:link rel="self"` and must not
  advertise formats it does not publish, or readers canonicalize blog
  subscribers onto the site-wide directory feed.

## 12. Acceptance Test Plan

Playwright specs `apps/web-e2e/tests/public/blog.spec.ts` and
`blog-detail-public.spec.ts` cover route reachability, metadata, the empty
state, search plus highlighting plus clear, pagination, chips, the RSS feed and
the sitemap entry. Data-dependent assertions skip when the fixture has no posts,
and the CI content fixture in `.github/workflows/e2e.yml` seeds three published
posts plus a draft so those branches actually run.

## 13. References

- Jira: EW-25, EW-26, EW-27, EW-28, EW-29
- Related spec: [042 site identity metadata](../042-site-identity-metadata/spec.md)
- `README.md` — `.content/posts/` layout and frontmatter reference
