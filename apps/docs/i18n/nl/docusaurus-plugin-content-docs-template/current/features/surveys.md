---
id: surveys
title: Enquêtes systeem
sidebar_label: Enquêtes
sidebar_position: 11
---

# Enquêtessysteem

De Ever Works-sjabloon bevat een ingebouwd enquêtesysteem dat zowel globale enquêtes (feedback op de hele site) als itemspecifieke enquêtes (gekoppeld aan individuele directory-items) ondersteunt. Enquêtes worden beheerd via het beheerdersdashboard en de antwoorden worden verzameld van geverifieerde gebruikers.

## Architectuur

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

## Enquêtetypen

| Typ | Beschrijving | Gebruiksscenario |
|------|-------------|----------|
| **Globaal** | Sitebrede enquête, niet gebonden aan een item | Algemene feedback, NPS-onderzoeken, gebruikerstevredenheid |
| **Artikelspecifiek** | Gekoppeld aan een specifiek artikel via `itemId` | Productfeedback, servicerecensies, functieverzoeken |

## EnquêteService

De klasse `SurveyService` ( `lib/services/survey.service.ts` ) verzorgt alle bedrijfslogica. Het is alleen een service aan de serverzijde (niet importeren in clientcomponenten).

### CRUD-operaties

| Werkwijze | Beschrijving |
|--------|-------------|
| `create(data)` | Maak een nieuwe enquête met automatisch gegenereerde slug |
| `getOne(id)` | Ontvang enquête op ID |
| `getBySlug(slug)` | Ontvang een enquête via URL-vriendelijke slug |
| `getMany(filters?, userId?)` | Geef enquêtes weer met paginering, filtering en voltooiingsstatus |
| `update(id, data)` | Onderzoeksvelden bijwerken en statusovergangen afhandelen |
| `delete(id)` | Enquête verwijderen (geblokkeerd als er reacties zijn) |

### Reactiebewerkingen

| Werkwijze | Beschrijving |
|--------|-------------|
| `submitResponse(data)` | Een enquêteantwoord indienen (valideert dat de enquête is gepubliceerd) |
| `getResponses(surveyId, filters?)` | Ontvang gepagineerde antwoorden voor een enquête |
| `getResponseById(id)` | Ontvang één antwoord |

### Generatie van naaktslakken

Enquêteslugs worden automatisch gegenereerd op basis van de titel met Unicode-ondersteuning:

```typescript
// Examples:
"Customer Satisfaction"  -> "customer-satisfaction"
"Cafe Survey"            -> "cafe-survey"
"Nino's Test"            -> "ninos-test"
```

De service zorgt ervoor dat de slak uniek is door een teller toe te voegen als er een botsing wordt gedetecteerd.

## Enquêtelevenscyclus

```
DRAFT  -->  PUBLISHED  -->  CLOSED
```

| Staat | Beschrijving |
|--------|-------------|
| `draft` | Enquête wordt bewerkt, niet zichtbaar voor gebruikers |
| `published` | Enquête is live en accepteert reacties |
| `closed` | Enquête accepteert geen reacties meer |

Statusovergangen updaten de tijdstempels van metagegevens:

- Door de status op `published` te zetten, wordt `publishedAt` ingesteld
- Door de status op `closed` te zetten, wordt `closedAt` ingesteld

## Structuur van enquêtegegevens

Enquêtes gebruiken een op JSON gebaseerde vraagdefinitie die is opgeslagen in de kolom `surveyJson` . Dit maakt flexibele onderzoeksstructuren mogelijk zonder schemawijzigingen.

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

### Structuur van enquêtereacties

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

## Beheerderbeheer

De beheerdersenquêtepagina's bieden een volledige interface voor levenscyclusbeheer:

### Beheerroutes

| Route | Beschrijving |
|-------|------------|
| `/admin/surveys` | Enquêtelijst met statustabbladen |
| `/admin/surveys/create` | Nieuw formulier voor het maken van enquêtes |
| `/admin/surveys/[slug]/edit` | Bestaande enquête bewerken |
| `/admin/surveys/[slug]/preview` | Bekijk een voorbeeld van de enquête voordat u deze publiceert |
| `/admin/surveys/[slug]/responses` | Reacties bekijken en analyseren |

### Beheermogelijkheden

- **Maak enquêtes** met titel, beschrijving, type en vraag-JSON
- **Enquêtes bewerken** in concept- of gepubliceerde staat
- **Voorbeeld** voordat u het publiceert om het uiterlijk te verifiëren
- **Publiceer/sluit** enquêtes om de responsverzameling te beheren
- **Bekijk reacties** met filtering en paginering
- **Enquêtes verwijderen** (alleen als er geen reacties zijn verzameld)

De `getMany` -methode ondersteunt efficiënt opvragen met:

- **Responsetelling** via SQL JOINs (enkele query, geen N+1)
- **Voltooiingsstatus** per gebruiker (laat zien of de huidige gebruiker al heeft gereageerd)
- **Paginering** met pagina-/limietparameters
- **Filteren** op status en type

## Foutafhandeling

De service omvat robuuste foutafhandeling voor veelvoorkomende databaseproblemen:

| Foutconditie | Gedrag |
|---------------|----------|
| Tabel niet gevonden | Duidelijk bericht: "Databasemigraties uitvoeren" |
| Verbinding geweigerd | "Databaseverbinding mislukt" |
| DATABASE_URL ontbreekt | "Database niet geconfigureerd" |
| Enquête niet gevonden | 404-stijlfout |
| Enquête niet gepubliceerd | "Enquête is [status] en accepteert geen antwoorden" |
| Verwijderen met reacties | "Kan enquête met N reacties niet verwijderen" |

## Functievlaggen

Enquêtes worden beheerd door het feature flags-systeem. De vlag `surveys` wordt automatisch ingeschakeld wanneer `DATABASE_URL` is geconfigureerd:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('surveys')) {
  // Render survey components
}
```

## Gebruik aan de clientzijde

Clientcomponenten gebruiken de API-clientwrapper in plaats van rechtstreeks de service:

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

## E2E-testen

Enquêtes worden gedekt door meerdere E2E-testbestanden:

- `e2e/tests/admin/surveys.spec.ts` -- Workflows voor beheerdersbeheer
- `e2e/tests/public/surveys.spec.ts` -- Weergave en indiening van openbare enquêtes
- `e2e/page-objects/admin/surveys.page.ts` -- Beheerdersenquêtepagina-object

## Gerelateerde bestanden

- `lib/services/survey.service.ts` -- Bedrijfslogica-service
- `lib/db/schema.ts` -- `surveys` en `survey_responses` tabeldefinities
- `lib/db/queries/` -- Query's uit de enquêtedatabase
- `lib/types/survey.ts` -- TypeScript-typedefinities
- `lib/api/survey-api.client.ts` -- API-wrapper aan clientzijde
- `app/[locale]/admin/surveys/` -- Beheerpagina's
- `components/admin/` -- Componenten van de beheerdersinterface
- `e2e/tests/admin/surveys.spec.ts` -- Beheerder E2E-tests
- `e2e/tests/public/surveys.spec.ts` -- Openbare E2E-tests
