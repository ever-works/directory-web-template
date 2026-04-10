---
id: data-versioning
title: Sistema di Versioning dei Dati
sidebar_label: Versioning Dati
sidebar_position: 6
---

# Sistema di Versioning dei Dati

Ever Works include un sistema di versioning dei dati che mostra agli utenti la versione corrente dei dati che stanno visualizzando, offrendo trasparenza sull'aggiornamento dei contenuti.

## Panoramica

Il sistema offre:
- 📊 **Visualizzazione versione in tempo reale** – Mostra la versione corrente del repository dati
- 🔄 **Auto-aggiornamento** – Aggiorna periodicamente le informazioni sulla versione
- 🎨 **Varianti multiple** – Viste badge, inline e dettagliate
- 💡 **Dettagli tooltip** – Hover per informazioni complete
- ⚡ **Supporto ISR** – Funziona con Incremental Static Regeneration
- 🛡️ **Gestione errori** – Fallback elegante quando non disponibile

## Architettura

```mermaid
graph TB
    Component[VersionDisplay] --> Hook[useVersionInfo]
    Hook --> API[/api/version]
    API --> Git[Git Repository]
    Git --> Sync[Auto Sync]
    Sync --> Cache[Cache Layer]
    Cache --> Response[Version Info]
```

## Componenti

### VersionDisplay

Componente principale per la visualizzazione delle informazioni sulla versione.

```tsx
import { VersionDisplay } from "@/components/version";

<VersionDisplay variant="inline" />
<VersionDisplay variant="badge" />
<VersionDisplay variant="detailed" showDetails={true} />
```

**Props**:
- `variant`: `"inline" | "badge" | "detailed"` – Stile di visualizzazione
- `showDetails`: `boolean` – Mostra informazioni estese
- `refreshInterval`: `number` – Intervallo di auto-aggiornamento in ms

### useVersionInfo Hook

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

const { versionInfo, loading, error, refetch } = useVersionInfo({
  refreshInterval: 5 * 60 * 1000,
  retryOnError: true,
});
```

## Endpoint API

### GET /api/version

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

## Configurazione

### Variabili d'ambiente

```env
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
GH_TOKEN=ghp_your_github_token_here
REPO_SYNC_INTERVAL=300000
```

## Esempi d'uso

### Badge versione nel footer

```tsx
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

## Best Practice

### 1. Posizionamento
- **Footer**: Variante inline o badge
- **Pannelli admin**: Variante dettagliata
- **Header**: Variante badge

### 2. Intervalli di aggiornamento
- **Pagine pubbliche**: 5–10 minuti
- **Pagine admin**: 1–2 minuti
- **Dashboard in tempo reale**: 30 secondi
