---
id: item-submissions
title: Zgłoszenia przedmiotów
sidebar_label: Zgłoszenia przedmiotów
sidebar_position: 31
---

# Zgłoszenia przedmiotu

System przesyłania pozycji zapewnia użytkownikom kompletny przepływ pracy polegający na przesyłaniu, zarządzaniu i śledzeniu list katalogowych. Obejmuje śledzenie statusu (oczekujący, zatwierdzony, odrzucony), filtrowanie, karty statystyk, modyfikacje szczegółów, modyfikacje edycji i usuwanie z potwierdzeniem.

## Przegląd architektury

| Moduł | Ścieżka | Cel |
|------------|------|--------|
| Lista zgłoszeń | `components/submissions/submission-list.tsx` | Główny komponent listy z paginacją |
| Element przesłania | `components/submissions/submission-item.tsx` | Karta zgłoszenia indywidualnego |
| Filtry zgłoszeń | `components/submissions/submission-filters.tsx` | Zakładki stanu i wyszukiwanie |
| Karty statystyk zgłoszeń | `components/submissions/submission-stats-cards.tsx` | Przegląd kart statystyk |
| EdytujSubmissionModal | `components/submissions/edit-submission-modal.tsx` | Modalne edytowanie inline |
| Szczegóły zgłoszeniaModal | `components/submissions/submission-detail-modal.tsx` | Widok szczegółowy tylko do odczytu |
| Usuń okno dialogowe przesyłania | `components/submissions/delete-submission-dialog.tsx` | Potwierdzenie usunięcia |
| Element kosza | `components/submissions/trash-item.tsx` | Wyświetlanie zniszczonych przedmiotów |
| Straż planu | `lib/guards/plan-features.guard.ts` | Limity zgłoszeń według planu |

## Model danych przesłanych

Interfejs `Submission` reprezentuje przesłanie w interfejsie użytkownika:

```ts
export interface Submission {
  id: string;
  title: string;
  description: string;
  status: "approved" | "pending" | "rejected";
  submittedAt: string | null;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  source_url?: string;
}
```

Pomocnik `toSubmission` konwertuje z modelu danych API:

```ts
export function toSubmission(
  item: ClientSubmissionData
): Submission {
  const approvedAt =
    item.status === 'approved' ? item.reviewed_at : undefined;
  const rejectedAt =
    item.status === 'rejected' ? item.reviewed_at : undefined;

  return {
    id: item.id,
    title: item.name,
    description: item.description,
    status: (['approved', 'pending', 'rejected'].includes(
      item.status
    )
      ? item.status
      : 'pending') as Submission['status'],
    submittedAt: item.submitted_at || item.updated_at || null,
    approvedAt,
    rejectedAt,
    rejectionReason: item.review_notes,
    category: Array.isArray(item.category)
      ? item.category[0] || 'Uncategorized'
      : item.category || 'Uncategorized',
    tags: item.tags || [],
    views: item.views || 0,
    likes: item.likes || 0,
    source_url: item.source_url,
  };
}
```

## Komponent listy zgłoszeń

Komponent `SubmissionList` wyświetla listę zgłoszeń ze stanami ładowania, pustymi i wypełnionymi:

```tsx
export interface SubmissionListProps {
  items: ClientSubmissionData[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  deletingId?: string | null;
  updatingId?: string | null;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateActionLabel?: string;
  emptyStateActionHref?: string;
  skeletonCount?: number;
}
```

Kluczowe zachowania:

- **Stan ładowania** -- renderuje `SubmissionItemSkeleton` symbole zastępcze
- **Stan pusty** -- pokazuje wezwanie do działania prowadzące do `/submit` - **Stan zaludnienia** -- mapuje elementy do `toSubmission()` i renderuje `SubmissionItem` dla każdego
- **Optymistyczne wskaźniki ładowania** -- `deletingId` i `updatingId` wyłączają dotknięte elementy

Wariant `SubmissionListWithInfo` dodaje wyświetlanie metadanych paginacji.

## Konfiguracja stanu

Każdy status przesłania jest powiązany z ikoną, schematem kolorów i kluczem tłumaczenia:

```ts
const statusConfig = {
  approved: {
    labelKey: "STATUS_APPROVED",
    icon: FiCheck,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  pending: {
    labelKey: "STATUS_PENDING",
    icon: FiClock,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  rejected: {
    labelKey: "STATUS_REJECTED",
    icon: FiX,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
};
```

W przypadku odrzuconych zgłoszeń powód odrzucenia jest wyświetlany w czerwonym polu objaśnień.

## Filtry zgłoszeń

Komponent `SubmissionFilters` zapewnia filtrowanie stanu w stylu tabulatora i wyszukiwanie tekstu:

```tsx
export interface SubmissionFiltersProps {
  status: ClientStatusFilter;
  search: string;
  onStatusChange: (status: ClientStatusFilter) => void;
  onSearchChange: (search: string) => void;
  isSearching?: boolean;
  disabled?: boolean;
  statusCounts?: {
    all: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}
```

Funkcje:

- **Zakładki stanu** -- Przyciski pigułek dla wszystkich, zatwierdzonych, oczekujących i odrzuconych z opcjonalnymi identyfikatorami licznika
- **Wprowadzanie wyszukiwania** -- Wyszukiwanie pełnotekstowe za pomocą przycisku czyszczenia i pokrętła ładowania
- **Wariant kompaktowy** -- `SubmissionFiltersCompact` wykorzystuje menu rozwijane w przypadku układów o ograniczonej przestrzeni

## Karty statystyk

Komponent `SubmissionStatsCards` wyświetla cztery karty statystyk w siatce:

```tsx
export interface SubmissionStatsCardsProps {
  stats: ClientItemStats;
  isLoading?: boolean;
}
```

Cztery karty pokazują:

| Karta | Klucz | Kolor |
|------|-----|-------|
| Całkowita liczba zgłoszeń | `total` | Niebieski |
| Zatwierdzone | `approved` | Zielony |
| Oczekuje | `pending` | Żółty |
| Odrzucony | `rejected` | Czerwony |

Każda karta ma gradientowe tło ikony, animowany szkielet ładowania i efekt cienia po najechaniu myszką.

## Karta przedmiotu zgłoszenia

Każde `SubmissionItem` renderuje:

- Tytuł z plakietką stanu
- Opis skrócony (zacisk dwuwierszowy)
- Do 5 tagów z liczbą przepełnień
- Wiersz metadanych: kategoria, data przesłania, liczba wyświetleń, liczba polubień
- Przyciski akcji: Wyświetl, Edytuj, Usuń
- Ładowanie pokręteł na przyciskach edycji/usuwania, gdy operacje są w toku
- Stan wyłączony podczas operacji masowych

## Limity zgłoszeń oparte na planie

System ochrony planu kontroluje, ile zgłoszeń może dokonać użytkownik:

```ts
// lib/guards/plan-features.guard.ts
export const PLAN_LIMITS = {
  free:     { max_submissions: 1   },
  standard: { max_submissions: 10  },
  premium:  { max_submissions: null }, // unlimited
};
```

Aby sprawdzić limity przed przesłaniem:

```ts
const guard = createPlanGuard(userPlan);
guard.requireWithinLimit('max_submissions', currentCount);
// Throws if limit exceeded
```

Dodatkowe funkcje zależne od planu dotyczące zgłoszeń:

| Funkcja | Bezpłatne | Standardowe | Premium |
|--------|------|----------|---------|
| Prześlij elementy | Tak | Tak | Tak |
| Maks. obrazów | 1 | 5 | Nieograniczony |
| Słowa opisu | 200 | 500 | Nieograniczony |
| Przesyłanie wideo | Nie | Nie | Tak |
| Zweryfikowana odznaka | Nie | Tak | Tak |
| Przegląd priorytetowy | Nie | Tak | Tak |
| Natychmiastowa recenzja | Nie | Nie | Tak |
| Czas przeglądu (dni) | 7 | 3 | 1 |

## Przebieg przesyłania

1. **Użytkownik przesyła** -- Wypełnia wieloetapowy formularz zgłoszeniowy
2. **Walidacja** — Sprawdzane są limity planu i walidacja danych wejściowych
3. **Przechowywanie** — Dane przedmiotu są przechowywane w systemie CMS opartym na Git za pośrednictwem usługi przedmiotów
4. **Stan: Oczekujący** — Zgłoszenie trafia do kolejki przeglądu administratora
5. **Przegląd administratora** – Administrator zatwierdza lub odrzuca z opcjonalnymi notatkami
6. **Stan: Zatwierdzony/Odrzucony** — Użytkownik widzi zaktualizowany status w swoim panelu kontrolnym
7. **Edytuj** – Użytkownicy mogą edytować zgłoszenia (w ramach limitów modyfikacji planu)
8. **Usuń** — Użytkownicy mogą usuwać własne zgłoszenia w oknie dialogowym potwierdzenia

## Internacjonalizacja

Cały tekst interfejsu użytkownika wykorzystuje `next-intl` tłumaczenia w przestrzeni nazw `client.submissions` :

- `NO_SUBMISSIONS_TITLE` -- Nagłówek stanu pustego
- `NO_SUBMISSIONS_DESC` -- Opis stanu pustego
- `SUBMIT_FIRST_PROJECT` -- Przycisk wezwania do działania
- `STATUS_APPROVED` , `STATUS_PENDING` , `STATUS_REJECTED` -- Etykiety stanu
- `SUBMITTED` -- Prefiks daty
- `VIEWS_COUNT` , `LIKES_COUNT` -- Etykiety metryczne z parametrem licznikowym
- `REJECTION_REASON` -- Etykieta objaśniająca odrzucenie
- `SEARCH_PLACEHOLDER` -- Wyszukaj element zastępczy danych wejściowych
- `SHOWING_RESULTS` , `PAGE_INFO` -- Tekst paginacji

## Powiązana dokumentacja

- [Formularze wieloetapowe](/docs/template/features/multi-step-forms) -- Implementacja formularza zgłoszeniowego
– [Zarządzanie administracyjne](/docs/template/features/admin-management) – Przebieg przeglądu przez administratora
– [Głosowanie i komentarze](/docs/template/features/voting-comments) – Zaangażowanie w zgłoszenia
