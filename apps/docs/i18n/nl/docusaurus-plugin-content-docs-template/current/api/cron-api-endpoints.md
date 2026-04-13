---
id: cron-api-endpoints
title: "Cron API Endpoints"
sidebar_label: "Cron API Endpoints"
---

# Cron API Eindpunten

De Cron API biedt geplande taaakeindpunten die worden geactiveerd door Vercel Cron, externe planners of de interne `BackgroundJobManager`. Alle cron-eindpunten vereisen authenticatie via de omgevingsvariabele `CRON_SECRET` met een `Bearer`-token in de `Authorization`-header.

**Bronmap:** `template/app/api/cron/`

---

## Authenticatie

Cron-eindpunten gebruiken een gedeeld geheim voor autorisatie:

- **Productie:** De omgevingsvariabele `CRON_SECRET` moet zijn ingesteld. Verzoeken moeten `Authorization: Bearer <CRON_SECRET>` bevatten.
- **Ontwikkeling:** Als `CRON_SECRET` niet is geconfigureerd, is toegang zonder authenticatie toegestaan voor een vlotte lokale ontwikkelervaring.
- **Beveiliging:** Alle cron-eindpunten gebruiken `crypto.timingSafeEqual()` voor constante-tijdvergelijking om timing-aanvallen te voorkomen.

**Niet-geautoriseerd antwoord (401):**

```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing cron secret"
}
```

---

## Vercel Cron Configuratie

Het cron-schema is gedefinieerd in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

| Taak | Schema | Beschrijving |
|------|--------|--------------|
| Inhoud synchroniseren | Dagelijks om 3:00 UTC | Synchroniseert inhoud uit de Git-gebaseerde CMS |
| Abonnementsherinneringen | Dagelijks om 9:00 UTC | Verstuurt verlengingsherinneringse-mails |
| Abonnementsvervalling | Dagelijks om middernacht UTC | Verwerkt verlopen abonnementen |

---

## Inhoud Synchroniseren

Activeert een inhoudssynchronisatie vanuit de Git-gebaseerde CMS-repository.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/cron/sync` |
| **Auth** | `CRON_SECRET` (Bearer-token) |
| **Bron** | `cron/sync/route.ts` |

### Antwoord

**Status 200** -- Synchronisatie succesvol voltooid.

```json
{
  "success": true,
  "timestamp": "2024-01-20T03:00:05.123Z",
  "duration": 5123,
  "message": "Sync completed successfully"
}
```

**Status 500** -- Synchronisatie mislukt.

```json
{
  "success": false,
  "timestamp": "2024-01-20T03:00:10.456Z",
  "duration": 10456,
  "message": "Cron sync failed",
  "details": "Error description"
}
```

| Veld | Type | Beschrijving |
|------|------|-------------|
| `success` | `boolean` | Of de synchronisatie geslaagd is |
| `timestamp` | `string` (ISO 8601) | Wanneer de synchronisatie is voltooid |
| `duration` | `number` | Duur in milliseconden |
| `message` | `string` | Leesbaar statusbericht |
| `details` | `string` (optioneel) | Aanvullende details bij mislukking |

---

## Abonnementsvervalling

Zoekt verlopen abonnementen op en verwerkt deze door hun status van `active` naar `expired` bij te werken en e-mailmeldingen te sturen.

| Eigenschap | Waarde |
|------------|--------|
| **Methoden** | `GET`, `POST` |
| **Pad** | `/api/cron/subscription-expiration` |
| **Auth** | `CRON_SECRET` (Bearer-token) |
| **Bron** | `cron/subscription-expiration/route.ts` |

### Antwoord

**Status 200** -- Succesvol verwerkt.

```json
{
  "success": true,
  "message": "Processed 3 expired subscriptions",
  "data": {
    "processed": 3,
    "affectedUsers": [
      {
        "subscriptionId": "sub_abc123",
        "userId": "user_456",
        "planId": "standard"
      }
    ],
    "errors": [],
    "timestamp": "2024-01-20T00:00:05.123Z"
  }
}
```

| Veld | Type | Beschrijving |
|------|------|-------------|
| `data.processed` | `number` | Aantal abonnementen bijgewerkt naar verlopen |
| `data.affectedUsers` | `array` | Lijst van getroffen abonnementen (geen persoonlijk identificeerbare informatie) |
| `data.errors` | `string[]` | Eventuele niet-fatale fouten (bijv. e-mailbezorgingsfouten) |
| `data.timestamp` | `string` | Verwerkingstijdstempel |

---

## Abonnementsherinneringen

Stuurt verlengingsherinneringse-mails naar gebruikers met abonnementen die de verlengingsdatum naderen.

| Eigenschap | Waarde |
|------------|--------|
| **Methoden** | `GET`, `POST` |
| **Pad** | `/api/cron/subscription-reminders` |
| **Auth** | `CRON_SECRET` (Bearer-token) |
| **Bron** | `cron/subscription-reminders/route.ts` |

### Antwoord

**Status 200** -- Taak succesvol voltooid.

```json
{
  "message": "Subscription reminder job completed",
  "success": true,
  "sent": 5,
  "errors": []
}
```

**Status 207** -- Taak voltooid met gedeeltelijke fouten (Multi-Status).

```json
{
  "error": "Job completed with errors",
  "success": false,
  "sent": 3,
  "errors": ["Failed to send reminder to user_123"]
}
```

---

## Initialisatie Achtergrondtaken

De module voor achtergrondtaken (`cron/jobs/background-jobs-init.ts`) is geen API-eindpunt maar een singleton-initialisatiemodule die wordt gebruikt om de planningsmodus bij het opstarten van de applicatie te configureren.

### Planningmodi

| Modus | Beschrijving |
|-------|--------------|
| `vercel` | Taken verwerkt door Vercel Cron via `/api/cron/*`-eindpunten |
| `local` | Interne planner (voor zelf-gehoste implementaties) |
| `trigger-dev` | Trigger.dev-integratie voor beheerde achtergrondtaken |
| `disabled` | Achtergrond synchronisatie uitgeschakeld (`DISABLE_AUTO_SYNC=true`) |

## Omgevingsvariabelen

| Variabele | Vereist | Beschrijving |
|-----------|---------|-------------|
| `CRON_SECRET` | Productie: Ja, Ontwikkeling: Nee | Gedeeld geheim voor cron-eindpuntauthenticatie |
| `DISABLE_AUTO_SYNC` | Nee | Stel in op `true` om automatische inhoudssynchronisatie uit te schakelen |
