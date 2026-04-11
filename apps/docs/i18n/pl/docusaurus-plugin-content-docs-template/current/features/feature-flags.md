---
id: feature-flags
title: System flag funkcji
sidebar_label: Flagi funkcyjne
sidebar_position: 9
---

# System flag funkcji

Szablon Ever Works wykorzystuje system flag funkcji, aby sprawnie obsługiwać brakujące zależności, w szczególności dostępność bazy danych. Funkcje zależne od bazy danych są automatycznie wyłączane, gdy `DATABASE_URL` nie jest skonfigurowane, dzięki czemu szablon może działać w trybie zawartości statycznej.

## Konfiguracja

Znajdujący się pod adresem `lib/config/feature-flags.ts` moduł flag funkcji zapewnia rozpoznawanie flag po stronie serwera.

### Definicje flag

```typescript
interface FeatureFlags {
  ratings: boolean;         // User ratings and reviews
  comments: boolean;        // User comments on items
  favorites: boolean;       // User favorite items collection
  featuredItems: boolean;   // Admin-managed featured items
  surveys: boolean;         // User surveys and feedback
}
```

### Logika rozdzielczości

Wszystkie aktualne flagi zależą od dostępności bazy danych:

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

## API po stronie serwera

### getFeatureFlags

Zwraca wszystkie flagi jako obiekt:

```typescript
import { getFeatureFlags } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
if (flags.comments) {
  // Render comments section
}
```

### to funkcja włączona

Sprawdź pojedynczą flagę:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Show comments
}
```

### pobierzDisabledFeatures

Zwraca tablicę nazw wyłączonych funkcji, przydatną do debugowania:

```typescript
import { getDisabledFeatures } from '@/lib/config/feature-flags';

const disabled = getDisabledFeatures();
// e.g., ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']
```

### pobierzEnabledFeatures

Zwraca tablicę nazw włączonych funkcji:

```typescript
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
```

### areAllFeaturesEnabled

Szybkie sprawdzenie, czy wszystkie funkcje są dostępne:

```typescript
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';

if (areAllFeaturesEnabled()) {
  // Full feature set available
}
```

## Haki po stronie klienta

### użyj flagi funkcji

Sprawdź flagę pojedynczej funkcji na kliencie:

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const isEnabled = useFeatureFlag('comments');
```

### użyjFeatureFlags

Pobierz wszystkie flagi funkcji:

```typescript
import { useFeatureFlags } from '@/hooks/use-feature-flags';

const { flags, isLoading } = useFeatureFlags();
```

### użyjFeatureFlagsWithSimulation

Rozszerzony hak obsługujący tryb symulacji administratora w celu testowania funkcji:

```typescript
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

const {
  features,          // FeatureFlags (actual or simulated)
  isSimulating,      // boolean
  toggleSimulation,  // (feature: keyof FeatureFlags) => void
} = useFeatureFlagsWithSimulation();
```

Ten hak jest używany przez system ulubionych do warunkowego włączania/wyłączania funkcji w fazie rozwoju.

## Przykłady integracji

### Renderowanie komponentów warunkowych

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

### Bramkowanie funkcji na poziomie haka

Wiele hooków sprawdza flagi funkcji wewnętrznie. Na przykład `useFavorites` zostanie pobrane tylko wtedy, gdy włączona jest funkcja ulubionych:

```typescript
// Inside useFavorites:
const { data: favorites = [] } = useQuery({
  queryKey: ['favorites'],
  queryFn: fetchFavorites,
  enabled: !!user?.id && features.favorites, // Feature flag check
});
```

### Warunkowe trasy API

Flagi funkcji można również sprawdzić w trasach API, aby zwrócić odpowiednie odpowiedzi:

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

## Dodanie nowej flagi funkcji

1. **Dodaj flagę do interfejsu** w `lib/config/feature-flags.ts` :

```typescript
interface FeatureFlags {
  // ... existing flags
  newFeature: boolean;
}
```

2. **Ustaw logikę rozdzielczości** na `getFeatureFlags()` :

```typescript
return {
  // ... existing flags
  newFeature: isDatabaseConfigured && Boolean(process.env.NEW_FEATURE_ENABLED),
};
```

3. **Użyj w komponentach i hakach** poprzez `isFeatureEnabled('newFeature')` lub haki po stronie klienta.

## Filozofia projektowania

System flag funkcji jest celowo prosty:
- **Brak zależności od usług zewnętrznych** -- Flagi są rozpoznawane na podstawie zmiennych środowiskowych
- **Brak narzutu w czasie wykonywania** -- Flagi są obliczane raz na żądanie/renderowanie
- **Łagodna degradacja** — Brakująca baza danych wyłącza funkcje zależne od bazy danych bez błędów
- **Przyjazny dla programistów** - Jasne nazewnictwo, typy TypeScript i funkcje pomocnicze
