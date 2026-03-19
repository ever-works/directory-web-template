---
id: image-domains
title: Image Domain Configuration
sidebar_label: Image Domains
sidebar_position: 30
---

# Image Domain Configuration

This page documents the image domain management system in `lib/utils/image-domains.ts` and its integration with `next.config.ts`. The template provides dynamic domain allowlisting, URL validation, and Next.js image optimization configuration.

## Overview

Next.js requires explicit configuration of external image domains for its `Image` component optimization. The template centralizes this configuration in a utility module that:

- Defines allowed image domains for OAuth avatars and content images
- Generates `remotePatterns` for `next.config.ts`
- Validates image URLs at runtime
- Supports dynamic domain addition and removal
- Detects problematic URLs that should show fallback icons

## Pre-Configured Domains

The module exports two domain lists for different purposes.

### Common Image Domains

```ts
export const COMMON_IMAGE_DOMAINS = [
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
  "platform-lookaside.fbsbx.com",
  "pbs.twimg.com",
  "images.unsplash.com",
];
```

These domains serve user avatars and content images from OAuth providers and stock photo services:

| Domain | Source |
|--------|--------|
| `lh3.googleusercontent.com` | Google account avatars |
| `avatars.githubusercontent.com` | GitHub profile pictures |
| `platform-lookaside.fbsbx.com` | Facebook profile pictures |
| `pbs.twimg.com` | Twitter/X profile pictures |
| `images.unsplash.com` | Unsplash stock photography |

### Icon Domains

```ts
export const ICON_DOMAINS = [
  "flaticon.com",
  "iconify.design",
  "icons8.com",
  "feathericons.com",
  "heroicons.com",
  "tabler-icons.io",
];
```

These domains host icon libraries used for tool and category icons in directory listings.

## Next.js Integration

### Remote Patterns Generator

The `generateImageRemotePatterns` function creates the `remotePatterns` array consumed by `next.config.ts`:

```ts
export function generateImageRemotePatterns() {
  const patterns = [
    {
      protocol: "https" as const,
      hostname: "lh3.googleusercontent.com",
      pathname: "/a/**",
    },
    {
      protocol: "https" as const,
      hostname: "avatars.githubusercontent.com",
      pathname: "/u/**",
    },
    {
      protocol: "https" as const,
      hostname: "platform-lookaside.fbsbx.com",
      pathname: "/platform/**",
    },
    {
      protocol: "https" as const,
      hostname: "pbs.twimg.com",
      pathname: "/**",
    },
    {
      protocol: "https" as const,
      hostname: "images.unsplash.com",
      pathname: "/**",
    },
  ];

  // Add wildcard subdomain patterns
  [...COMMON_IMAGE_DOMAINS, ...ICON_DOMAINS].forEach(
    (domain) => {
      patterns.push({
        protocol: "https" as const,
        hostname: `*.${domain}`,
        pathname: "/**",
      });
    }
  );

  return patterns;
}
```

Each pattern specifies:
- `protocol` -- Always HTTPS for security
- `hostname` -- Exact domain or wildcard subdomain (`*.domain.com`)
- `pathname` -- URL path pattern (provider-specific or catch-all `/**`)

### Usage in next.config.ts

The generated patterns are used directly in the Next.js configuration:

```ts
import { generateImageRemotePatterns } from "./lib/utils/image-domains";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: generateImageRemotePatterns(),
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy:
      "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: false,
  },
};
```

The image configuration also includes:
- **SVG support** -- `dangerouslyAllowSVG: true` with CSP restrictions for safety
- **Content disposition** -- Forces `attachment` to prevent XSS via SVG
- **Content Security Policy** -- Sandboxed rendering with no script execution
- **Optimization** -- Enabled (`unoptimized: false`) for production performance

## Runtime URL Validation

### Checking Allowed Domains

```ts
export function isAllowedImageDomain(url: string): boolean {
  try {
    if (!/^https?:\/\//i.test(url)) return true;
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (
      COMMON_IMAGE_DOMAINS.map((d) => d.toLowerCase()).includes(
        hostname
      )
    )
      return true;
    if (
      ICON_DOMAINS.map((d) => d.toLowerCase()).includes(
        hostname
      )
    )
      return true;

    // Check subdomain matches
    for (const domain of [
      ...COMMON_IMAGE_DOMAINS,
      ...ICON_DOMAINS,
    ].map((d) => d.toLowerCase())) {
      if (hostname.endsWith(`.${domain}`)) return true;
    }

    return false;
  } catch {
    return false;
  }
}
```

Key behaviors:
- Relative URLs (no protocol) are always allowed
- Exact domain matches are checked first
- Subdomain matches are checked next (e.g., `cdn.flaticon.com` matches `flaticon.com`)
- Invalid URLs return `false` instead of throwing

### Detecting Problematic URLs

Some URLs from icon services are not direct image files. The `isProblematicUrl` function identifies these:

```ts
export function isProblematicUrl(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();

    // Flaticon free icon pages (not direct images)
    if (
      (host === "flaticon.com" ||
        host.endsWith(".flaticon.com")) &&
      path.includes("/icone-gratuite/")
    )
      return true;

    // URLs with tracking parameters
    if (
      u.search.includes("related_id=") ||
      u.search.includes("origin=")
    )
      return true;

    // Check for image file extension
    const hasImageExt =
      /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(path);
    return !hasImageExt;
  } catch {
    return true;
  }
}
```

This function returns `true` when a URL:
- Points to a Flaticon page rather than a direct image file
- Contains tracking query parameters
- Lacks a recognized image file extension

### Fallback Decision

The `shouldShowFallback` function combines the checks:

```ts
export function shouldShowFallback(url: string) {
  return !url || isProblematicUrl(url);
}
```

Use this in components to decide whether to render the actual image or a placeholder icon.

### URL Format Validation

```ts
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return true; // Relative URLs OK

  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
}
```

This validates URL structure without checking domain allowlists.

## Dynamic Domain Management

### Adding Domains

```ts
export function addImageDomain(
  domain: string,
  isIconDomain: boolean = false
): void {
  if (isIconDomain) {
    if (!ICON_DOMAINS.includes(domain)) {
      ICON_DOMAINS.push(domain);
    }
  } else {
    if (!COMMON_IMAGE_DOMAINS.includes(domain)) {
      COMMON_IMAGE_DOMAINS.push(domain);
    }
  }
}
```

### Removing Domains

```ts
export function removeImageDomain(domain: string): void {
  const iconIndex = ICON_DOMAINS.indexOf(domain);
  if (iconIndex > -1) ICON_DOMAINS.splice(iconIndex, 1);

  const commonIndex = COMMON_IMAGE_DOMAINS.indexOf(domain);
  if (commonIndex > -1)
    COMMON_IMAGE_DOMAINS.splice(commonIndex, 1);
}
```

### Listing All Domains

```ts
export function getAllowedDomains(): {
  common: string[];
  icons: string[];
} {
  return {
    common: [...COMMON_IMAGE_DOMAINS],
    icons: [...ICON_DOMAINS],
  };
}
```

Returns copies of the arrays to prevent external mutation.

## Usage in Components

```tsx
import {
  isValidImageUrl,
  shouldShowFallback,
} from "@/lib/utils/image-domains";
import Image from "next/image";

function ToolIcon({ iconUrl }: { iconUrl: string }) {
  if (!isValidImageUrl(iconUrl) || shouldShowFallback(iconUrl)) {
    return <DefaultIcon />;
  }

  return (
    <Image
      src={iconUrl}
      alt="Tool icon"
      width={48}
      height={48}
    />
  );
}
```

## Adding a New Image Provider

To allow images from a new domain:

1. Add the domain to the appropriate array in `lib/utils/image-domains.ts`:

```ts
export const COMMON_IMAGE_DOMAINS = [
  // ...existing domains
  "cdn.example.com",
];
```

2. If the domain needs a specific path pattern, add it to `generateImageRemotePatterns`:

```ts
patterns.push({
  protocol: "https" as const,
  hostname: "cdn.example.com",
  pathname: "/images/**",
});
```

3. Rebuild the application to pick up the new `next.config.ts` output.

## Related Resources

- [Performance Optimization](/template/guides/performance-optimization) -- Image optimization strategies
- [Security Configuration](/template/configuration/security-config) -- Content Security Policy for images
- [Customization Guide](/template/guides/customization) -- Theming and asset customization
