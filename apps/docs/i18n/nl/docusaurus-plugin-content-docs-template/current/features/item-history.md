---
id: item-history
title: Artikelgeschiedenis en audit
sidebar_label: Artikelgeschiedenis en audit
sidebar_position: 17
---

# Itemgeschiedenis en audit

De Ever Works-sjabloon bevat een uitgebreid audittrailsysteem dat alle wijzigingen bijhoudt die gedurende hun levenscyclus aan items zijn aangebracht. Elke creatie, update, statuswijziging, beoordeling, verwijdering en restauratie wordt vastgelegd met gedetailleerde wijzigingsinformatie, identiteit van de uitvoerder en tijdstempels.

## Architectuuroverzicht

| Onderdeel | Pad | Doel |
|---|---|---|
| `itemAuditService` | `lib/services/item-audit.service.ts` | Servicelaag voor het loggen van auditacties |
| `item-audit.queries.ts` | `lib/db/queries/item-audit.queries.ts` | Databasequery's voor auditlogboek CRUD |
| `useItemHistory` | `hooks/use-item-history.ts` | React Query hook voor het ophalen van auditlogboeken |
| `ItemHistoryModal` | `components/admin/items/item-history-modal.tsx` | Modale gebruikersinterface voor het bekijken van itemgeschiedenis |

## Auditacties

Het systeem houdt zes soorten acties bij:

| Actie | Constante | Beschrijving |
|---|---|---|
| Gemaakt | `ItemAuditAction.CREATED` | Artikel is gemaakt |
| Bijgewerkt | `ItemAuditAction.UPDATED` | Artikelvelden zijn aangepast |
| Status gewijzigd | `ItemAuditAction.STATUS_CHANGED` | Artikelstatus is gewijzigd |
| Beoordeeld | `ItemAuditAction.REVIEWED` | Item is beoordeeld (goedgekeurd/afgewezen) |
| Verwijderd | `ItemAuditAction.DELETED` | Item is verwijderd (zacht of hard) |
| Gerestaureerd | `ItemAuditAction.RESTORED` | Item is hersteld na verwijdering |

## Bijgehouden velden

De auditdienst bewaakt de volgende velden voor wijzigingsdetectie:

| Veld | Typ |
|---|---|
| `name` | Artikelnaam |
| `description` | Artikelbeschrijving |
| `source_url` | Bron-/product-URL |
| `category` | Categorietoewijzing |
| `tags` | Tagarray |
| `collections` | Incasso-opdrachten |
| `featured` | Uitgelichte status |
| `icon_url` | Icoon/logo-URL |
| `status` | Artikelstatus |

## Artikelauditservice

De `itemAuditService` biedt logmethoden op hoog niveau die worden aangeroepen vanuit API-routes en -services.

### Artikelcreatie loggen

```tsx
import { logCreation } from '@/lib/services/item-audit.service';

await logCreation(item, { id: userId, name: userName });
// Logs: action=CREATED, metadata includes slug, category, tags
```

### Artikelupdates loggen

```tsx
import { logUpdate } from '@/lib/services/item-audit.service';

await logUpdate(previousItem, updatedItem, { id: userId, name: userName });
// Automatically detects changes between previous and current state
// Uses STATUS_CHANGED action if status differs, UPDATED otherwise
// Only logs if actual changes are detected
```

### Recensies registreren

```tsx
import { logReview } from '@/lib/services/item-audit.service';

await logReview(item, 'pending', 'Looks good, approved!', { id: userId, name: userName });
// Logs: action=REVIEWED with previous status, new status, and review notes
```

### Verwijderen en herstellen van logboekregistratie

```tsx
import { logDeletion, logRestoration } from '@/lib/services/item-audit.service';

await logDeletion(item, performer, true);  // soft delete
await logRestoration(item, performer);
```

### Niet-blokkerend ontwerp

Alle auditlogboeken zijn verpakt in try-catch-blokken en genereren geen fouten die de primaire bewerking zouden kunnen blokkeren:

```tsx
async function logAction(params: LogActionParams): Promise<void> {
  try {
    await createItemAuditLog(createParams);
  } catch (error) {
    // Log error but don't throw - audit logging should not block operations
    console.error('[ItemAuditService] Failed to log action:', error);
  }
}
```

## Wijzigingsdetectie

De functie `detectChanges` vergelijkt twee itemstatussen en retourneert een gedetailleerd verschil:

```tsx
import { detectChanges } from '@/lib/services/item-audit.service';

const changes = detectChanges(previousItem, updatedItem);
// Returns: { fieldName: { old: previousValue, new: currentValue } } or null
```

Voorbeelduitvoer:

```json
{
  "name": { "old": "Old Name", "new": "New Name" },
  "tags": { "old": ["react", "nextjs"], "new": ["react", "nextjs", "typescript"] },
  "status": { "old": "pending", "new": "approved" }
}
```

De functie verwerkt diepe gelijkheid voor matrices (gesorteerde vergelijking) en retourneert `null` als er geen wijzigingen worden gedetecteerd.

## Databaselaag

### Auditlogboekschema

Elke vermelding in het auditlogboek bevat:

| Veld | Typ | Beschrijving |
|---|---|---|
| `id` | `string` | Unieke ID |
| `itemId` | `string` | Artikelslak/ID |
| `itemName` | `string` | Artikelnaam op het moment van actie |
| `action` | `ItemAuditActionValues` | Actietype |
| `previousStatus` | `string \| null` | Status vóór actie |
| `newStatus` | `string \| null` | Status na actie |
| `changes` | `JSON \| null` | Wijzigingsdetails op veldniveau |
| `performedBy` | `string \| null` | Gebruikers-ID die de actie heeft uitgevoerd |
| `performedByName` | `string \| null` | Weergavenaam gebruiker |
| `notes` | `string \| null` | Aanvullende opmerkingen (bijvoorbeeld recensieopmerkingen) |
| `metadata` | `JSON \| null` | Extra contextgegevens |
| `createdAt` | `timestamp` | Wanneer de actie plaatsvond |

### Queryfuncties

| Functie | Beschrijving |
|---|---|
| `createItemAuditLog(data)` | Maak een nieuwe auditlogboekvermelding |
| `getItemHistory(params)` | Krijg gepagineerde geschiedenis met informatie over artiesten |
| `getLatestItemAuditLog(itemId)` | Meest recente logboekinvoer ophalen |
| `getAuditLogsByAction(action, limit)` | Logboeken filteren op actietype |
| `getAuditLogsByPerformer(userId, limit)` | Logboeken filteren op uitvoerder |
| `getItemAuditStats(itemId)` | Ontvang een uitsplitsing van de telling per actietype |

### Gepagineerde geschiedenisquery

```tsx
import { getItemHistory } from '@/lib/db/queries/item-audit.queries';

const result = await getItemHistory({
  itemId: 'my-item-slug',
  page: 1,
  limit: 20,
  actionFilter: ['updated', 'status_changed']
});

// Returns: { logs, total, page, limit, totalPages }
```

De zoekopdracht wordt samengevoegd met de `users` -tabel om naast elk logboekitem het e-mailadres van de artiest op te nemen.

## De `useItemHistory` haak

```tsx
import { useItemHistory } from '@/hooks/use-item-history';

function ItemHistoryPanel({ itemId }) {
  const { data, isLoading, isError } = useItemHistory({
    itemId,
    page: 1,
    limit: 20,
    actionFilter: ['updated', 'reviewed'],
    enabled: true
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div>
      <p>Total entries: {data.total}</p>
      {data.logs.map(entry => (
        <div key={entry.id}>
          <span>{entry.action}</span>
          <span>{entry.performedByName}</span>
          <span>{entry.createdAt}</span>
        </div>
      ))}
    </div>
  );
}
```

### Hook-configuratie

| Optie | Standaard | Beschrijving |
|---|---|---|
| `itemId` | vereist | Item-ID/slug om geschiedenis op te halen voor |
| `page` | `1` | Paginanummer |
| `limit` | `20` | Artikelen per pagina |
| `actionFilter` | `undefined` | Array van actietypen om te filteren op |
| `enabled` | `true` | Of de zoekopdracht actief is |
| `staleTime` | 30 seconden | Duur van cacheversheid |

## Artikelgeschiedenis Modaal

De component `ItemHistoryModal` biedt een complete gebruikersinterface voor het bekijken van de itemauditgeschiedenis:

```tsx
import { ItemHistoryModal } from '@/components/admin/items/item-history-modal';

<ItemHistoryModal
  isOpen={showHistory}
  itemId="my-item-slug"
  itemName="My Item Name"
  onClose={() => setShowHistory(false)}
/>
```

### Modale functies

| Kenmerk | Beschrijving |
|---|---|
| Actiefiltering | Dropdownmenu om te filteren op actietype (aangemaakt, bijgewerkt, etc.) |
| Kleurgecodeerde vermeldingen | Elk actietype heeft een apart pictogram en kleurenschema |
| Uitbreidbare wijzigingen | Klik om wijzigingsdetails op veldniveau uit te vouwen |
| Relatieve tijdstempels | "2 uur geleden", "3d geleden" met volledige datum bij hover |
| Weergave van artiesten | Toont gebruikersnaam, e-mailadres of "Systeem" voor geautomatiseerde acties |
| Reviewcontext | Toont labels "Goedgekeurd"/"Afgewezen" en redenen voor afwijzing |
| Paginering | Ingebouwde paginering voor lange geschiedenissen |
| Toetsenbordondersteuning | Escape-toets sluit de modale |

### Actiekleurenschema

| Actie | Kleur | Icoon |
|---|---|---|
| Gemaakt | Groen | Plus |
| Bijgewerkt | Blauw | Bewerken2 |
| Status gewijzigd | Geel | RefreshCw |
| Beoordeeld | Paars | ControleerCirkel |
| Verwijderd | Rood | Prullenbak2 |
| Gerestaureerd | Wintertaling | RotateCcw |

## Sleutelbestanden

| Bestand | Pad |
|---|---|
| Auditdienst | `lib/services/item-audit.service.ts` |
| Controlequery's | `lib/db/queries/item-audit.queries.ts` |
| Geschiedenis haak | `hooks/use-item-history.ts` |
| Geschiedenis Modaal | `components/admin/items/item-history-modal.tsx` |
