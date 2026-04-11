---
id: data-versioning
title: Datenversionierungsanzeigesystem
sidebar_label: Datenversionierung
sidebar_position: 6
---

# Datenversionierungsanzeigesystem

Ever Works enthält ein Datenversionierungssystem, das Benutzern die aktuelle Version der angezeigten Daten zeigt und so Transparenz über die Aktualität der Inhalte bietet.

## Übersicht

Das System bietet:
- 📊 **Echtzeit-Versionsanzeige** – Zeigt die aktuelle Version des Datenrepositorys
- 🔄 **Auto-Aktualisierung** – Aktualisiert Versionsinformationen regelmäßig
- 🎨 **Mehrere Varianten** – Badge-, Inline- und Detailansichten
- 💡 **Tooltip-Details** – Hover für umfassende Informationen
- ⚡ **ISR-Unterstützung** – Funktioniert mit Incremental Static Regeneration
- 🛡️ **Fehlerbehandlung** – Graceful Fallback bei Nichtverfügbarkeit

## Architektur

```mermaid
graph TB
    Component[VersionDisplay] --> Hook[useVersionInfo]
    Hook --> API[/api/version]
    API --> Git[Git Repository]
    Git --> Sync[Auto Sync]
    Sync --> Cache[Cache Layer]
    Cache --> Response[Version Info]
```

## Komponenten

### VersionDisplay

Hauptkomponente zur Anzeige von Versionsinformationen.

```tsx
import { VersionDisplay } from "@/components/version";

// Einfache Inline-Anzeige
<VersionDisplay variant="inline" />

// Badge-Variante
<VersionDisplay variant="badge" />

// Detailansicht mit zusätzlichen Informationen
<VersionDisplay variant="detailed" showDetails={true} />
```

**Props**:
- `variant`: `"inline" | "badge" | "detailed"` – Anzeigestil
- `showDetails`: `boolean` – Erweiterte Informationen anzeigen (nur Detailvariante)
- `className`: `string` – Zusätzliche CSS-Klassen
- `refreshInterval`: `number` – Auto-Aktualisierungsintervall in ms (Standard: 5 Minuten)

### VersionTooltip

Wrapper-Komponente, die einen Tooltip mit detaillierten Versionsinformationen hinzufügt.

```tsx
import { VersionTooltip } from "@/components/version";

<VersionTooltip>
  <VersionDisplay variant="badge" />
</VersionTooltip>
```

**Funktionen**:
- Zeigt Commit-Hash und Datum
- Zeigt Commit-Nachricht an
- Zeigt Autorinformationen
- Verlinkt zum Repository

### useVersionInfo Hook

Benutzerdefinierter Hook zur Verwaltung von Versionsinformationen mit Caching und Auto-Aktualisierung.

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

const { versionInfo, loading, error, refetch } = useVersionInfo({
  refreshInterval: 5 * 60 * 1000, // 5 Minuten
  retryOnError: true,
  retryDelay: 10000
});
```

**Rückgabewerte**:
- `versionInfo`: Versionsdatenobjekt
- `loading`: Ladezustand
- `error`: Fehlerzustand
- `refetch`: Manuelle Aktualisierungsfunktion

## API-Endpunkt

### GET /api/version

Gibt aktuelle Versionsinformationen des Datenrepositorys zurück.

**Antwort**:
```json
{
  "commit": "abc1234",
  "date": "2024-01-01T12:00:00.000Z",
  "message": "Update data items",
  "author": "Developer Name",
  "repository": "https://github.com/owner/repo",
  "lastSync": "2024-01-01T12:05:00.000Z"
}
```

**Funktionen**:
- Automatische Repository-Synchronisierung vor dem Abrufen
- Korrekte Cache-Header für optimale Leistung
- ETag-Unterstützung für effizientes Caching
- Fehlerbehandlung mit angemessenen HTTP-Statuscodes

**Cache-Header**:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: "abc1234"
```

## Konfiguration

### Umgebungsvariablen

```env
# Datenrepository-URL
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# GitHub-Token für private Repositories (optional)
GH_TOKEN=ghp_your_github_token_here

# Repository-Synchronisierungsintervall (optional, Standard: 5 Minuten)
REPO_SYNC_INTERVAL=300000
```

### Caching-Strategie

#### Client-seitiger Cache
- **Dauer**: 1 Minute
- **Strategie**: stale-while-revalidate
- **Aktualisierung**: Automatische Hintergrundaktualisierungen

#### Server-seitiger Cache
- **Dauer**: 60 Sekunden
- **Strategie**: s-maxage mit Revalidierung
- **ETag**: Commit-Hash-basiert

## Verwendungsbeispiele

### Footer-Versions-Badge

```tsx
// components/footer/Footer.tsx
import { VersionDisplay } from "@/components/version";

export function Footer() {
  return (
    <footer>
      <div className="container">
        <p>© 2024 Ever Works</p>
        <VersionDisplay variant="badge" />
      </div>
    </footer>
  );
}
```

### Admin-Dashboard

```tsx
// app/admin/dashboard/page.tsx
import { VersionDisplay } from "@/components/version";

export default function AdminDashboard() {
  return (
    <div>
      <h1>Admin-Dashboard</h1>
      <VersionDisplay 
        variant="detailed" 
        showDetails={true}
        refreshInterval={60000} // 1 Minute
      />
    </div>
  );
}
```

### Benutzerdefinierte Implementierung

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

export function CustomVersionDisplay() {
  const { versionInfo, loading, error, refetch } = useVersionInfo();

  if (loading) return <div>Version wird geladen...</div>;
  if (error) return <div>Version nicht verfügbar</div>;

  return (
    <div>
      <p>Datenversion: {versionInfo.commit.substring(0, 7)}</p>
      <p>Aktualisiert: {new Date(versionInfo.date).toLocaleDateString()}</p>
      <button onClick={refetch}>Aktualisieren</button>
    </div>
  );
}
```

## Anzeigevarianten

### Inline-Variante

Kompakte Textanzeige für Fußzeilen oder Seitenleisten.

```tsx
<VersionDisplay variant="inline" />
// Ausgabe: "Data v.abc1234 • Updated 2 hours ago"
```

### Badge-Variante

Pillenförmiges Badge mit Symbol, ideal für Header oder Navigation.

```tsx
<VersionDisplay variant="badge" />
// Ausgabe: [🔄 v.abc1234]
```

### Detailvariante

Umfassende Ansicht mit allen Versionsinformationen.

```tsx
<VersionDisplay variant="detailed" showDetails={true} />
// Ausgabe: Karte mit Commit, Datum, Nachricht, Autor, Repository-Link
```

## Best Practices

### 1. Platzierung
- **Fußzeile**: Inline- oder Badge-Variante verwenden
- **Admin-Panels**: Detailvariante verwenden
- **Header**: Badge-Variante verwenden
- **Tooltips**: Beliebige Variante mit VersionTooltip umhüllen

### 2. Aktualisierungsintervalle
- **Öffentliche Seiten**: 5–10 Minuten
- **Admin-Seiten**: 1–2 Minuten
- **Echtzeit-Dashboards**: 30 Sekunden

### 3. Fehlerbehandlung
- Immer Fallback-UI bereitstellen
- Fehler für Monitoring protokollieren
- Benutzerfreundliche Nachrichten anzeigen

### 4. Leistung
- Angemessene Cache-Dauern verwenden
- stale-while-revalidate implementieren
- Übermäßige API-Aufrufe vermeiden

## Fehlerbehebung

### Version wird nicht aktualisiert

**Problem**: Versionsinformationen werden nicht aktualisiert

**Lösung**: Aktualisierungsintervall und Cache-Einstellungen prüfen

```tsx
// Sofortige Aktualisierung erzwingen
const { refetch } = useVersionInfo();
refetch();
```

### API-Fehler

**Problem**: `/api/version` gibt Fehler zurück

**Lösung**: Umgebungsvariablen und Repository-Zugriff überprüfen

```bash
# Umgebungsvariablen prüfen
echo $DATA_REPOSITORY
echo $GH_TOKEN

# Repository-Zugriff testen
git ls-remote $DATA_REPOSITORY
```

### Langsames Laden

**Problem**: Versionskomponente lädt langsam

**Lösung**: Caching optimieren und Aktualisierungsfrequenz reduzieren
