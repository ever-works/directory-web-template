---
id: data-versioning
title: System Wersjonowania Danych
sidebar_label: Wersjonowanie
sidebar_position: 6
---

# System Wyświetlania Wersji Danych

Ever Works zawiera system wersjonowania danych, który pokazuje użytkownikom aktualną wersję przeglądanych danych, zapewniając przejrzystość co do świeżości treści.

## Przegląd

System zapewnia:
- 📊 **Wyświetlanie wersji w czasie rzeczywistym** - Pokazuje aktualną wersję repozytorium danych
- 🔄 **Automatyczne odświeżanie** - Okresowo aktualizuje informacje o wersji
- 🎨 **Wiele wariantów** - Widoki badge, inline i szczegółowy
- 💡 **Szczegóły w tooltipie** - Najedź, aby uzyskać wyczerpujące informacje
- ⚡ **Wsparcie ISR** - Działa z Inkrementalną Regeneracją Statyczną
- 🛡️ **Obsługa błędów** - Płynny fallback gdy niedostępny

## Architektura

```mermaid
graph TB
    Component[VersionDisplay] --> Hook[useVersionInfo]
    Hook --> API[/api/version]
    API --> Git[Git Repository]
    Git --> Sync[Auto Sync]
    Sync --> Cache[Cache Layer]
    Cache --> Response[Version Info]
```

## Komponenty

### VersionDisplay

Główny komponent do wyświetlania informacji o wersji.

```tsx
import { VersionDisplay } from "@/components/version";

// Podstawowe wyświetlanie inline
<VersionDisplay variant="inline" />

// Wariant badge
<VersionDisplay variant="badge" />

// Widok szczegółowy z dodatkowymi informacjami
<VersionDisplay variant="detailed" showDetails={true} />
```

**Właściwości**:
- `variant`: `"inline" | "badge" | "detailed"` - Styl wyświetlania
- `showDetails`: `boolean` - Pokaż rozszerzone informacje (tylko wariant szczegółowy)
- `className`: `string` - Dodatkowe klasy CSS
- `refreshInterval`: `number` - Interwał automatycznego odświeżania w ms (domyślnie: 5 minut)

### VersionTooltip

Komponent-wrapper dodający tooltip ze szczegółowymi informacjami o wersji.

```tsx
import { VersionTooltip } from "@/components/version";

<VersionTooltip>
  <VersionDisplay variant="badge" />
</VersionTooltip>
```

**Funkcje**:
- Pokazuje hash i datę commita
- Wyświetla wiadomość commita
- Pokazuje informacje o autorze
- Linki do repozytorium

### Hook useVersionInfo

Niestandardowy hook do zarządzania informacjami o wersji z pamięcią podręczną i automatycznym odświeżaniem.

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

const { versionInfo, loading, error, refetch } = useVersionInfo({
  refreshInterval: 5 * 60 * 1000, // 5 minut
  retryOnError: true,
  retryDelay: 10000
});
```

**Zwraca**:
- `versionInfo`: Obiekt danych wersji
- `loading`: Stan ładowania
- `error`: Stan błędu
- `refetch`: Funkcja ręcznego odświeżania

## Endpoint API

### GET /api/version

Zwraca aktualne informacje o wersji repozytorium danych.

**Odpowiedź**:
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

**Funkcje**:
- Automatyczna synchronizacja repozytorium przed pobieraniem
- Odpowiednie nagłówki cache dla optymalnej wydajności
- Wsparcie ETag dla efektywnego cache
- Obsługa błędów z odpowiednimi kodami statusu HTTP

**Nagłówki Cache**:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: "abc1234"
```

## Konfiguracja

### Zmienne Środowiskowe

```env
# URL repozytorium danych
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Token GitHub dla prywatnych repozytoriów (opcjonalne)
GH_TOKEN=ghp_your_github_token_here

# Interwał synchronizacji repozytorium (opcjonalne, domyślnie: 5 minut)
REPO_SYNC_INTERVAL=300000
```

### Strategia Cache

#### Cache po Stronie Klienta
- **Czas trwania**: 1 minuta
- **Strategia**: stale-while-revalidate
- **Odświeżanie**: Automatyczne aktualizacje w tle

#### Cache po Stronie Serwera
- **Czas trwania**: 60 sekund
- **Strategia**: s-maxage z rewalidacją
- **ETag**: Oparty na hash commita

## Przykłady Użycia

### Badge Wersji w Stopce

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

### Panel Administracyjny

```tsx
// app/admin/dashboard/page.tsx
import { VersionDisplay } from "@/components/version";

export default function AdminDashboard() {
  return (
    <div>
      <h1>Panel Administracyjny</h1>
      <VersionDisplay 
        variant="detailed" 
        showDetails={true}
        refreshInterval={60000} // 1 minuta
      />
    </div>
  );
}
```

### Własna Implementacja

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

export function CustomVersionDisplay() {
  const { versionInfo, loading, error, refetch } = useVersionInfo();

  if (loading) return <div>Ładowanie wersji...</div>;
  if (error) return <div>Wersja niedostępna</div>;

  return (
    <div>
      <p>Wersja danych: {versionInfo.commit.substring(0, 7)}</p>
      <p>Zaktualizowano: {new Date(versionInfo.date).toLocaleDateString()}</p>
      <button onClick={refetch}>Odśwież</button>
    </div>
  );
}
```

## Warianty Wyświetlania

### Wariant Inline

Kompaktowe wyświetlanie tekstu odpowiednie dla stopek lub pasków bocznych.

```tsx
<VersionDisplay variant="inline" />
// Wyjście: "Data v.abc1234 • Zaktualizowano 2 godziny temu"
```

### Wariant Badge

Badge w kształcie pigułki z ikoną, idealny dla nagłówków lub nawigacji.

```tsx
<VersionDisplay variant="badge" />
// Wyjście: [🔄 v.abc1234]
```

### Wariant Szczegółowy

Kompleksowy widok ze wszystkimi informacjami o wersji.

```tsx
<VersionDisplay variant="detailed" showDetails={true} />
// Wyjście: Karta z commitem, datą, wiadomością, autorem, linkiem do repozytorium
```

## Najlepsze Praktyki

### 1. Umiejscowienie
- **Stopka**: Użyj wariantu inline lub badge
- **Panele administracyjne**: Użyj wariantu szczegółowego
- **Nagłówki**: Użyj wariantu badge
- **Tooltipy**: Owiń dowolny wariant w VersionTooltip

### 2. Interwały Odświeżania
- **Strony publiczne**: 5-10 minut
- **Strony administracyjne**: 1-2 minuty
- **Dashboardy w czasie rzeczywistym**: 30 sekund

### 3. Obsługa Błędów
- Zawsze zapewniaj interfejs fallback
- Loguj błędy do monitorowania
- Pokazuj przyjazne dla użytkownika wiadomości

### 4. Wydajność
- Używaj odpowiednich czasów trwania cache
- Implementuj stale-while-revalidate
- Unikaj nadmiernych wywołań API

## Rozwiązywanie Problemów

### Wersja Nie Aktualizuje Się

**Problem**: Informacje o wersji nie odświeżają się

**Rozwiązanie**: Sprawdź interwał odświeżania i ustawienia cache

```tsx
// Wymuś natychmiastowe odświeżenie
const { refetch } = useVersionInfo();
refetch();
```

### Błędy API

**Problem**: `/api/version` zwraca błędy

**Rozwiązanie**: Sprawdź zmienne środowiskowe i dostęp do repozytorium

```bash
# Check environment variables
echo $DATA_REPOSITORY
echo $GH_TOKEN

# Test repository access
git ls-remote $DATA_REPOSITORY
```

### Wolne Ładowanie

**Problem**: Komponent wersji ładuje się wolno

**Rozwiązanie**: Zoptymalizuj cache i zmniejsz częstotliwość odświeżania
