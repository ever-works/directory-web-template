---
id: footer-customization
title: "Footer Customization"
sidebar_label: "Footer Customization"
sidebar_position: 18
---

# Footer Customization

The template provides a flexible footer system that supports both default legal links and fully custom footer configurations. Footer items are processed through a utility layer that handles validation, internationalization, and external URL detection.

## Architecture Overview

The footer system consists of three layers:

- **Footer utilities** (`lib/utils/footer-utils.ts`) -- Processes and validates footer configuration
- **Custom navigation helpers** (`lib/utils/custom-navigation.ts`) -- Resolves labels and detects external URLs
- **Footer components** (`components/footer/`) -- Renders the processed footer items

## Core Types

The footer utility defines several TypeScript interfaces for type-safe footer handling:

```ts
// Translation function type from next-intl
type TranslationFunction = (key: string) => string;

// Footer configuration (subset of Config needed for footer processing)
interface FooterConfig {
  custom_footer?: CustomNavigationItem[];
}

// Processed footer item ready for rendering
interface FooterItem {
  label: string;
  href: string;
  target?: string;
  rel?: string;
}
```

The `FooterConfig` interface accepts an optional `custom_footer` array. When present and non-empty, custom items fully **replace** the default links rather than extending them.

## Default Footer Links

When no custom footer is configured, the system falls back to three default legal links:

```ts
const DEFAULT_FOOTER_LINKS = [
  { label: 'footer.TERMS_OF_SERVICE', href: '/pages/terms-of-service' },
  { label: 'footer.PRIVACY_POLICY', href: '/pages/privacy-policy' },
  { label: 'footer.COOKIES', href: '/pages/cookies' },
];
```

Each label uses a translation key in the `footer` namespace. The `resolveLabel` function from `custom-navigation.ts` handles key resolution at render time.

## Processing Footer Items

The main entry point is the `processFooterItems` function:

```ts
import { processFooterItems } from '@/lib/utils/footer-utils';

// In your component
const footerItems = processFooterItems(config, t);
```

### How It Works

1. **Check for custom footer** -- If `config.custom_footer` is a non-empty array, custom items are used
2. **Validate each item** -- Items without a `label` or `path` property are filtered out with a console warning
3. **Detect external URLs** -- Each item's `path` is checked with `isExternalUrl()` to determine if it starts with `http://`, `https://`, or `//`
4. **Add security attributes** -- External links automatically receive `target="_blank"` and `rel="noopener noreferrer"`
5. **Resolve labels** -- Both translation keys and plain text labels are supported via `resolveLabel()`

### Full Implementation

```ts
export function processFooterItems(
  config: FooterConfig,
  t: TranslationFunction
): FooterItem[] {
  const customFooter = config.custom_footer;
  const hasCustomFooter =
    customFooter && Array.isArray(customFooter) && customFooter.length > 0;

  if (hasCustomFooter && customFooter) {
    return customFooter
      .filter((item, index) => {
        if (!item || typeof item !== 'object' || !item.label || !item.path) {
          console.warn(
            `Invalid custom_footer item at index ${index}:`,
            item
          );
          return false;
        }
        return true;
      })
      .map((item) => {
        const isExternal = isExternalUrl(item.path);
        return {
          label: resolveLabel(item.label, t),
          href: item.path,
          ...(isExternal && {
            target: '_blank',
            rel: 'noopener noreferrer',
          }),
        };
      });
  }

  // Fallback to default links
  return DEFAULT_FOOTER_LINKS.map((item) => ({
    ...item,
    label: resolveLabel(item.label, t),
  }));
}
```

## Label Resolution

The `resolveLabel` function in `custom-navigation.ts` supports multiple label formats:

| Format | Example | Behavior |
|--------|---------|----------|
| Plain text | `"About Us"` | Returned as-is |
| Namespaced key | `"footer.PRIVACY_POLICY"` | Looked up in `footer` namespace |
| Bare key | `"NAV_ABOUT"` | Searched across common, footer, auth, listing, survey, help namespaces |

The resolution order is:

1. Try the exact key (with namespace if present)
2. Check if the label looks like a translation key (uppercase with underscores)
3. Try common namespaces in order: `common`, `footer`, `auth`, `listing`, `survey`, `help`
4. Try the key directly without any namespace
5. Fall back to the original label string

## External URL Detection

The `isExternalUrl` function uses a regex pattern to detect external links:

```ts
function isExternalUrl(path: string): boolean {
  return /^(https?:)?\/\//i.test(path);
}
```

This matches URLs starting with `http://`, `https://`, or protocol-relative `//`.

## Footer Components

### FooterBottom

The main footer component renders the processed items alongside copyright information:

```tsx
import { processFooterItems } from '@/lib/utils/footer-utils';

interface FooterBottomProps {
  config: Config;
  t: (key: string) => string;
  footerSettings: FooterSettings;
}

function FooterBottom({ config, t, footerSettings }: FooterBottomProps) {
  const footerItems = processFooterItems(config, t);

  return (
    <div>
      <span>
        Copyright &copy; {config.copyright_year || new Date().getFullYear()}{' '}
        {config.company_name}. {t('footer.ALL_RIGHTS_RESERVED')}.
      </span>
      {footerItems.map((item, index) => (
        <Link
          key={index}
          href={item.href}
          target={item.target}
          rel={item.rel}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
```

The component also conditionally renders a **version display** and **theme toggler** based on `footerSettings.versionEnabled` and `footerSettings.themeSelectorEnabled`.

### FooterLinkGroup

For rendering grouped footer links (e.g., product links, resource links), the `FooterLinkGroup` component accepts a category label and an array of links:

```tsx
interface FooterLinkGroupProps {
  links: Array<{
    label: string;
    href: string;
    target?: string;
    rel?: string;
    isExternal?: boolean;
  }>;
  categoryLabel: string;
}

function FooterLinkGroup({ links, categoryLabel }: FooterLinkGroupProps) {
  return (
    <div>
      <h4>{categoryLabel}</h4>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              target={link.target}
              rel={link.rel || (link.isExternal ? 'noopener noreferrer' : undefined)}
            >
              {link.label}
              {link.isExternal && <ExternalLinkIcon />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

External links display a small arrow icon to indicate they open in a new tab.

## Custom Footer Configuration

To configure custom footer links, add a `custom_footer` array to your site configuration:

```json
{
  "custom_footer": [
    {
      "label": "footer.TERMS_OF_SERVICE",
      "path": "/pages/terms-of-service"
    },
    {
      "label": "footer.PRIVACY_POLICY",
      "path": "/pages/privacy-policy"
    },
    {
      "label": "Contact Us",
      "path": "https://support.example.com"
    },
    {
      "label": "footer.COOKIES",
      "path": "/pages/cookies"
    }
  ]
}
```

### Configuration Rules

- Custom footer items **replace** all default links -- they do not merge
- Each item must have both `label` and `path` properties
- Invalid items are skipped with a console warning
- External URLs (starting with `http://` or `https://`) automatically get `target="_blank"` and `rel="noopener noreferrer"`
- Labels can be plain text or translation keys

## Source Files

| File | Purpose |
|------|---------|
| `lib/utils/footer-utils.ts` | Footer processing logic |
| `lib/utils/custom-navigation.ts` | Label resolution and URL detection |
| `components/footer/footer-bottom.tsx` | Bottom footer bar component |
| `components/footer/footer-link-group.tsx` | Grouped link list component |
