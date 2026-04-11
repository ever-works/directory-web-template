---
id: image-management
title: Bildverwaltung
sidebar_label: Bildverwaltung
sidebar_position: 21
---

# Bildverwaltung

Die Ever Works-Vorlage enthält ein Bilddomänenverwaltungssystem, das steuert, welche externen Bildhosts für die Next.js-Bildoptimierung zugelassen sind. Das System verwaltet kuratierte Domänenlisten für gängige Bildanbieter und Symboldienste, bietet Laufzeitdomänenverwaltung, URL-Validierung und generiert `remotePatterns` -Konfiguration für `next.config.js` .

## Architekturübersicht

| Komponente | Pfad | Zweck |
|---|---|---|
| `image-domains.ts` | `lib/utils/image-domains.ts` | Kerndomänenlisten, Mustergenerierungs- und Validierungsdienstprogramme |
| `useImageDomains` | `hooks/use-image-domains.ts` | React-Hook zum Verwalten von Domänen zur Laufzeit |
| `useImageValidation` | `hooks/use-image-domains.ts` | React-Hook zur Validierung von Bild-URLs anhand zulässiger Domänen |

## Vorkonfigurierte Domänen

Das System wird mit zwei kuratierten Domainlisten ausgeliefert:

### Gemeinsame Bilddomänen

Dies sind Standard-Bildhosting-Dienste, die für Benutzeravatare und Inhaltsbilder verwendet werden:

| Domäne | Zweck |
|---|---|
| `lh3.googleusercontent.com` | Google-Nutzerprofilbilder |
| `avatars.githubusercontent.com` | GitHub-Benutzeravatare |
| `platform-lookaside.fbsbx.com` | Facebook-Profilbilder |
| `pbs.twimg.com` | Twitter/X-Profilbilder |
| `images.unsplash.com` | Unsplash-Stockfotografie |

### Symboldomänen

Spezielle Icon- und Design-Asset-Services:

| Domäne | Zweck |
|---|---|
| `flaticon.com` | Flaticon-Symbole |
| `iconify.design` | Symbolbibliothek ikonifizieren |
| `icons8.com` | Icons8 Assets |
| `feathericons.com` | Feder-Icon-Set |
| `heroicons.com` | Heroicons-Bibliothek |
| `tabler-icons.io` | Tabler-Symbole |

## Next.js Remote-Muster

Die `generateImageRemotePatterns` -Funktion erstellt das `remotePatterns` -Array für die Next.js-Bildkonfiguration:

```tsx
import { generateImageRemotePatterns } from '@/lib/utils/image-domains';

// next.config.js
module.exports = {
  images: {
    remotePatterns: generateImageRemotePatterns()
  }
};
```

### Generierte Muster

Die Funktion erzeugt zwei Arten von Mustern:

1. **Spezifische Muster** mit eingeschränkten Pfadnamen für bekannte Dienste:

```tsx
{
  protocol: 'https',
  hostname: 'lh3.googleusercontent.com',
  pathname: '/a/**'
}
```

2. **Wildcard-Muster** für Subdomains aller registrierten Domains:

```tsx
{
  protocol: 'https',
  hostname: '*.flaticon.com',
  pathname: '/**'
}
```

## Domänenvalidierung

### `isAllowedImageDomain` Überprüft, ob der Hostname einer URL in der Liste der zulässigen Domänen enthalten ist:

```tsx
import { isAllowedImageDomain } from '@/lib/utils/image-domains';

isAllowedImageDomain('https://images.unsplash.com/photo-123')  // true
isAllowedImageDomain('https://cdn.flaticon.com/icons/svg/123')  // true (subdomain match)
isAllowedImageDomain('https://evil-site.com/image.jpg')         // false
isAllowedImageDomain('/local/image.png')                        // true (non-HTTP URLs pass)
```

Die Funktion führt drei Matching-Ebenen durch:

| Prüfen | Beschreibung |
|---|---|
| Genaue Übereinstimmung | Der Hostname stimmt genau mit einer Domäne in einer der beiden Listen überein |
| Subdomain-Übereinstimmung | Der Hostname endet für jede registrierte Domain | mit `.{domain}` | Nicht-HTTP-Pass | URLs ohne das Präfix `http://` oder `https://` übergeben immer |

### `isValidImageUrl` Überprüft, ob eine Zeichenfolge eine strukturell gültige Bild-URL ist:

```tsx
import { isValidImageUrl } from '@/lib/utils/image-domains';

isValidImageUrl('https://example.com/image.png')  // true
isValidImageUrl('/local/image.png')                // true (relative URLs allowed)
isValidImageUrl('')                                // false
isValidImageUrl('not-a-url')                       // false
```

### `isProblematicUrl` Erkennt URLs, bei denen es sich wahrscheinlich nicht um direkte Bildlinks handelt:

```tsx
import { isProblematicUrl } from '@/lib/utils/image-domains';

isProblematicUrl('https://flaticon.com/icone-gratuite/some-page')  // true (page, not image)
isProblematicUrl('https://example.com?related_id=123')              // true (redirect URL)
isProblematicUrl('https://example.com/photo.jpg')                   // false (valid image extension)
```

| Erkennungsregel | Beschreibung |
|---|---|
| Flaticon-Seiten-URLs | URLs mit `/icone-gratuite/` Pfad auf flaticon.com |
| Umleitungsparameter | URLs mit `related_id=` oder `origin=` Abfrageparametern |
| Fehlende Bilderweiterung | URLs ohne `.jpg` , `.jpeg` , `.png` , `.gif` , `.webp` , `.svg` oder `.ico` |

### `shouldShowFallback` Bestimmt, ob ein Fallback-Symbol anstelle eines Bildes angezeigt werden soll:

```tsx
import { shouldShowFallback } from '@/lib/utils/image-domains';

shouldShowFallback('')                                    // true (empty URL)
shouldShowFallback('https://flaticon.com/page/123')       // true (problematic)
shouldShowFallback('https://example.com/icon.png')        // false (valid image)
```

## Laufzeitdomänenverwaltung

### Domänen hinzufügen

```tsx
import { addImageDomain } from '@/lib/utils/image-domains';

// Add as a common image domain
addImageDomain('cdn.example.com');

// Add as an icon domain
addImageDomain('my-icons.example.com', true);
```

Die Funktion ist idempotent – ​​das Hinzufügen einer bereits registrierten Domäne hat keine Auswirkung.

### Domains entfernen

```tsx
import { removeImageDomain } from '@/lib/utils/image-domains';

removeImageDomain('cdn.example.com');
// Removes from both COMMON_IMAGE_DOMAINS and ICON_DOMAINS
```

### Alle Domänen abrufen

```tsx
import { getAllowedDomains } from '@/lib/utils/image-domains';

const { common, icons } = getAllowedDomains();
// common: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', ...]
// icons: ['flaticon.com', 'iconify.design', ...]
```

Gibt Kopien der Domänen-Arrays zurück und verhindert so externe Mutationen.

## Der `useImageDomains` -Haken

Ein React-Hook zum Verwalten von Bilddomänen mit Statussynchronisierung:

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

### Hook-API

| Methode | Parameter | Beschreibung |
|---|---|---|
| `domains` | -- | Aktueller Stand: `{ common: string[], icons: string[] }` |
| `addDomain` | `(domain: string, isIconDomain?: boolean)` | Fügen Sie eine Domäne hinzu und aktualisieren Sie den Status |
| `removeDomain` | `(domain: string)` | Entfernen Sie eine Domäne (normalisiert die Eingabe) und aktualisieren Sie den Status |
| `checkDomain` | `(url: string)` | Prüfen Sie, ob die Domäne einer URL zulässig ist |

Die `removeDomain` -Methode normalisiert die Eingabe durch Beschneiden von Leerzeichen, Kleinbuchstaben und Entfernen von Platzhalterpräfixen ( `*.` ).

## Der `useImageValidation` Haken

Ein einfacher Hook zum Validieren von Bild-URLs anhand der Liste der zulässigen Domänen:

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

### Validierungsergebnisse

| Szenario | `isValid` | `error` |
|---|---|---|
| Nicht-HTTP-URL (relativer Pfad) | `true` | -- |
| Erlaubte Domäne | `true` | -- |
| Unzulässige Domäne | `false` | „Domäne nicht zulässig. Fügen Sie `hostname` zur Bilddomänenkonfiguration hinzu.“ |
| Ungültiges URL-Format | `false` | „Ungültiges URL-Format“ |

## Schlüsseldateien

| Datei | Pfad |
|---|---|
| Bilddomänen-Dienstprogramm | `lib/utils/image-domains.ts` |
| Bilddomänen-Hook | `hooks/use-image-domains.ts` |
| Bildvalidierungs-Hook | `hooks/use-image-domains.ts` |
