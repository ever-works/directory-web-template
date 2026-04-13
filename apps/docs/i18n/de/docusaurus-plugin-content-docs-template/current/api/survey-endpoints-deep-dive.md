---
id: survey-endpoints-deep-dive
title: "Surveys API Reference"
sidebar_label: "Surveys API Reference"
---

# Umfrage-Endpunkte – technischer Deep Dive

Dieser Deep Dive dokumentiert die technische Implementierung des Umfragesystems, einschließlich Datenbankschema, TypeScript-Typen und Fetch-Beispiele.

## Datenbankschema

Das Umfragesystem verwendet folgende Drizzle-Tabellen:

```typescript
// Umfragen
export const surveys = pgTable('surveys', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['active', 'inactive'] }).default('active').notNull(),
  questions: jsonb('questions').notNull(),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Umfrageantworten
export const surveyResponses = pgTable('survey_responses', {
  id: text('id').primaryKey(),
  surveyId: text('survey_id').references(() => surveys.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  answers: jsonb('answers').notNull(),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserSurvey: unique().on(table.userId, table.surveyId),
}));
```

## TypeScript-Typen

```typescript
export type SurveyQuestion = {
  id: string;
  type: 'multiple_choice' | 'text' | 'rating' | 'boolean';
  question: string;
  options?: string[]; // nur für multiple_choice
  required: boolean;
};

export type SurveyAnswer = {
  questionId: string;
  value: string | number | boolean;
};

export type Survey = {
  id: string;
  title: string;
  description: string | null;
  status: 'active' | 'inactive';
  questions: SurveyQuestion[];
  createdAt: string;
  updatedAt: string;
};

export type SurveyResponse = {
  id: string;
  surveyId: string;
  userId: string;
  answers: SurveyAnswer[];
  submittedAt: string;
};
```

## API-Antworttypen

```typescript
// Alle Umfragen
type SurveysListResponse = {
  success: true;
  data: Survey[];
} | { success: false; error: string };

// Einzelne Umfrage
type SurveyDetailResponse = {
  success: true;
  data: Survey;
} | { success: false; error: string };

// Umfrage erstellen/aktualisieren
type SurveyMutationResponse = {
  success: true;
  data: Survey;
} | { success: false; error: string };

// Antworten
type SurveyResponsesResponse = {
  success: true;
  data: SurveyResponse[];
} | { success: false; error: string };
```

## Fetch-Beispiele

### Alle aktiven Umfragen abrufen

```typescript
const response = await fetch('/api/surveys');
const data: SurveysListResponse = await response.json();

if (data.success) {
  console.log(`${data.data.length} Umfragen gefunden`);
}
```

### Antwort auf Umfrage einreichen

```typescript
const answers: SurveyAnswer[] = [
  { questionId: 'q1', value: 'Täglich' },
  { questionId: 'q2', value: 'Bessere mobile App' },
];

const response = await fetch(`/api/surveys/${surveyId}/responses`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ answers }),
});

const data = await response.json();
if (!data.success) {
  if (response.status === 409) {
    console.error('Sie haben diese Umfrage bereits beantwortet');
  }
}
```

### Umfrage erstellen (Admin)

```typescript
const newSurvey = {
  title: 'Produktfeedback Q2',
  description: 'Vierteljährliches Feedback',
  questions: [
    {
      id: 'q1',
      type: 'rating' as const,
      question: 'Wie bewerten Sie unser Produkt? (1–10)',
      required: true,
    },
    {
      id: 'q2',
      type: 'text' as const,
      question: 'Was sollten wir verbessern?',
      required: false,
    },
  ],
};

const response = await fetch('/api/surveys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newSurvey),
});

const data: SurveyMutationResponse = await response.json();
```

## Fehlerbehandlung

| Fehlertyp | HTTP-Status | Beschreibung |
|-----------|-------------|--------------|
| Validierungsfehler | 400 | Pflichtfelder fehlen oder ungültige Werte |
| Nicht authentifiziert | 401 | Keine gültige Session |
| Nicht autorisiert | 403 | Aktion erfordert Admin-Rechte |
| Nicht gefunden | 404 | Umfrage oder Antwort nicht gefunden |
| Duplikat | 409 | Benutzer hat bereits geantwortet |
| DB-Verbindungsfehler | 503 | Datenbank nicht erreichbar |

## Idempotenz

Das Unique-Constraint auf `(userId, surveyId)` in der `surveyResponses`-Tabelle stellt sicher, dass jeder Benutzer eine Umfrage nur einmal beantworten kann. Mehrfacheinreichungen geben `409 Conflict` zurück.

**Quellen:**
- `template/app/api/surveys/route.ts`
- `template/app/api/surveys/[id]/route.ts`
- `template/app/api/surveys/[id]/responses/route.ts`
- `template/lib/db/schema/surveys.ts`
