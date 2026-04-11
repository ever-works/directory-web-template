---
id: surveys
title: System ankiet
sidebar_label: Ankiety
sidebar_position: 11
---

# System ankiet

Szablon Ever Works zawiera wbudowany system ankiet, który obsługuje zarówno ankiety globalne (opinie w całej witrynie), jak i ankiety dotyczące konkretnego elementu (dołączone do poszczególnych elementów w katalogu). Ankietami zarządza się za pośrednictwem panelu administracyjnego, a odpowiedzi są zbierane od uwierzytelnionych użytkowników.

## Architektura

```
Surveys System
  |
  +-- SurveyService (lib/services/survey.service.ts)
  |     Server-side business logic singleton
  |
  +-- Database Queries (lib/db/queries/)
  |     Survey and response CRUD operations
  |
  +-- Admin Pages (app/[locale]/admin/surveys/)
  |     Create, edit, preview, publish, view responses
  |
  +-- API Client (lib/api/survey-api.client.ts)
  |     Client-side API wrapper
  |
  +-- Database Schema (lib/db/schema.ts)
        surveys + survey_responses tables
```

## Typy ankiet

| Wpisz | Opis | Przypadek użycia |
|------|------------|--------------|
| **Globalny** | Ankieta obejmująca całą witrynę, niezwiązana z żadnym elementem | Ogólne opinie, ankiety NPS, satysfakcja użytkowników |
| **Specyficzne dla przedmiotu** | Powiązany z konkretnym elementem poprzez `itemId` | Opinie o produktach, recenzje usług, prośby o funkcje |

## Usługa ankiet

Klasa `SurveyService` ( `lib/services/survey.service.ts` ) obsługuje całą logikę biznesową. Jest to usługa dostępna wyłącznie po stronie serwera (nie należy importować komponentów klienta).

### Operacje CRUD

| Metoda | Opis |
|------------|------------|
| `create(data)` | Utwórz nową ankietę z automatycznie wygenerowaną informacją |
| `getOne(id)` | Pobierz ankietę według identyfikatora |
| `getBySlug(slug)` | Uzyskaj ankietę według ślimaka przyjaznego dla adresu URL |
| `getMany(filters?, userId?)` | Lista ankiet z podziałem na strony, filtrowaniem i statusem ukończenia |
| `update(id, data)` | Aktualizuj pola ankiety i obsługuj zmiany statusu |
| `delete(id)` | Usuń ankietę (zablokowana, jeśli istnieją odpowiedzi) |

### Operacje odpowiedzi

| Metoda | Opis |
|------------|------------|
| `submitResponse(data)` | Prześlij odpowiedź na ankietę (weryfikuje publikację ankiety) |
| `getResponses(surveyId, filters?)` | Uzyskaj odpowiedzi na ankietę podzielone na strony |
| `getResponseById(id)` | Uzyskaj jedną odpowiedź |

### Generowanie ślimaków

Informacje o ankietach są generowane automatycznie na podstawie tytułu z obsługą Unicode:

```typescript
// Examples:
"Customer Satisfaction"  -> "customer-satisfaction"
"Cafe Survey"            -> "cafe-survey"
"Nino's Test"            -> "ninos-test"
```

Usługa zapewnia unikalność ślimaka poprzez dodanie licznika w przypadku wykrycia kolizji.

## Cykl życia ankiety

```
DRAFT  -->  PUBLISHED  -->  CLOSED
```

| Stan | Opis |
|------------|------------|
| `draft` | Ankieta jest edytowana, niewidoczna dla użytkowników |
| `published` | Ankieta jest aktualna i przyjmuje odpowiedzi |
| `closed` | Ankieta nie przyjmuje już odpowiedzi |

Przejścia stanu aktualizują znaczniki czasu metadanych:

- Ustawienie statusu na `published` ustawia `publishedAt` - Ustawienie statusu na `closed` ustawia `closedAt` ## Struktura danych ankiety

Ankiety wykorzystują definicję pytania opartą na formacie JSON zapisaną w kolumnie `surveyJson` . Pozwala to na elastyczne struktury ankiet bez zmian schematu.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: 'global' | 'item';
  itemId?: string;          // Required when type is 'item'
  status?: 'draft' | 'published' | 'closed';
  surveyJson: object;       // Question definitions
}
```

### Struktura odpowiedzi na ankietę

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;          // Authenticated user ID
  itemId?: string;          // Item ID for item-specific surveys
  data: object;             // Response data matching surveyJson
  ipAddress?: string;       // For rate limiting
  userAgent?: string;       // For analytics
}
```

## Zarządzanie administracyjne

Strony ankiet administracyjnych zapewniają pełny interfejs zarządzania cyklem życia:

### Trasy administracyjne

| Trasa | Opis |
|-------|------------|
| `/admin/surveys` | Lista ankiet z zakładkami stanu |
| `/admin/surveys/create` | Nowy formularz tworzenia ankiety |
| `/admin/surveys/[slug]/edit` | Edytuj istniejącą ankietę |
| `/admin/surveys/[slug]/preview` | Podgląd ankiety przed publikacją |
| `/admin/surveys/[slug]/responses` | Przeglądaj i analizuj odpowiedzi |

### Możliwości administratora

- **Twórz ankiety** z tytułem, opisem, typem i pytaniem w formacie JSON
- **Edytuj ankiety** w wersji roboczej lub opublikowanej
- **Podgląd** przed publikacją w celu sprawdzenia wyglądu
- **Publikuj/zamknij** ankiety, aby kontrolować gromadzenie odpowiedzi
- **Wyświetl odpowiedzi** z filtrowaniem i paginacją
- **Usuń ankiety** (tylko jeśli nie zebrano żadnych odpowiedzi)

Metoda `getMany` wspiera efektywne odpytywanie za pomocą:

- **Liczenie odpowiedzi** poprzez SQL JOIN (pojedyncze zapytanie, bez N+1)
- **Stan ukończenia** na użytkownika (pokazuje, czy bieżący użytkownik już odpowiedział)
- **Paginacja** z parametrami strony/limitu
- **Filtrowanie** według statusu i typu

## Obsługa błędów

Usługa obejmuje niezawodną obsługę błędów typowych problemów z bazami danych:

| Stan błędu | Zachowanie |
|----------------|--------------|
| Nie znaleziono tabeli | Wyczyść komunikat: „Uruchom migrację bazy danych” |
| Połączenie odrzucone | „Połączenie z bazą danych nie powiodło się” |
| Brak DATABASE_URL | „Baza danych nieskonfigurowana” |
| Nie znaleziono ankiety | Błąd w stylu 404 |
| Ankieta nieopublikowana | „Ankieta ma status [status] i nie przyjmuje odpowiedzi” |
| Usuń z odpowiedziami | „Nie można usunąć ankiety z N odpowiedziami” |

## Flagi funkcji

Ankiety są kontrolowane przez system flag funkcji. Flaga `surveys` jest automatycznie włączana, gdy skonfigurowano `DATABASE_URL` :

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('surveys')) {
  // Render survey components
}
```

## Użycie po stronie klienta

Komponenty klienta korzystają z opakowania klienta API zamiast bezpośrednio z usługi:

```typescript
// Use in client components
import { surveyApiClient } from '@/lib/api/survey-api.client';

// Fetch surveys
const surveys = await surveyApiClient.getMany({ status: 'published' });

// Submit response
await surveyApiClient.submitResponse({
  surveyId: 'survey-uuid',
  data: { rating: 5, feedback: 'Great!' },
});
```

## Testowanie E2E

Ankiety są objęte wieloma plikami testowymi E2E:

- `e2e/tests/admin/surveys.spec.ts` -- Przepływy pracy związane z zarządzaniem administratorem
- `e2e/tests/public/surveys.spec.ts` — Wyświetlanie i przesyłanie ankiet publicznych
- `e2e/page-objects/admin/surveys.page.ts` -- Obiekt strony ankiety administratora

## Powiązane pliki

- `lib/services/survey.service.ts` -- Usługa logiki biznesowej
- `lib/db/schema.ts` -- `surveys` i `survey_responses` definicje tabel
- `lib/db/queries/` -- Zapytania do bazy danych ankiet
- `lib/types/survey.ts` -- Definicje typów TypeScript
- `lib/api/survey-api.client.ts` -- Opakowanie API po stronie klienta
- `app/[locale]/admin/surveys/` -- Strony administracyjne
- `components/admin/` — Składniki interfejsu administratora
- `e2e/tests/admin/surveys.spec.ts` -- Testy administratora E2E
- `e2e/tests/public/surveys.spec.ts` -- Publiczne testy E2E
