---
id: survey-endpoints
title: "Punkty końcowe API ankiet"
sidebar_label: "Ankiety"
---

# Punkty końcowe API ankiet

Ta strona dokumentuje punkty końcowe do tworzenia ankiet, zarządzania nimi i zbierania odpowiedzi.

## Podsumowanie punktów końcowych

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| `GET` | `/api/surveys` | Brak | Listuj ankiety publiczne |
| `POST` | `/api/surveys` | Tylko administrator | Utwórz nową ankietę |
| `GET` | `/api/surveys/{surveyId}` | Brak | Pobierz ankietę |
| `PUT` | `/api/surveys/{surveyId}` | Tylko administrator | Zaktualizuj ankietę |
| `DELETE` | `/api/surveys/{surveyId}` | Tylko administrator | Usuń ankietę |
| `GET` | `/api/surveys/{surveyId}/responses` | Administrator lub właściciel | Listuj odpowiedzi na ankietę |
| `POST` | `/api/surveys/{surveyId}/responses` | Brak | Prześlij odpowiedź na ankietę |
| `GET` | `/api/surveys/responses/{responseId}` | Administrator lub właściciel | Pobierz konkretną odpowiedź |

## GET /api/surveys

Zwraca paginowaną listę aktywnych ankiet.

### Parametry zapytania

| Parametr | Typ | Wymagane | Domyślne | Opis |
|----------|-----|----------|----------|------|
| `page` | `number` | Nie | `1` | Numer strony |
| `limit` | `number` | Nie | `10` | Wyniki na stronie |
| `status` | `string` | Nie | `active` | Filtruj według statusu ankiety |

### Odpowiedź sukcesu (200)

```json
{
  "data": [
    {
      "id": "survey_123",
      "title": "Opinie o produkcie",
      "description": "Powiedz nam, co sądzisz",
      "status": "active",
      "questionCount": 5,
      "responseCount": 142,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Obsługa błędów bazy danych

Błędy bazy danych są przechwytywane i zwracane ze status kodem `500`:

```json
{
  "error": "Database error",
  "message": "Failed to fetch surveys"
}
```

## POST /api/surveys

Tworzy nową ankietę. Wymaga uprawnień administratora.

### Treść żądania

```json
{
  "title": "Tytuł ankiety",
  "description": "Opis ankiety",
  "questions": [
    {
      "text": "Treść pytania",
      "type": "single_choice",
      "options": ["Opcja 1", "Opcja 2", "Opcja 3"],
      "required": true
    }
  ],
  "status": "draft"
}
```

### Odpowiedź sukcesu (201)

```json
{
  "data": {
    "id": "survey_456",
    "title": "Tytuł ankiety",
    "status": "draft",
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "message": "Ankieta utworzona pomyślnie"
}
```

## GET /api/surveys/{surveyId}

Pobiera pojedynczą ankietę wraz z pytaniami.

### Parametry ścieżki

| Parametr | Typ | Opis |
|----------|-----|------|
| `surveyId` | `string` | ID ankiety |

## PUT /api/surveys/{surveyId}

Aktualizuje istniejącą ankietę. Wymaga uprawnień administratora.

## DELETE /api/surveys/{surveyId}

Usuwa ankietę i wszystkie powiązane odpowiedzi. Wymaga uprawnień administratora.

:::danger
Trwale usuwa ankietę i wszystkie odpowiedzi. Operacji nie można cofnąć.
:::

## GET /api/surveys/{surveyId}/responses

Listuje wszystkie odpowiedzi dla danej ankiety. Wymaga uprawnień administratora lub właściciela ankiety.

### Parametry zapytania

| Parametr | Typ | Wymagane | Domyślne | Opis |
|----------|-----|----------|----------|------|
| `page` | `number` | Nie | `1` | Numer strony |
| `limit` | `number` | Nie | `20` | Wyniki na stronie |

## POST /api/surveys/{surveyId}/responses

Przesyła odpowiedź na ankietę. Publiczny punkt końcowy — uwierzytelnianie nie jest wymagane, ale adres IP i user agent są zapisywane.

### Przechwytywanie kontekstu

Punkt końcowy automatycznie przechwytuje:
- **Adres IP** — z nagłówka `x-forwarded-for` lub `request.ip`
- **User agent** — z nagłówka `user-agent`

```typescript
const ipAddress = headersList.get('x-forwarded-for')
  || headersList.get('x-real-ip')
  || 'unknown';
const userAgent = headersList.get('user-agent') || 'unknown';
```

### Treść żądania

```json
{
  "answers": [
    {
      "questionId": "q_1",
      "value": "Opcja 2"
    },
    {
      "questionId": "q_2",
      "value": "Moja odpowiedź tekstowa"
    }
  ]
}
```

### Odpowiedź sukcesu (201)

```json
{
  "data": {
    "id": "response_789",
    "surveyId": "survey_123",
    "submittedAt": "2024-01-15T14:30:00Z"
  },
  "message": "Odpowiedź przesłana pomyślnie"
}
```

## GET /api/surveys/responses/{responseId}

Pobiera pojedynczą odpowiedź na ankietę. Dostępna dla administratorów lub dla respondenta zidentyfikowanego przez adres IP/sesję.

## Powiązane pliki źródłowe

| Plik | Opis |
|------|------|
| `app/api/surveys/route.ts` | Punkt końcowy listowania i tworzenia |
| `app/api/surveys/[surveyId]/route.ts` | Pobieranie/aktualizacja/usuwanie ankiety |
| `app/api/surveys/[surveyId]/responses/route.ts` | Odpowiedzi na ankietę |
| `app/api/surveys/responses/[responseId]/route.ts` | Konkretna odpowiedź |
| `lib/repositories/surveyRepository.ts` | Warstwa dostępu do danych |
| `lib/services/surveyService.ts` | Logika biznesowa |
