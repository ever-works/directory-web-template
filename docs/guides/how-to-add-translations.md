---
id: how-to-add-translations
title: "How to Add Translations"
sidebar_label: "Add Translations"
sidebar_position: 8
---

# How to Add Translations

This guide covers the complete internationalization (i18n) workflow: adding message keys, using translations in components, supporting RTL languages, handling pluralization, and managing multiple locale files.

## Prerequisites

- Familiarity with `next-intl` library
- Understanding of the `messages/` directory structure
- Development server running (`pnpm dev`)

---

## Architecture Overview

The template uses **next-intl** for internationalization. Translation files are JSON and live in the `messages/` directory:

```
messages/
  en.json       # English (primary/reference locale)
  fr.json       # French
  es.json       # Spanish
  de.json       # German
  ar.json       # Arabic (RTL)
  he.json       # Hebrew (RTL)
  ja.json       # Japanese
  ko.json       # Korean
  zh.json       # Chinese
  pt.json       # Portuguese
  ru.json       # Russian
  ... 21 locale files total
```

Messages are organized by namespace (section), with keys in UPPER_SNAKE_CASE:

```json
{
  "auth": {
    "SIGN_IN": "Sign In",
    "SIGN_UP": "Sign up"
  },
  "common": {
    "HOME": "Home",
    "ABOUT": "About"
  },
  "admin": {
    "ADMIN_ITEMS_PAGE": {
      "TITLE": "Items Management"
    }
  }
}
```

---

## Step 1: Add Keys to the English File

Always start with `messages/en.json` as the reference locale. Add your keys under the appropriate namespace, or create a new namespace:

```json
{
  "bookmarks": {
    "TITLE": "My Bookmarks",
    "ADD_BOOKMARK": "Add bookmark",
    "REMOVE_BOOKMARK": "Remove bookmark",
    "NO_BOOKMARKS": "You have not bookmarked any items yet.",
    "BOOKMARK_ADDED": "Bookmark added successfully",
    "BOOKMARK_REMOVED": "Bookmark removed",
    "BOOKMARK_COUNT": "You have {count} bookmarks",
    "CONFIRM_REMOVE": "Are you sure you want to remove this bookmark?"
  }
}
```

### Naming Conventions

| Pattern | Use Case | Example |
|---------|----------|---------|
| `UPPER_SNAKE_CASE` | All translation keys | `SIGN_IN`, `NO_BOOKMARKS` |
| Namespace grouping | Feature sections | `auth.SIGN_IN`, `bookmarks.TITLE` |
| Nested namespaces | Admin sub-pages | `admin.ADMIN_ITEMS_PAGE.TITLE` |
| `{variable}` | Dynamic values | `"Hello, {name}"` |

---

## Step 2: Add Keys to All Locale Files

Every key added to `en.json` must also be added to all other locale files. Untranslated keys will fall back to the English value, but it is best practice to translate them.

```json
// messages/fr.json
{
  "bookmarks": {
    "TITLE": "Mes favoris",
    "ADD_BOOKMARK": "Ajouter un favori",
    "REMOVE_BOOKMARK": "Supprimer le favori",
    "NO_BOOKMARKS": "Vous n'avez pas encore de favoris.",
    "BOOKMARK_ADDED": "Favori ajout\u00e9 avec succ\u00e8s",
    "BOOKMARK_REMOVED": "Favori supprim\u00e9",
    "BOOKMARK_COUNT": "Vous avez {count} favoris",
    "CONFIRM_REMOVE": "\u00cates-vous s\u00fbr de vouloir supprimer ce favori ?"
  }
}
```

```json
// messages/ar.json (RTL language)
{
  "bookmarks": {
    "TITLE": "\u0627\u0644\u0645\u0641\u0636\u0644\u0627\u062a",
    "ADD_BOOKMARK": "\u0625\u0636\u0627\u0641\u0629 \u0645\u0641\u0636\u0644\u0629",
    "REMOVE_BOOKMARK": "\u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0645\u0641\u0636\u0644\u0629",
    "NO_BOOKMARKS": "\u0644\u0645 \u062a\u0642\u0645 \u0628\u0625\u0636\u0627\u0641\u0629 \u0623\u064a \u0639\u0646\u0627\u0635\u0631 \u0625\u0644\u0649 \u0627\u0644\u0645\u0641\u0636\u0644\u0629 \u0628\u0639\u062f."
  }
}
```

---

## Step 3: Use Translations in Components

### Client Components

```tsx
'use client';

import { useTranslations } from 'next-intl';

export function BookmarksList() {
  const t = useTranslations('bookmarks');

  return (
    <div>
      <h1>{t('TITLE')}</h1>
      <p>{t('NO_BOOKMARKS')}</p>
    </div>
  );
}
```

### With Dynamic Values

```tsx
const t = useTranslations('bookmarks');

// Message: "You have {count} bookmarks"
<p>{t('BOOKMARK_COUNT', { count: bookmarks.length })}</p>
```

### Nested Namespaces

```tsx
// For deeply nested keys like admin.ADMIN_ITEMS_PAGE.TITLE
const t = useTranslations('admin.ADMIN_ITEMS_PAGE');
<h1>{t('TITLE')}</h1>
```

### Server Components

```tsx
import { getTranslations } from 'next-intl/server';

export default async function BookmarksPage() {
  const t = await getTranslations('bookmarks');

  return (
    <div>
      <h1>{t('TITLE')}</h1>
    </div>
  );
}
```

---

## Step 4: Handle Pluralization

`next-intl` supports ICU MessageFormat for pluralization:

```json
// messages/en.json
{
  "bookmarks": {
    "ITEM_COUNT": "{count, plural, =0 {No bookmarks} one {1 bookmark} other {# bookmarks}}"
  }
}
```

Usage in component:

```tsx
const t = useTranslations('bookmarks');

<p>{t('ITEM_COUNT', { count: 0 })}</p>   // "No bookmarks"
<p>{t('ITEM_COUNT', { count: 1 })}</p>   // "1 bookmark"
<p>{t('ITEM_COUNT', { count: 5 })}</p>   // "5 bookmarks"
```

For languages with more plural forms (Arabic has six), define all categories:

```json
// messages/ar.json
{
  "bookmarks": {
    "ITEM_COUNT": "{count, plural, =0 {\u0644\u0627 \u0645\u0641\u0636\u0644\u0627\u062a} one {\u0645\u0641\u0636\u0644\u0629 \u0648\u0627\u062d\u062f\u0629} two {\u0645\u0641\u0636\u0644\u062a\u0627\u0646} few {# \u0645\u0641\u0636\u0644\u0627\u062a} many {# \u0645\u0641\u0636\u0644\u0629} other {# \u0645\u0641\u0636\u0644\u0629}}"
  }
}
```

---

## Step 5: RTL Support

The template supports RTL (Right-to-Left) languages like Arabic (`ar`) and Hebrew (`he`). The layout direction is typically handled at the root layout level:

```tsx
// app/[locale]/layout.tsx

import { getLocale } from 'next-intl/server';

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dir = ['ar', 'he'].includes(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
```

### RTL-Aware Styling

Use logical CSS properties and Tailwind RTL utilities:

```tsx
// Instead of ml-4 (margin-left), use ms-4 (margin-start)
<div className="ms-4 ps-2">
  {/* ms = margin-inline-start, ps = padding-inline-start */}
</div>

// Instead of text-left, use text-start
<p className="text-start">Content</p>

// For icons that should flip in RTL
<ChevronRight className="rtl:rotate-180" />
```

---

## Step 6: Adding a New Language

To add a completely new locale:

### 1. Create the message file

```bash
# Copy English as the starting template
cp messages/en.json messages/sv.json
```

### 2. Translate all keys

Edit `messages/sv.json` and translate all values to Swedish.

### 3. Register the locale

Update the i18n configuration to include the new locale:

```ts
// i18n/config.ts or next-intl config

export const locales = ['en', 'fr', 'es', 'de', 'ar', 'sv'] as const;
export const defaultLocale = 'en';
```

### 4. Update middleware

Ensure the middleware recognizes the new locale for routing:

```ts
// middleware.ts
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'fr', 'es', 'de', 'ar', 'sv'],
  defaultLocale: 'en',
});
```

---

## Step 7: Language Switcher

The template includes a `LanguageSwitcher` component that automatically lists available locales:

```tsx
// components/language-switcher.tsx (already exists)

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    // Replace the locale segment in the URL
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  // Renders buttons/dropdown for each locale
}
```

---

## Message File Organization

Keep messages organized by feature:

```json
{
  "auth": { ... },           // Authentication strings
  "common": { ... },         // Shared/global strings
  "header": { ... },         // Header navigation
  "footer": { ... },         // Footer content
  "admin": {                 // Admin panel
    "ADMIN_ITEMS_PAGE": { ... },
    "COUPONS": { ... }
  },
  "bookmarks": { ... },      // Bookmarks feature
  "payment": { ... },        // Payment/billing
  "errors": { ... }          // Error messages
}
```

---

## Handling Missing Translations

If a key is missing in a non-English locale, `next-intl` can be configured to fall back:

```ts
// i18n config
{
  messages: {
    ...require(`../messages/${locale}.json`),
  },
  onError: (error) => {
    // Log missing translations in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Missing translation:', error.message);
    }
  },
  getMessageFallback: ({ namespace, key }) => {
    // Fall back to the key name
    return `${namespace}.${key}`;
  },
}
```

---

## Supported Locales Reference

| Code | Language | Direction | File |
|------|----------|-----------|------|
| `en` | English | LTR | `en.json` |
| `fr` | French | LTR | `fr.json` |
| `es` | Spanish | LTR | `es.json` |
| `de` | German | LTR | `de.json` |
| `pt` | Portuguese | LTR | `pt.json` |
| `it` | Italian | LTR | `it.json` |
| `nl` | Dutch | LTR | `nl.json` |
| `pl` | Polish | LTR | `pl.json` |
| `ru` | Russian | LTR | `ru.json` |
| `uk` | Ukrainian | LTR | `uk.json` |
| `tr` | Turkish | LTR | `tr.json` |
| `ar` | Arabic | **RTL** | `ar.json` |
| `he` | Hebrew | **RTL** | `he.json` |
| `ja` | Japanese | LTR | `ja.json` |
| `ko` | Korean | LTR | `ko.json` |
| `zh` | Chinese | LTR | `zh.json` |
| `hi` | Hindi | LTR | `hi.json` |
| `th` | Thai | LTR | `th.json` |
| `vi` | Vietnamese | LTR | `vi.json` |
| `id` | Indonesian | LTR | `id.json` |
| `bg` | Bulgarian | LTR | `bg.json` |

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Translation key shows raw key name | Verify the key exists in the message file for the current locale. Check for typos. |
| `useTranslations` returns undefined | Ensure the namespace matches the top-level key in the JSON file. |
| RTL layout broken | Check that the `dir` attribute is set on the `<html>` element and use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`). |
| New locale not showing in switcher | Add the locale to both the config and middleware. |
| Pluralization not working | Ensure you use the ICU MessageFormat syntax: `{count, plural, one {# item} other {# items}}`. |
| JSON parse error | Validate your JSON files. A common issue is trailing commas or unescaped characters. |

---

## Checklist

- [ ] Keys added to `messages/en.json` under the appropriate namespace
- [ ] Keys added to all other locale files (21 files total)
- [ ] Component uses `useTranslations()` or `getTranslations()` -- no hardcoded strings
- [ ] Dynamic values use `{variable}` syntax in messages and `t('KEY', { variable })` in code
- [ ] Pluralization uses ICU MessageFormat where needed
- [ ] RTL support verified for `ar` and `he` locales
- [ ] Language switcher works with the new keys
- [ ] JSON files are valid (no syntax errors)
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm build` passes (translation errors surface at build time)

---

## Related Guides

- [How to Add a New Feature](./how-to-add-a-new-feature.md)
- [How to Add a New Component](./how-to-add-a-new-component.md)
- [How to Create Admin Pages](./how-to-create-admin-pages.md)
