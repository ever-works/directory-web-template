---
id: seo
title: Configurazione SEO
sidebar_label: SEO
sidebar_position: 8
---

# Configurazione SEO

Il modello Ever Works fornisce un supporto SEO completo, inclusi dati strutturati JSON-LD, tag hreflang per contenuti multilingue, metadati OpenGraph, mappe del sito automatizzate e configurazione robots.txt.

## Dati strutturati JSON-LD

Situate in `lib/seo/schema.ts` , le utilità dello schema generano dati strutturati Schema.org per vari tipi di contenuto.

### Schema del prodotto

Utilizzato nelle pagine dei dettagli dell'articolo:

```typescript
import { generateProductSchema } from '@/lib/seo/schema';

const schema = generateProductSchema({
  name: 'Product Name',
  description: 'Product description',
  image: 'https://example.com/image.jpg',
  url: 'https://example.com/product',
  category: 'Software',
  sourceUrl: 'https://product-website.com',
  brandName: 'Brand Name',
});
```

Genera:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": "https://example.com/image.jpg",
  "url": "https://example.com/product",
  "category": "Software",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://product-website.com",
    "availability": "https://schema.org/InStock"
  }
}
```

### Schema organizzativo

Utilizzato per l'identità del marchio a livello di sito sulla home page e sulle pagine.

### Altri tipi di schemi

Il modulo fornisce generatori per:
- **SitoWeb**: metadati a livello di sito con azione di ricerca
- **BreadcrumbList** -- breadcrumb di navigazione
- **FAQPage** -- Sezioni FAQ con coppie domanda/risposta
- **ItemList** -- Pagine di elenco di categorie e collezioni

## Tag hreflang

Situata in `lib/seo/hreflang.ts` , l'utilità hreflang genera collegamenti linguistici alternativi per i motori di ricerca.

### Località supportate

Il modello supporta oltre 20 lingue:

```
en | fr | es | de | zh | ar | he | ru | uk | pt
it | ja | ko | nl | pl | tr | vi | th | hi | id | bg
```

### Generazione di URL

L'utilità hreflang segue il modello di prefisso locale "secondo necessità":
- La locale predefinita ( `en` ) utilizza il percorso root: `https://example.com/page` - Altre localizzazioni utilizzano percorsi prefissati: `https://example.com/fr/page`

```typescript
import { generateHreflangTags } from '@/lib/seo/hreflang';

const alternates = generateHreflangTags('/items/product-slug');
// Returns language alternate links for all configured locales
```

### Mappatura da locale a Hreflang

Ogni locale corrisponde al proprio valore hreflang ISO 639-1. La maggior parte utilizza lo stesso codice, ma alcuni richiedono una gestione speciale per le varianti regionali.

## Metadati dell'elenco

Situato in `lib/seo/listing-metadata.ts` , questo modulo genera metadati per le pagine di elenchi, comprese le pagine di categoria, i risultati di ricerca e le visualizzazioni filtrate con modelli di titoli, descrizioni e URL canonici appropriati.

## Schede OpenGraph e Twitter

Il modello genera metadati OpenGraph e Twitter Card tramite l'API dei metadati Next.js nei componenti della pagina:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: 'Page Title',
    description: 'Page description',
    openGraph: {
      title: 'Page Title',
      description: 'Page description',
      images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Page Title',
      description: 'Page description',
    },
    alternates: {
      languages: generateHreflangTags('/current-path'),
    },
  };
}
```

##Mappa del sito

Situata in `app/sitemap.ts` , la mappa del sito viene generata automaticamente utilizzando il supporto della mappa del sito integrato di Next.js:

- **Pagine statiche** -- Home, informazioni, prezzi, contatti
- **Pagine dinamiche** -- Tutti gli elementi, le categorie e le raccolte pubblicate
- **URL localizzati** -- Ogni pagina genera voci per tutte le lingue attive
- **Priorità e frequenza** -- Configurate per tipo di pagina

## Robot.txt

Situata in `app/robots.ts` , la configurazione del robot:

- Consente tutti i crawler per impostazione predefinita
- Punta all'URL della mappa del sito
- Facoltativamente, blocca l'indicizzazione dei percorsi amministratore e API
- Configurabile tramite ambiente per differenze di staging/produzione

## Migliori pratiche

1. **Ogni pagina dovrebbe avere metadati univoci** -- Utilizza `generateMetadata()` nei componenti della pagina
2. **Includi JSON-LD nelle pagine dei dettagli** -- Schema prodotto per articoli, Organizzazione per home page
3. **Imposta URL canonici**: impedisce la duplicazione dei contenuti nelle versioni localizzate
4. **Utilizza l'utilità hreflang**: garantisce che i motori di ricerca forniscano la versione nella lingua corretta
5. **Mantieni le descrizioni sotto i 160 caratteri** -- Ottimale per gli snippet dei risultati di ricerca
