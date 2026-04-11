---
id: feature-config
title: "Functie Configuratie"
sidebar_label: "Feature Config"
sidebar_position: 3
---

# Functie Configuratie

Het template gebruikt een functievlaggen-systeem om functionaliteit op basis van de systeemconfiguratie te in- of uitschakelen. Hierdoor kan de applicatie werken zonder database (alleen statische inhoud serveren) terwijl functies progressief worden ingeschakeld naarmate de infrastructuur beschikbaar komt.

## Functievlaggen-module

De functievlaggen zijn gedefinieerd in `lib/config/feature-flags.ts`.

### FeatureFlags-interface

```ts
interface FeatureFlags {
  /** Beoordelings- en recensiefunctionaliteit van gebruikers */
  ratings: boolean;
  /** Gebruikersopmerkingen op items */
  comments: boolean;
  /** Gebruikersfavorietenitemcollectie */
  favorites: boolean;
  /** Door admin beheerde uitgelichte itemsweergave */
  featuredItems: boolean;
  /** Gebruikersenquêtes en feedbackverzameling */
  surveys: boolean;
}
```

### Hoe vlaggen worden bepaald

Alle huidige functies zijn afhankelijk van de beschikbaarheid van de database. Een functie is ingeschakeld wanneer `DATABASE_URL` is geconfigureerd:

```ts
export function getFeatureFlags(): FeatureFlags {
  const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

  return {
    ratings: isDatabaseConfigured,
    comments: isDatabaseConfigured,
    favorites: isDatabaseConfigured,
    featuredItems: isDatabaseConfigured,
    surveys: isDatabaseConfigured,
  };
}
```

Dit ontwerp stelt het template in staat inhoud te serveren vanuit de Git-gebaseerde CMS zonder database, terwijl database-afhankelijke interactieve functies (beoordelingen, opmerkingen, favorieten) automatisch worden uitgeschakeld.

### Hulpfuncties

De module biedt verschillende hulpfuncties:

```ts
// Enkelvoudige functie controleren
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Opmerkingen-component renderen
}

// Alle ingeschakelde functies ophalen
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
// bijv. ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']

// Alle uitgeschakelde functies ophalen (handig voor foutopsporing)
import { getDisabledFeatures } from '@/lib/config/feature-flags';
const disabled = getDisabledFeatures();

// Controleren of alles gereed is
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';
if (areAllFeaturesEnabled()) {
  console.log('Full platform is operational');
}
```

### Volledige API-referentie

| Functie | Geeft terug | Beschrijving |
|---------|-------------|--------------|
| `getFeatureFlags()` | `FeatureFlags` | Alle vlaggen als booleaans object |
| `isFeatureEnabled(name)` | `boolean` | Enkelvoudige functie controleren op naam |
| `getEnabledFeatures()` | `string[]` | Array van ingeschakelde functienamen |
| `getDisabledFeatures()` | `string[]` | Array van uitgeschakelde functienamen |
| `areAllFeaturesEnabled()` | `boolean` | Waar als elke functie is ingeschakeld |

## Functie-afhankelijke weergave

### In Server-componenten

```tsx
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export default function ItemDetailPage({ item }) {
  const showComments = isFeatureEnabled('comments');
  const showRatings = isFeatureEnabled('ratings');

  return (
    <div>
      <ItemDetail item={item} />
      {showRatings && <RatingSection itemId={item.id} />}
      {showComments && <CommentsSection itemId={item.id} />}
    </div>
  );
}
```

### In API-routes

```ts
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Comments feature is not available' },
      { status: 503 }
    );
  }
  // Opmerking aanmaken verwerken...
}
```

## Siteconfiguratie (siteConfig)

Naast functievlaggen biedt het template een `siteConfig`-object in `lib/config.ts` voor branding- en metadataaanpassing. Elke waarde kan worden overschreven via omgevingsvariabelen:

```ts
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Ever Works',
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'The Open-Source, AI-Powered Directory Builder',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://demo.ever.works',
  logo: process.env.NEXT_PUBLIC_SITE_LOGO || '/logo-ever-works.svg',
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Ever Works',
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || '...',
  keywords: process.env.NEXT_PUBLIC_SITE_KEYWORDS?.split(',').map(k => k.trim()) || [...],
  ogImage: {
    gradientStart: process.env.NEXT_PUBLIC_OG_GRADIENT_START || '#667eea',
    gradientEnd: process.env.NEXT_PUBLIC_OG_GRADIENT_END || '#764ba2'
  },
  social: {
    github: process.env.NEXT_PUBLIC_SOCIAL_GITHUB || '...',
    x: process.env.NEXT_PUBLIC_SOCIAL_X || '...',
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || '...',
    // ...
  },
  attribution: {
    url: process.env.NEXT_PUBLIC_ATTRIBUTION_URL || 'https://ever.works',
    name: process.env.NEXT_PUBLIC_ATTRIBUTION_NAME || 'Ever Works'
  }
} as const;
```

### Aanpassing via omgevingsvariabelen

| Variabele | Standaard | Doel |
|-----------|-----------|------|
| `NEXT_PUBLIC_SITE_NAME` | `'Ever Works'` | Sitenaam in metadata en OG-afbeeldingen |
| `NEXT_PUBLIC_SITE_TAGLINE` | Sjabloonstandaard | Homepage-tagline |
| `NEXT_PUBLIC_APP_URL` | `'https://demo.ever.works'` | Volledige site-URL (geen afsluitende schuine streep) |
| `NEXT_PUBLIC_SITE_LOGO` | `'/logo-ever-works.svg'` | Logo-pad relatief aan `/public` |
| `NEXT_PUBLIC_BRAND_NAME` | `'Ever Works'` | Schema.org-organisatienaam |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Sjabloonstandaard | SEO-metabeschrijving |
| `NEXT_PUBLIC_SITE_KEYWORDS` | Sjabloonstandaarden | Kommagescheiden SEO-trefwoorden |
| `NEXT_PUBLIC_OG_GRADIENT_START` | `'#667eea'` | OG-afbeelding verloop startkleur |
| `NEXT_PUBLIC_OG_GRADIENT_END` | `'#764ba2'` | OG-afbeelding verloop eindkleur |
| `NEXT_PUBLIC_SOCIAL_GITHUB` | Ever Works URL | GitHub-profiellink |
| `NEXT_PUBLIC_SOCIAL_X` | Ever Works URL | X (Twitter)-profiellink |
| `NEXT_PUBLIC_ATTRIBUTION_URL` | `'https://ever.works'` | "Gebouwd met"-voettekstlink |

### Validatie

De functie `validateSiteConfig()` controleert op ontbrekende productiekritieke variabelen:

```ts
import { validateSiteConfig } from '@/lib/config';

// Geeft true terug als alle vereiste variabelen zijn ingesteld, anders false met waarschuwingen
const isValid = validateSiteConfig();
```

Waarschuwingen worden geregistreerd voor ontbrekende `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` en `NEXT_PUBLIC_SITE_NAME`.

## ConfigManager (YAML-configuratie)

De klasse `ConfigManager` in `lib/config-manager.ts` beheert het bestand `config.yml` uit de Git-gebaseerde CMS-repository. Het verwerkt het lezen, schrijven en committen van configuratiewijzigingen.

### Configuratie lezen

```ts
import { configManager } from '@/lib/config-manager';

// Volledige configuratie ophalen
const config = configManager.getConfig();

// Een specifieke sleutel ophalen
const pagination = configManager.getPaginationConfig();
// Geeft terug: { type: 'standard' | 'infinite', itemsPerPage: 12 }

// Geneste waarde ophalen
const value = configManager.getNestedValue('pagination.type');
```

### Configuratie schrijven

Alle schrijfbewerkingen worden automatisch gecommit en gepusht naar de Git-repository:

```ts
// Paginering bijwerken
await configManager.updatePagination('infinite', 24);

// Willekeurige sleutel op het hoogste niveau bijwerken
await configManager.updateKey('pagination', { type: 'standard', itemsPerPage: 20 });

// Geneste sleutel bijwerken
await configManager.updateNestedKey('headerSettings.sticky', true);
```

### Git-integratie

De ConfigManager doet dit automatisch:
1. Het YAML-bestand naar de inhoudsmap schrijven
2. Een Git-commit met een beschrijvend bericht in de wachtrij plaatsen
3. Pushen naar de geconfigureerde GitHub-repository
4. Git-bewerkingen serialiseren om gelijktijdige schrijfconflicten te voorkomen

Commit-berichten zijn contextbewust:

```ts
// Voor pagineringswijzigingen:
"Update pagination configuration (type: infinite, itemsPerPage: 24) - 2024-01-20T..."

// Voor headernavigatie:
"Update custom header navigation (5 items) - 2024-01-20T..."

// Voor generieke sleutels:
"Update config.yml: myKey - 2024-01-20T..."
```

### Beveiliging

De ConfigManager bevat prototypevervuilingsbescherming:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
```

Pogingen om `__proto__`-, `constructor`- of `prototype`-sleutels bij te werken worden stilzwijgend afgewezen.

## Verwante bestanden

| Pad | Beschrijving |
|-----|--------------|
| `lib/config/feature-flags.ts` | Functievlagdefinities en hulpfuncties |
| `lib/config.ts` | Clientveilige siteConfig en type-herexports |
| `lib/config-manager.ts` | YAML-configuratie lezen/schrijven met Git-integratie |
| `lib/config/index.ts` | Barrel-export voor de configuratiemodule |
| `lib/config/config-service.ts` | Server-side ConfigService-singleton |
| `lib/config/types.ts` | TypeScript-typedefinities voor configuratie |
| `.env.example` | Volledige lijst met opties voor omgevingsvariabelen |
