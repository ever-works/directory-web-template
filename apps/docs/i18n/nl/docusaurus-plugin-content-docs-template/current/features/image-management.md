---
id: image-management
title: Beeldbeheer
sidebar_label: Beeldbeheer
sidebar_position: 21
---

# Beeldbeheer

De Ever Works-sjabloon bevat een beelddomeinbeheersysteem dat bepaalt welke externe beeldhosts zijn toegestaan voor Next.js-beeldoptimalisatie. Het systeem onderhoudt samengestelde domeinlijsten voor gangbare beeldaanbieders en pictogramservices, biedt runtime-domeinbeheer, URL-validatie en genereert `remotePatterns` -configuratie voor `next.config.js` .

## Architectuuroverzicht

| Onderdeel | Pad | Doel |
|---|---|---|
| `image-domains.ts` | `lib/utils/image-domains.ts` | Kerndomeinlijsten, patroongeneratie en validatiehulpprogramma's |
| `useImageDomains` | `hooks/use-image-domains.ts` | React hook voor het beheren van domeinen tijdens runtime |
| `useImageValidation` | `hooks/use-image-domains.ts` | React hook voor het valideren van afbeeldings-URL's tegen toegestane domeinen |

## Vooraf geconfigureerde domeinen

Het systeem wordt geleverd met twee samengestelde domeinlijsten:

### Algemene afbeeldingsdomeinen

Dit zijn standaard beeldhostingdiensten die worden gebruikt voor gebruikersavatars en inhoudsafbeeldingen:

| Domein | Doel |
|---|---|
| `lh3.googleusercontent.com` | Google-gebruikersprofielafbeeldingen |
| `avatars.githubusercontent.com` | GitHub-gebruikersavatars |
| `platform-lookaside.fbsbx.com` | Facebook-profielafbeeldingen |
| `pbs.twimg.com` | Twitter/X-profielafbeeldingen |
| `images.unsplash.com` | Unsplash- stockfotografie |

### Pictogramdomeinen

Toegewijde pictogram- en ontwerpactivadiensten:

| Domein | Doel |
|---|---|
| `flaticon.com` | Flaticon-pictogrammen |
| `iconify.design` | Iconify-pictogrambibliotheek |
| `icons8.com` | Iconen8 activa |
| `feathericons.com` | Veer pictogramserie |
| `heroicons.com` | Heroicons-bibliotheek |
| `tabler-icons.io` | Tabler-pictogrammen |

## Next.js externe patronen

De functie `generateImageRemotePatterns` maakt de `remotePatterns` -array voor de Next.js-beeldconfiguratie:

```tsx
import { generateImageRemotePatterns } from '@/lib/utils/image-domains';

// next.config.js
module.exports = {
  images: {
    remotePatterns: generateImageRemotePatterns()
  }
};
```

### Gegenereerde patronen

De functie produceert twee soorten patronen:

1. **Specifieke patronen** met beperkte padnamen voor bekende services:

```tsx
{
  protocol: 'https',
  hostname: 'lh3.googleusercontent.com',
  pathname: '/a/**'
}
```

2. **Wildcard-patronen** voor subdomeinen van alle geregistreerde domeinen:

```tsx
{
  protocol: 'https',
  hostname: '*.flaticon.com',
  pathname: '/**'
}
```

## Domeinvalidatie

### `isAllowedImageDomain` Controleert of de hostnaam van een URL in de lijst met toegestane domeinen staat:

```tsx
import { isAllowedImageDomain } from '@/lib/utils/image-domains';

isAllowedImageDomain('https://images.unsplash.com/photo-123')  // true
isAllowedImageDomain('https://cdn.flaticon.com/icons/svg/123')  // true (subdomain match)
isAllowedImageDomain('https://evil-site.com/image.jpg')         // false
isAllowedImageDomain('/local/image.png')                        // true (non-HTTP URLs pass)
```

De functie voert drie matchingniveaus uit:

| Controleer | Beschrijving |
|---|---|
| Exacte overeenkomst | Hostnaam komt exact overeen met een domein in beide lijsten |
| Subdomeinovereenkomst | Hostnaam eindigt met `.{domain}` voor elk geregistreerd domein |
| Niet-HTTP-pas | URL's zonder het voorvoegsel `http://` of `https://` geven altijd | door

### `isValidImageUrl` Valideert of een tekenreeks een structureel geldige afbeeldings-URL is:

```tsx
import { isValidImageUrl } from '@/lib/utils/image-domains';

isValidImageUrl('https://example.com/image.png')  // true
isValidImageUrl('/local/image.png')                // true (relative URLs allowed)
isValidImageUrl('')                                // false
isValidImageUrl('not-a-url')                       // false
```

### `isProblematicUrl` Detecteert URL's die waarschijnlijk geen directe afbeeldingslinks zijn:

```tsx
import { isProblematicUrl } from '@/lib/utils/image-domains';

isProblematicUrl('https://flaticon.com/icone-gratuite/some-page')  // true (page, not image)
isProblematicUrl('https://example.com?related_id=123')              // true (redirect URL)
isProblematicUrl('https://example.com/photo.jpg')                   // false (valid image extension)
```

| Detectieregel | Beschrijving |
|---|---|
| Flaticon-pagina-URL's | URL's met pad `/icone-gratuite/` op flaticon.com |
| Omleidingsparameters | URL's met `related_id=` of `origin=` zoekparameters |
| Ontbrekende afbeeldingsextensie | URL's zonder `.jpg` , `.jpeg` , `.png` , `.gif` , `.webp` , `.svg` of `.ico` |

### `shouldShowFallback` Bepaalt of er een fallback-pictogram moet worden weergegeven in plaats van een afbeelding:

```tsx
import { shouldShowFallback } from '@/lib/utils/image-domains';

shouldShowFallback('')                                    // true (empty URL)
shouldShowFallback('https://flaticon.com/page/123')       // true (problematic)
shouldShowFallback('https://example.com/icon.png')        // false (valid image)
```

## Runtime-domeinbeheer

### Domeinen toevoegen

```tsx
import { addImageDomain } from '@/lib/utils/image-domains';

// Add as a common image domain
addImageDomain('cdn.example.com');

// Add as an icon domain
addImageDomain('my-icons.example.com', true);
```

De functie is idempotent: het toevoegen van een reeds geregistreerd domein heeft geen effect.

### Domeinen verwijderen

```tsx
import { removeImageDomain } from '@/lib/utils/image-domains';

removeImageDomain('cdn.example.com');
// Removes from both COMMON_IMAGE_DOMAINS and ICON_DOMAINS
```

### Alle domeinen verkrijgen

```tsx
import { getAllowedDomains } from '@/lib/utils/image-domains';

const { common, icons } = getAllowedDomains();
// common: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', ...]
// icons: ['flaticon.com', 'iconify.design', ...]
```

Retourneert kopieën van de domeinarrays, waardoor externe mutatie wordt voorkomen.

## De `useImageDomains` -haak

Een React-hook voor het beheren van afbeeldingsdomeinen met statussynchronisatie:

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

| Werkwijze | Parameters | Beschrijving |
|---|---|---|
| `domains` | -- | Huidige status: `{ common: string[], icons: string[] }` |
| `addDomain` | `(domain: string, isIconDomain?: boolean)` | Voeg een domein toe en vernieuw de status |
| `removeDomain` | `(domain: string)` | Verwijder een domein (normaliseert invoer) en vernieuw status |
| `checkDomain` | `(url: string)` | Controleer of het domein van een URL is toegestaan ​​|

De `removeDomain` -methode normaliseert de invoer door witruimte in te korten, kleine letters te gebruiken en jokertekenvoorvoegsels te verwijderen ( `*.` ).

## De `useImageValidation` haak

Een lichtgewicht hook voor het valideren van afbeeldings-URL's aan de hand van de lijst met toegestane domeinen:

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

### Validatieresultaten

| Scenario | `isValid` | `error` |
|---|---|---|
| Niet-HTTP-URL (relatief pad) | `true` | -- |
| Toegestaan ​​domein | `true` | -- |
| Niet-toegestaan ​​domein | `false` | "Domein niet toegestaan. Voeg `hostname` toe aan de configuratie van afbeeldingsdomeinen." |
| Ongeldig URL-formaat | `false` | "Ongeldig URL-formaat" |

## Sleutelbestanden

| Bestand | Pad |
|---|---|
| Hulpprogramma Afbeeldingsdomeinen | `lib/utils/image-domains.ts` |
| Afbeeldingsdomeinen Hook | `hooks/use-image-domains.ts` |
| Afbeeldingsvalidatiehaak | `hooks/use-image-domains.ts` |
