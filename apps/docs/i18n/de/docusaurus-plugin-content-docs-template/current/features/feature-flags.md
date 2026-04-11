---
id: feature-flags
title: Feature-Flags-System
sidebar_label: Feature-Flags
sidebar_position: 9
---

# Feature-Flags-System

Die Ever Works-Vorlage verwendet ein Feature-Flags-System, um fehlende Abhängigkeiten, insbesondere die Datenbankverfügbarkeit, ordnungsgemäß zu handhaben. Von der Datenbank abhängige Funktionen werden automatisch deaktiviert, wenn `DATABASE_URL` nicht konfiguriert ist, sodass die Vorlage in einem statischen Inhaltsmodus betrieben werden kann.

## Konfiguration

Das Feature-Flags-Modul befindet sich bei `lib/config/feature-flags.ts` und bietet eine serverseitige Flag-Auflösung.

### Flag-Definitionen

```typescript
interface FeatureFlags {
  ratings: boolean;         // User ratings and reviews
  comments: boolean;        // User comments on items
  favorites: boolean;       // User favorite items collection
  featuredItems: boolean;   // Admin-managed featured items
  surveys: boolean;         // User surveys and feedback
}
```

### Auflösungslogik

Alle aktuellen Flags hängen von der Datenbankverfügbarkeit ab:

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

## Serverseitige API

### getFeatureFlags

Gibt alle Flags als Objekt zurück:

```typescript
import { getFeatureFlags } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
if (flags.comments) {
  // Render comments section
}
```

### istFeatureEnabled

Überprüfen Sie ein einzelnes Flag:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Show comments
}
```

### getDisabledFeatures

Gibt ein Array deaktivierter Funktionsnamen zurück, die zum Debuggen nützlich sind:

```typescript
import { getDisabledFeatures } from '@/lib/config/feature-flags';

const disabled = getDisabledFeatures();
// e.g., ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']
```

### getEnabledFeatures

Gibt ein Array aktivierter Funktionsnamen zurück:

```typescript
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
```

### areAllFeaturesEnabled

Überprüfen Sie schnell, ob alle Funktionen verfügbar sind:

```typescript
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';

if (areAllFeaturesEnabled()) {
  // Full feature set available
}
```

## Clientseitige Hooks

### useFeatureFlag

Überprüfen Sie ein einzelnes Feature-Flag auf dem Client:

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const isEnabled = useFeatureFlag('comments');
```

### FeatureFlags verwenden

Holen Sie sich alle Feature-Flags:

```typescript
import { useFeatureFlags } from '@/hooks/use-feature-flags';

const { flags, isLoading } = useFeatureFlags();
```

### useFeatureFlagsWithSimulation

Erweiterter Hook, der den Admin-Simulationsmodus zum Testen von Funktionen unterstützt:

```typescript
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

const {
  features,          // FeatureFlags (actual or simulated)
  isSimulating,      // boolean
  toggleSimulation,  // (feature: keyof FeatureFlags) => void
} = useFeatureFlagsWithSimulation();
```

Dieser Hook wird vom Favoritensystem verwendet, um Funktionen in der Entwicklung bedingt zu aktivieren/deaktivieren.

## Integrationsbeispiele

### Bedingtes Komponenten-Rendering

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

### Feature-Gating auf Hook-Ebene

Viele Hooks prüfen Feature-Flags intern. Beispielsweise wird `useFavorites` nur abgerufen, wenn die Favoritenfunktion aktiviert ist:

```typescript
// Inside useFavorites:
const { data: favorites = [] } = useQuery({
  queryKey: ['favorites'],
  queryFn: fetchFavorites,
  enabled: !!user?.id && features.favorites, // Feature flag check
});
```

### Bedingte API-Routen

Feature-Flags können auch in API-Routen überprüft werden, um entsprechende Antworten zurückzugeben:

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

## Hinzufügen eines neuen Feature-Flags

1. **Flag zur Schnittstelle hinzufügen** in `lib/config/feature-flags.ts` :

```typescript
interface FeatureFlags {
  // ... existing flags
  newFeature: boolean;
}
```

2. **Legen Sie die Auflösungslogik fest** in `getFeatureFlags()` :

```typescript
return {
  // ... existing flags
  newFeature: isDatabaseConfigured && Boolean(process.env.NEW_FEATURE_ENABLED),
};
```

3. **Verwendung in Komponenten und Hooks** über `isFeatureEnabled('newFeature')` oder die clientseitigen Hooks.

## Designphilosophie

Das Feature-Flag-System ist bewusst einfach:
– **Keine externe Dienstabhängigkeit** – Flags werden aus Umgebungsvariablen aufgelöst
– **Kein Laufzeit-Overhead** – Flags werden einmal pro Anfrage/Rendering berechnet
– **Anständige Verschlechterung** – Fehlende Datenbank deaktiviert DB-abhängige Funktionen ohne Fehler
- **Entwicklerfreundlich** – Klare Benennung, TypeScript-Typen und Hilfsfunktionen
