---
id: version-management
title: Versionsverwaltung
sidebar_label: Versionsverwaltung
sidebar_position: 15
---

# Versionsverwaltung

Die Ever Works-Vorlage umfasst ein Versionsverwaltungssystem, das die Daten-Repository-Version verfolgt, Versionsinformationen für Administratoren anzeigt und eine automatische Synchronisierungserkennung bereitstellt. Dieses System überwacht das Git-basierte CMS-Inhalts-Repository und präsentiert Versionsdetails über konfigurierbare UI-Komponenten.

## Architekturübersicht

| Komponente | Pfad | Zweck |
|---|---|---|
| `useVersionInfo` | `hooks/use-version-info.ts` | React Query-Hook zum Abrufen von Versionsdaten von der API |
| `useVersionInfoUtils` | `hooks/use-version-info.ts` | Utility-Hook für die Cache-Verwaltung |
| `VersionDisplay` | `components/version/version-display.tsx` | Konfigurierbare Versionsanzeigekomponente |
| `VersionTooltip` | `components/version/version-tooltip.tsx` | Hover-Tooltip mit detaillierten Versionsinformationen |
| `/api/version` | `app/api/version/route.ts` | API-Endpunkt, der aktuelle Versionsdaten zurückgibt |

## Versionsinformationsdatenstruktur

Das Versionssystem verfolgt die folgenden Daten aus dem Content-Repository:

| Feld | Geben Sie | ein Beschreibung |
|---|---|---|
| `commit` | `string` | Kurzer Commit-Hash der aktuellen Datenversion |
| `date` | `string` | ISO-Datumszeichenfolge des Commits |
| `author` | `string` | Namen des Autors festlegen |
| `message` | `string` | Commit-Nachricht |
| `repository` | `string` | Repository-URL |
| `lastSync` | `string` | Zeitstempel der letzten Datensynchronisation |

## Der `useVersionInfo` Haken

### Schnittstelle

```tsx
interface UseVersionInfoOptions {
  refreshInterval?: number;    // Auto-refresh interval in ms (default: 5 min)
  retryOnError?: boolean;      // Retry on failures (default: true)
  enabled?: boolean;           // Enable/disable the query (default: true)
}

interface UseVersionInfoReturn {
  versionInfo: VersionInfo | null;
  isLoading: boolean;
  isError: boolean;
  error: UseVersionInfoError | null;
  refetch: () => Promise<any>;
  isStale: boolean;
  dataUpdatedAt: number;
  invalidateVersionInfo: () => Promise<void>;
}
```

### Nutzung

```tsx
import { useVersionInfo } from '@/hooks/use-version-info';

function VersionIndicator() {
  const { versionInfo, isLoading, error } = useVersionInfo({
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    retryOnError: true
  });

  if (isLoading) return <span>Loading...</span>;
  if (error) return <span>Version unavailable</span>;

  return <span>v{versionInfo?.commit}</span>;
}
```

### Caching-Strategie

| Einstellung | Wert | Beschreibung |
|---|---|---|
| `staleTime` | 5 Minuten | Daten gelten 5 Minuten lang als aktuell |
| `gcTime` | 30 Minuten | Garbage Collection nach 30 Minuten |
| `refetchOnWindowFocus` | `false` | Kein erneuter Abruf beim Tab-Wechsel |
| `refetchOnReconnect` | `true` | Erneut abrufen, wenn das Netzwerk erneut eine Verbindung herstellt |
| `refetchOnMount` | `false` | Erneutes Abrufen überspringen, wenn der Cache Daten enthält |

### Wiederholungslogik

Der Hook implementiert einen intelligenten Wiederholungsversuch mit exponentiellem Backoff:

- Kein erneuter Versuch bei Client-Fehlern (4xx-Statuscodes)
- Wiederholt Netzwerk- und Serverfehler bis zu zwei Mal
- Verwendet exponentielles Backoff: `min(1000 * 2^attempt, 30000ms)` ## Versionsanzeigekomponente

Die `VersionDisplay` -Komponente unterstützt drei visuelle Varianten:

### Inline-Variante (Standard)

Eine kompakte Inline-Anzeige, die den Commit-Hash und die relative Zeit anzeigt:

```tsx
<VersionDisplay variant="inline" />
// Output: v abc1234 . 2h ago .
```

### Abzeichenvariante

Ein pillenförmiges Abzeichen mit Hintergrund mit Farbverlauf:

```tsx
<VersionDisplay variant="badge" />
// Output: [git-icon] v abc1234 . 2h ago
```

### Detaillierte Variante

Eine Karte mit vollständigen Versionsinformationen:

```tsx
<VersionDisplay
  variant="detailed"
  showDetails={true}
  refreshInterval={10 * 60 * 1000}
/>
```

Die Detailvariante zeigt:
- Commit-Hash und relative Zeit
- Name des Autors
- Commit-Nachricht (erste Zeile, zitiert)
- Zeitstempel der letzten Aktualisierung (wenn `showDetails` wahr ist)
- Zeitstempel der letzten Synchronisierung
– Repository-Name

### Requisiten

| Stütze | Geben Sie | ein Standard | Beschreibung |
|---|---|---|---|
| `className` | `string` | `""` | Zusätzliche CSS-Klassen |
| `variant` | `"inline" \| "badge" \| "detailed"` | `"inline"` | Anzeigestil |
| `showDetails` | `boolean` | `false` | Erweiterte Details anzeigen (nur detaillierte Variante) |
| `refreshInterval` | `number` | `300000` (5 Min.) | Automatisches Aktualisierungsintervall in Millisekunden |

### Zugangskontrolle

Die Komponente respektiert Benutzerrollen:
- **Normale Benutzer**: Komponente wird ausgeblendet, wenn Versionsinformationen nicht verfügbar sind
- **Dev/Admin-Benutzer**: Der Fehlerstatus wird mit der Meldung „Version nicht verfügbar“ angezeigt

```tsx
const isDevOrAdmin = useIsDevOrAdmin();

if (error || !versionInfo) {
  if (!isDevOrAdmin) return null;  // Hide for regular users
  return <span>Version unavailable</span>;  // Show error for admins
}
```

## Versions-Tooltip

Das `VersionTooltip` umschließt jedes Element mit einem Hover-Tooltip, der detaillierte Versionsinformationen anzeigt:

```tsx
import { VersionTooltip } from '@/components/version/version-tooltip';

function Footer() {
  return (
    <VersionTooltip delay={300}>
      <span>Data v1.0</span>
    </VersionTooltip>
  );
}
```

### Tooltip-Funktionen

| Funktion | Beschreibung |
|---|---|
| Verspätete Show | Konfigurierbare Verzögerung, bevor der Tooltip angezeigt wird (Standard: 300 ms) |
| Schnell ausblenden | 100 ms Verzögerung beim Verlassen der Maus für reibungslose Interaktion |
| Tooltip-Hover | Tooltip bleibt sichtbar, wenn Sie mit der Maus darüber fahren |
| Tastaturunterstützung | Die Escape-Taste schließt den Tooltip |
| Barrierefreiheit | ARIA-Attribute ( `role="tooltip"` , `aria-describedby` ) |
| Anmutige Erniedrigung | Gibt untergeordnete Elemente ohne Tooltip zurück, wenn keine Daten verfügbar sind |

### Requisiten

| Stütze | Geben Sie | ein Standard | Beschreibung |
|---|---|---|---|
| `children` | `ReactNode` | erforderlich | Das Triggerelement |
| `className` | `string` | `""` | Zusätzliche CSS-Klassen |
| `disabled` | `boolean` | `false` | Tooltip vollständig deaktivieren |
| `delay` | `number` | `300` | Verzögerung in Millisekunden anzeigen |

## Cache-Dienstprogramme

Der `useVersionInfoUtils` -Hook bietet Cache-Verwaltungsfunktionen:

```tsx
import { useVersionInfoUtils } from '@/hooks/use-version-info';

function AdminPanel() {
  const {
    prefetchVersionInfo,
    invalidateVersionInfo,
    getVersionInfoFromCache,
    setVersionInfoInCache
  } = useVersionInfoUtils();

  // Prefetch version data before it is needed
  useEffect(() => {
    prefetchVersionInfo();
  }, []);

  // Force refresh
  const handleRefresh = () => invalidateVersionInfo();

  // Read directly from cache
  const cached = getVersionInfoFromCache();
}
```

## Datumsformatierung

Die `VersionDisplay` -Komponente enthält gespeicherte Dienstprogramme zur Datumsformatierung:

| Funktion | Beispielausgabe |
|---|---|
| `formatDate` | „15. Januar 2025, 14:30 Uhr“ |
| `getRelativeTime` | „Gerade jetzt“, „vor 3 Stunden“, „vor 2 Tagen“, „15. Januar“ |
| `getRepositoryName` | „ever-works/awesome-time-tracking-data“ |

## Schlüsseldateien

| Datei | Pfad |
|---|---|
| Versionsinfo-Hook | `hooks/use-version-info.ts` |
| Versionsanzeige | `components/version/version-display.tsx` |
| Versions-Tooltip | `components/version/version-tooltip.tsx` |
| Versions-API-Route | `app/api/version/route.ts` |
