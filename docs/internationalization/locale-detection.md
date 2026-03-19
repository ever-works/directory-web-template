---
id: locale-detection
title: Locale Detection and Routing
sidebar_label: Locale Detection
sidebar_position: 3
---

# Locale Detection and Routing

The template uses `next-intl` for locale detection with automatic browser language matching, URL-based locale routing, cookie persistence, and a message fallback system. This page covers the full locale detection flow from incoming request to rendered page.

## Detection Flow

When a request arrives, the locale is determined through this sequence:

1. **URL prefix** -- If the URL contains a locale prefix (e.g., `/fr/about`), that locale is used directly
2. **Cookie** -- If no URL prefix is present, the system checks for a locale cookie set by the LanguageSwitcher
3. **Accept-Language header** -- If no cookie exists, the browser's language preference header is read
4. **Default fallback** -- If no match is found, the default locale (`en`) is used

This sequence is controlled by the `localeDetection: true` setting in the routing configuration.

## Source Files

| File | Role in Detection |
|------|-------------------|
| `i18n/routing.ts` | Defines supported locales, prefix strategy, detection toggle |
| `i18n/request.ts` | Validates resolved locale, loads and merges messages |
| `i18n/navigation.ts` | Provides locale-aware Link, router, redirect |
| `lib/constants.ts` | Source of truth for LOCALES array and RTL_LOCALES |
| `components/language-switcher.tsx` | Sets locale cookie via router.replace |
| `app/[locale]/layout.tsx` | Validates locale, rejects invalid ones with notFound() |

## Routing Configuration

The routing module at `i18n/routing.ts` controls locale detection behavior:

```typescript
import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/constants";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localeDetection: true,
  localePrefix: "as-needed",
});
```

### Configuration Options

| Option | Value | Effect |
|--------|-------|--------|
| `locales` | 21 locale codes | Defines which locales are recognized |
| `defaultLocale` | `'en'` | Fallback when no locale is detected |
| `localeDetection` | `true` | Enables cookie and Accept-Language detection |
| `localePrefix` | `"as-needed"` | Default locale has no URL prefix |

### Locale Prefix Strategy

The `"as-needed"` prefix strategy determines how locales appear in URLs:

| Request | Resolved Locale | URL Shown |
|---------|-----------------|-----------|
| `/about` | `en` | `/about` (no prefix for default) |
| `/fr/about` | `fr` | `/fr/about` (prefix for non-default) |
| `/en/about` | `en` | Redirects to `/about` (strips default prefix) |

This keeps URLs clean for the default locale while providing explicit locale prefixes for all others.

## Request-Level Locale Resolution

The `i18n/request.ts` module runs on every server request. It validates the resolved locale and loads the correct translation messages:

```typescript
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate against supported locale list
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  // Load locale messages and English fallback
  const userMessages = (await import(`../messages/${locale}.json`)).default;
  const defaultMessages = (await import(`../messages/en.json`)).default;
  const messages = deepmerge(defaultMessages, userMessages);

  return { locale, messages };
});
```

### Validation Steps

1. `requestLocale` resolves to the locale determined by the routing layer (URL prefix, cookie, or header)
2. If the resolved locale is `null`, `undefined`, or not in the `LOCALES` array, the default locale (`en`) is used
3. The locale-specific message file is imported dynamically
4. The English message file is always imported as a fallback base
5. `deepmerge` combines them so missing keys in the locale file fall back to English

## Message Fallback Logic

The `deepmerge` strategy is the key mechanism preventing untranslated keys from appearing as raw key names:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

**How it works**:

- English messages serve as the base layer with all keys present
- Locale-specific messages override only the keys they define
- Any key missing from the locale file retains its English value
- Nested objects are merged recursively

**Example**: If `fr.json` translates `auth.SIGN_IN` but not `auth.FORGOT_PASSWORD`, the merged result contains the French value for `SIGN_IN` and the English value for `FORGOT_PASSWORD`.

This means locale files can be partially translated and the application will still render correctly.

## Cookie Persistence

When a user selects a locale via the LanguageSwitcher, `next-intl` sets a cookie storing the preference. On subsequent visits without a locale prefix in the URL, this cookie takes priority over the Accept-Language header.

The LanguageSwitcher triggers locale changes through the locale-aware router:

```typescript
const changeLanguage = useCallback(
  (locale: string) => {
    if (locale === currentLocale || isPending) return;

    startTransition(() => {
      router.replace(pathname, { locale });
    });
    setIsOpen(false);
  },
  [currentLocale, isPending, router, pathname]
);
```

The `router.replace(pathname, { locale })` call:

1. Updates the URL to include (or remove) the locale prefix
2. Sets the `next-intl` locale cookie for future visits
3. Triggers a client-side navigation with the new locale

## Accept-Language Detection

When no URL prefix and no cookie are present, `next-intl` reads the browser's `Accept-Language` header. The header typically contains a priority list like:

```
Accept-Language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7
```

The system matches this against the supported `LOCALES` array. The first matching locale wins. If no supported locale matches any entry in the header, the default locale (`en`) is used.

## Layout-Level Locale Validation

The root layout at `app/[locale]/layout.tsx` performs a final validation check:

```typescript
export default async function RootLayout({ children, params }) {
  const { locale } = await params;

  // Reject locales not in the supported list
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Set locale for server-side i18n helpers
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <>
      <NextIntlClientProvider messages={messages}>
        {/* Application providers and children */}
      </NextIntlClientProvider>
    </>
  );
}
```

If someone manually navigates to `/zz/about` (where `zz` is not a supported locale), the layout triggers a 404 page.

## RTL Support

Two locales (Arabic and Hebrew) use right-to-left text direction. The `RTL_LOCALES` constant defines them:

```typescript
export const RTL_LOCALES: readonly Locale[] = ['ar', 'he'] as const;
```

The root layout sets the `dir` attribute on the HTML element based on the active locale. Components can check the current direction to adjust layouts accordingly.

The LanguageSwitcher component also tracks RTL status per locale in its language map:

```typescript
const languageMap = {
  en: { flagSrc: "/flags/en.svg", name: "EN", fullName: "English", isRTL: false },
  ar: { flagSrc: "/flags/ar.svg", name: "AR", fullName: "Arabic", isRTL: true },
  he: { flagSrc: "/flags/he.svg", name: "HE", fullName: "Hebrew", isRTL: true },
  // ... all 21 locales
};
```

## SEO: Hreflang Generation

The `lib/seo/hreflang.ts` module generates localized URL alternates for search engine crawlers:

```typescript
export function getLocalizedUrl(path: string, locale: Locale): string {
  const baseUrl = getBaseUrl().replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (locale === DEFAULT_LOCALE) {
    return `${baseUrl}${cleanPath}`;
  }
  return `${baseUrl}/${locale}${cleanPath}`;
}

export function generateHreflangAlternates(
  path: string
): Record<string, string> {
  const languages: Record<string, string> = {};

  for (const locale of LOCALES) {
    languages[LOCALE_TO_HREFLANG[locale]] = getLocalizedUrl(path, locale);
  }
  languages['x-default'] = getLocalizedUrl(path, DEFAULT_LOCALE);

  return languages;
}
```

The root layout calls this in `generateMetadata`:

```typescript
export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    alternates: {
      canonical: locale === DEFAULT_LOCALE ? '/' : `/${locale}`,
      languages: generateHreflangAlternates('/')
    }
  };
}
```

Convenience helpers are available for dynamic routes:

```typescript
// For item detail pages
generateItemHreflangAlternates(slug)  // /items/{slug}

// For CMS pages
generatePageHreflangAlternates(slug)  // /pages/{slug}
```

## Navigation Utilities

The `i18n/navigation.ts` module exports locale-aware replacements for standard Next.js navigation:

```typescript
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

| Export | Replaces | Behavior |
|--------|----------|----------|
| `Link` | `next/link` | Automatically adds locale prefix to `href` |
| `redirect` | `next/navigation` redirect | Redirects within the current locale |
| `usePathname` | `next/navigation` usePathname | Returns path without locale prefix |
| `useRouter` | `next/navigation` useRouter | push/replace preserve current locale |
| `getPathname` | N/A | Server-side path resolution with locale |

Always import these from `@/i18n/navigation` instead of `next/link` or `next/navigation`.

## Static Params Generation

The root layout generates static params only for the default locale:

```typescript
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}
```

Other locales are rendered on demand. This keeps build times fast while still supporting all 21 locales at runtime. The `dynamicParams = true` export ensures non-default locales are not rejected during static generation.

## Debugging Locale Issues

| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| Translation keys shown instead of text | Missing key in locale file | Add the key to `messages/en.json` (fallback) |
| Wrong locale rendered | Cookie overriding URL | Clear browser cookies or use incognito mode |
| 404 on locale URLs | Locale not in LOCALES array | Add the locale code to `lib/constants.ts` |
| RTL layout not applied | Locale not in RTL_LOCALES | Add to `RTL_LOCALES` in `lib/constants.ts` |
| Hreflang tags missing | No `generateMetadata` call | Add `alternates.languages` using `generateHreflangAlternates` |

## Best Practices

1. **Always use `Link` from `@/i18n/navigation`** instead of `next/link`
2. **Add all new translation keys to `en.json` first** since it serves as the fallback for every locale
3. **Test locale detection** by setting browser language preferences or using the LanguageSwitcher
4. **Rely on `deepmerge` fallback** -- partially translated locale files are expected and handled
5. **Keep the `localePrefix: "as-needed"` strategy** for clean default-locale URLs
6. **Include hreflang alternates** in `generateMetadata` for every public-facing page
