---
id: use-image-domains-reference
title: useImageDomains Hook Reference
sidebar_label: useImageDomains
sidebar_position: 99
---

# useImageDomains

## Overview

`useImageDomains` is a React hook for managing allowed external image domains at runtime. It wraps the utility functions from `lib/utils/image-domains` with React state, providing reactive access to add, remove, and check image domains. The file also exports a companion hook, `useImageValidation`, for validating image URLs against the allowed domain list.

**Source:** `template/hooks/use-image-domains.ts`

## Hooks

### `useImageDomains`

```typescript
function useImageDomains(): UseImageDomainsReturn
```

Takes no parameters.

#### Return Values

| Property       | Type                                                   | Description                                                             |
|---------------|--------------------------------------------------------|-------------------------------------------------------------------------|
| `domains`     | `{ common: string[]; icons: string[] }`                | Current snapshot of allowed domains, split into common image domains and icon-specific domains |
| `addDomain`   | `(domain: string, isIconDomain?: boolean) => void`     | Add a domain to the allowed list. Set `isIconDomain` to `true` to add it to the icon domains list instead. |
| `removeDomain`| `(domain: string) => void`                             | Remove a domain from both the common and icon domain lists. The domain is normalized (trimmed, lowercased, wildcard prefix stripped). |
| `checkDomain` | `(url: string) => boolean`                             | Check whether a URL's hostname is in the allowed domains list. Returns `true` for relative URLs and allowed domains. |

---

### `useImageValidation`

```typescript
function useImageValidation(): { checkImageUrl: (url: string) => ValidationResult }
```

Takes no parameters.

#### Return Values

| Property        | Type                                                       | Description                                     |
|----------------|------------------------------------------------------------|-------------------------------------------------|
| `checkImageUrl` | `(url: string) => { isValid: boolean; error?: string }`   | Validate an image URL against the allowed domains |

#### `ValidationResult`

| Property  | Type      | Description                                                                                     |
|----------|-----------|-------------------------------------------------------------------------------------------------|
| `isValid` | `boolean` | `true` if the URL is allowed (relative URLs, valid domains) or `false` if the domain is blocked |
| `error`  | `string`  | Present only when `isValid` is `false`. Describes why the URL was rejected.                     |

## Domain Lists

The hook manages two domain lists defined in `lib/utils/image-domains.ts`:

**Common Image Domains** (default):
- `lh3.googleusercontent.com`
- `avatars.githubusercontent.com`
- `platform-lookaside.fbsbx.com`
- `pbs.twimg.com`
- `images.unsplash.com`

**Icon Domains** (default):
- `flaticon.com`
- `iconify.design`
- `icons8.com`
- `feathericons.com`
- `heroicons.com`
- `tabler-icons.io`

Both lists support wildcard subdomain matching -- for example, `flaticon.com` also matches `cdn.flaticon.com`.

## Implementation Details

- **Reactive state:** `useImageDomains` stores the domain list in React state via `useState`. After every `addDomain` or `removeDomain` call, it re-reads the current domains from the utility module to refresh the state.
- **Domain normalization:** When removing a domain, the input is trimmed, lowercased, and any leading `*.` wildcard prefix is stripped before matching.
- **Relative URL handling:** Both `checkDomain` and `checkImageUrl` return `true` for non-HTTP URLs (relative paths, data URIs), allowing them to pass through without restriction.
- **Global mutation:** The underlying `addImageDomain` and `removeImageDomain` utility functions mutate module-level arrays. Changes are visible across all components using these hooks, but only components that call `addDomain` or `removeDomain` through this hook will trigger a React re-render.
- **URL parsing errors:** `checkImageUrl` catches `URL` constructor errors and returns `{ isValid: false, error: 'Invalid URL format' }` for malformed URLs.

## Usage Examples

### Managing allowed image domains in admin settings

```tsx
import { useImageDomains } from '@/hooks/use-image-domains';

function ImageDomainSettings() {
  const { domains, addDomain, removeDomain } = useImageDomains();
  const [newDomain, setNewDomain] = useState('');

  const handleAdd = () => {
    if (newDomain.trim()) {
      addDomain(newDomain.trim());
      setNewDomain('');
    }
  };

  return (
    <div>
      <h3>Allowed Image Domains</h3>

      <h4>Common Domains</h4>
      <ul>
        {domains.common.map((domain) => (
          <li key={domain}>
            {domain}
            <button onClick={() => removeDomain(domain)}>Remove</button>
          </li>
        ))}
      </ul>

      <h4>Icon Domains</h4>
      <ul>
        {domains.icons.map((domain) => (
          <li key={domain}>
            {domain}
            <button onClick={() => removeDomain(domain)}>Remove</button>
          </li>
        ))}
      </ul>

      <input
        value={newDomain}
        onChange={(e) => setNewDomain(e.target.value)}
        placeholder="e.g., cdn.example.com"
      />
      <button onClick={handleAdd}>Add Domain</button>
    </div>
  );
}
```

### Validating an image URL in a form

```tsx
import { useImageValidation } from '@/hooks/use-image-domains';

function ImageUrlInput({ value, onChange }) {
  const { checkImageUrl } = useImageValidation();
  const [error, setError] = useState('');

  const handleChange = (url: string) => {
    const result = checkImageUrl(url);
    setError(result.isValid ? '' : result.error || 'Invalid URL');
    onChange(url);
  };

  return (
    <div>
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="https://images.unsplash.com/photo-..."
      />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

### Checking a domain before rendering an image

```tsx
import { useImageDomains } from '@/hooks/use-image-domains';

function SafeImage({ src, alt, fallback }) {
  const { checkDomain } = useImageDomains();

  if (!checkDomain(src)) {
    return fallback ? <img src={fallback} alt={alt} /> : null;
  }

  return <img src={src} alt={alt} />;
}
```

## Related Hooks

- [`useUrlExtraction`](./use-url-extraction-reference.md) -- Extract and validate URLs from text content.
