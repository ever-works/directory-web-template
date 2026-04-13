---
id: cron-endpoints
title: "Cron Job API Endpoints"
sidebar_label: "Cron Job API Endpoints"
---

# Cron Taak API Eindpunten

De template bevat drie cron-taaakeindpunten die op geplande intervallen worden uitgevoerd via Vercel Cron. Deze eindpunten verwerken inhoudssynchronisatie, abonnementsherinneringen en verwerking van abonnementsvervalling.

## Cron Configuratie

Cron-schema's zijn gedefinieerd in `vercel.json`:

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

## Inhouds synchroniseren (`/api/cron/sync`)

| Methode | Pad | Schema | Beschrijving |
|---------|-----|--------|--------------|
| `GET` | `/api/cron/sync` | Dagelijks om 3:00 UTC | Git-gebaseerde inhoudsrepository synchroniseren |

### Wat Het Doet

De sync-crontaak haalt de laatste inhoud op uit de geconfigureerde Git-gegevensrepository (`DATA_REPOSITORY`) en werkt de lokale inhoudscache bij. Dit zorgt ervoor dat de applicatie wijzigingen weerspiegelt die rechtstreeks in de inhoudsrepository zijn gemaakt (bijv. via GitHub PR-samenvoeging).

### Synchronisatieproces

```
1. CRON_SECRET-autorisatie verifiëren
2. Controleren of synchronisatie al bezig is (mutex-vergrendeling)
3. Laatste wijzigingen ophalen uit externe Git-repository
4. Bijgewerkte YAML-inhoudsbestanden parseren en valideren
5. Lokale inhoudscache bijwerken
6. Synchronisatieresultaat met duur teruggeven
```

### Sleutelgedragingen

- **Mutex-vergrendeling**: Er kan slechts één synchronisatie tegelijk worden uitgevoerd. Gelijktijdige verzoeken worden geweigerd met een statusbericht
- **Time-out**: Synchronisatiebewerkingen hebben een time-out van 5 minuten om onbeperkte processen te voorkomen
- **Herproberinglogica**: Mislukte synchronisaties proberen het tot 3 keer opnieuw
- **Ontwikkelingsmodus**: Automatische synchronisatie kan worden uitgeschakeld via de omgevingsvariabele `DISABLE_AUTO_SYNC=true`

### Antwoord

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "duration": 4523
}
```

## Abonnementsherinneringen (`/api/cron/subscription-reminders`)

| Methode | Pad | Schema | Beschrijving |
|---------|-----|--------|--------------|
| `GET` | `/api/cron/subscription-reminders` | Dagelijks om 9:00 UTC | Abonnementsverlengingsherinneringen sturen |

### Wat Het Doet

Vraagt abonnementen op die naderen aan de verlengingsdatum en stuurt e-mailherinneringen aan abonnees. Dit helpt onvrijwillig verloop te verminderen door gebruikers te waarschuwen voordat hun betaling wordt verwerkt.

### Antwoord

```json
{
  "success": true,
  "message": "Subscription reminders sent",
  "data": {
    "reminders_sent": 15,
    "errors": 0
  }
}
```

## Abonnementsvervalling (`/api/cron/subscription-expiration`)

| Methode | Pad | Schema | Beschrijving |
|---------|-----|--------|--------------|
| `GET` | `/api/cron/subscription-expiration` | Dagelijks om middernacht UTC | Verlopen abonnementen verwerken |

### Wat Het Doet

Identificeert abonnementen na hun vervaldatum en werkt hun status bij. Dit verwerkt abonnementen die zijn geannuleerd maar nog resterende tijd hadden, evenals abonnementen die niet konden worden verlengd.

### Antwoord

```json
{
  "success": true,
  "message": "Subscription expirations processed",
  "data": {
    "expired": 3,
    "errors": 0
  }
}
```

## Beveiliging

### CRON_SECRET Verificatie

Alle cron-eindpunten verifiëren een `CRON_SECRET`-header of queryparameter om ongeautoriseerde uitvoering te voorkomen:

```typescript
// Typische cron-autorisatiecontrole
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Handmatige Uitvoering

Cron-eindpunten kunnen handmatig worden geactiveerd voor foutopsporing door de `CRON_SECRET` op te nemen in de Authorization-header:

```bash
curl -H "Authorization: Bearer your-cron-secret" \
  https://your-app.vercel.app/api/cron/sync
```

## Schema Referentie

| Cron-expressie | Betekenis |
|----------------|----------|
| `0 3 * * *` | Elke dag om 3:00 UTC |
| `0 9 * * *` | Elke dag om 9:00 UTC |
| `0 0 * * *` | Elke dag om middernacht UTC |

Alle tijden zijn in UTC. Houd rekening met de tijdzoneverdeling van uw gebruikersbasis bij het aanpassen van deze schema's.
