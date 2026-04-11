---
id: notification-system
title: System powiadomień Głębokie nurkowanie
sidebar_label: System powiadomień
sidebar_position: 34
---

# Głębokie nurkowanie systemu powiadomień

Szablon zapewnia system powiadomień w aplikacji obsługiwany przez PostgreSQL. Powiadomienia są tworzone przez usługi po stronie serwera i wykorzystywane przez interfejs API REST, głównie przez panel administracyjny. System obsługuje wiele typów powiadomień, operacje wsadowe i definicje typów rozszerzalnych.

## Przegląd architektury

```
lib/db/schema.ts                    # notifications table definition
lib/services/notification.service.ts # NotificationService with convenience methods

app/api/admin/notifications/
  route.ts                           # GET (list) and POST (create) endpoints
  mark-all-read/route.ts             # POST mark all as read
  [id]/read/route.ts                 # PATCH mark single as read

components/admin/
  admin-notifications.tsx            # Notification dropdown UI
  admin-notification-stats.tsx       # Notification count badges
```

## Schemat bazy danych

Powiadomienia zapisywane są w tabeli `notifications` :

```ts
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data'),              // JSON string for extra payload
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIndex: index('notifications_user_idx').on(table.userId),
  typeIndex: index('notifications_type_idx').on(table.type),
  isReadIndex: index('notifications_is_read_idx').on(table.isRead),
  createdAtIndex: index('notifications_created_at_idx').on(table.createdAt),
}));
```

### Projekt schematu

- **Kolumna `type` ** -- dowolny ciąg znaków kategoryzujący powiadomienie. Nie wymuszane przez wyliczenie, zezwala na nowe typy bez migracji.
- ** `data` kolumna** -- przechowuje dodatkowy kontekst w postaci ciągu JSON. Analizowane podczas odczytu, aby uzyskać dostęp do identyfikatorów elementów, treści komentarzy lub informacji dotyczących konkretnego wydarzenia.
- ** `isRead` / `readAt` ** -- flaga logiczna do szybkiego zliczania nieprzeczytanych plików oraz znacznik czasu do kontroli.
- **Cztery indeksy** — obejmują wyszukiwanie użytkowników, filtrowanie typów, filtrowanie nieprzeczytanych i listę chronologiczną.

## Typy powiadomień

System używa identyfikatorów typów opartych na ciągach znaków. Wbudowane typy obejmują:

| Wpisz | Wyzwalacz | Typowy odbiorca |
|------|---------|----------------------|
| `item_approved` | Administrator zatwierdza przesłany przedmiot | Osoba przesyłająca przedmiot |
| `item_rejected` | Administrator odrzuca przesłany przedmiot | Osoba przesyłająca przedmiot |
| `comment_received` | Ktoś komentuje przedmiot użytkownika | Właściciel przedmiotu |
| `comment_reported` | Komentarz został oznaczony do sprawdzenia | Administrator |
| `item_reported` | Element został oznaczony do sprawdzenia | Administrator |
| `user_registered` | Rejestruje się nowy użytkownik | Administrator |
| `payment_failed` | Próba płatności nie powiodła się | Dotknięty użytkownik |
| `system_alert` | Ostrzeżenie lub uwaga na poziomie systemu | Administrator |

### Dodawanie typów niestandardowych

1. Wybierz ciąg opisowy (np. `survey_response_received` ).
2. Dodaj wygodną metodę do `NotificationService` , która tworzy prawidłowy ładunek.
3. Wywołaj metodę z odpowiedniej trasy API lub usługi.
4. Opcjonalnie zaktualizuj menu powiadomień administratora, aby wyrenderować niestandardową ikonę.

Nie jest wymagana migracja bazy danych, ponieważ `type` jest kolumną z dowolnym tekstem.

##Usługa powiadomień

Usługa zlokalizowana pod adresem `lib/services/notification.service.ts` zapewnia wygodne metody tworzenia powiadomień z kodu po stronie serwera:

```ts
class NotificationService {
  static async create(data: CreateNotificationData);
  static async createItemSubmissionNotification(adminUserId, itemId, itemName, submittedBy);
  static async createCommentReportedNotification(adminUserId, commentId, content, reportedBy);
  static async createItemReportedNotification(adminUserId, itemId, itemName, reportedBy);
  static async createUserRegisteredNotification(adminUserId, userName, userEmail);
  static async createPaymentFailedNotification(userId, subscriptionId, errorMessage);
  static async createSystemAlertNotification(adminUserId, title, message);
}
```

Każda wygodna metoda konstruuje prawidłowy ładunek `type` , `title` , `message` i `data` przed delegowaniem do ogólnej metody `create` .

### Użycie

```ts
import { NotificationService } from '@/lib/services/notification.service';

// After approving an item
await NotificationService.createItemSubmissionNotification(
  adminUserId, item.id, item.name, item.submittedBy
);

// System-level alert
await NotificationService.createSystemAlertNotification(
  adminUserId, 'Database Warning', 'Connection pool reaching capacity'
);
```

## Punkty końcowe interfejsu API

Wszystkie punkty końcowe powiadomień wymagają uwierzytelnienia administratora.

### POBIERZ /api/admin/notifications

Pobiera 50 najnowszych powiadomień dla uwierzytelnionego administratora, posortowanych najpierw od najnowszych. Zwraca powiadomienia i liczbę nieprzeczytanych informacji w jednej odpowiedzi.

```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 3
  }
}
```

Licznik nieprzeczytanych danych wykorzystuje oddzielne `SELECT count(*)` z `isRead = false` dla wydajności.

### POST /api/admin/notifications

Tworzy nowe powiadomienie dla konkretnego użytkownika.

| Pole | Wymagane | Opis |
|-------|----------|------------|
| `type` | Tak | Identyfikator kategorii powiadomień |
| `title` | Tak | Krótki tekst nagłówka |
| `message` | Tak | Treść |
| `userId` | Tak | Identyfikator użytkownika odbiorcy |
| `data` | Nie | Dodatkowy ładunek (automatycznie naciągany) |

### POST /api/admin/notifications/mark-all-read

Oznacza wszystkie nieprzeczytane powiadomienia bieżącego administratora jako przeczytane. Ustawia `isRead = true` i `readAt` na bieżący znacznik czasu w ramach pojedynczej aktualizacji wsadowej.

### PATCH /api/admin/notifications/[id]/read

Oznacza pojedyncze powiadomienie jako przeczytane według identyfikatora.

## Integracja panelu administracyjnego

Nagłówek administratora wyświetla ikonę dzwonka z plakietką nieprzeczytanej liczby. Komponent rozwijany:

1. Pobiera powiadomienia z punktu końcowego GET.
2. Renderuje każde powiadomienie za pomocą ikon specyficznych dla typu i kodowania kolorami.
3. Oznacza poszczególne powiadomienia jako przeczytane po kliknięciu.
4. Zapewnia akcję zbiorczą „Oznacz wszystko jako przeczytane”.
5. Odpytuje licznik czasu lub odświeża w nawigacji administratora.

## Rozważania w czasie rzeczywistym

Bieżąca implementacja wykorzystuje odświeżanie oparte na odpytywaniu. W przypadku aktualizacji w czasie rzeczywistym architektura obsługuje punkty rozszerzeń:

- **Zdarzenia wysyłane przez serwer** — dodaj punkt końcowy SSE, który przesyła strumieniowo nowe powiadomienia.
- **WebSocket** — integracja z dostawcą protokołu WebSocket w celu zapewnienia komunikacji dwukierunkowej.
- **Interwał odpytywania** – regulowany za pomocą licznika czasu odświeżania komponentu powiadomień administratora.

## Integracja z pocztą e-mail

System powiadomień koncentruje się na powiadomieniach w aplikacji. Wychodzące powiadomienia e-mail są obsługiwane oddzielnie za pośrednictwem usługi e-mail (Wyślij ponownie/Novu), ale mają te same punkty aktywacji. Gdy powiadomienie zostanie utworzone za pośrednictwem `NotificationService` , kod wywołujący może opcjonalnie wywołać wiadomość e-mail w tej samej operacji.

## Struktura ładunku danych

Kolumna `data` przechowuje ciągi JSON z kontekstem specyficznym dla zdarzenia:

```ts
// Item-related notification
{ "itemId": "item_789", "itemName": "Awesome Tool", "itemSlug": "awesome-tool" }

// Comment-related notification
{ "commentId": "comment_123", "content": "Great tool!", "itemId": "item_789" }

// Payment-related notification
{ "subscriptionId": "sub_456", "errorMessage": "Card declined" }
```

Ten elastyczny schemat umożliwia modułom renderującym powiadomienia tworzenie głębokich linków do odpowiednich stron i wyświetlanie informacji kontekstowych.

## Dostępność

- Ikona dzwonka wyświetla liczbę nieprzeczytanych informacji czytnikom ekranu.
- Elementy powiadomień na liście rozwijanej można ustawiać i można nimi poruszać się za pomocą klawiatury.
- Ikony specyficzne dla typu mają charakter dekoracyjny ( `aria-hidden="true"` ) z etykietami tekstowymi zapewniającymi kontekst.
- Przycisk „Oznacz wszystko jako przeczytane” zapewnia wyraźną informację zwrotną w formie powiadomienia wyskakującego.
- Znaczniki czasu korzystają z formatowania względnego („2 godziny temu”) z pełną datą w `title` atrybutach.

## Powiązana dokumentacja

- [Komponenty administracyjne](/docs/template/components/admin-components) -- Interfejs powiadomień administratora
- [Komponenty pulpitu nawigacyjnego](/docs/template/components/dashboard-components) -- Statystyki powiadomień
- [Raporty i moderacja](/docs/template/features/reports-modation) -- Powiadomienia wywoływane przez raport
– [Głosowanie i komentarze](/docs/template/features/voting-comments) -- Powiadomienia uruchamiane przez komentarz
