---
id: survey-endpoints-deep-dive
title: "Ankiety – dokumentacja API"
sidebar_label: "Dokumentacja API ankiet"
---

# Ankiety – dokumentacja API

## Przegląd

Punkty końcowe ankiet umożliwiają tworzenie ankiet wielokwestionariuszowych, zbieranie odpowiedzi i analizę wyników. Publiczne punkty końcowe pozwalają na anonimowe wypełnianie, a punkty administracyjne wymagają uprawnień.

## GET /api/surveys

Pobierz paginowaną listę ankiet.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `GET` |
| Ścieżka | `/api/surveys` |
| Uwierzytelnianie | Brak (listowanie publiczne) |

### Typy TypeScript

```typescript
interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'closed';
  questions: SurveyQuestion[];
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'text' | 'single_choice' | 'multiple_choice' | 'rating' | 'boolean';
  options?: string[];
  required: boolean;
  order: number;
}
```

### Odpowiedź sukcesu (200)

```json
{
  "data": [
    {
      "id": "survey_abc123",
      "title": "Opinie o produkcie Q1 2024",
      "description": "Pomóż nam ulepszyć nasz produkt",
      "status": "active",
      "questions": [],
      "responseCount": 87,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-05T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

## POST /api/surveys

Utwórz nową ankietę.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `POST` |
| Ścieżka | `/api/surveys` |
| Uwierzytelnianie | Tylko administrator |

### Treść żądania

```typescript
interface CreateSurveyRequest {
  title: string;
  description?: string;
  status?: 'draft' | 'active';
  questions: {
    text: string;
    type: 'text' | 'single_choice' | 'multiple_choice' | 'rating' | 'boolean';
    options?: string[];
    required?: boolean;
    order?: number;
  }[];
}
```

### Przykładowe żądanie

```json
{
  "title": "Badanie satysfakcji klientów",
  "description": "Ankieta kwartalna NPS",
  "status": "active",
  "questions": [
    {
      "text": "Jak bardzo prawdopodobne jest, że polecisz nas znajomym?",
      "type": "rating",
      "required": true,
      "order": 1
    },
    {
      "text": "Co możemy poprawić?",
      "type": "text",
      "required": false,
      "order": 2
    }
  ]
}
```

## GET /api/surveys/{surveyId}

Pobierz konkretną ankietę z wszystkimi pytaniami.

### Parametry ścieżki

| Parametr | Typ | Opis |
|----------|-----|------|
| `surveyId` | `string` | ID ankiety do pobrania |

## PUT /api/surveys/{surveyId}

Zaktualizuj istniejącą ankietę.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `PUT` |
| Ścieżka | `/api/surveys/{surveyId}` |
| Uwierzytelnianie | Tylko administrator |

### Treść żądania

Ta sama struktura co `CreateSurveyRequest`, ale wszystkie pola są opcjonalne.

## DELETE /api/surveys/{surveyId}

Usuń ankietę i wszystkie powiązane odpowiedzi.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `DELETE` |
| Ścieżka | `/api/surveys/{surveyId}` |
| Uwierzytelnianie | Tylko administrator |

## GET /api/surveys/{surveyId}/responses

Pobierz listę odpowiedzi na ankietę.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `GET` |
| Ścieżka | `/api/surveys/{surveyId}/responses` |
| Uwierzytelnianie | Wymagana sesja administratora |

### Typy TypeScript

```typescript
interface SurveyResponse {
  id: string;
  surveyId: string;
  userId: string | null;       // null for anonymous responses
  answers: SurveyAnswer[];
  ipAddress: string;
  userAgent: string;
  submittedAt: string;
}

interface SurveyAnswer {
  questionId: string;
  questionText: string;
  value: string | string[];
}
```

## POST /api/surveys/{surveyId}/responses

Prześlij odpowiedź na ankietę.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `POST` |
| Ścieżka | `/api/surveys/{surveyId}/responses` |
| Uwierzytelnianie | Brak (anonimowe przesyłanie) |

### Treść żądania

```typescript
interface SubmitResponseRequest {
  answers: {
    questionId: string;
    value: string | string[];
  }[];
  userId?: string;    // Optional user association
}
```

### Przykładowe żądanie

```json
{
  "answers": [
    { "questionId": "q_1", "value": "9" },
    { "questionId": "q_2", "value": "Czas ładowania bywa wolny" }
  ]
}
```

## GET /api/surveys/responses/{responseId}

Pobierz konkretną odpowiedź na ankietę.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `GET` |
| Ścieżka | `/api/surveys/responses/{responseId}` |
| Uwierzytelnianie | Wymagana sesja administratora |

## Uwierzytelnianie

| Punkt końcowy | Wymagane uwierzytelnianie |
|---------------|--------------------------|
| `GET /api/surveys` | Nie |
| `POST /api/surveys` | Administrator |
| `GET /api/surveys/{id}` | Nie |
| `PUT /api/surveys/{id}` | Administrator |
| `DELETE /api/surveys/{id}` | Administrator |
| `GET /api/surveys/{id}/responses` | Administrator |
| `POST /api/surveys/{id}/responses` | Nie |
| `GET /api/surveys/responses/{id}` | Administrator |

## Odpowiedzi błędów

| Kod | Treść | Opis |
|-----|-------|------|
| 400 | `Invalid request body` | Walidacja treści żądania nie powiodła się |
| 401 | `Unauthorized` | Wymagane uwierzytelnianie |
| 403 | `Forbidden` | Niewystarczające uprawnienia |
| 404 | `Survey not found` | Ankieta nie istnieje |
| 404 | `Response not found` | Odpowiedź nie istnieje |
| 409 | `Already submitted` | Użytkownik już przesłał odpowiedź |

## Ograniczenie liczby żądań

Punkt końcowy przesyłania odpowiedzi (`POST /api/surveys/{id}/responses`) podlega ograniczeniu liczby żądań, aby zapobiec nadużyciom. Adresy IP przekraczające limit otrzymują odpowiedź `429 Too Many Requests`.
