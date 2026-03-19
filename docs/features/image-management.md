---
id: image-management
title: Image Management
sidebar_label: Image Management
sidebar_position: 21
---

# Image Management

The Ever Works Template includes an image domain management system that controls which external image hosts are allowed for Next.js Image optimization. The system maintains curated domain lists for common image providers and icon services, provides runtime domain management, URL validation, and generates `remotePatterns` configuration for `next.config.js`.

## Architecture Overview

| Component | Path | Purpose |
|---|---|---|
| `image-domains.ts` | `lib/utils/image-domains.ts` | Core domain lists, pattern generation, and validation utilities |
| `useImageDomains` | `hooks/use-image-domains.ts` | React hook for managing domains at runtime |
| `useImageValidation` | `hooks/use-image-domains.ts` | React hook for validating image URLs against allowed domains |

## Pre-Configured Domains

The system ships with two curated domain lists:

### Common Image Domains

These are standard image hosting services used for user avatars and content images:

| Domain | Purpose |
|---|---|
| `lh3.googleusercontent.com` | Google user profile images |
| `avatars.githubusercontent.com` | GitHub user avatars |
| `platform-lookaside.fbsbx.com` | Facebook profile images |
| `pbs.twimg.com` | Twitter/X profile images |
| `images.unsplash.com` | Unsplash stock photography |

### Icon Domains

Dedicated icon and design asset services:

| Domain | Purpose |
|---|---|
| `flaticon.com` | Flaticon icons |
| `iconify.design` | Iconify icon library |
| `icons8.com` | Icons8 assets |
| `feathericons.com` | Feather icon set |
| `heroicons.com` | Heroicons library |
| `tabler-icons.io` | Tabler icons |

## Next.js Remote Patterns

The `generateImageRemotePatterns` function creates the `remotePatterns` array for Next.js image configuration:

```tsx
import { generateImageRemotePatterns } from '@/lib/utils/image-domains';

// next.config.js
module.exports = {
  images: {
    remotePatterns: generateImageRemotePatterns()
  }
};
```

### Generated Patterns

The function produces two types of patterns:

1. **Specific patterns** with restricted pathnames for known services:

```tsx
{
  protocol: 'https',
  hostname: 'lh3.googleusercontent.com',
  pathname: '/a/**'
}
```

2. **Wildcard patterns** for subdomains of all registered domains:

```tsx
{
  protocol: 'https',
  hostname: '*.flaticon.com',
  pathname: '/**'
}
```

## Domain Validation

### `isAllowedImageDomain`

Checks whether a URL's hostname is in the allowed domain list:

```tsx
import { isAllowedImageDomain } from '@/lib/utils/image-domains';

isAllowedImageDomain('https://images.unsplash.com/photo-123')  // true
isAllowedImageDomain('https://cdn.flaticon.com/icons/svg/123')  // true (subdomain match)
isAllowedImageDomain('https://evil-site.com/image.jpg')         // false
isAllowedImageDomain('/local/image.png')                        // true (non-HTTP URLs pass)
```

The function performs three levels of matching:

| Check | Description |
|---|---|
| Exact match | Hostname matches a domain in either list exactly |
| Subdomain match | Hostname ends with `.{domain}` for any registered domain |
| Non-HTTP pass | URLs without `http://` or `https://` prefix always pass |

### `isValidImageUrl`

Validates whether a string is a structurally valid image URL:

```tsx
import { isValidImageUrl } from '@/lib/utils/image-domains';

isValidImageUrl('https://example.com/image.png')  // true
isValidImageUrl('/local/image.png')                // true (relative URLs allowed)
isValidImageUrl('')                                // false
isValidImageUrl('not-a-url')                       // false
```

### `isProblematicUrl`

Detects URLs that are likely not direct image links:

```tsx
import { isProblematicUrl } from '@/lib/utils/image-domains';

isProblematicUrl('https://flaticon.com/icone-gratuite/some-page')  // true (page, not image)
isProblematicUrl('https://example.com?related_id=123')              // true (redirect URL)
isProblematicUrl('https://example.com/photo.jpg')                   // false (valid image extension)
```

| Detection Rule | Description |
|---|---|
| Flaticon page URLs | URLs with `/icone-gratuite/` path on flaticon.com |
| Redirect parameters | URLs containing `related_id=` or `origin=` query parameters |
| Missing image extension | URLs without `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, or `.ico` |

### `shouldShowFallback`

Determines whether to display a fallback icon instead of an image:

```tsx
import { shouldShowFallback } from '@/lib/utils/image-domains';

shouldShowFallback('')                                    // true (empty URL)
shouldShowFallback('https://flaticon.com/page/123')       // true (problematic)
shouldShowFallback('https://example.com/icon.png')        // false (valid image)
```

## Runtime Domain Management

### Adding Domains

```tsx
import { addImageDomain } from '@/lib/utils/image-domains';

// Add as a common image domain
addImageDomain('cdn.example.com');

// Add as an icon domain
addImageDomain('my-icons.example.com', true);
```

The function is idempotent -- adding an already-registered domain has no effect.

### Removing Domains

```tsx
import { removeImageDomain } from '@/lib/utils/image-domains';

removeImageDomain('cdn.example.com');
// Removes from both COMMON_IMAGE_DOMAINS and ICON_DOMAINS
```

### Getting All Domains

```tsx
import { getAllowedDomains } from '@/lib/utils/image-domains';

const { common, icons } = getAllowedDomains();
// common: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', ...]
// icons: ['flaticon.com', 'iconify.design', ...]
```

Returns copies of the domain arrays, preventing external mutation.

## The `useImageDomains` Hook

A React hook for managing image domains with state synchronization:

```tsx
import { useImageDomains } from '@/hooks/use-image-domains';

function ImageDomainManager() {
  const { domains, addDomain, removeDomain, checkDomain } = useImageDomains();

  return (
    <div>
      <h3>Common Domains ({domains.common.length})</h3>
      <ul>
        {domains.common.map(domain => (
          <li key={domain}>
            {domain}
            <button onClick={() => removeDomain(domain)}>Remove</button>
          </li>
        ))}
      </ul>

      <h3>Icon Domains ({domains.icons.length})</h3>
      <ul>
        {domains.icons.map(domain => (
          <li key={domain}>{domain}</li>
        ))}
      </ul>

      <button onClick={() => addDomain('cdn.new-service.com')}>
        Add Domain
      </button>
    </div>
  );
}
```

### Hook API

| Method | Parameters | Description |
|---|---|---|
| `domains` | -- | Current state: `{ common: string[], icons: string[] }` |
| `addDomain` | `(domain: string, isIconDomain?: boolean)` | Add a domain and refresh state |
| `removeDomain` | `(domain: string)` | Remove a domain (normalizes input) and refresh state |
| `checkDomain` | `(url: string)` | Check if a URL's domain is allowed |

The `removeDomain` method normalizes the input by trimming whitespace, lowercasing, and stripping wildcard prefixes (`*.`).

## The `useImageValidation` Hook

A lightweight hook for validating image URLs against the allowed domain list:

```tsx
import { useImageValidation } from '@/hooks/use-image-domains';

function ImageUrlInput({ value, onChange }) {
  const { checkImageUrl } = useImageValidation();

  const handleChange = (url: string) => {
    const { isValid, error } = checkImageUrl(url);
    if (!isValid) {
      console.warn(error);
      // e.g., "Domain not allowed. Add cdn.example.com to image domains configuration."
    }
    onChange(url);
  };

  return <input value={value} onChange={(e) => handleChange(e.target.value)} />;
}
```

### Validation Results

| Scenario | `isValid` | `error` |
|---|---|---|
| Non-HTTP URL (relative path) | `true` | -- |
| Allowed domain | `true` | -- |
| Disallowed domain | `false` | "Domain not allowed. Add `hostname` to image domains configuration." |
| Invalid URL format | `false` | "Invalid URL format" |

## Key Files

| File | Path |
|---|---|
| Image Domains Utility | `lib/utils/image-domains.ts` |
| Image Domains Hook | `hooks/use-image-domains.ts` |
| Image Validation Hook | `hooks/use-image-domains.ts` |
