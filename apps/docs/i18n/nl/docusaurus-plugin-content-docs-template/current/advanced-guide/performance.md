---
id: performance
title: Prestatie-optimalisatie
sidebar_label: Prestatie
sidebar_position: 5
---

# Prestatieoptimalisatie

Deze handleiding behandelt de prestatie-optimalisaties die zijn ingebouwd in de Ever Works-sjabloon en technieken voor het handhaven van snelle laadtijden naarmate uw applicatie groeit.

## Next.js-configuratie

De `next.config.ts` van de sjabloon bevat verschillende prestatiegerichte instellingen:

### Zelfstandige uitvoer

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  // ...
};
```

De uitvoermodus `standalone` creëert een op zichzelf staande build die alleen de bestanden bevat die nodig zijn om de applicatie uit te voeren. Dit vermindert de containergrootte en de opstarttijd in de productie.

### Optimalisatie van pakketimport

```typescript
experimental: {
  optimizePackageImports: ["@heroui/react", "lucide-react"],
},
```

Deze instelling maakt boomschudden mogelijk voor pakketten met zware tonbestanden. In plaats van de volledige `@heroui/react` - of `lucide-react` -bibliotheek te importeren, worden alleen de daadwerkelijk gebruikte componenten in de bundel opgenomen.

### Webpack Watch-optimalisatie

```typescript
if (dev) {
  config.watchOptions = {
    ...config.watchOptions,
    ignored: ['**/node_modules/**', '**/.git/**', '**/.content/**']
  };
}
```

De map `.content/` (op Git gebaseerd CMS met meer dan 220 markdown-bestanden) is uitgesloten van de bestandswatcher van webpack die in ontwikkeling is. Dit voorkomt onnodig opnieuw opbouwen wanneer inhoudsbestanden veranderen en vermindert het CPU-gebruik tijdens de ontwikkeling aanzienlijk.

### Onderdrukte waarschuwingen

Uitgebreide logboekregistratie van de infrastructuur wordt onderdrukt in CI- en Vercel-omgevingen:

```typescript
if (process.env.CI || process.env.VERCEL) {
  config.infrastructureLogging = { level: 'error' };
}
```

## Beeldoptimalisatie

### Patronen op afstand

De sjabloon genereert dynamisch toegestane externe afbeeldingspatronen met behulp van `generateImageRemotePatterns()` . Dit zorgt ervoor dat afbeeldingen van geconfigureerde CDN's en externe bronnen worden geoptimaliseerd via de ingebouwde afbeeldingspijplijn van Next.js.

### SVG-verwerking

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

SVG-afbeeldingen zijn toegestaan, maar worden in een sandbox geplaatst met een strikt inhoudbeveiligingsbeleid dat de uitvoering van scripts uitschakelt. Hierdoor zijn SVG-logo's en -pictogrammen mogelijk en wordt XSS via SVG-injectie voorkomen.

### Beste praktijken voor afbeeldingen

| Techniek | Implementatie | Gevolgen |
|---|---|---|
| Gebruik `next/image` | Inbouwcomponent met lazyloading | Automatische WebP/AVIF, responsieve formaten |
| Expliciete dimensies instellen | `width` en `height` rekwisieten | Voorkomt cumulatieve lay-outverschuiving (CLS) |
| Gebruik `priority` voor LCP | `<Image priority />` voor heldenafbeeldingen | Laadt de grootste inhoudsvolle Paint-afbeelding vooraf |
| Gebruik `sizes` rekwisiet | `sizes="(max-width: 768px) 100vw, 50vw"` | Voorkomt het downloaden van te grote afbeeldingen |
| Tijdelijke aanduidingen vervagen | `placeholder="blur"` met `blurDataURL` | Verbetert de waargenomen laadsnelheid |

## Cachingstrategieën

### HTTP-headers

De sjabloon stelt cache-gerelateerde headers in in `next.config.ts` :

```typescript
headers: [
  { key: "X-DNS-Prefetch-Control", value: "on" },
]
```

DNS-prefetching is wereldwijd ingeschakeld om de DNS-opzoeklatentie voor externe bronnen te verminderen.

### Statische generatie

De sjabloon gebruikt een royale time-out voor het genereren van statische pagina's:

```typescript
staticPageGenerationTimeout: 180, // 3 minutes
```

Dit biedt plaats aan pagina's die tijdens de bouwtijd gegevens ophalen van externe API's of het op Git gebaseerde CMS.

### ETag-configuratie

```typescript
generateEtags: false,
```

ETags zijn uitgeschakeld op Next.js-niveau omdat de CDN/reverse proxy (Vercel Edge Network of Cloudflare) de cachevalidatie efficiënter afhandelt.

### Caching op applicatieniveau

De analyse-achtergrondprocessor verwarmt caches met regelmatige tussenpozen voor:

| Cachetype | Vernieuwingsinterval | Gegevens |
|---|---|---|
| Trends in gebruikersgroei | 10 minuten | Maandelijkse gebruikersgroei gedurende 6, 12, 24 maanden |
| Activiteitstrends | 5 minuten | Activiteitsgegevens voor vensters van 7, 14 en 30 dagen |
| Ranglijst topitems | 15 minuten | Top 10, 20, 50 artikelen |
| Recente activiteit | 2 minuten | Laatste 10 en 20 activiteiteninzendingen |
| Prestatiestatistieken | 30 seconden | Prestatiestatistieken voor query's |
| Cache opruimen | 1 uur | Verlopen cache-item verwijderen |

## Lui laden

### Lui laden op componentniveau

Gebruik `next/dynamic` voor zware componenten die niet nodig zijn bij de eerste weergave:

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // disable SSR for client-only components
});
```

### Codesplitsing op routeniveau

Next.js App Router splitst de code automatisch op route. Elke pagina in `app/[locale]/` krijgt een eigen bundel, zodat gebruikers alleen het JavaScript downloaden dat nodig is voor de huidige pagina.

### Dynamische import in achtergrondtaken

De sjabloon maakt gebruik van dynamische import binnen taak-callbacks om te voorkomen dat webpack alleen server-modules in de clientbundel haalt:

```typescript
manager.scheduleJob('repository-sync', 'Repository Synchronization', async () => {
  const { syncManager } = await import('@/lib/services/sync-service');
  await syncManager.performSync();
}, 5 * 60 * 1000);
```

## Optimalisatie van bundelgrootte

### De bundel analyseren

Voer het volgende uit om de bundelsamenstelling te inspecteren:

```bash
ANALYZE=true pnpm build
```

Als `@next/bundle-analyzer` is geconfigureerd, levert dit een interactieve boomkaart op die laat zien welke modules bijdragen aan de bundelgrootte.

### Algemene optimalisatietechnieken

| Techniek | Voorbeeld | Besparingen |
|---|---|---|
| Optimalisatie van vatbestanden | `optimizePackageImports` in configuratie | Voorkomt het importeren van volledige pictogram-/UI-bibliotheken |
| Modules voor alleen servers | `import 'server-only'` in lib-bestanden | Voorkomt onbedoelde klantbundeling |
| Dynamische import | `await import('@/lib/services/...')` | Stelt het laden uit totdat het nodig is |
| Externe pakketten | `serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']` | Uitgesloten van webpackbundeling |

De `serverExternalPackages` -configuratie is bijzonder belangrijk:

```typescript
serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
```

Deze pakketten zijn uitgesloten van webpackbundeling en worden native geladen tijdens runtime, waardoor de bouwtijd wordt verkort en compatibiliteitsproblemen met native modules worden vermeden.

## Tips voor optimalisatie van vuurtorens

### Kerndoelen voor webvitaliteit

| Metrisch | Doel | Sleutelfactoren |
|---|---|---|
| **LCP** (grootste contentvolle verf) | < 2,5s | Beeldoptimalisatie, laden met prioriteit, responstijd van de server |
| **FID** (Vertraging eerste invoer) | < 100 ms | Codesplitsing, minimale hoofdthreadblokkering |
| **CLS** (Cumulatieve lay-outverschuiving) | < 0,1 | Expliciete afbeeldingsafmetingen, strategie voor het laden van lettertypen |
| **TTFB** (Tijd tot eerste byte) | < 800 ms | CDN-caching, edge-functies, optimalisatie van databasequery's |

### Praktische checklist

1. **Afbeeldingen**: gebruik `next/image` met expliciete `width` , `height` en `sizes` rekwisieten. Markeer afbeeldingen boven de vouw met `priority` .
2. **Lettertypen**: gebruik `next/font` om lettertypen zelf te hosten met `display: swap` en kritische lettertypebestanden vooraf te laden.
3. **JavaScript**: bekijk `optimizePackageImports` en voeg eventuele grote bibliotheken toe die vatbestanden gebruiken.
4. **CSS**: De sjabloon maakt gebruik van Tailwind CSS, die al is verwijderd in productiebuilds. Vermijd het importeren van ongebruikte CSS-modules.
5. **Scripts van derden**: stel niet-kritieke scripts uit met `next/script` met `strategy="lazyOnload"` .
6. **Servercomponenten**: standaard ingesteld op React Server Components (RSC) en gebruik `"use client"` alleen wanneer interactiviteit vereist is.

### Lopende vuurtoren

De sjabloon bevat een `lighthouse-test.json` -configuratie. Voer geautomatiseerde Lighthouse-tests uit:

```bash
npx lhci autorun --config=lighthouse-test.json
```

Of gebruik het Chrome DevTools Lighthouse-paneel voor handmatige audits.

## Prestaties van databasequery's

### Verbindingspooling

Gebruik verbindingspooling om te voorkomen dat er per aanvraag een nieuwe databaseverbinding wordt geopend. Zie de [Scaling guide](/deployment/scaling) voor configuratiedetails.

### Zoekopdrachtoptimalisatie

- Gebruik het repositorypatroon ( `lib/repositories/` ) om zoekopdrachten te centraliseren en te optimaliseren.
- De analyserepository bevat ingebouwde cachelagen met configureerbare TTL.
- Bewaak langzame query's via de achtergrondtaak voor prestatiestatistieken.

### Indexeringsstrategie

Bekijk `lib/db/schema.ts` voor bestaande indexen. Indexen toevoegen voor:
- Kolommen gebruikt in `WHERE` -clausules
- Vreemde sleutelkolommen
- Kolommen gebruikt in `ORDER BY` -clausules
- Samengestelde indexen voor zoekopdrachten in meerdere kolommen

## Prestaties bewaken

### Sentry-integratie

De sjabloon integreert Sentry voor prestatiemonitoring in `instrumentation.ts` :

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Sporen worden bemonsterd bij 10% in productie en 100% in ontwikkeling. Pas `tracesSampleRate` aan op basis van uw verkeersvolume en de limieten van uw Sentry-plan.

### Aangepaste prestatiemarkeringen

Gebruik de Web Performance API voor aangepaste timing:

```typescript
performance.mark('data-fetch-start');
const data = await fetchData();
performance.mark('data-fetch-end');
performance.measure('data-fetch', 'data-fetch-start', 'data-fetch-end');
```

## Samenvatting

| Gebied | Ingebouwde optimalisatie | Aanvullende stappen |
|---|---|---|
| Afbeeldingen | Automatische WebP/AVIF, SVG-sandbox | Voeg `priority` toe aan LCP-afbeeldingen, gebruik `sizes` |
| JavaScript | Pakketoptimalisatie, codesplitsing | Bibliotheken toevoegen aan `optimizePackageImports` |
| Caching | Opwarming van de achtergrondcache, DNS-prefetch | CDN-cacheregels configureren |
| Databank | Verbindingspooling, repositorypatroon | Indexen toevoegen, langzame queries monitoren |
| Bouw | Standalone uitvoer, externe pakketten | Bundelanalyse inschakelen |
| Toezicht | Sentry-traceringen, taak voor prestatiestatistieken | Waarschuwingen instellen voor verslechterde statistieken |
