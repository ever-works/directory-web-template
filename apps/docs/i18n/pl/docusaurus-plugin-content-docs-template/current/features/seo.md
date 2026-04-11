---
id: seo
title: Konfiguracja SEO
sidebar_label: SEO
sidebar_position: 8
---

# Konfiguracja SEO

Szablon Ever Works zapewnia kompleksowe wsparcie SEO, w tym dane strukturalne JSON-LD, tagi hreflang dla treści wielojęzycznych, metadane OpenGraph, automatyczne mapy witryn i konfigurację pliku robots.txt.

## Dane strukturalne JSON-LD

Znajdujące się pod numerem `lib/seo/schema.ts` narzędzia schematu generują uporządkowane dane Schema.org dla różnych typów treści.

### Schemat produktu

Używane na stronach szczegółów przedmiotu:

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

Generuje:
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

### Schemat organizacyjny

Używany do identyfikacji marki w całej witrynie na stronie głównej i stronach z informacjami.

### Inne typy schematów

Moduł udostępnia generatory dla:
- **Witryna internetowa** — Metadane na poziomie witryny z możliwością wyszukiwania
- **BreadcrumbList** -- Okruszki nawigacji
- **FAQPage** – sekcje FAQ z parami pytanie/odpowiedź
- **ItemList** -- Strony z listami kategorii i kolekcji

## Tagi Hreflang

Znajdujące się pod adresem `lib/seo/hreflang.ts` narzędzie hreflang generuje linki do alternatywnych języków dla wyszukiwarek.

### Obsługiwane języki

Szablon obsługuje ponad 20 lokalizacji:

```
en | fr | es | de | zh | ar | he | ru | uk | pt
it | ja | ko | nl | pl | tr | vi | th | hi | id | bg
```

### Generowanie adresu URL

Narzędzie hreflang stosuje się do wzorca przedrostków ustawień regionalnych „w razie potrzeby”:
- Domyślne ustawienia regionalne ( `en` ) używają ścieżki głównej: `https://example.com/page` - Inne ustawienia regionalne używają ścieżek z prefiksem: `https://example.com/fr/page`

```typescript
import { generateHreflangTags } from '@/lib/seo/hreflang';

const alternates = generateHreflangTags('/items/product-slug');
// Returns language alternate links for all configured locales
```

### Mapowanie ustawień regionalnych na Hreflang

Każde ustawienie regionalne jest mapowane na wartość hreflang ISO 639-1. Większość używa tego samego kodu, ale niektóre wymagają specjalnego postępowania w przypadku wariantów regionalnych.

## Metadane listy

Znajdujący się pod adresem `lib/seo/listing-metadata.ts` moduł ten generuje metadane dla stron z listami, w tym strony kategorii, wyniki wyszukiwania i filtrowane widoki z odpowiednimi szablonami tytułów, opisami i kanonicznymi adresami URL.

## Karty OpenGraph i Twitter

Szablon generuje metadane OpenGraph i Twitter Card poprzez Next.js Metadata API w komponentach strony:

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

## Mapa witryny

Mapa witryny, znajdująca się pod adresem `app/sitemap.ts` , jest generowana automatycznie przy użyciu wbudowanej obsługi map witryn Next.js:

- **Strony statyczne** -- Strona główna, o nas, ceny, kontakt
- **Strony dynamiczne** -- Wszystkie opublikowane elementy, kategorie, kolekcje
- **Zlokalizowane adresy URL** — Każda strona generuje wpisy dla wszystkich aktywnych lokalizacji
- **Priorytet i częstotliwość** -- Konfigurowane według typu strony

## Robots.txt

Znajdująca się pod adresem `app/robots.ts` konfiguracja robota:

- Domyślnie zezwala wszystkim robotom
- Wskazuje adres URL mapy witryny
- Opcjonalnie blokuje indeksowanie tras administracyjnych i API
- Możliwość konfiguracji za pośrednictwem środowiska pod kątem różnic w przemieszczaniu/produkcji

## Najlepsze praktyki

1. **Każda strona powinna mieć unikalne metadane** -- Użyj `generateMetadata()` w składnikach strony
2. **Dołącz JSON-LD na stronach szczegółów** -- Schemat produktu dla pozycji, Organizacja na stronie głównej
3. **Ustaw kanoniczne adresy URL** – Zapobiegaj duplikowaniu treści w zlokalizowanych wersjach
4. **Użyj narzędzia hreflang** -- Zapewnia, że wyszukiwarki wyświetlają poprawną wersję językową
5. **Trzymaj opis krótszy niż 160 znaków** – Optymalny dla fragmentów wyników wyszukiwania
