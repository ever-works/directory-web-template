---
id: version-management
title: Zarządzanie wersjami
sidebar_label: Zarządzanie wersjami
sidebar_position: 15
---

# Zarządzanie wersjami

Szablon Ever Works zawiera system zarządzania wersjami, który śledzi wersję repozytorium danych, wyświetla informacje o wersji administratorom i zapewnia automatyczne wykrywanie synchronizacji. System ten monitoruje repozytorium treści CMS oparte na Git i prezentuje szczegóły wersji poprzez konfigurowalne komponenty interfejsu użytkownika.

## Przegląd architektury

| Składnik | Ścieżka | Cel |
|---|---|---|
| `useVersionInfo` | `hooks/use-version-info.ts` | Reaguj na zapytanie umożliwiające pobranie danych wersji z API |
| `useVersionInfoUtils` | `hooks/use-version-info.ts` | Hak narzędziowy do zarządzania pamięcią podręczną |
| `VersionDisplay` | `components/version/version-display.tsx` | Konfigurowalny komponent wyświetlania wersji |
| `VersionTooltip` | `components/version/version-tooltip.tsx` | Najedź etykietką pokazującą szczegółowe informacje o wersji |
| `/api/version` | `app/api/version/route.ts` | Punkt końcowy interfejsu API zwracający dane bieżącej wersji |

## Struktura danych informacji o wersji

System wersji śledzi następujące dane z repozytorium treści:

| Pole | Wpisz | Opis |
|---|---|---|
| `commit` | `string` | Krótki skrót zatwierdzenia bieżącej wersji danych |
| `date` | `string` | Ciąg daty ISO zatwierdzenia |
| `author` | `string` | Zatwierdź nazwisko autora |
| `message` | `string` | Zatwierdź wiadomość |
| `repository` | `string` | Adres URL repozytorium |
| `lastSync` | `string` | Znacznik czasu ostatniej synchronizacji danych |

## Hak `useVersionInfo` ### Interfejs

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

### Użycie

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

### Strategia buforowania

| Ustawienie | Wartość | Opis |
|---|---|---|
| `staleTime` | 5 minut | Dane uważane za świeże przez 5 minut |
| `gcTime` | 30 minut | Zbiórka śmieci po 30 minutach |
| `refetchOnWindowFocus` | `false` | Brak ponownego pobierania po przełączeniu karty |
| `refetchOnReconnect` | `true` | Ponów pobieranie, gdy sieć ponownie się połączy |
| `refetchOnMount` | `false` | Pomiń ponowne pobieranie, jeśli pamięć podręczna zawiera dane |

### Ponów próbę logiczną

Hak implementuje inteligentną ponowną próbę z wykładniczym wycofywaniem:

— Nie podejmuje ponownych prób w przypadku błędów klienta (kody stanu 4xx)
- Ponawia błędy sieci i serwera do 2 razy
- Wykorzystuje wykładnicze wycofywanie: `min(1000 * 2^attempt, 30000ms)` ## Komponent wyświetlania wersji

Komponent `VersionDisplay` obsługuje trzy warianty wizualne:

### Wariant wbudowany (domyślny)

Kompaktowy wyświetlacz inline pokazujący skrót zatwierdzenia i czas względny:

```tsx
<VersionDisplay variant="inline" />
// Output: v abc1234 . 2h ago .
```

### Wariant odznaki

Plakietka w kształcie pigułki z gradientowym tłem:

```tsx
<VersionDisplay variant="badge" />
// Output: [git-icon] v abc1234 . 2h ago
```

### Wariant szczegółowy

Karta z pełną informacją o wersji:

```tsx
<VersionDisplay
  variant="detailed"
  showDetails={true}
  refreshInterval={10 * 60 * 1000}
/>
```

Szczegółowy wariant pokazuje:
- Zatwierdź skrót i czas względny
- Nazwisko autora
- Komunikat zatwierdzenia (pierwszy wiersz, cytowany)
- Znacznik czasu ostatniej aktualizacji (jeśli wartość `showDetails` jest prawdziwa)
- Znacznik czasu ostatniej synchronizacji
- Nazwa repozytorium

### Rekwizyty

| Podpora | Wpisz | Domyślne | Opis |
|---|---|---|---|
| `className` | `string` | `""` | Dodatkowe klasy CSS |
| `variant` | `"inline" \| "badge" \| "detailed"` | `"inline"` | Styl wyświetlania |
| `showDetails` | `boolean` | `false` | Pokaż rozszerzone szczegóły (tylko wariant szczegółowy) |
| `refreshInterval` | `number` | `300000` (5 min) | Interwał automatycznego odświeżania w milisekundach |

### Kontrola dostępu

Komponent uwzględnia role użytkowników:
- **Stali użytkownicy**: Komponent jest ukryty, gdy informacje o wersji są niedostępne
- **Użytkownicy Dev/Admin**: Stan błędu jest wyświetlany z komunikatem „Wersja niedostępna”.

```tsx
const isDevOrAdmin = useIsDevOrAdmin();

if (error || !versionInfo) {
  if (!isDevOrAdmin) return null;  // Hide for regular users
  return <span>Version unavailable</span>;  // Show error for admins
}
```

## Etykietka wersji `VersionTooltip` otacza dowolny element etykietką wyświetlającą szczegółowe informacje o wersji:

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

### Funkcje podpowiedzi

| Funkcja | Opis |
|---|---|
| Opóźniony pokaz | Konfigurowalne opóźnienie przed pojawieniem się podpowiedzi (domyślnie: 300 ms) |
| Szybkie ukrycie | Opóźnienie 100 ms po opuszczeniu myszy zapewnia płynną interakcję |
| Najechanie etykietką | Etykietka pozostaje widoczna po najechaniu na nią kursorem |
| Obsługa klawiatury | Klawisz Escape zamyka podpowiedź |
| Dostępność | Atrybuty ARIA ( `role="tooltip"` , `aria-describedby` ) |
| Pełna wdzięku degradacja | Zwraca elementy podrzędne bez podpowiedzi, gdy dane są niedostępne |

### Rekwizyty

| Podpora | Wpisz | Domyślne | Opis |
|---|---|---|---|
| `children` | `ReactNode` | wymagane | Element wyzwalający |
| `className` | `string` | `""` | Dodatkowe klasy CSS |
| `disabled` | `boolean` | `false` | Całkowicie wyłącz podpowiedź |
| `delay` | `number` | `300` | Pokaż opóźnienie w milisekundach |

## Narzędzia pamięci podręcznej

Haczyk `useVersionInfoUtils` udostępnia funkcje zarządzania pamięcią podręczną:

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

## Formatowanie daty

Komponent `VersionDisplay` zawiera narzędzia do formatowania daty zapisane w pamięci:

| Funkcja | Przykładowe wyjście |
|---|---|
| `formatDate` | „15 stycznia 2025, 14:30” |
| `getRelativeTime` | „Właśnie teraz”, „3 godziny temu”, „2 dni temu”, „15 stycznia” |
| `getRepositoryName` | „zawsze działa/niesamowite-dane-śledzenia czasu” |

## Kluczowe pliki

| Plik | Ścieżka |
|---|---|
| Informacje o wersji Hook | `hooks/use-version-info.ts` |
| Wersja wyświetlacza | `components/version/version-display.tsx` |
| Etykietka wersji | `components/version/version-tooltip.tsx` |
| Wersja API Trasa | `app/api/version/route.ts` |
