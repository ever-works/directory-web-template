---
id: survey-types
title: Definicje typów ankiet
sidebar_label: Typy ankiet
sidebar_position: 6
---

# Definicje typów ankiet

**Źródło:** `lib/types/survey.ts`

Moduł ten definiuje wszystkie wspólne definicje typów ankiet i odpowiedzi na ankiety. Służy jako pojedyncze źródło prawdy dla struktur danych związanych z ankietami używanych przez usługę ankiet, klienta interfejsu API ankiety i procedury obsługi tras interfejsu API.

## Wyliczenia

### `SurveyTypeEnum`

Określa, czy ankieta ma zastosowanie globalne, czy jest ograniczona do określonego elementu.

```typescript
enum SurveyTypeEnum {
  GLOBAL = 'global',
  ITEM = 'item',
}
```

|Wartość|Opis|
|-------|-------------|
|`GLOBAL`|Ankieta pojawia się w całej witrynie i nie jest powiązana z żadnym konkretnym elementem|
|`ITEM`|Ankieta jest powiązana z konkretnym przedmiotem (poprzez `itemId`)|

### `SurveyStatusEnum`

Stany cyklu życia ankiety.

```typescript
enum SurveyStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}
```

|Wartość|Opis|
|-------|-------------|
|`DRAFT`|Ankieta jest tworzona/edytowana i nie jest widoczna dla respondentów|
|`PUBLISHED`|Ankieta jest aktywna i przyjmuje odpowiedzi|
|`CLOSED`|Ankieta nie akceptuje już odpowiedzi, ale dane zostaną zachowane|

## Interfejsy

### `CreateSurveyData`

Dane wymagane do utworzenia nowej ankiety.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  surveyJson: any;
}
```

|Pole|Wpisz|Wymagane|Opis|
|-------|------|----------|-------------|
|`title`|`string`|Tak|Wyświetl tytuł ankiety|
|`description`|`string`|Nie|Opcjonalny opis/podtytuł|
|`type`|`SurveyTypeEnum`|Tak|Czy ankieta ma charakter globalny, czy ma zakres przedmiotowy|
|`itemId`|`string`|Nie|Identyfikator przedmiotu (wymagany, gdy `type` to `ITEM`)|
|`status`|`SurveyStatusEnum`|Nie|Stan początkowy (domyślnie `DRAFT`)|
|`surveyJson`|`any`|Tak|Definicja JSON zgodna z Survey.js|

### `UpdateSurveyData`

Dane do aktualizacji istniejącej ankiety. Wszystkie pola są opcjonalne.

```typescript
interface UpdateSurveyData {
  title?: string;
  slug?: string;
  description?: string;
  status?: SurveyStatusEnum;
  surveyJson?: any;
}
```

### `SubmitResponseData`

Dane do przesłania odpowiedzi na ankietę od respondenta.

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;
  itemId?: string;
  data: any;
  ipAddress?: string;
  userAgent?: string;
}
```

|Pole|Wpisz|Wymagane|Opis|
|-------|------|----------|-------------|
|`surveyId`|`string`|Tak|Identyfikator ankiety, na którą udzielono odpowiedzi|
|`userId`|`string`|Nie|Uwierzytelniony identyfikator użytkownika (null dla anonimowego)|
|`itemId`|`string`|Nie|Kontekst pozycji dla ankiet o zakresie pozycji|
|`data`|`any`|Tak|Obiekt danych odpowiedzi Survey.js|
|`ipAddress`|`string`|Nie|Adres IP respondenta na potrzeby analiz/deduplikacji|
|`userAgent`|`string`|Nie|Ciąg agenta użytkownika przeglądarki|

### `SurveyFilters`

Filtry do wysyłania zapytań do ankiet w punktach końcowych list.

```typescript
interface SurveyFilters {
  type?: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  page?: number;
  limit?: number;
}
```

### `ResponseFilters`

Filtry do sprawdzania odpowiedzi na ankiety.

```typescript
interface ResponseFilters {
  itemId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
```

|Pole|Wpisz|Opis|
|-------|------|-------------|
|`itemId`|`string?`|Filtruj odpowiedzi według elementu|
|`userId`|`string?`|Filtruj odpowiedzi według użytkownika|
|`startDate`|`string?`|Ciąg daty ISO dla początku zakresu|
|`endDate`|`string?`|Ciąg daty ISO dla końca zakresu|
|`page`|`number?`|Numer strony paginacji|
|`limit`|`number?`|Wyniki na stronę|

## Przykłady użycia

### Tworzenie globalnej ankiety

```typescript
import type { CreateSurveyData } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const surveyData: CreateSurveyData = {
  title: 'User Satisfaction Survey',
  description: 'Help us improve by sharing your experience',
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.DRAFT,
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'satisfaction',
            title: 'How satisfied are you with our platform?',
            rateMin: 1,
            rateMax: 5,
          },
          {
            type: 'comment',
            name: 'feedback',
            title: 'Any additional feedback?',
          },
        ],
      },
    ],
  },
};
```

### Tworzenie ankiety o zakresie przedmiotowym

```typescript
import { SurveyTypeEnum } from '@/lib/types/survey';

const itemSurvey: CreateSurveyData = {
  title: 'Product Review',
  type: SurveyTypeEnum.ITEM,
  itemId: 'my-tool-slug',
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'quality',
            title: 'Rate this product',
          },
        ],
      },
    ],
  },
};
```

### Filtrowanie ankiet

```typescript
import type { SurveyFilters } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const filters: SurveyFilters = {
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.PUBLISHED,
  page: 1,
  limit: 10,
};
```

### Przesyłanie odpowiedzi

```typescript
import type { SubmitResponseData } from '@/lib/types/survey';

const response: SubmitResponseData = {
  surveyId: 'survey-uuid-123',
  userId: 'user-uuid-456',
  data: {
    satisfaction: 4,
    feedback: 'The platform is easy to use!',
  },
};
```

### Filtrowanie odpowiedzi według zakresu dat

```typescript
import type { ResponseFilters } from '@/lib/types/survey';

const responseFilters: ResponseFilters = {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
};
```

## Uwagi do projektu

### Integracja z Survey.js

Pole `surveyJson` używa typu `any`, aby zaakceptować definicje JSON Survey.js. Survey.js to biblioteka innej firmy, która definiuje ankiety jako obiekty JSON opisujące strony, elementy i ich konfigurację. Szablon przechowuje ten kod JSON w niezmienionej postaci i renderuje go przy użyciu komponentu React Survey.js.

### Cykl życia ankiety

1. **Wersja robocza** – Ankieta jest tworzona i można ją dowolnie edytować
2. **Opublikowano** — ankieta jest aktywna; można przesyłać odpowiedzi
3. **Zamknięte** — ankieta przestaje akceptować odpowiedzi; istniejące dane zostaną zachowane

### Ankiety globalne a ankiety przedmiotowe

- **Ankiety globalne** (`SurveyTypeEnum.GLOBAL`) pojawiają się w całej witrynie i nie są powiązane z żadnym elementem
- **Ankiety dotyczące pozycji** (`SurveyTypeEnum.ITEM`) są wyświetlane na stronach ze szczegółami dotyczącymi poszczególnych pozycji i wymagają `itemId`

Pole `ItemData.showSurveys` (od `item.ts`) kontroluje, czy sekcja ankiet ma być wyświetlana na stronie elementu.

## Powiązane typy

- [`ItemData.showSurveys`](./item-types.md) — kontroluje widoczność ankiety dla każdego elementu
- [`ItemData.action`](./item-types.md) - Akcja `'start-survey'` prowadzi do ankiety
