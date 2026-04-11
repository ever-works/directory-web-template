---
id: item-history
title: Historia pozycji i audyt
sidebar_label: Historia pozycji i audyt
sidebar_position: 17
---

# Historia pozycji i audyt

Szablon Ever Works zawiera kompleksowy system ścieżki audytu, który śledzi wszystkie zmiany wprowadzone w elementach w całym cyklu ich życia. Każde utworzenie, aktualizacja, zmiana statusu, przegląd, usunięcie i przywrócenie jest rejestrowane ze szczegółowymi informacjami o zmianach, tożsamością wykonawcy i znacznikami czasu.

## Przegląd architektury

| Składnik | Ścieżka | Cel |
|---|---|---|
| `itemAuditService` | `lib/services/item-audit.service.ts` | Warstwa usługowa do rejestrowania działań audytowych |
| `item-audit.queries.ts` | `lib/db/queries/item-audit.queries.ts` | Zapytania do bazy danych dotyczące dziennika audytu CRUD |
| `useItemHistory` | `hooks/use-item-history.ts` | Reaguj Hook Query do pobierania dzienników audytu |
| `ItemHistoryModal` | `components/admin/items/item-history-modal.tsx` | Modalny interfejs użytkownika do przeglądania historii przedmiotów |

## Działania kontrolne

System śledzi sześć rodzajów działań:

| Akcja | Stała | Opis |
|---|---|---|
| Utworzono | `ItemAuditAction.CREATED` | Element został utworzony |
| Zaktualizowano | `ItemAuditAction.UPDATED` | Pola pozycji zostały zmodyfikowane |
| Stan zmieniony | `ItemAuditAction.STATUS_CHANGED` | Status przedmiotu został zmieniony |
| Recenzja | `ItemAuditAction.REVIEWED` | Pozycja została sprawdzona (zatwierdzona/odrzucona) |
| Usunięto | `ItemAuditAction.DELETED` | Element został usunięty (miękki lub twardy) |
| Przywrócony | `ItemAuditAction.RESTORED` | Element został przywrócony z usunięcia |

## Śledzone pola

Usługa audytu monitoruje następujące pola pod kątem wykrywania zmian:

| Pole | Wpisz |
|---|---|
| `name` | Nazwa przedmiotu |
| `description` | Opis przedmiotu |
| `source_url` | Adres URL źródła/produktu |
| `category` | Przypisanie kategorii |
| `tags` | Tablica znaczników |
| `collections` | Przydziały kolekcji |
| `featured` | Wyróżniony status |
| `icon_url` | Adres URL ikony/logo |
| `status` | Stan przedmiotu |

## Usługa audytu pozycji `itemAuditService` zapewnia metody rejestrowania wysokiego poziomu, które są wywoływane z tras i usług API.

### Rejestrowanie tworzenia elementu

```tsx
import { logCreation } from '@/lib/services/item-audit.service';

await logCreation(item, { id: userId, name: userName });
// Logs: action=CREATED, metadata includes slug, category, tags
```

### Rejestrowanie aktualizacji elementów

```tsx
import { logUpdate } from '@/lib/services/item-audit.service';

await logUpdate(previousItem, updatedItem, { id: userId, name: userName });
// Automatically detects changes between previous and current state
// Uses STATUS_CHANGED action if status differs, UPDATED otherwise
// Only logs if actual changes are detected
```

### Rejestrowanie recenzji

```tsx
import { logReview } from '@/lib/services/item-audit.service';

await logReview(item, 'pending', 'Looks good, approved!', { id: userId, name: userName });
// Logs: action=REVIEWED with previous status, new status, and review notes
```

### Usuwanie i przywracanie rejestrowania

```tsx
import { logDeletion, logRestoration } from '@/lib/services/item-audit.service';

await logDeletion(item, performer, true);  // soft delete
await logRestoration(item, performer);
```

### Konstrukcja nieblokująca

Całe rejestrowanie audytu jest opakowane w bloki try-catch i nie powoduje zgłaszania błędów, które mogłyby zablokować podstawową operację:

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

## Wykrywanie zmian

Funkcja `detectChanges` porównuje dwa stany elementów i zwraca szczegółową różnicę:

```tsx
import { detectChanges } from '@/lib/services/item-audit.service';

const changes = detectChanges(previousItem, updatedItem);
// Returns: { fieldName: { old: previousValue, new: currentValue } } or null
```

Przykładowe wyjście:

```json
{
  "name": { "old": "Old Name", "new": "New Name" },
  "tags": { "old": ["react", "nextjs"], "new": ["react", "nextjs", "typescript"] },
  "status": { "old": "pending", "new": "approved" }
}
```

Funkcja obsługuje głęboką równość tablic (porównanie posortowane) i zwraca `null` , jeśli nie zostaną wykryte żadne zmiany.

## Warstwa bazy danych

### Schemat dziennika audytu

Każdy wpis dziennika audytu zawiera:

| Pole | Wpisz | Opis |
|---|---|---|
| `id` | `string` | Unikalny identyfikator |
| `itemId` | `string` | Ślimak/identyfikator przedmiotu |
| `itemName` | `string` | Nazwa pozycji w momencie działania |
| `action` | `ItemAuditActionValues` | Rodzaj akcji |
| `previousStatus` | `string \| null` | Stan przed działaniem |
| `newStatus` | `string \| null` | Stan po akcji |
| `changes` | `JSON \| null` | Szczegóły zmian na poziomie pola |
| `performedBy` | `string \| null` | Identyfikator użytkownika, który wykonał akcję |
| `performedByName` | `string \| null` | Wyświetlana nazwa użytkownika |
| `notes` | `string \| null` | Dodatkowe uwagi (np. komentarze do recenzji) |
| `metadata` | `JSON \| null` | Dodatkowe dane kontekstowe |
| `createdAt` | `timestamp` | Kiedy akcja miała miejsce |

### Funkcje zapytań

| Funkcja | Opis |
|---|---|
| `createItemAuditLog(data)` | Utwórz nowy wpis dziennika audytu |
| `getItemHistory(params)` | Pobierz historię stronicowaną z informacjami o wykonawcach |
| `getLatestItemAuditLog(itemId)` | Pobierz najnowszy wpis dziennika |
| `getAuditLogsByAction(action, limit)` | Filtruj logi według rodzaju akcji |
| `getAuditLogsByPerformer(userId, limit)` | Filtruj logi według wykonawcy |
| `getItemAuditStats(itemId)` | Uzyskaj podział liczby według typu akcji |

### Zapytanie o historię podzielone na strony

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

Zapytanie łączy się z tabelą `users` i zawiera adres e-mail wykonawcy obok każdego wpisu dziennika.

## Hak `useItemHistory`

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

### Konfiguracja haka

| Opcja | Domyślne | Opis |
|---|---|---|
| `itemId` | wymagane | Identyfikator przedmiotu/błąd do pobrania historii dla |
| `page` | `1` | Numer strony |
| `limit` | `20` | Pozycje na stronę |
| `actionFilter` | `undefined` | Tablica typów akcji do filtrowania według |
| `enabled` | `true` | Czy zapytanie jest aktywne |
| `staleTime` | 30 sekund | Czas trwania świeżości pamięci podręcznej |

## Modalna historia pozycji

Komponent `ItemHistoryModal` zapewnia kompletny interfejs użytkownika umożliwiający przeglądanie historii audytów pozycji:

```tsx
import { ItemHistoryModal } from '@/components/admin/items/item-history-modal';

<ItemHistoryModal
  isOpen={showHistory}
  itemId="my-item-slug"
  itemName="My Item Name"
  onClose={() => setShowHistory(false)}
/>
```

### Funkcje modalne

| Funkcja | Opis |
|---|---|
| Filtrowanie akcji | Lista rozwijana umożliwiająca filtrowanie według typu akcji (Utworzono, Zaktualizowano itp.) |
| Wpisy oznaczone kolorami | Każdy typ akcji ma odrębną ikonę i schemat kolorów |
| Zmiany rozwijalne | Kliknij, aby rozwinąć szczegóły zmian na poziomie pola |
| Względne znaczniki czasu | „2 godziny temu”, „3 dni temu” z pełną datą po najechaniu kursorem |
| Pokaz wykonawcy | Pokazuje nazwę użytkownika, adres e-mail lub „System” dla automatycznych działań |
| Kontekst przeglądu | Pokazuje etykiety „Zatwierdzone”/„Odrzucone” i przyczyny odrzucenia |
| Paginacja | Wbudowana paginacja dla długich historii |
| Obsługa klawiatury | Klawisz Escape zamyka modalne |

### Schemat kolorów akcji

| Akcja | Kolor | Ikona |
|---|---|---|
| Utworzono | Zielony | Plus |
| Zaktualizowano | Niebieski | Edytuj2 |
| Stan zmieniony | Żółty | OdświeżCw |
| Recenzja | Fioletowy | SprawdźKoło |
| Usunięto | Czerwony | Kosz2 |
| Przywrócony | Turkusowy | ObróćCcw |

## Kluczowe pliki

| Plik | Ścieżka |
|---|---|
| Usługa audytu | `lib/services/item-audit.service.ts` |
| Zapytania audytowe | `lib/db/queries/item-audit.queries.ts` |
| Hak historii | `hooks/use-item-history.ts` |
| Historia Modalna | `components/admin/items/item-history-modal.tsx` |
