---
id: image-management
title: Gestione delle immagini
sidebar_label: Gestione delle immagini
sidebar_position: 21
---

# Gestione delle immagini

Il modello Ever Works include un sistema di gestione del dominio immagine che controlla quali host di immagini esterne sono consentiti per l'ottimizzazione dell'immagine Next.js. Il sistema mantiene elenchi di domini curati per fornitori di immagini e servizi di icone comuni, fornisce la gestione del dominio runtime, la convalida dell'URL e genera la configurazione `remotePatterns` per `next.config.js` .

## Panoramica dell'architettura

| Componente | Percorso | Scopo |
|---|---|---|
| `image-domains.ts` | `lib/utils/image-domains.ts` | Elenchi di domini principali, generazione di modelli e utilità di convalida |
| `useImageDomains` | `hooks/use-image-domains.ts` | Hook React per la gestione dei domini in fase di runtime |
| `useImageValidation` | `hooks/use-image-domains.ts` | Hook di reazione per convalidare gli URL delle immagini rispetto ai domini consentiti |

## Domini preconfigurati

Il sistema viene fornito con due elenchi di domini curati:

### Domini di immagini comuni

Questi sono servizi di hosting di immagini standard utilizzati per gli avatar degli utenti e le immagini dei contenuti:

| Dominio | Scopo |
|---|---|
| `lh3.googleusercontent.com` | Immagini del profilo utente di Google |
| `avatars.githubusercontent.com` | Avatar utente GitHub |
| `platform-lookaside.fbsbx.com` | Immagini del profilo Facebook |
| `pbs.twimg.com` | Immagini del profilo Twitter/X |
| `images.unsplash.com` | Unsplash fotografia stock |

### Domini icona

Servizi dedicati per icone e asset di design:

| Dominio | Scopo |
|---|---|
| `flaticon.com` | Icone flaticon |
| `iconify.design` | Libreria di icone Iconify |
| `icons8.com` | Risorse Icons8 |
| `feathericons.com` | Set di icone di piume |
| `heroicons.com` | Libreria Heroicons |
| `tabler-icons.io` | Icone tabella |

## Modelli remoti Next.js

La funzione `generateImageRemotePatterns` crea l'array `remotePatterns` per la configurazione dell'immagine Next.js:

```tsx
import { generateImageRemotePatterns } from '@/lib/utils/image-domains';

// next.config.js
module.exports = {
  images: {
    remotePatterns: generateImageRemotePatterns()
  }
};
```

### Modelli generati

La funzione produce due tipi di pattern:

1. **Modelli specifici** con percorsi limitati per servizi noti:

```tsx
{
  protocol: 'https',
  hostname: 'lh3.googleusercontent.com',
  pathname: '/a/**'
}
```

2. **Modelli jolly** per i sottodomini di tutti i domini registrati:

```tsx
{
  protocol: 'https',
  hostname: '*.flaticon.com',
  pathname: '/**'
}
```

## Convalida del dominio

### `isAllowedImageDomain` Controlla se il nome host di un URL è nell'elenco dei domini consentiti:

```tsx
import { isAllowedImageDomain } from '@/lib/utils/image-domains';

isAllowedImageDomain('https://images.unsplash.com/photo-123')  // true
isAllowedImageDomain('https://cdn.flaticon.com/icons/svg/123')  // true (subdomain match)
isAllowedImageDomain('https://evil-site.com/image.jpg')         // false
isAllowedImageDomain('/local/image.png')                        // true (non-HTTP URLs pass)
```

La funzione esegue tre livelli di corrispondenza:

| Controlla | Descrizione |
|---|---|
| Corrispondenza esatta | Il nome host corrisponde esattamente a un dominio in uno degli elenchi |
| Corrispondenza sottodominio | Il nome host termina con `.{domain}` per qualsiasi dominio registrato |
| Passaggio non HTTP | Gli URL senza prefisso `http://` o `https://` passano sempre |

### `isValidImageUrl` Verifica se una stringa è un URL di immagine strutturalmente valido:

```tsx
import { isValidImageUrl } from '@/lib/utils/image-domains';

isValidImageUrl('https://example.com/image.png')  // true
isValidImageUrl('/local/image.png')                // true (relative URLs allowed)
isValidImageUrl('')                                // false
isValidImageUrl('not-a-url')                       // false
```

### `isProblematicUrl` Rileva gli URL che probabilmente non sono collegamenti diretti a immagini:

```tsx
import { isProblematicUrl } from '@/lib/utils/image-domains';

isProblematicUrl('https://flaticon.com/icone-gratuite/some-page')  // true (page, not image)
isProblematicUrl('https://example.com?related_id=123')              // true (redirect URL)
isProblematicUrl('https://example.com/photo.jpg')                   // false (valid image extension)
```

| Regola di rilevamento | Descrizione |
|---|---|
| URL delle pagine Flaticon | URL con percorso `/icone-gratuite/` su flaticon.com |
| Parametri di reindirizzamento | URL contenenti `related_id=` o `origin=` parametri di query |
| Estensione immagine mancante | URL senza `.jpg` , `.jpeg` , `.png` , `.gif` , `.webp` , `.svg` o `.ico` |

### `shouldShowFallback` Determina se visualizzare un'icona di fallback invece di un'immagine:

```tsx
import { shouldShowFallback } from '@/lib/utils/image-domains';

shouldShowFallback('')                                    // true (empty URL)
shouldShowFallback('https://flaticon.com/page/123')       // true (problematic)
shouldShowFallback('https://example.com/icon.png')        // false (valid image)
```

## Gestione domini runtime

### Aggiunta di domini

```tsx
import { addImageDomain } from '@/lib/utils/image-domains';

// Add as a common image domain
addImageDomain('cdn.example.com');

// Add as an icon domain
addImageDomain('my-icons.example.com', true);
```

La funzione è idempotente: l'aggiunta di un dominio già registrato non ha alcun effetto.

### Rimozione domini

```tsx
import { removeImageDomain } from '@/lib/utils/image-domains';

removeImageDomain('cdn.example.com');
// Removes from both COMMON_IMAGE_DOMAINS and ICON_DOMAINS
```

### Ottenere tutti i domini

```tsx
import { getAllowedDomains } from '@/lib/utils/image-domains';

const { common, icons } = getAllowedDomains();
// common: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', ...]
// icons: ['flaticon.com', 'iconify.design', ...]
```

Restituisce copie degli array di domini, impedendo la mutazione esterna.

## Il gancio `useImageDomains` Un hook React per la gestione dei domini immagine con sincronizzazione dello stato:

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

### API di collegamento

| Metodo | Parametri | Descrizione |
|---|---|---|
| `domains` | -- | Stato attuale: `{ common: string[], icons: string[] }` |
| `addDomain` | `(domain: string, isIconDomain?: boolean)` | Aggiungi un dominio e aggiorna lo stato |
| `removeDomain` | `(domain: string)` | Rimuovi un dominio (normalizza l'input) e aggiorna lo stato |
| `checkDomain` | `(url: string)` | Controlla se il dominio di un URL è consentito |

Il metodo `removeDomain` normalizza l'input tagliando gli spazi bianchi, minuscole ed eliminando i prefissi dei caratteri jolly ( `*.` ).

## Il gancio `useImageValidation` Un hook leggero per convalidare gli URL delle immagini rispetto all'elenco dei domini consentiti:

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

### Risultati della convalida

| Scenario | `isValid` | `error` |
|---|---|---|
| URL non HTTP (percorso relativo) | `true` | -- |
| Dominio consentito | `true` | -- |
| Dominio non consentito | `false` | "Dominio non consentito. Aggiungi `hostname` alla configurazione dei domini immagine." |
| Formato URL non valido | `false` | "Formato URL non valido" |

## File chiave

| File | Percorso |
|---|---|
| Utilità domini immagine | `lib/utils/image-domains.ts` |
| Aggancio domini immagine | `hooks/use-image-domains.ts` |
| Gancio di convalida dell'immagine | `hooks/use-image-domains.ts` |
