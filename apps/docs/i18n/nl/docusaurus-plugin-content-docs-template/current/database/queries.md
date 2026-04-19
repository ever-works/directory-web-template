---
id: queries
title: Referentie voor databasequery's
sidebar_label: Vragen
sidebar_position: 2
---

# Referentie voor databasequery's

De map `lib/db/queries/` bevat meer dan 23 querymodules, georganiseerd per domein. Elke module omvat Drizzle ORM-query's voor een specifiek functiegebied, volgens het Single Responsibility Principle.

## Moduleoverzicht

Alle querymodules worden in een vat geëxporteerd vanuit `lib/db/queries/index.ts` voor gemakkelijk importeren:

```typescript
import { getUser, getUserByEmail } from '@/lib/db/queries';
```

## Querymodules

### activiteit.queries.ts

Loggen en ophalen van activiteiten voor het audit trail-systeem.

**Sleutelfuncties:**
- Logboek van gebruikersactiviteiten (inloggen, aanmelden, accountwijzigingen)
- Activiteitsgeschiedenis opvragen op gebruiker of datumbereik

### auth.queries.ts

Authenticatiegerelateerde databasebewerkingen.

**Sleutelfuncties:**
- Vind gebruiker via e-mail voor authenticatie van inloggegevens
- Maak en verifieer tokens voor het opnieuw instellen van wachtwoorden
- Beheer verificatietokens

### client.queries.ts

De grootste querymodule (37 KB), die alle klantgerichte bewerkingen afhandelt.

**Sleutelfuncties:**
- Klantprofiel CRUD-bewerkingen
- Inzending en beheer van klantitems
- Gegevensaggregatie van klantdashboard
- Zoek en filter klantgegevens
- Gepagineerde lijstquery's

### commentaar.queries.ts

Systeembewerkingen becommentariëren.

**Sleutelfuncties:**
- Opmerkingen maken, bijwerken en voorlopig verwijderen
- Haal opmerkingen op per item met paginering
- Vragen over het modereren van reacties (beheerder)
- Aggregatie van beoordelingen

### bedrijf.queries.ts

Vragen over bedrijfsbeheer.

**Sleutelfuncties:**
- Bedrijf CRUD-activiteiten
- Bedrijf zoeken en filteren
- Beheer van item-bedrijfsverenigingen
- Bedrijfsstatistieken en analyses

### dashboard.queries.ts

Dashboardgegevensaggregatie voor zowel beheerders- als klantdashboards.

**Sleutelfuncties:**
- Statistieken van het beheerdersdashboard (totaal aantal gebruikers, items, omzet)
- Statistieken van het klantdashboard (inzendingen, weergaven, betrokkenheid)
- Tijdreeksgegevens voor diagrammen
- Samenvattingen van activiteiten

### engagement.queries.ts

Geaggregeerde betrokkenheidsstatistieken voor weergaven, stemmen, favorieten en reacties.

**Sleutelfuncties:**
- Ontvang betrokkenheidsscores voor items
- Geaggregeerde weergavetellingen
- Bereken populariteitsstatistieken
- Betrokkenheidsranglijsten

### integratie-mapping.queries.ts

Mappingbewerkingen voor CRM-integratie.

**Sleutelfuncties:**
- Integratietoewijzingen maken en bijwerken
- Zoek CRM-ID's op van Ever ID's en omgekeerd
- Houd synchronisatietijdstempels en versiehashes bij
- Bulkkarteringsbewerkingen

### item.queries.ts

Kernitemquery's (items worden opgeslagen in Git, maar metadata wordt bijgehouden in de database).

**Sleutelfuncties:**
- Bewerkingen met metagegevens van items
- Artikelweergave volgen
- Gegevens over itembetrokkenheid

### item-audit.queries.ts

Item-auditlogboekbewerkingen.

**Sleutelfuncties:**
- Registreer acties voor het maken, bijwerken, verwijderen en beoordelen van items
- Auditgeschiedenis opvragen voor specifieke items
- Filter auditlogboeken op actietype, uitvoerder of datumbereik

### item-view.queries.ts

Tracking en analyse van itemweergaven.

**Sleutelfuncties:**
- Registreer unieke dagelijkse weergaven (gededupliceerd op kijkers-ID en datum)
- Queryweergave telt per item en datumbereik
- Bekijk de aggregatie van analyses

### locatie-index.queries.ts

Locatiegebaseerd zoeken en indexeren.

**Sleutelfuncties:**
- Geospatiale zoekopdrachten naar items in de buurt
- Beheer van locatie-index
- Afstandsberekeningen
- Locatiegebaseerd zoeken met filters

### moderatie.queries.ts

Contentmoderatiesysteem.

**Sleutelfuncties:**
- Inhoudsrapporten maken en beheren
- Update de rapportstatus en resolutie
- Neem moderatieacties op
- Moderatiestatistieken en wachtrijbeheer

### nieuwsbrief.queries.ts

Beheer van nieuwsbriefabonnementen.

**Sleutelfuncties:**
- Aan- en afmeldbewerkingen
- Controleer de abonnementsstatus
- Lijst actieve abonnees
- Houd de geschiedenis van e-mailverzendingen bij

### payment.queries.ts

Betalingsgerelateerde databasebewerkingen.

**Sleutelfuncties:**
- Beheer van betalingsproviders
- Betaalrekening koppelen
- Transactieregistratie
- Vragen over betalingsgeschiedenis

### rapport.queries.ts

Systeemquery's voor inhoudsrapportage.

**Sleutelfuncties:**
- Rapporten maken (item of opmerking)
- Lijstrapporten met filters en paginering
- Rapportstatus bijwerken
- Rapportanalyses

### abonnement.queries.ts

Beheer van de levenscyclus van abonnementen (17 KB).

**Sleutelfuncties:**
- Abonnementen maken en bijwerken
- Overgangen van abonnementsstatus
- Opname van abonnementsgeschiedenis
- Zoek abonnementen op gebruikers- of provider-ID
- Verlengings- en opzeggingsoperaties
- Analyse van abonnementen

### enquête.queries.ts

Operaties van het enquêtesysteem.

**Sleutelfuncties:**
- Onderzoek CRUD-operaties
- Opname van enquêtereacties
- Reactieaggregatie en analyse
- Enquêtestatusbeheer (concept, gepubliceerd, gesloten)

### user.queries.ts

Vragen over gebruikersbeheer.

**Sleutelfuncties:**
- Gebruik CRUD-bewerkingen
- Zoeken en filteren van gebruikers
- Beheer van gebruikersrollen
- Accountverwijdering (zachte verwijdering)

### stem.queries.ts

Werking van het stemsysteem.

**Sleutelfuncties:**
- Stemmen maken, bijwerken en verwijderen
- Controleer bestaande stemmen voor een gebruikersitempaar
- Totaal aantal stemmen per item
- Stemtype wisselen (omhoog/omlaagvote)

## Gedeelde nutsvoorzieningen

### typen.ts

Gedeelde TypeScript-typen die in querymodules worden gebruikt:

```typescript
// Common query parameter types
export interface PaginationParams {
  page: number;
  limit: number;
}
```

### utils.ts

Gedeelde hulpprogrammafuncties voor het bouwen van query's:

- Hulpmiddelen voor paginering (offsetberekening, resultaatopmaak)
- Veel voorkomende filterbouwers
- Helpers voor SQL-fragmenten

## Vraagpatronen

### Standaard querypatroon

Alle querymodules volgen een consistent patroon:

```typescript
import { db } from '../drizzle';
import { eq, desc, and, sql } from 'drizzle-orm';
import { tableName } from '../schema';

export async function getItemById(id: string) {
  const result = await db
    .select()
    .from(tableName)
    .where(eq(tableName.id, id))
    .limit(1);
  return result[0] || null;
}
```

### Gepagineerde zoekopdrachten

Veel modules implementeren gepagineerde query's:

```typescript
export async function getItems(page: number, limit: number) {
  const offset = (page - 1) * limit;
  const [items, countResult] = await Promise.all([
    db.select().from(tableName)
      .orderBy(desc(tableName.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(tableName),
  ]);
  return {
    items,
    total: Number(countResult[0].count),
    page,
    limit,
  };
}
```

### Aggregatiequery's

De engagement- en dashboardmodules maken gebruik van SQL-aggregatie:

```typescript
export async function getEngagementScore(itemId: string) {
  const result = await db.execute(sql`
    SELECT
      COALESCE(v.vote_count, 0) as votes,
      COALESCE(c.comment_count, 0) as comments,
      COALESCE(f.favorite_count, 0) as favorites,
      COALESCE(iv.view_count, 0) as views
    FROM ...
  `);
  return result;
}
```

## Importconventie

Queryfuncties importeren via de vatexport:

```typescript
// Preferred: import from barrel
import { getUser, createSubscription, getVotesByItem } from '@/lib/db/queries';

// Also valid: import from specific module
import { getUser } from '@/lib/db/queries/user.queries';
```
