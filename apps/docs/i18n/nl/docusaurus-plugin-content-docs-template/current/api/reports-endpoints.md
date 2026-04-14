---
id: reports-endpoints
title: "Reports Endpoints"
sidebar_label: "Reports Endpoints"
---

# Rapportage-eindpunten

## Overzicht

Het rapportagesysteem stelt gebruikers in staat om twijfelachtige content te melden en biedt beheerders tools voor moderatie. Het systeem houdt de rapportagegeschiedenis bij en koppelt automatisch moderatieacties aan gerapporteerde items.

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|--------|------|------|-------------|
| `POST` | `/api/reports` | Optioneel | Een inhoudsrapport indienen |
| `GET` | `/api/admin/reports` | Beheerder | Rapporten weergeven met filters |
| `GET` | `/api/admin/reports/stats` | Beheerder | Rapportagestatistieken ophalen |
| `GET` | `/api/admin/reports/[id]` | Beheerder | Specifiek rapport ophalen |
| `PUT` | `/api/admin/reports/[id]` | Beheerder | Rapport bijwerken / moderatieactie uitvoeren |

## Openbaar eindpunt: Rapport indienen

### POST `/api/reports`

### Aanvraagbody

| Veld | Type | Vereist | Beschrijving |
|------|------|---------|-------------|
| `contentType` | string | Ja | Type gemelde content |
| `contentId` | string | Ja | ID van het gemelde item |
| `reason` | string | Ja | Reden voor de melding |
| `description` | string | Nee | Aanvullende toelichting door de melder |

### Toegestane waarden voor `contentType`

| Waarde | Beschrijving |
|-------|-------------|
| `listing` | Bedrijfsvermeldingsinvoer |
| `comment` | Gebruikerscommentaar |
| `review` | Gebruikersbeoordeling |
| `user` | Gebruikersprofiel |

### Toegestane waarden voor `reason`

| Waarde | Beschrijving |
|-------|-------------|
| `spam` | Spam of ongewenste reclame |
| `inappropriate` | Ongepaste of aanstootgevende content |
| `misinformation` | Onjuiste of misleidende informatie |
| `harassment` | Pesterij of bedreigende content |
| `other` | Overige — gebruik `description` voor toelichting |

### Voorbeeldaanvraag

```bash
curl -X POST /api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "listing",
    "contentId": "listing_abc123",
    "reason": "spam",
    "description": "Dit bedrijf promoot ongerelateerde producten."
  }'
```

### Geslaagde reactie (201)

```json
{
  "success": true,
  "reportId": "rpt_1234567890abcdef"
}
```

### Foutreacties

| Status | Fout | Beschrijving |
|--------|-------|-------------|
| 400 | `Invalid content type` | Niet-ondersteund inhoudstype |
| 400 | `Invalid reason` | Niet-erkende rapportagereden |
| 400 | `Content not found` | Gemeld inhouds-ID bestaat niet |
| 429 | `Rate limit exceeded` | Te veel meldingen van hetzelfde IP-adres |

## Beheerdereindpunten

### GET `/api/admin/reports`

Geeft alle ingediende rapporten weer. Ondersteunt filteren, sorteren en paginering.

#### Queryparameters

| Parameter | Type | Standaard | Beschrijving |
|-----------|------|---------|-------------|
| `status` | string | - | Filteren op status: `pending`, `reviewed`, `dismissed`, `actioned` |
| `contentType` | string | - | Filteren op inhoudstype |
| `reason` | string | - | Filteren op rapportagereden |
| `page` | number | 1 | Paginanummer |
| `limit` | number | 20 | Records per pagina |
| `sortBy` | string | `createdAt` | Sorteerveld |
| `sortOrder` | string | `desc` | Sorteervolgorde: `asc` of `desc` |

#### Geslaagde reactie (200)

```typescript
interface AdminReportsResponse {
  reports: AdminReportItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface AdminReportItem {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  description: string | null;
  status: string;          // "pending", "reviewed", "dismissed", "actioned"
  reporterId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  content: {               // Ingebedd contentobject
    id: string;
    title?: string;
    name?: string;
  };
}
```

### GET `/api/admin/reports/stats`

#### Geslaagde reactie (200)

```typescript
interface ReportStatsResponse {
  total: number;
  byStatus: {
    pending: number;
    reviewed: number;
    dismissed: number;
    actioned: number;
  };
  byReason: {
    [reason: string]: number;
  };
  byContentType: {
    [contentType: string]: number;
  };
  recentReports: number;     // Afgelopen 7 dagen
}
```

### GET `/api/admin/reports/[id]`

Haalt een specifiek rapportrecord op, inclusief ingebedde contentdetails en controlelogboek.

#### Geslaagde reactie (200)

Geeft een enkel `AdminReportItem`-object terug (zie bovenstaande typedefinitie) met aanvullende velden:

```typescript
interface DetailedReportItem extends AdminReportItem {
  auditLog: {
    action: string;
    performedBy: string;
    performedAt: string;
    notes?: string;
  }[];
}
```

### PUT `/api/admin/reports/[id]`

Werkt de status van een rapport bij en legt optioneel een moderatieactie op.

#### Aanvraagbody

```typescript
interface UpdateReportRequest {
  status: string;            // "reviewed", "dismissed", "actioned"
  moderationAction?: string; // "warn_user", "remove_content", "ban_user", "none"
  notes?: string;            // Interne notities van de beheerder
}
```

#### Toegestane waarden voor `moderationAction`

| Waarde | Beschrijving |
|-------|-------------|
| `warn_user` | Waarschuwing sturen naar rapporteur/gemelde gebruiker |
| `remove_content` | Gerapporteerde content verwijderen |
| `ban_user` | Gebruikersaccount opschorten |
| `none` | Rapport benoemen zonder actie |

#### Geslaagde reactie (200)

```json
{
  "success": true,
  "report": { "...bijgewerkte rapportgegevens..." }
}
```

## Gegevensmodel

### Statusopsomming van rapporten

| Waarde | Beschrijving |
|-------|-------------|
| `pending` | Ingediend, nog niet beoordeeld |
| `reviewed` | Door beheerder bekeken |
| `dismissed` | Als ongeldig beschouwd of geweigerd |
| `actioned` | Moderatieactie ondernomen |

### Redenopsomming

| Waarde | Weergavenaam |
|-------|-------------|
| `spam` | Spam |
| `inappropriate` | Ongepaste content |
| `misinformation` | Onjuiste informatie |
| `harassment` | Pesterij |
| `other` | Overige |

### Inhoudstype-opsomming

| Waarde | Beschrijving |
|-------|-------------|
| `listing` | Bedrijfsvermelding |
| `comment` | Gebruikerscommentaar |
| `review` | Gebruikersbeoordeling |
| `user` | Gebruikersprofiel |

### Moderatieactie-opsomming

| Waarde | Beschrijving |
|-------|-------------|
| `warn_user` | Gebruiker gewaarschuwd |
| `remove_content` | Content verwijderd |
| `ban_user` | Gebruiker verbannen |
| `none` | Geen actie ondernomen |

## Integratie met moderatie

Wanneer een moderatieactie `remove_content` wordt ingesteld, roept het systeem automatisch de juiste verwijderingsservice aan op basis van het `contentType`:

```typescript
switch (moderationAction) {
  case 'remove_content':
    await contentModerationService.removeContent(report.contentType, report.contentId);
    break;
  case 'ban_user':
    await userService.suspendUser(report.reportedUserId);
    break;
  case 'warn_user':
    await notificationService.sendWarning(report.reportedUserId);
    break;
}
```

Alle moderatieacties worden geregistreerd in het controlelogboek met de ID van de beheerder, het tijdstip en optionele notities.

## Snelheidsbeperking

- Openbaar eindpunt (`POST /api/reports`): 5 meldingen per uur per IP-adres
- Beheerdereindpunten: Standaard authenticatiegebaseerde limieten

## Gerelateerde eindpunten

- [Beheerderbeheer-eindpunten](./admin-endpoints.md)
- [ReCAPTCHA API-referentie](./recaptcha-endpoints.md)
