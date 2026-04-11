---
id: version-management
title: Versiebeheer
sidebar_label: Versiebeheer
sidebar_position: 15
---

# Versiebeheer

De Ever Works-sjabloon bevat een versiebeheersysteem dat de versie van de gegevensopslagplaats bijhoudt, versie-informatie weergeeft aan beheerders en automatische synchronisatiedetectie biedt. Dit systeem bewaakt de op Git gebaseerde CMS-inhoudsopslagplaats en presenteert versiedetails via configureerbare UI-componenten.

## Architectuuroverzicht

| Onderdeel | Pad | Doel |
|---|---|---|
| `useVersionInfo` | `hooks/use-version-info.ts` | React Query hook voor het ophalen van versiegegevens uit de API |
| `useVersionInfoUtils` | `hooks/use-version-info.ts` | Utility hook voor cachebeheer |
| `VersionDisplay` | `components/version/version-display.tsx` | Configureerbare versie weergavecomponent |
| `VersionTooltip` | `components/version/version-tooltip.tsx` | Beweeg over tooltip met gedetailleerde versie-informatie |
| `/api/version` | `app/api/version/route.ts` | API-eindpunt retourneert huidige versiegegevens |

## Versie-informatie Gegevensstructuur

Het versiesysteem houdt de volgende gegevens bij uit de inhoudsopslagplaats:

| Veld | Typ | Beschrijving |
|---|---|---|
| `commit` | `string` | Korte commit-hash van de huidige gegevensversie |
| `date` | `string` | ISO-datumreeks van de commit |
| `author` | `string` | Auteursnaam vastleggen |
| `message` | `string` | Commit-bericht |
| `repository` | `string` | Repository-URL |
| `lastSync` | `string` | Tijdstempel van de laatste gegevenssynchronisatie |

## De `useVersionInfo` haak

### Interface

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

### Gebruik

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

### Cachingstrategie

| Instelling | Waarde | Beschrijving |
|---|---|---|
| `staleTime` | 5 minuten | Gegevens worden gedurende 5 minuten als nieuw beschouwd |
| `gcTime` | 30 minuten | Afvalinzameling na 30 minuten |
| `refetchOnWindowFocus` | `false` | Geen retetch op tabbladschakelaar |
| `refetchOnReconnect` | `true` | Opnieuw ophalen wanneer netwerk opnieuw verbinding maakt |
| `refetchOnMount` | `false` | Opnieuw ophalen overslaan als cache gegevens bevat |

### Logica opnieuw proberen

De hook implementeert intelligente nieuwe pogingen met exponentiële uitstel:

- Probeert niet opnieuw bij clientfouten (4xx-statuscodes)
- Probeert netwerk- en serverfouten tot 2 keer opnieuw
- Gebruikt exponentiële uitstel: `min(1000 * 2^attempt, 30000ms)` ## Versie Weergavecomponent

De component `VersionDisplay` ondersteunt drie visuele varianten:

### Inlinevariant (standaard)

Een compact inline display dat de commit-hash en relatieve tijd toont:

```tsx
<VersionDisplay variant="inline" />
// Output: v abc1234 . 2h ago .
```

### Badgevariant

Een pilvormige badge met verloopachtergrond:

```tsx
<VersionDisplay variant="badge" />
// Output: [git-icon] v abc1234 . 2h ago
```

### Gedetailleerde variant

Een kaart met volledige versie-informatie:

```tsx
<VersionDisplay
  variant="detailed"
  showDetails={true}
  refreshInterval={10 * 60 * 1000}
/>
```

De gedetailleerde variant toont:
- Leg hash en relatieve tijd vast
- Naam van de auteur
- Commit-bericht (eerste regel, geciteerd)
- Tijdstempel laatste update (wanneer `showDetails` waar is)
- Laatste synchronisatietijdstempel
- Naam van de opslagplaats

### Rekwisieten

| Prop | Typ | Standaard | Beschrijving |
|---|---|---|---|
| `className` | `string` | `""` | Extra CSS-klassen |
| `variant` | `"inline" \| "badge" \| "detailed"` | `"inline"` | Weergavestijl |
| `showDetails` | `boolean` | `false` | Uitgebreide details tonen (alleen gedetailleerde variant) |
| `refreshInterval` | `number` | `300000` (5 min) | Interval voor automatisch vernieuwen in milliseconden |

### Toegangscontrole

De component respecteert gebruikersrollen:
- **Regelmatige gebruikers**: Component is verborgen wanneer versie-informatie niet beschikbaar is
- **Dev/Admin-gebruikers**: de foutstatus wordt weergegeven met het bericht 'Versie niet beschikbaar'

```tsx
const isDevOrAdmin = useIsDevOrAdmin();

if (error || !versionInfo) {
  if (!isDevOrAdmin) return null;  // Hide for regular users
  return <span>Version unavailable</span>;  // Show error for admins
}
```

## Versie-knopinfo

De `VersionTooltip` omhult elk element met een hover-tooltip die gedetailleerde versie-informatie weergeeft:

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

### Tooltip-functies

| Kenmerk | Beschrijving |
|---|---|
| Vertraagde show | Configureerbare vertraging voordat tooltip verschijnt (standaard: 300 ms) |
| Snel verbergen | 100 ms vertraging bij muisverlof voor soepele interactie |
| Knopinfo-zweven | Tooltip blijft zichtbaar als u erover zweeft |
| Toetsenbordondersteuning | De Escape-toets sluit de tooltip | af
| Toegankelijkheid | ARIA-attributen ( `role="tooltip"` , `aria-describedby` ) |
| Sierlijke degradatie | Retourneert kinderen zonder tooltip wanneer gegevens niet beschikbaar zijn |

### Rekwisieten

| Prop | Typ | Standaard | Beschrijving |
|---|---|---|---|
| `children` | `ReactNode` | vereist | Het triggerelement |
| `className` | `string` | `""` | Extra CSS-klassen |
| `disabled` | `boolean` | `false` | Tooltip volledig uitschakelen |
| `delay` | `number` | `300` | Vertraging in milliseconden weergeven |

## Cachehulpprogramma's

De `useVersionInfoUtils` hook biedt functies voor cachebeheer:

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

## Datumopmaak

De component `VersionDisplay` bevat hulpprogramma's voor het noteren van datums:

| Functie | Voorbeelduitvoer |
|---|---|
| `formatDate` | "15 januari 2025, 14:30 uur" |
| `getRelativeTime` | "Zojuist", "3 uur geleden", "2d geleden", "15 januari" |
| `getRepositoryName` | "ever-works/awesome-time-tracking-data" |

## Sleutelbestanden

| Bestand | Pad |
|---|---|
| Versie-info Hook | `hooks/use-version-info.ts` |
| Versieweergave | `components/version/version-display.tsx` |
| Versie Tooltip | `components/version/version-tooltip.tsx` |
| Versie API-route | `app/api/version/route.ts` |
