---
id: item-history
title: Artikelverlauf und Prüfung
sidebar_label: Artikelverlauf und Prüfung
sidebar_position: 17
---

# Artikelverlauf und Prüfung

Die Ever Works-Vorlage umfasst ein umfassendes Audit-Trail-System, das alle an Elementen während ihres gesamten Lebenszyklus vorgenommenen Änderungen verfolgt. Jede Erstellung, Aktualisierung, Statusänderung, Überprüfung, Löschung und Wiederherstellung wird mit detaillierten Änderungsinformationen, der Identität des Ausführenden und Zeitstempeln protokolliert.

## Architekturübersicht

| Komponente | Pfad | Zweck |
|---|---|---|
| `itemAuditService` | `lib/services/item-audit.service.ts` | Serviceschicht zur Protokollierung von Audit-Aktionen |
| `item-audit.queries.ts` | `lib/db/queries/item-audit.queries.ts` | Datenbankabfragen für Prüfprotokoll CRUD |
| `useItemHistory` | `hooks/use-item-history.ts` | React Query-Hook zum Abrufen von Audit-Protokollen |
| `ItemHistoryModal` | `components/admin/items/item-history-modal.tsx` | Modale Benutzeroberfläche zum Anzeigen des Artikelverlaufs |

## Audit-Aktionen

Das System verfolgt sechs Arten von Aktionen:

| Aktion | Konstante | Beschreibung |
|---|---|---|
| Erstellt | `ItemAuditAction.CREATED` | Artikel wurde erstellt |
| Aktualisiert | `ItemAuditAction.UPDATED` | Artikelfelder wurden geändert |
| Status geändert | `ItemAuditAction.STATUS_CHANGED` | Artikelstatus wurde geändert |
| Bewertet | `ItemAuditAction.REVIEWED` | Artikel wurde überprüft (genehmigt/abgelehnt) |
| Gelöscht | `ItemAuditAction.DELETED` | Element wurde gelöscht (weich oder hart) |
| Restauriert | `ItemAuditAction.RESTORED` | Das Element wurde nach dem Löschen wiederhergestellt |

## Verfolgte Felder

Der Prüfdienst überwacht die folgenden Felder zur Änderungserkennung:

| Feld | Geben Sie | ein
|---|---|
| `name` | Artikelname |
| `description` | Artikelbeschreibung |
| `source_url` | Quell-/Produkt-URL |
| `category` | Kategoriezuordnung |
| `tags` | Tag-Array |
| `collections` | Inkassoaufträge |
| `featured` | Hervorgehobener Status |
| `icon_url` | Symbol-/Logo-URL |
| `status` | Artikelstatus |

## Artikelprüfungsdienst

Der `itemAuditService` bietet High-Level-Protokollierungsmethoden, die von API-Routen und -Diensten aufgerufen werden.

### Erstellung von Protokollierungselementen

```tsx
import { logCreation } from '@/lib/services/item-audit.service';

await logCreation(item, { id: userId, name: userName });
// Logs: action=CREATED, metadata includes slug, category, tags
```

### Artikelaktualisierungen protokollieren

```tsx
import { logUpdate } from '@/lib/services/item-audit.service';

await logUpdate(previousItem, updatedItem, { id: userId, name: userName });
// Automatically detects changes between previous and current state
// Uses STATUS_CHANGED action if status differs, UPDATED otherwise
// Only logs if actual changes are detected
```

### Protokollierung von Bewertungen

```tsx
import { logReview } from '@/lib/services/item-audit.service';

await logReview(item, 'pending', 'Looks good, approved!', { id: userId, name: userName });
// Logs: action=REVIEWED with previous status, new status, and review notes
```

### Protokollierung, Löschung und Wiederherstellung

```tsx
import { logDeletion, logRestoration } from '@/lib/services/item-audit.service';

await logDeletion(item, performer, true);  // soft delete
await logRestoration(item, performer);
```

### Nicht blockierendes Design

Die gesamte Überwachungsprotokollierung ist in Try-Catch-Blöcke eingeschlossen und löst keine Fehler aus, die den primären Vorgang blockieren könnten:

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

## Änderungserkennung

Die Funktion `detectChanges` vergleicht zwei Elementzustände und gibt einen detaillierten Unterschied zurück:

```tsx
import { detectChanges } from '@/lib/services/item-audit.service';

const changes = detectChanges(previousItem, updatedItem);
// Returns: { fieldName: { old: previousValue, new: currentValue } } or null
```

Beispielausgabe:

```json
{
  "name": { "old": "Old Name", "new": "New Name" },
  "tags": { "old": ["react", "nextjs"], "new": ["react", "nextjs", "typescript"] },
  "status": { "old": "pending", "new": "approved" }
}
```

Die Funktion verarbeitet tiefe Gleichheit für Arrays (sortierter Vergleich) und gibt `null` zurück, wenn keine Änderungen erkannt werden.

## Datenbankschicht

### Audit-Log-Schema

Jeder Audit-Log-Eintrag enthält:

| Feld | Geben Sie | ein Beschreibung |
|---|---|---|
| `id` | `string` | Eindeutige ID |
| `itemId` | `string` | Artikel-Slug/ID |
| `itemName` | `string` | Artikelname zum Zeitpunkt der Aktion |
| `action` | `ItemAuditActionValues` | Aktionstyp |
| `previousStatus` | `string \| null` | Status vor Aktion |
| `newStatus` | `string \| null` | Status nach Aktion |
| `changes` | `JSON \| null` | Änderungsdetails auf Feldebene |
| `performedBy` | `string \| null` | Benutzer-ID, die die Aktion ausgeführt hat |
| `performedByName` | `string \| null` | Benutzeranzeigename |
| `notes` | `string \| null` | Zusätzliche Hinweise (z. B. Rezensionskommentare) |
| `metadata` | `JSON \| null` | Zusätzliche Kontextdaten |
| `createdAt` | `timestamp` | Wann die Aktion stattgefunden hat |

### Abfragefunktionen

| Funktion | Beschreibung |
|---|---|
| `createItemAuditLog(data)` | Erstellen Sie einen neuen Audit-Log-Eintrag |
| `getItemHistory(params)` | Erhalten Sie einen paginierten Verlauf mit Interpreteninformationen |
| `getLatestItemAuditLog(itemId)` | Neuesten Protokolleintrag abrufen |
| `getAuditLogsByAction(action, limit)` | Protokolle nach Aktionstyp filtern |
| `getAuditLogsByPerformer(userId, limit)` | Protokolle nach Ausführendem filtern |
| `getItemAuditStats(itemId)` | Anzahlaufschlüsselung nach Aktionstyp abrufen |

### Paginierte Verlaufsabfrage

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

Die Abfrage wird mit der Tabelle `users` verknüpft, um neben jedem Protokolleintrag auch die E-Mail-Adresse des Ausführenden einzuschließen.

## Der `useItemHistory` Haken

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

### Hook-Konfiguration

| Option | Standard | Beschreibung |
|---|---|---|
| `itemId` | erforderlich | Artikel-ID/Slug zum Abrufen des Verlaufs für |
| `page` | `1` | Seitenzahl |
| `limit` | `20` | Artikel pro Seite |
| `actionFilter` | `undefined` | Array von Aktionstypen, nach denen gefiltert werden soll |
| `enabled` | `true` | Ob die Abfrage aktiv ist |
| `staleTime` | 30 Sekunden | Cache-Aktivitätsdauer |

## Artikelverlauf modal

Die `ItemHistoryModal` -Komponente bietet eine vollständige Benutzeroberfläche zum Anzeigen des Artikelprüfverlaufs:

```tsx
import { ItemHistoryModal } from '@/components/admin/items/item-history-modal';

<ItemHistoryModal
  isOpen={showHistory}
  itemId="my-item-slug"
  itemName="My Item Name"
  onClose={() => setShowHistory(false)}
/>
```

### Modale Funktionen

| Funktion | Beschreibung |
|---|---|
| Aktionsfilterung | Dropdown-Liste zum Filtern nach Aktionstyp (Erstellt, Aktualisiert usw.) |
| Farbcodierte Einträge | Jeder Aktionstyp verfügt über ein eigenes Symbol und Farbschema |
| Erweiterbare Änderungen | Klicken Sie hier, um die Änderungsdetails auf Feldebene zu erweitern |
| Relative Zeitstempel | „vor 2 Stunden“, „vor 3 Tagen“ mit vollständigem Datum beim Hover |
| Darstelleranzeige | Zeigt Benutzernamen, E-Mail oder „System“ für automatisierte Aktionen an |
| Überprüfungskontext | Zeigt die Bezeichnungen „Genehmigt“/„Abgelehnt“ und die Ablehnungsgründe | an
| Paginierung | Integrierte Paginierung für lange Historien |
| Tastaturunterstützung | Die Escape-Taste schließt das modale |

### Aktionsfarbschema

| Aktion | Farbe | Symbol |
|---|---|---|
| Erstellt | Grün | Plus |
| Aktualisiert | Blau | Bearbeiten2 |
| Status geändert | Gelb | RefreshCw |
| Bewertet | Lila | CheckCircle |
| Gelöscht | Rot | Papierkorb2 |
| Restauriert | Blaugrün | Im Uhrzeigersinn drehen |

## Schlüsseldateien

| Datei | Pfad |
|---|---|
| Prüfungsdienst | `lib/services/item-audit.service.ts` |
| Audit-Abfragen | `lib/db/queries/item-audit.queries.ts` |
| Geschichtshaken | `hooks/use-item-history.ts` |
| Geschichte Modal | `components/admin/items/item-history-modal.tsx` |
