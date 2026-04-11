---
id: feature-flags
title: Sistema di flag di funzionalità
sidebar_label: Flag di funzionalità
sidebar_position: 9
---

# Sistema di flag di funzionalità

Il modello Ever Works utilizza un sistema di contrassegni di funzionalità per gestire con garbo le dipendenze mancanti, in particolare la disponibilità del database. Le funzionalità che dipendono dal database vengono automaticamente disabilitate quando `DATABASE_URL` non è configurato, consentendo al modello di funzionare in modalità contenuto statico.

##Configurazione

Situato in `lib/config/feature-flags.ts` , il modulo feature flag fornisce la risoluzione dei flag lato server.

### Definizioni dei flag

```typescript
interface FeatureFlags {
  ratings: boolean;         // User ratings and reviews
  comments: boolean;        // User comments on items
  favorites: boolean;       // User favorite items collection
  featuredItems: boolean;   // Admin-managed featured items
  surveys: boolean;         // User surveys and feedback
}
```

### Logica di risoluzione

Tutti i flag attuali dipendono dalla disponibilità del database:

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

## API lato server

### getFeatureFlags

Restituisce tutti i flag come oggetto:

```typescript
import { getFeatureFlags } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
if (flags.comments) {
  // Render comments section
}
```

### èFeatureEnabled

Controlla un singolo flag:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Show comments
}
```

### getDisabledFeatures

Restituisce un array di nomi di funzionalità disabilitate, utili per il debug:

```typescript
import { getDisabledFeatures } from '@/lib/config/feature-flags';

const disabled = getDisabledFeatures();
// e.g., ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']
```

### getEnabledFeatures

Restituisce un array di nomi di funzionalità abilitate:

```typescript
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
```

### sonoTutte le funzionalità abilitate

Verifica rapidamente se tutte le funzionalità sono disponibili:

```typescript
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';

if (areAllFeaturesEnabled()) {
  // Full feature set available
}
```

## Hook lato client

### usaFeatureFlag

Controlla un singolo flag di funzionalità sul client:

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const isEnabled = useFeatureFlag('comments');
```

### usaFeatureFlags

Ottieni tutti i flag di funzionalità:

```typescript
import { useFeatureFlags } from '@/hooks/use-feature-flags';

const { flags, isLoading } = useFeatureFlags();
```

### usaFeatureFlagsWithSimulazione

Hook esteso che supporta la modalità di simulazione dell'amministratore per testare le funzionalità:

```typescript
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

const {
  features,          // FeatureFlags (actual or simulated)
  isSimulating,      // boolean
  toggleSimulation,  // (feature: keyof FeatureFlags) => void
} = useFeatureFlagsWithSimulation();
```

Questo hook viene utilizzato dal sistema dei preferiti per abilitare/disabilitare in modo condizionale le funzionalità in fase di sviluppo.

## Esempi di integrazione

### Rendering dei componenti condizionali

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

### Gating di funzionalità a livello di hook

Molti hook controllano internamente i flag di funzionalità. Ad esempio, `useFavorites` viene recuperato solo quando la funzione Preferiti è abilitata:

```typescript
// Inside useFavorites:
const { data: favorites = [] } = useQuery({
  queryKey: ['favorites'],
  queryFn: fetchFavorites,
  enabled: !!user?.id && features.favorites, // Feature flag check
});
```

### Percorsi API condizionali

I flag di funzionalità possono anche essere controllati nelle route API per restituire risposte appropriate:

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

## Aggiunta di un nuovo flag di funzionalità

1. **Aggiungi il flag all'interfaccia** in `lib/config/feature-flags.ts` :

```typescript
interface FeatureFlags {
  // ... existing flags
  newFeature: boolean;
}
```

2. **Impostare la logica di risoluzione** in `getFeatureFlags()` :

```typescript
return {
  // ... existing flags
  newFeature: isDatabaseConfigured && Boolean(process.env.NEW_FEATURE_ENABLED),
};
```

3. **Utilizzo in componenti e ganci** tramite `isFeatureEnabled('newFeature')` o i ganci lato client.

## Filosofia del design

Il sistema di flag delle funzionalità è intenzionalmente semplice:
- **Nessuna dipendenza dal servizio esterno** -- I flag vengono risolti dalle variabili di ambiente
- **Nessun sovraccarico di runtime** -- I flag vengono calcolati una volta per richiesta/rendering
- **Degradazione regolare**: il database mancante disabilita le funzionalità dipendenti dal DB senza errori
- **Facile per gli sviluppatori** -- Denominazione chiara, tipi TypeScript e funzioni di supporto
