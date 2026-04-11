---
id: data-versioning
title: Dataversioneringssysteem
sidebar_label: Dataversies
sidebar_position: 6
---

# Dataversioneringssysteem

Ever Works bevat een dataversioneringssysteem dat gebruikers de huidige versie toont van de gegevens die ze bekijken, wat transparantie biedt over de actualiteit van de inhoud.

## Overzicht

Het systeem biedt:
- 📊 **Realtime versieweergave** – Toont de huidige versie van het datarepository
- 🔄 **Auto-refresh** – Versie-informatie periodiek bijwerken
- 🎨 **Meerdere varianten** – Badge-, inline- en gedetailleerde weergaven
- 💡 **Tooltip-details** – Hover voor uitgebreide informatie
- ⚡ **ISR-ondersteuning** – Werkt met Incremental Static Regeneration
- 🛡️ **Foutafhandeling** – Graceful fallback bij niet-beschikbaarheid

## Architectuur

```mermaid
graph TB
    Component[VersionDisplay] --> Hook[useVersionInfo]
    Hook --> API[/api/version]
    API --> Git[Git Repository]
    Git --> Sync[Auto Sync]
    Sync --> Cache[Cache Layer]
    Cache --> Response[Version Info]
```

## Componenten

### VersionDisplay

Hoofdcomponent voor het weergeven van versie-informatie.

```tsx
import { VersionDisplay } from "@/components/version";

// Eenvoudige inline weergave
<VersionDisplay variant="inline" />

// Badge-variant
<VersionDisplay variant="badge" />

// Gedetailleerde weergave met aanvullende informatie
<VersionDisplay variant="detailed" showDetails={true} />
```

**Props**:
- `variant`: `"inline" | "badge" | "detailed"` – Weergavestijl
- `showDetails`: `boolean` – Uitgebreide informatie tonen (alleen gedetailleerde variant)
- `className`: `string` – Aanvullende CSS-klassen
- `refreshInterval`: `number` – Auto-refresh interval in ms (standaard: 5 minuten)

### VersionTooltip

Wrappercomponent die een tooltip met gedetailleerde versie-informatie toevoegt.

```tsx
import { VersionTooltip } from "@/components/version";

<VersionTooltip>
  <VersionDisplay variant="badge" />
</VersionTooltip>
```

**Functies**:
- Toont commit-hash en datum
- Geeft commitbericht weer
- Toont auteurinformatie
- Koppelt naar repository

### useVersionInfo Hook

Aangepaste hook voor het beheren van versie-informatie met caching en auto-refresh.

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

const { versionInfo, loading, error, refetch } = useVersionInfo({
  refreshInterval: 5 * 60 * 1000, // 5 minuten
  retryOnError: true,
  retryDelay: 10000
});
```

**Retourneert**:
- `versionInfo`: Versiegegevensobject
- `loading`: Laadstatus
- `error`: Foutstatus
- `refetch`: Handmatige vernieuwingsfunctie

## API-eindpunt

### GET /api/version

Retourneert actuele versie-informatie van het datarepository.

**Antwoord**:
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

**Cache-headers**:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: "abc1234"
```

## Configuratie

### Omgevingsvariabelen

```env
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
GH_TOKEN=ghp_your_github_token_here
REPO_SYNC_INTERVAL=300000
```

## Gebruik voorbeelden

### Footer versie-badge

```tsx
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

## Best Practices

### 1. Plaatsing
- **Footer**: Inline- of badge-variant gebruiken
- **Admin-panels**: Gedetailleerde variant gebruiken
- **Headers**: Badge-variant gebruiken

### 2. Vernieuwingsintervallen
- **Openbare pagina's**: 5–10 minuten
- **Admin-pagina's**: 1–2 minuten
- **Realtime dashboards**: 30 seconden
