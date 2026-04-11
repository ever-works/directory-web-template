---
id: feature-flags
title: Feature Flags-systeem
sidebar_label: Functievlaggen
sidebar_position: 9
---

# Feature Flags-systeem

De Ever Works-sjabloon maakt gebruik van een functievlagsysteem om ontbrekende afhankelijkheden, met name de beschikbaarheid van databases, op een elegante manier af te handelen. Functies die afhankelijk zijn van de database worden automatisch uitgeschakeld als `DATABASE_URL` niet is geconfigureerd, waardoor de sjabloon in een modus met statische inhoud kan werken.

## Configuratie

De feature flags-module bevindt zich op `lib/config/feature-flags.ts` en biedt vlagresolutie aan de serverzijde.

### Vlagdefinities

```typescript
interface FeatureFlags {
  ratings: boolean;         // User ratings and reviews
  comments: boolean;        // User comments on items
  favorites: boolean;       // User favorite items collection
  featuredItems: boolean;   // Admin-managed featured items
  surveys: boolean;         // User surveys and feedback
}
```

### Resolutielogica

Alle huidige vlaggen zijn afhankelijk van de beschikbaarheid van de database:

```typescript
function getFeatureFlags(): FeatureFlags {
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

## Server-side API

### getFeatureFlags

Retourneert alle vlaggen als object:

```typescript
import { getFeatureFlags } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
if (flags.comments) {
  // Render comments section
}
```

### isFeatureEnabled

Controleer een enkele vlag:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Show comments
}
```

### getDisabledFuncties

Retourneert een reeks uitgeschakelde functienamen, handig voor foutopsporing:

```typescript
import { getDisabledFeatures } from '@/lib/config/feature-flags';

const disabled = getDisabledFeatures();
// e.g., ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']
```

### getEnabledFuncties

Retourneert een array met ingeschakelde functienamen:

```typescript
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
```

### zijnAlleFeaturesEnabled

Controleer snel of alle functies beschikbaar zijn:

```typescript
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';

if (areAllFeaturesEnabled()) {
  // Full feature set available
}
```

## Haken aan de klantzijde

### gebruikFeatureFlag

Controleer een enkele functievlag op de client:

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const isEnabled = useFeatureFlag('comments');
```

### gebruikFeatureFlags

Ontvang alle functievlaggen:

```typescript
import { useFeatureFlags } from '@/hooks/use-feature-flags';

const { flags, isLoading } = useFeatureFlags();
```

### gebruikFeatureFlagsWithSimulation

Uitgebreide hook die de admin-simulatiemodus ondersteunt voor het testen van functies:

```typescript
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

const {
  features,          // FeatureFlags (actual or simulated)
  isSimulating,      // boolean
  toggleSimulation,  // (feature: keyof FeatureFlags) => void
} = useFeatureFlagsWithSimulation();
```

Deze hook wordt door het favorietensysteem gebruikt om functies in ontwikkeling voorwaardelijk in/uit te schakelen.

## Integratievoorbeelden

### Voorwaardelijke componentweergave

```typescript
function ItemDetailPage({ item }) {
  const flags = getFeatureFlags();

  return (
    <div>
      <ItemDetails item={item} />
      {flags.comments && <CommentsSection itemId={item.id} />}
      {flags.ratings && <RatingWidget itemId={item.id} />}
      {flags.favorites && <FavoriteButton item={item} />}
    </div>
  );
}
```

### Functiepoort op haakniveau

Veel haken controleren de functievlaggen intern. `useFavorites` wordt bijvoorbeeld alleen opgehaald als de favorietenfunctie is ingeschakeld:

```typescript
// Inside useFavorites:
const { data: favorites = [] } = useQuery({
  queryKey: ['favorites'],
  queryFn: fetchFavorites,
  enabled: !!user?.id && features.favorites, // Feature flag check
});
```

### Voorwaardelijke API-routes

Functievlaggen kunnen ook worden gecontroleerd in API-routes om de juiste antwoorden te retourneren:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export async function GET() {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Comments feature is not available' },
      { status: 503 }
    );
  }
  // ... handle request
}
```

## Een nieuwe functievlag toevoegen

1. **Voeg de vlag toe aan de interface** in `lib/config/feature-flags.ts` :

```typescript
interface FeatureFlags {
  // ... existing flags
  newFeature: boolean;
}
```

2. **Stel de resolutielogica in** in `getFeatureFlags()` :

```typescript
return {
  // ... existing flags
  newFeature: isDatabaseConfigured && Boolean(process.env.NEW_FEATURE_ENABLED),
};
```

3. **Gebruik in componenten en haken** via `isFeatureEnabled('newFeature')` of de haken aan de clientzijde.

## Ontwerpfilosofie

Het feature flag-systeem is opzettelijk eenvoudig:
- **Geen afhankelijkheid van externe services** -- Vlaggen worden omgezet op basis van omgevingsvariabelen
- **Geen runtime-overhead** -- Vlaggen worden één keer per aanvraag/weergave berekend
- **Graceful degradatie** -- Ontbrekende database schakelt DB-afhankelijke functies zonder fouten uit
- **Ontwikkelaarsvriendelijk** -- Duidelijke naamgeving, TypeScript-typen en helperfuncties
