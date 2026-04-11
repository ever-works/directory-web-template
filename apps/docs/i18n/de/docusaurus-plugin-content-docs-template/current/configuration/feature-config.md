---
id: feature-config
title: "Funktionskonfiguration"
sidebar_label: "Feature Config"
sidebar_position: 3
---

# Funktionskonfiguration

Das Template verwendet ein Feature-Flag-System, um Funktionalität basierend auf der Systemkonfiguration kontrolliert zu aktivieren oder zu deaktivieren. Dadurch kann die Anwendung ohne Datenbank (nur statische Inhalte) funktionieren und Features progressiv aktivieren, sobald die Infrastruktur verfügbar wird.

## Feature-Flags-Modul

Die Feature-Flags sind in `lib/config/feature-flags.ts` definiert.

### FeatureFlags-Interface

```ts
interface FeatureFlags {
  /** Bewertungs- und Rezensionsfunktionalität der Benutzer */
  ratings: boolean;
  /** Benutzerkommentare zu Einträgen */
  comments: boolean;
  /** Benutzer-Favoriten-Eintragssammlung */
  favorites: boolean;
  /** Admin-verwaltete hervorgehobene Eintragsanzeige */
  featuredItems: boolean;
  /** Benutzerumfragen und Feedback-Sammlung */
  surveys: boolean;
}
```

### Wie Flags bestimmt werden

Alle aktuellen Features hängen von der Datenbankverfügbarkeit ab. Ein Feature ist aktiviert, wenn `DATABASE_URL` konfiguriert ist:

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

Dieses Design ermöglicht es dem Template, Inhalte aus dem Git-basierten CMS ohne Datenbank bereitzustellen, während datenbankabhängige interaktive Features (Bewertungen, Kommentare, Favoriten) automatisch deaktiviert werden.

### Hilfsfunktionen

Das Modul bietet mehrere Hilfsfunktionen:

```ts
// Einzelnes Feature prüfen
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Kommentar-Komponente rendern
}

// Alle aktivierten Features abrufen
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
// z.B. ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']

// Alle deaktivierten Features abrufen (hilfreich beim Debuggen)
import { getDisabledFeatures } from '@/lib/config/feature-flags';
const disabled = getDisabledFeatures();

// Prüfen, ob alles bereit ist
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';
if (areAllFeaturesEnabled()) {
  console.log('Full platform is operational');
}
```

### Vollständige API-Referenz

| Funktion | Rückgabe | Beschreibung |
|----------|----------|--------------|
| `getFeatureFlags()` | `FeatureFlags` | Alle Flags als boolesches Objekt |
| `isFeatureEnabled(name)` | `boolean` | Einzelnes Feature nach Name prüfen |
| `getEnabledFeatures()` | `string[]` | Array aktivierter Feature-Namen |
| `getDisabledFeatures()` | `string[]` | Array deaktivierter Feature-Namen |
| `areAllFeaturesEnabled()` | `boolean` | Wahr, wenn jedes Feature aktiviert ist |

## Feature-abhängiges Rendering

### In Server-Komponenten

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

### In API-Routen

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
  // Kommentarerstellung verarbeiten...
}
```

## Website-Konfiguration (siteConfig)

Über Feature-Flags hinaus bietet das Template ein `siteConfig`-Objekt in `lib/config.ts` zur Anpassung von Branding und Metadaten. Jeder Wert kann über Umgebungsvariablen überschrieben werden:

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

### Anpassung über Umgebungsvariablen

| Variable | Standard | Zweck |
|----------|----------|-------|
| `NEXT_PUBLIC_SITE_NAME` | `'Ever Works'` | Site-Name in Metadaten und OG-Bildern |
| `NEXT_PUBLIC_SITE_TAGLINE` | Template-Standard | Homepage-Slogan |
| `NEXT_PUBLIC_APP_URL` | `'https://demo.ever.works'` | Vollständige Site-URL (kein abschließender Schrägstrich) |
| `NEXT_PUBLIC_SITE_LOGO` | `'/logo-ever-works.svg'` | Logo-Pfad relativ zu `/public` |
| `NEXT_PUBLIC_BRAND_NAME` | `'Ever Works'` | Schema.org-Organisationsname |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Template-Standard | SEO-Meta-Beschreibung |
| `NEXT_PUBLIC_SITE_KEYWORDS` | Template-Standards | Kommagetrennte SEO-Keywords |
| `NEXT_PUBLIC_OG_GRADIENT_START` | `'#667eea'` | OG-Bild-Verlauf Startfarbe |
| `NEXT_PUBLIC_OG_GRADIENT_END` | `'#764ba2'` | OG-Bild-Verlauf Endfarbe |
| `NEXT_PUBLIC_SOCIAL_GITHUB` | Ever Works URL | GitHub-Profillink |
| `NEXT_PUBLIC_SOCIAL_X` | Ever Works URL | X (Twitter)-Profillink |
| `NEXT_PUBLIC_ATTRIBUTION_URL` | `'https://ever.works'` | "Erstellt mit"-Footer-Link |

### Validierung

Die Funktion `validateSiteConfig()` prüft auf fehlende produktionskritische Variablen:

```ts
import { validateSiteConfig } from '@/lib/config';

// Gibt true zurück, wenn alle erforderlichen Variablen gesetzt sind, sonst false mit Warnungen
const isValid = validateSiteConfig();
```

Warnungen werden bei fehlendem `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` und `NEXT_PUBLIC_SITE_NAME` protokolliert.

## ConfigManager (YAML-Konfiguration)

Die Klasse `ConfigManager` in `lib/config-manager.ts` verwaltet die Datei `config.yml` aus dem Git-basierten CMS-Repository. Sie übernimmt das Lesen, Schreiben und Committen von Konfigurationsänderungen.

### Konfiguration lesen

```ts
import { configManager } from '@/lib/config-manager';

// Gesamte Konfiguration abrufen
const config = configManager.getConfig();

// Einen spezifischen Key abrufen
const pagination = configManager.getPaginationConfig();
// Gibt zurück: { type: 'standard' | 'infinite', itemsPerPage: 12 }

// Verschachtelten Wert abrufen
const value = configManager.getNestedValue('pagination.type');
```

### Konfiguration schreiben

Alle Schreibvorgänge werden automatisch committed und in das Git-Repository gepusht:

```ts
// Paginierung aktualisieren
await configManager.updatePagination('infinite', 24);

// Beliebigen Top-Level-Key aktualisieren
await configManager.updateKey('pagination', { type: 'standard', itemsPerPage: 20 });

// Verschachtelten Key aktualisieren
await configManager.updateNestedKey('headerSettings.sticky', true);
```

### Git-Integration

Der ConfigManager führt automatisch aus:
1. Die YAML-Datei in das Inhaltsverzeichnis schreiben
2. Einen Git-Commit mit einer beschreibenden Nachricht in die Warteschlange stellen
3. In das konfigurierte GitHub-Repository pushen
4. Git-Operationen serialisieren, um gleichzeitige Schreibkonflikte zu verhindern

Commit-Nachrichten sind kontextabhängig:

```ts
// Für Paginierungsänderungen:
"Update pagination configuration (type: infinite, itemsPerPage: 24) - 2024-01-20T..."

// Für Header-Navigation:
"Update custom header navigation (5 items) - 2024-01-20T..."

// Für generische Keys:
"Update config.yml: myKey - 2024-01-20T..."
```

### Sicherheit

Der ConfigManager enthält Prototype-Pollution-Schutz:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
```

Versuche, `__proto__`, `constructor` oder `prototype` Keys zu aktualisieren, werden stillschweigend abgelehnt.

## Verwandte Dateien

| Pfad | Beschreibung |
|------|--------------|
| `lib/config/feature-flags.ts` | Feature-Flag-Definitionen und Hilfsfunktionen |
| `lib/config.ts` | Client-sicherer siteConfig und Typ-Re-Exporte |
| `lib/config-manager.ts` | YAML-Konfigurations-Lese-/Schreiber mit Git-Integration |
| `lib/config/index.ts` | Barrel-Export für das Konfigurationsmodul |
| `lib/config/config-service.ts` | Server-seitiger ConfigService-Singleton |
| `lib/config/types.ts` | TypeScript-Typdefinitionen für die Konfiguration |
| `.env.example` | Vollständige Liste der Umgebungsvariablen-Optionen |
