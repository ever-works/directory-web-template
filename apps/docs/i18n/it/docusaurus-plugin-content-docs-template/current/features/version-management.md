---
id: version-management
title: Gestione delle versioni
sidebar_label: Gestione delle versioni
sidebar_position: 15
---

# Gestione delle versioni

Il modello Ever Works include un sistema di gestione delle versioni che tiene traccia della versione del repository di dati, visualizza le informazioni sulla versione agli amministratori e fornisce il rilevamento automatico della sincronizzazione. Questo sistema monitora il repository di contenuti CMS basato su Git e presenta i dettagli della versione tramite componenti dell'interfaccia utente configurabili.

## Panoramica dell'architettura

| Componente | Percorso | Scopo |
|---|---|---|
| `useVersionInfo` | `hooks/use-version-info.ts` | Hook React Query per recuperare i dati della versione dall'API |
| `useVersionInfoUtils` | `hooks/use-version-info.ts` | Gancio di utilità per la gestione della cache |
| `VersionDisplay` | `components/version/version-display.tsx` | Componente display versione configurabile |
| `VersionTooltip` | `components/version/version-tooltip.tsx` | Descrizione comando al passaggio del mouse che mostra informazioni dettagliate sulla versione |
| `/api/version` | `app/api/version/route.ts` | Endpoint API che restituisce i dati della versione corrente |

## Struttura dati informazioni versione

Il sistema di versione tiene traccia dei seguenti dati dal repository dei contenuti:

| Campo | Digitare | Descrizione |
|---|---|---|
| `commit` | `string` | Hash di commit breve della versione dei dati corrente |
| `date` | `string` | Stringa della data ISO del commit |
| `author` | `string` | Nome dell'autore del commit |
| `message` | `string` | Messaggio di commit |
| `repository` | `string` | URL del repository |
| `lastSync` | `string` | Timestamp dell'ultima sincronizzazione dei dati |

## Il gancio `useVersionInfo` ### Interfaccia

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

### Utilizzo

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

### Strategia di memorizzazione nella cache

| Impostazione | Valore | Descrizione |
|---|---|---|
| `staleTime` | 5 minuti | Dati considerati aggiornati per 5 minuti |
| `gcTime` | 30 minuti | Raccolta rifiuti dopo 30 minuti |
| `refetchOnWindowFocus` | `false` | Nessun recupero sul cambio di scheda |
| `refetchOnReconnect` | `true` | Recupera quando la rete si riconnette |
| `refetchOnMount` | `false` | Salta il recupero se la cache contiene dati |

### Riprova logica

L'hook implementa il tentativo intelligente con backoff esponenziale:

- Non riprova in caso di errori del client (codici di stato 4xx)
- Riprova gli errori di rete e del server fino a 2 volte
- Utilizza backoff esponenziale: `min(1000 * 2^attempt, 30000ms)` ## Componente di visualizzazione della versione

Il componente `VersionDisplay` supporta tre varianti visive:

### Variante in linea (predefinita)

Un display in linea compatto che mostra l'hash del commit e il tempo relativo:

```tsx
<VersionDisplay variant="inline" />
// Output: v abc1234 . 2h ago .
```

### Variante del distintivo

Un badge a forma di pillola con sfondo sfumato:

```tsx
<VersionDisplay variant="badge" />
// Output: [git-icon] v abc1234 . 2h ago
```

### Variante dettagliata

Una scheda con le informazioni complete sulla versione:

```tsx
<VersionDisplay
  variant="detailed"
  showDetails={true}
  refreshInterval={10 * 60 * 1000}
/>
```

La variante dettagliata mostra:
- Commit hash e tempo relativo
- Nome dell'autore
- Messaggio di commit (prima riga, tra virgolette)
- Timestamp dell'ultimo aggiornamento (quando `showDetails` è vero)
- Timestamp dell'ultima sincronizzazione
- Nome dell'archivio

### Oggetti di scena

| Prop | Digitare | Predefinito | Descrizione |
|---|---|---|---|
| `className` | `string` | `""` | Classi CSS aggiuntive |
| `variant` | `"inline" \| "badge" \| "detailed"` | `"inline"` | Stile di visualizzazione |
| `showDetails` | `boolean` | `false` | Mostra dettagli estesi (solo variante dettagliata) |
| `refreshInterval` | `number` | `300000` (5 min) | Intervallo di aggiornamento automatico in millisecondi |

### Controllo degli accessi

Il componente rispetta i ruoli utente:
- **Utenti normali**: il componente è nascosto quando le informazioni sulla versione non sono disponibili
- **Utenti sviluppatore/amministratore**: lo stato di errore viene visualizzato con il messaggio "Versione non disponibile".

```tsx
const isDevOrAdmin = useIsDevOrAdmin();

if (error || !versionInfo) {
  if (!isDevOrAdmin) return null;  // Hide for regular users
  return <span>Version unavailable</span>;  // Show error for admins
}
```

## Descrizione comando della versione

Il `VersionTooltip` racchiude qualsiasi elemento in un tooltip al passaggio del mouse che mostra informazioni dettagliate sulla versione:

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

### Funzionalità delle descrizioni comandi

| Caratteristica | Descrizione |
|---|---|
| Spettacolo ritardato | Ritardo configurabile prima che venga visualizzata la descrizione comando (impostazione predefinita: 300 ms) |
| Nasconditi velocemente | Ritardo di 100 ms durante il congedo del mouse per un'interazione fluida |
| Descrizione comando al passaggio del mouse | La descrizione comando rimane visibile quando si passa sopra |
| Supporto tastiera | Il tasto Escape chiude la descrizione comando |
| Accessibilità | Attributi ARIA ( `role="tooltip"` , `aria-describedby` ) |
| Degrado grazioso | Restituisce i figli senza descrizione comando quando i dati non sono disponibili |

### Oggetti di scena

| Prop | Digitare | Predefinito | Descrizione |
|---|---|---|---|
| `children` | `ReactNode` | richiesto | L'elemento trigger |
| `className` | `string` | `""` | Classi CSS aggiuntive |
| `disabled` | `boolean` | `false` | Disabilita completamente la descrizione comando |
| `delay` | `number` | `300` | Mostra ritardo in millisecondi |

## Utilità cache

L'hook `useVersionInfoUtils` fornisce funzioni di gestione della cache:

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

## Formattazione della data

Il componente `VersionDisplay` include utilità di formattazione della data memorizzata:

| Funzione | Esempio di output |
|---|---|
| `formatDate` | "15 gennaio 2025, 14:30" |
| `getRelativeTime` | "Proprio adesso", "3 ore fa", "2 giorni fa", "15 gennaio" |
| `getRepositoryName` | "funziona sempre/dati-fantastici-per-il-tracciamento-del-tempo" |

## File chiave

| File | Percorso |
|---|---|
| Informazioni sulla versione Gancio | `hooks/use-version-info.ts` |
| Visualizzazione della versione | `components/version/version-display.tsx` |
| Descrizione comando versione | `components/version/version-tooltip.tsx` |
| Percorso API versione | `app/api/version/route.ts` |
