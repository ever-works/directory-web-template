---
id: health-endpoints
title: "Health API Reference"
sidebar_label: "Health API Reference"
---

# Health API-referentie

## Overzicht

Het Health-eindpunt biedt een eenvoudige controle van de databaseconnectiviteit voor monitoring- en infrastructuurdoeleinden. Het voert een lichtgewicht query uit om te verifiëren dat de databaseverbinding actief en responsief is, en geeft statusinformatie terug met tijdstempels.

## Eindpunten

### GET /api/health/database

Voert een basisgezondheidscheck van de database uit door een `SELECT 1`-query te gebruiken om de databaseverbinding te verifiëren.

**Aanvraag**

Geen parameters of body vereist.

**Reactie**
```typescript
// Gezonde reactie
{
  status: "healthy";
  database: "connected";
  timestamp: string;        // ISO 8601-formaat, bijv. "2024-01-15T10:30:00.000Z"
  result: object;           // Ruwe queryresultaat van SELECT 1
}

// Ongezonde reactie (status 500)
{
  status: "unhealthy";
  database: "disconnected";
  error: "Database connection check failed";
  timestamp: string;
}
```

**Voorbeeld**
```typescript
const response = await fetch('/api/health/database');
const health = await response.json();

if (health.status === 'healthy') {
  console.log('Database is connected at', health.timestamp);
} else {
  console.error('Database is disconnected:', health.error);
}
```

## Authenticatie

Dit eindpunt is **openbaar** -- er is geen authenticatie vereist. Het is bedoeld voor gebruik door load balancers, uptime-monitors en gezondheidschecks bij implementatie.

## Foutreacties

| Status | Beschrijving |
|--------|-------------|
| 200 | Databaseverbinding is gezond |
| 500 | Databaseverbinding mislukt -- geeft de status `"unhealthy"` terug met foutdetails |

## Snelheidsbeperking

Er wordt geen expliciete snelheidsbeperking toegepast. Dit eindpunt is lichtgewicht en geschikt voor frequent pollen door monitoringsystemen.

## Gerelateerde eindpunten

- [Config Feature Endpoints](./config-feature-endpoints) -- Vlaggen voor beschikbaarheid van functies (afhankelijk van database)
- [Version Sync Endpoints](./version-sync-endpoints) -- Systeemversie en synchronisatiestatus
