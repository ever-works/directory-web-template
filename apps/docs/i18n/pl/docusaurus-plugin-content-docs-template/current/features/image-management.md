---
id: image-management
title: Zarządzanie obrazem
sidebar_label: Zarządzanie obrazem
sidebar_position: 21
---

# Zarządzanie obrazem

Szablon Ever Works zawiera system zarządzania domeną obrazów, który kontroluje, które zewnętrzne hosty obrazów są dozwolone w celu optymalizacji obrazu Next.js. System utrzymuje wybrane listy domen dla popularnych dostawców obrazów i usług ikon, zapewnia zarządzanie domenami w czasie wykonywania, sprawdzanie poprawności adresów URL i generuje `remotePatterns` konfigurację dla `next.config.js` .

## Przegląd architektury

| Składnik | Ścieżka | Cel |
|---|---|---|
| `image-domains.ts` | `lib/utils/image-domains.ts` | Podstawowe listy domen, narzędzia do generowania wzorców i walidacji |
| `useImageDomains` | `hooks/use-image-domains.ts` | Reaguj hak do zarządzania domenami w czasie wykonywania |
| `useImageValidation` | `hooks/use-image-domains.ts` | Reaguj hak do sprawdzania poprawności adresów URL obrazów w dozwolonych domenach |

## Wstępnie skonfigurowane domeny

System jest dostarczany z dwiema wyselekcjonowanymi listami domen:

### Typowe domeny obrazów

Są to standardowe usługi hostingu obrazów używane w przypadku awatarów użytkowników i obrazów treści:

| Domena | Cel |
|---|---|
| `lh3.googleusercontent.com` | Zdjęcia profili użytkowników Google |
| `avatars.githubusercontent.com` | Awatary użytkowników GitHub |
| `platform-lookaside.fbsbx.com` | Zdjęcia profilowe na Facebooku |
| `pbs.twimg.com` | Zdjęcia profilowe na Twitterze/X |
| `images.unsplash.com` | Unsplash fotografia stockowa |

### Domeny ikon

Dedykowane usługi w zakresie ikon i projektów:

| Domena | Cel |
|---|---|
| `flaticon.com` | Ikony Flaticon |
| `iconify.design` | Iconify biblioteka ikon |
| `icons8.com` | Ikony8 aktywów |
| `feathericons.com` | Zestaw ikon piór |
| `heroicons.com` | Biblioteka Heroicons |
| `tabler-icons.io` | Ikony stołowe |

## Zdalne wzorce Next.js

Funkcja `generateImageRemotePatterns` tworzy tablicę `remotePatterns` dla konfiguracji obrazu Next.js:

```tsx
import { generateImageRemotePatterns } from '@/lib/utils/image-domains';

// next.config.js
module.exports = {
  images: {
    remotePatterns: generateImageRemotePatterns()
  }
};
```

### Wygenerowane wzorce

Funkcja generuje dwa typy wzorców:

1. **Specyficzne wzorce** z ograniczonymi nazwami ścieżek dla znanych usług:

```tsx
{
  protocol: 'https',
  hostname: 'lh3.googleusercontent.com',
  pathname: '/a/**'
}
```

2. **Wzorce wieloznaczne** dla subdomen wszystkich zarejestrowanych domen:

```tsx
{
  protocol: 'https',
  hostname: '*.flaticon.com',
  pathname: '/**'
}
```

## Walidacja domeny

### `isAllowedImageDomain` Sprawdza, czy nazwa hosta adresu URL znajduje się na liście dozwolonych domen:

```tsx
import { isAllowedImageDomain } from '@/lib/utils/image-domains';

isAllowedImageDomain('https://images.unsplash.com/photo-123')  // true
isAllowedImageDomain('https://cdn.flaticon.com/icons/svg/123')  // true (subdomain match)
isAllowedImageDomain('https://evil-site.com/image.jpg')         // false
isAllowedImageDomain('/local/image.png')                        // true (non-HTTP URLs pass)
```

Funkcja realizuje trzy poziomy dopasowania:

| Sprawdź | Opis |
|---|---|
| Dokładne dopasowanie | Nazwa hosta dokładnie odpowiada domenie na obu listach |
| Dopasowanie subdomeny | Nazwa hosta kończy się na `.{domain}` dla każdej zarejestrowanej domeny |
| Karnet inny niż HTTP | Adresy URL bez prefiksu `http://` lub `https://` zawsze przechodzą |

### `isValidImageUrl` Sprawdza, czy ciąg znaków jest strukturalnie poprawnym adresem URL obrazu:

```tsx
import { isValidImageUrl } from '@/lib/utils/image-domains';

isValidImageUrl('https://example.com/image.png')  // true
isValidImageUrl('/local/image.png')                // true (relative URLs allowed)
isValidImageUrl('')                                // false
isValidImageUrl('not-a-url')                       // false
```

### `isProblematicUrl` Wykrywa adresy URL, które prawdopodobnie nie są bezpośrednimi linkami do obrazów:

```tsx
import { isProblematicUrl } from '@/lib/utils/image-domains';

isProblematicUrl('https://flaticon.com/icone-gratuite/some-page')  // true (page, not image)
isProblematicUrl('https://example.com?related_id=123')              // true (redirect URL)
isProblematicUrl('https://example.com/photo.jpg')                   // false (valid image extension)
```

| Reguła wykrywania | Opis |
|---|---|
| Adresy URL stron Flaticon | Adresy URL ze ścieżką `/icone-gratuite/` na flaticon.com |
| Parametry przekierowania | Adresy URL zawierające `related_id=` lub `origin=` parametry zapytania |
| Brakujące rozszerzenie obrazu | Adresy URL bez `.jpg` , `.jpeg` , `.png` , `.gif` , `.webp` , `.svg` lub `.ico` |

### `shouldShowFallback` Określa, czy wyświetlać ikonę zastępczą zamiast obrazu:

```tsx
import { shouldShowFallback } from '@/lib/utils/image-domains';

shouldShowFallback('')                                    // true (empty URL)
shouldShowFallback('https://flaticon.com/page/123')       // true (problematic)
shouldShowFallback('https://example.com/icon.png')        // false (valid image)
```

## Zarządzanie domeną w środowisku wykonawczym

### Dodawanie domen

```tsx
import { addImageDomain } from '@/lib/utils/image-domains';

// Add as a common image domain
addImageDomain('cdn.example.com');

// Add as an icon domain
addImageDomain('my-icons.example.com', true);
```

Funkcja jest idempotentna - dodanie już zarejestrowanej domeny nie przynosi żadnego efektu.

### Usuwanie domen

```tsx
import { removeImageDomain } from '@/lib/utils/image-domains';

removeImageDomain('cdn.example.com');
// Removes from both COMMON_IMAGE_DOMAINS and ICON_DOMAINS
```

### Pobieranie wszystkich domen

```tsx
import { getAllowedDomains } from '@/lib/utils/image-domains';

const { common, icons } = getAllowedDomains();
// common: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', ...]
// icons: ['flaticon.com', 'iconify.design', ...]
```

Zwraca kopie tablic domeny, zapobiegając zewnętrznym mutacjom.

## Hak `useImageDomains` Hak React do zarządzania domenami obrazów z synchronizacją stanu:

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

### API haka

| Metoda | Parametry | Opis |
|---|---|---|
| `domains` | -- | Stan obecny: `{ common: string[], icons: string[] }` |
| `addDomain` | `(domain: string, isIconDomain?: boolean)` | Dodaj domenę i odśwież stan |
| `removeDomain` | `(domain: string)` | Usuń domenę (normalizuje dane wejściowe) i odśwież stan |
| `checkDomain` | `(url: string)` | Sprawdź, czy domena adresu URL jest dozwolona |

Metoda `removeDomain` normalizuje dane wejściowe poprzez przycięcie białych znaków, małych liter i usunięcie przedrostków symboli wieloznacznych ( `*.` ).

## Hak `useImageValidation` Lekki hak do sprawdzania poprawności adresów URL obrazów na liście dozwolonych domen:

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

### Wyniki walidacji

| Scenariusz | `isValid` | `error` |
|---|---|---|
| Adres URL inny niż HTTP (ścieżka względna) | `true` | -- |
| Dozwolona domena | `true` | -- |
| Niedozwolona domena | `false` | „Domena niedozwolona. Dodaj `hostname` do konfiguracji domen obrazu.” |
| Nieprawidłowy format adresu URL | `false` | „Nieprawidłowy format adresu URL” |

## Kluczowe pliki

| Plik | Ścieżka |
|---|---|
| Narzędzie domen obrazu | `lib/utils/image-domains.ts` |
| Hak domen obrazu | `hooks/use-image-domains.ts` |
| Hak do sprawdzania poprawności obrazu | `hooks/use-image-domains.ts` |
