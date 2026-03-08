---
id: content-management-guide
title: Content Management Deep Dive
sidebar_label: Content Management
sidebar_position: 1
---

# Content Management Deep Dive

This guide covers the full content management lifecycle in the Ever Works Template, from how content is stored and parsed to caching, synchronization, and multi-language translation support.

## Content Data Model

All content in the template is driven by YAML files stored in a Git repository. Each content item lives in its own directory under `.content/data/` and follows a consistent schema defined in `lib/content.ts`.

### Item Schema

```typescript
// lib/content.ts
export interface ItemData {
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | Category | Category[] | string[];
  tags: string[] | Tag[];
  collections?: string[] | Collection[];
  featured?: boolean;
  icon_url?: string;
  updated_at: string;       // Raw string timestamp (e.g. "2024-06-15 10:30")
  updatedAt: Date;           // Parsed Date object
  promo_code?: PromoCode;
  markdown?: string;
  is_source_url_active?: boolean;
  action?: 'visit-website' | 'start-survey' | 'buy';
  publisher?: string;
  location?: ItemLocationData;
}
```

A typical YAML item file looks like this:

```yaml
# .content/data/my-tool/my-tool.yml
name: "My Tool"
description: "A great productivity tool"
source_url: "https://mytool.example.com"
category: "productivity"
tags:
  - time-tracking
  - collaboration
featured: true
updated_at: "2024-06-15 10:30"
```

### Supporting Types

Categories, tags, and collections each have their own top-level YAML files:

```typescript
// lib/content.ts
export interface Category {
  id: string;
  name: string;
  icon_url?: string;
  count?: number;
  image_url?: string;
}

export interface Tag {
  id: string;
  name: string;
  count?: number;
}
```

These are stored in `.content/categories/categories.yml`, `.content/tags/tags.yml`, and `.content/collections/collections.yml`.

## Git-Based CMS Architecture

The template uses a **Git-based CMS** approach. Content is stored in a separate GitHub repository, referenced by the `DATA_REPOSITORY` environment variable. This provides version control, collaboration via pull requests, and a clear audit trail.

### Content Path Resolution

The path to content varies by environment. The `getContentPath()` function in `lib/lib.ts` handles this:

```typescript
// lib/lib.ts
export function getContentPath() {
  const contentDir = '.content';
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

  // Vercel runtime: use /tmp because build artifact is read-only
  if (process.env.VERCEL && !isBuildPhase) {
    return path.join(os.tmpdir(), contentDir);  // /tmp/.content
  }

  // Local dev, Docker, Kubernetes: use project directory
  return path.join(process.cwd(), contentDir);   // ./.content
}
```

| Environment       | Content Path        | Writable | Persistent |
|-------------------|---------------------|----------|------------|
| Local development | `./.content`        | Yes      | Yes        |
| Vercel build      | `./.content`        | Yes      | Build only |
| Vercel runtime    | `/tmp/.content`     | Yes      | No (ephemeral) |
| Docker / K8s      | `./.content` or mounted volume | Yes | Depends on config |

### Initial Clone

During development, the content repository is cloned by `scripts/clone.cjs`:

```javascript
// scripts/clone.cjs (simplified)
const git = require("isomorphic-git");
const http = require("isomorphic-git/http/node");

const url = process.env.DATA_REPOSITORY;
const dest = path.join(process.cwd(), '.content');

await git.clone({
  fs,
  http,
  url,
  dir: dest,
  singleBranch: true,
  onAuth: () => ({ username: "x-access-token", password: token })
});
```

### Lazy Initialization at Runtime

On cold starts (especially Vercel serverless functions), content is cloned on first access via `ensureContentAvailable()`:

```typescript
// lib/lib.ts
export async function ensureContentAvailable(): Promise<string> {
  const state = getContentInitState();

  if (state.initialized) {
    return getContentPath();
  }

  if (state.promise) {
    return state.promise;
  }

  state.promise = (async () => {
    const contentPath = getContentPath();
    await fs.mkdir(contentPath, { recursive: true });

    const hasContent = await hasContentFiles(contentPath);

    if (!hasContent) {
      // Clone from Git on first request to cold container
      const { trySyncRepository } = await import('./repository');
      await trySyncRepository();
    }

    state.initialized = true;
    return contentPath;
  })();

  return state.promise;
}
```

This uses a `globalThis` singleton to ensure the initialization happens only once per serverless container.

## Content Parsing

Items are parsed from YAML using the `parseItem` function, which includes security measures to prevent directory traversal:

```typescript
// lib/content.ts
async function parseItem(base: string, filename: string) {
  const sanitizedFilename = sanitizeFilename(filename);
  const filepath = path.join(base, sanitizedFilename);
  const content = await safeReadFile(filepath, base);
  const meta = yaml.parse(content) as ItemData;
  meta.slug = path.basename(sanitizedFilename, path.extname(sanitizedFilename));
  meta.updatedAt = parse(meta.updated_at, 'yyyy-MM-dd HH:mm', new Date());
  return meta;
}
```

### Security Utilities

The content layer includes built-in security functions to prevent path traversal and injection attacks:

```typescript
// lib/content.ts
function sanitizeFilename(filename: string): string {
  const sanitized = path.basename(filename);
  if (sanitized.includes('..') || sanitized.includes('/') || sanitized.includes('\\')) {
    throw new Error('Invalid filename: contains dangerous characters');
  }
  return sanitized;
}

function validatePath(filepath: string, basePath: string): void {
  const resolvedPath = path.resolve(filepath);
  const resolvedBase = path.resolve(basePath);
  if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
    throw new Error('Invalid file path: outside of allowed directory');
  }
}
```

## Fetching and Populating Content

The main entry point for reading content is `fetchItems()`, which reads all items from the filesystem, populates category/tag references, and applies sorting:

```typescript
// lib/content.ts (simplified)
export async function fetchItems(options: FetchOptions = {}): Promise<FetchItemsResult> {
  await ensureContentAvailable();

  const dest = path.join(getContentPath(), 'data');
  const files = await fsp.readdir(dest);

  const categories = await readCategories(options);
  const tags = await readTags(options);
  const collections = await readCollections(options);

  const items = await Promise.all(
    files.map(async (slug) => {
      const item = await parseItem(path.join(dest, slug), `${slug}.yml`);

      // Populate tag and category references
      if (Array.isArray(item.tags)) {
        item.tags = item.tags.map((tag) => populateTag(tag, tags));
      }
      if (Array.isArray(item.category)) {
        item.category = item.category.map((cat) => populateCategory(cat, categories));
      }
      return item;
    })
  );

  return {
    total: items.length,
    items: items.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }),
    categories: Array.from(categories.values()),
    tags: Array.from(tags.values()),
    collections: Array.from(collections.values()),
  };
}
```

## Multi-Layer Caching

The content system uses multiple caching layers to minimize filesystem reads and improve performance.

### Layer 1: In-Memory Cache

```typescript
// lib/content.ts
const fetchItemsCache = new Map<string, { data: FetchItemsResult; timestamp: number }>();
const FETCH_ITEMS_CACHE_TTL = 600000; // 10 minutes

// Smart directory caching avoids re-reading the filesystem
const directoryCache = new Map<string, DirectoryCache>();
const DIRECTORY_CACHE_TTL = 600000; // 10 minutes
```

The directory cache is especially smart -- it checks the directory modification time (`mtime`) and only re-reads from disk if the directory has actually changed:

```typescript
const dirStat = await fsp.stat(dest);
const currentMtime = dirStat.mtimeMs;

if (cachedDir && cachedDir.mtime === currentMtime &&
    Date.now() - cachedDir.timestamp < DIRECTORY_CACHE_TTL) {
  // Use cached data - directory hasn't changed
  files = cachedDir.files;
} else {
  // Re-read from filesystem
  files = await fsp.readdir(dest);
}
```

### Layer 2: Next.js `unstable_cache`

Configuration data is cached with Next.js built-in caching:

```typescript
// lib/content.ts
export const getCachedConfig = unstable_cache(
  async () => {
    return await getConfig();
  },
  ['config'],
  { revalidate: 60 }
);
```

### Layer 3: Cache Tags and Invalidation

Cache tags are defined centrally in `lib/cache-config.ts`:

```typescript
// lib/cache-config.ts
export const CACHE_TAGS = {
  CONTENT: 'content',
  ITEMS: 'items',
  ITEM: (slug: string) => `item:${slug}`,
  CATEGORIES: 'categories',
  TAGS: 'tags',
  COLLECTIONS: 'collections',
  CONFIG: 'config',
  PAGES: 'pages',
  ITEMS_LOCALE: (locale: string) => `items:${locale}`,
};

export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,
  CONFIG: 600,
  PAGES: 600,
};
```

### Cache Invalidation

After a sync operation, all caches are invalidated through `lib/cache-invalidation.ts`:

```typescript
// lib/cache-invalidation.ts
export async function invalidateContentCaches(): Promise<void> {
  safeRevalidateTag(CACHE_TAGS.CONTENT);
  safeRevalidateTag(CACHE_TAGS.ITEMS);
  safeRevalidateTag(CACHE_TAGS.CATEGORIES);
  safeRevalidateTag(CACHE_TAGS.TAGS);
  safeRevalidateTag(CACHE_TAGS.COLLECTIONS);
  safeRevalidateTag(CACHE_TAGS.PAGES);

  // Also clear in-memory caches
  await clearFetchItemsCache();
}
```

The `safeRevalidateTag` wrapper handles the case where revalidation is called during a React render phase:

```typescript
function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, 'max');
  } catch (error) {
    if (error instanceof Error && isRenderPhaseError(error)) {
      console.warn(`Skipping cache invalidation during render phase (tag: ${tag})`);
    } else {
      throw error;
    }
  }
}
```

## Content Synchronization

Content is kept up to date through periodic Git sync operations managed by `lib/repository.ts`.

### Pull Mechanism

The repository module uses `isomorphic-git` (a pure JavaScript Git implementation) to pull changes:

```typescript
// lib/repository.ts (simplified)
export async function trySyncRepository() {
  const url = process.env.DATA_REPOSITORY;
  const dest = getContentPath();
  const auth = getGitAuth(process.env.GH_TOKEN);

  const gitDir = path.join(dest, '.git');
  if (await fsExists(gitDir)) {
    // Repository exists - pull changes
    await pullChanges(url, dest, auth);
  } else {
    // Fresh clone
    await git.clone({ fs, http, url, dir: dest, singleBranch: true, onAuth: () => auth });
  }

  // Invalidate caches after sync
  await invalidateContentCaches();
}
```

### Handling Local Changes

Before pulling remote changes, the system checks for uncommitted local changes (from admin write operations) and pushes them first:

```typescript
// lib/repository.ts
async function checkForLocalChanges(dir: string): Promise<boolean> {
  const status = await git.statusMatrix({ fs, dir });
  return status.some(([, head, workdir, stage]) =>
    head !== workdir || head !== stage
  );
}

async function tryPushLocalChanges(dir: string, url: string, auth: GitAuth): Promise<boolean> {
  await git.add({ fs, dir, filepath: '.' });
  await git.commit({
    fs, dir,
    message: `[Auto] Save local changes before sync - ${new Date().toISOString()}`,
    author: { name: 'Website Bot', email: 'bot@ever.works' },
  });
  await git.push({ onAuth: () => auth, fs, http, dir, url });
  return true;
}
```

## Multi-Language Content

The content system supports translations through language-specific YAML files placed alongside the base content.

### Translation File Structure

```
.content/
  data/
    my-tool/
      my-tool.yml          # Base content (English)
      my-tool.fr.yml       # French translation
      my-tool.es.yml       # Spanish translation
      my-tool.ar.yml       # Arabic translation
  categories/
    categories.yml         # Base categories
    categories.fr.yml      # French category translations
  tags/
    tags.yml
    tags.fr.yml
```

### Translation Loading

Translations are loaded and merged with the base content:

```typescript
// lib/content.ts
if (options.lang && options.lang !== 'en') {
  if (!validateLanguageCode(options.lang)) {
    throw new Error(`Invalid language code: ${options.lang}`);
  }
  const translation = await parseTranslation(base, `${slug}.${options.lang}.yml`);
  if (translation) Object.assign(item, translation);
}
```

Language codes are validated to prevent path traversal attacks:

```typescript
function validateLanguageCode(lang: string): boolean {
  const validLangPattern = /^[a-zA-Z0-9_-]+$/;
  return validLangPattern.test(lang) && lang.length <= 10;
}
```

## Configuration via YAML

The global site configuration is stored in `.content/config.yml` and parsed into a typed `Config` interface:

```typescript
// lib/content.ts
export interface Config {
  company_name?: string;
  content_table?: boolean;
  item_name?: string;
  items_name?: string;
  app_url?: string;
  auth?: false | AuthOptions;
  authConfig?: AuthConfig;
  pricing?: PricingPlanConfig;
  pagination?: TypePagination;
  settings?: Settings;
  logo?: LogoSettings;
  custom_hero?: CustomHeroConfig;
  custom_header?: CustomNavigationItem[];
  custom_footer?: CustomNavigationItem[];
}
```

The config is loaded with a 60-second cache:

```typescript
export const getCachedConfig = unstable_cache(
  async () => getConfig(),
  ['config'],
  { revalidate: 60 }
);
```

## Environment Variables

| Variable           | Required | Description |
|--------------------|----------|-------------|
| `DATA_REPOSITORY`  | Yes      | GitHub URL for the content repository |
| `GH_TOKEN`         | Private repos | GitHub personal access token with repo read/write |
| `GITHUB_BRANCH`    | No       | Branch to clone (defaults to main) |
| `DISABLE_AUTO_SYNC`| No       | Set to `true` to disable background sync |
| `CRON_SECRET`      | Production | Secret for the cron sync endpoint |

## Key Source Files

| File | Purpose |
|------|---------|
| `lib/content.ts` | Core content parsing, fetching, caching, and similarity engine |
| `lib/lib.ts` | Content path resolution, lazy initialization, filesystem utilities |
| `lib/repository.ts` | Git clone, pull, push operations using isomorphic-git |
| `lib/cache-config.ts` | Centralized cache tag and TTL definitions |
| `lib/cache-invalidation.ts` | Safe cache invalidation with render-phase protection |
| `scripts/clone.cjs` | Initial content clone during development setup |
| `lib/services/sync-service.ts` | Background sync manager |
| `app/api/cron/sync/route.ts` | HTTP endpoint for triggering content sync |
