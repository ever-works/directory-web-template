---
id: surveys
title: Umfragesystem
sidebar_label: Umfragen
sidebar_position: 11
---

# Umfragesystem

Die Ever Works-Vorlage enthält ein integriertes Umfragesystem, das sowohl globale Umfragen (seitenweites Feedback) als auch artikelspezifische Umfragen (an einzelne Verzeichniselemente angehängt) unterstützt. Umfragen werden über das Admin-Dashboard verwaltet und Antworten von authentifizierten Benutzern gesammelt.

## Architektur

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

## Umfragetypen

| Geben Sie | ein Beschreibung | Anwendungsfall |
|------|-------------|----------|
| **Global** | Siteweite Umfrage, nicht an einen Artikel gebunden | Allgemeines Feedback, NPS-Umfragen, Benutzerzufriedenheit |
| **Artikelspezifisch** | Über `itemId` | mit einem bestimmten Artikel verknüpft Produktfeedback, Servicebewertungen, Funktionsanfragen |

## SurveyService

Die Klasse `SurveyService` ( `lib/services/survey.service.ts` ) verwaltet die gesamte Geschäftslogik. Es handelt sich um einen rein serverseitigen Dienst (nicht in Client-Komponenten importieren).

### CRUD-Operationen

| Methode | Beschreibung |
|--------|-------------|
| `create(data)` | Erstellen Sie eine neue Umfrage mit automatisch generiertem Slug |
| `getOne(id)` | Umfrage nach ID abrufen |
| `getBySlug(slug)` | Erhalten Sie eine Umfrage per URL-freundlichem Slug |
| `getMany(filters?, userId?)` | Umfragen mit Paginierung, Filterung und Abschlussstatus auflisten |
| `update(id, data)` | Umfragefelder aktualisieren und Statusübergänge verarbeiten |
| `delete(id)` | Umfrage löschen (blockiert, wenn Antworten vorhanden sind) |

### Reaktionsoperationen

| Methode | Beschreibung |
|--------|-------------|
| `submitResponse(data)` | Senden Sie eine Umfrageantwort (bestätigt, dass die Umfrage veröffentlicht wurde) |
| `getResponses(surveyId, filters?)` | Erhalten Sie paginierte Antworten für eine Umfrage |
| `getResponseById(id)` | Erhalten Sie eine einzige Antwort |

### Slug-Generierung

Umfrage-Slugs werden automatisch aus dem Titel mit Unicode-Unterstützung generiert:

```typescript
// Examples:
"Customer Satisfaction"  -> "customer-satisfaction"
"Cafe Survey"            -> "cafe-survey"
"Nino's Test"            -> "ninos-test"
```

Der Dienst stellt die Eindeutigkeit des Slugs sicher, indem er einen Zähler anhängt, wenn eine Kollision erkannt wird.

## Umfragelebenszyklus

```
DRAFT  -->  PUBLISHED  -->  CLOSED
```

| Status | Beschreibung |
|--------|-------------|
| `draft` | Umfrage wird bearbeitet, für Benutzer nicht sichtbar |
| `published` | Die Umfrage ist live und akzeptiert Antworten |
| `closed` | Umfrage akzeptiert keine Antworten mehr |

Statusübergänge aktualisieren Metadaten-Zeitstempel:

- Durch Setzen des Status auf `published` wird `publishedAt` eingestellt
- Durch Setzen des Status auf `closed` wird `closedAt` eingestellt

## Umfragedatenstruktur

Umfragen verwenden eine JSON-basierte Fragedefinition, die in der Spalte `surveyJson` gespeichert ist. Dies ermöglicht flexible Umfragestrukturen ohne Schemaänderungen.

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

### Struktur der Umfrageantworten

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

## Admin-Verwaltung

Die Admin-Umfrageseiten bieten eine vollständige Lebenszyklusverwaltungsoberfläche:

### Admin-Routen

| Route | Beschreibung |
|-------|-------------|
| `/admin/surveys` | Umfrageliste mit Statusregisterkarten |
| `/admin/surveys/create` | Neues Formular zur Umfrageerstellung |
| `/admin/surveys/[slug]/edit` | Vorhandene Umfrage bearbeiten |
| `/admin/surveys/[slug]/preview` | Vorschau der Umfrage vor der Veröffentlichung |
| `/admin/surveys/[slug]/responses` | Antworten ansehen und analysieren |

### Admin-Funktionen

- **Umfragen erstellen** mit Titel, Beschreibung, Typ und Frage-JSON
- **Umfragen bearbeiten** im Entwurfs- oder veröffentlichten Zustand
- **Vorschau** vor der Veröffentlichung, um das Erscheinungsbild zu überprüfen
- Umfragen **veröffentlichen/schließen**, um die Antworterfassung zu steuern
- **Antworten anzeigen** mit Filterung und Paginierung
- **Umfragen löschen** (nur wenn keine Antworten gesammelt wurden)

Die `getMany` -Methode unterstützt effiziente Abfragen mit:

- **Antwortzählung** über SQL JOINs (einzelne Abfrage, kein N+1)
- **Abschlussstatus** pro Benutzer (zeigt an, ob der aktuelle Benutzer bereits geantwortet hat)
- **Paginierung** mit Seiten-/Limit-Parametern
- **Filtern** nach Status und Typ

## Fehlerbehandlung

Der Service umfasst eine robuste Fehlerbehandlung für häufige Datenbankprobleme:

| Fehlerbedingung | Verhalten |
|----------------|----------|
| Tabelle nicht gefunden | Klare Meldung: „Datenbankmigrationen ausführen“ |
| Verbindung abgelehnt | „Datenbankverbindung fehlgeschlagen“ |
| DATABASE_URL fehlt | „Datenbank nicht konfiguriert“ |
| Umfrage nicht gefunden | Fehler im 404-Stil |
| Umfrage nicht veröffentlicht | „Umfrage ist [Status] und es werden keine Antworten angenommen“ |
| Mit Antworten löschen | „Umfrage mit N Antworten kann nicht gelöscht werden“ |

## Feature-Flags

Umfragen werden durch das Feature-Flags-System gesteuert. Das `surveys` -Flag wird automatisch aktiviert, wenn `DATABASE_URL` konfiguriert ist:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('surveys')) {
  // Render survey components
}
```

## Clientseitige Nutzung

Clientkomponenten verwenden den API-Client-Wrapper anstelle des Dienstes direkt:

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

## E2E-Tests

Umfragen werden durch mehrere E2E-Testdateien abgedeckt:

- `e2e/tests/admin/surveys.spec.ts` – Admin-Management-Workflows
- `e2e/tests/public/surveys.spec.ts` – Anzeige und Einreichung öffentlicher Umfragen
- `e2e/page-objects/admin/surveys.page.ts` – Objekt der Admin-Umfrageseite

## Verwandte Dateien

- `lib/services/survey.service.ts` – Geschäftslogikdienst
- `lib/db/schema.ts` – `surveys` und `survey_responses` Tabellendefinitionen
- `lib/db/queries/` – Umfragedatenbankabfragen
- `lib/types/survey.ts` – TypeScript-Typdefinitionen
- `lib/api/survey-api.client.ts` – Clientseitiger API-Wrapper
- `app/[locale]/admin/surveys/` – Admin-Seiten
- `components/admin/` – Admin-UI-Komponenten
- `e2e/tests/admin/surveys.spec.ts` – Admin-E2E-Tests
- `e2e/tests/public/surveys.spec.ts` – Öffentliche E2E-Tests
