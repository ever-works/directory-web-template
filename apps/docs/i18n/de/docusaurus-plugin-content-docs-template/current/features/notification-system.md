---
id: notification-system
title: Detaillierte Informationen zum Benachrichtigungssystem
sidebar_label: Benachrichtigungssystem
sidebar_position: 34
---

# Benachrichtigungssystem Deep Dive

Die Vorlage bietet ein In-App-Benachrichtigungssystem, das von PostgreSQL unterstützt wird. Benachrichtigungen werden von serverseitigen Diensten erstellt und über eine REST-API verarbeitet, hauptsächlich vom Admin-Dashboard. Das System unterstützt mehrere Benachrichtigungstypen, Batch-Operationen und erweiterbare Typdefinitionen.

## Architekturübersicht

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

## Datenbankschema

Benachrichtigungen werden in der Tabelle `notifications` gespeichert:

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

### Schemadesign

- Spalte ** `type` ** – Freiform-Zeichenfolge zur Kategorisierung der Benachrichtigung. Wird nicht durch eine Enumeration erzwungen, wodurch neue Typen ohne Migrationen möglich sind.
- ** `data` Spalte** – speichert zusätzlichen Kontext als JSON-Zeichenfolge. Beim Lesen analysiert, um auf Element-IDs, Kommentarinhalte oder ereignisspezifische Informationen zuzugreifen.
- ** `isRead` / `readAt` ** – boolesches Flag für schnelle ungelesene Zählungen plus einen Zeitstempel für die Prüfung.
- **Vier Indizes** – umfassen Benutzersuche, Typfilterung, ungelesene Filterung und chronologische Auflistung.

## Benachrichtigungstypen

Das System verwendet stringbasierte Typbezeichner. Zu den integrierten Typen gehören:

| Geben Sie | ein Auslöser | Typischer Empfänger |
|------|---------|-------------------|
| `item_approved` | Der Administrator genehmigt einen eingereichten Artikel | Artikeleinreicher |
| `item_rejected` | Der Administrator lehnt einen eingereichten Artikel ab | Artikeleinreicher |
| `comment_received` | Jemand kommentiert den Artikel eines Benutzers | Artikelbesitzer |
| `comment_reported` | Ein Kommentar ist zur Überprüfung markiert | Admin |
| `item_reported` | Ein Artikel ist zur Überprüfung markiert | Admin |
| `user_registered` | Ein neuer Benutzer meldet sich an | Admin |
| `payment_failed` | Ein Zahlungsversuch schlägt fehl | Betroffener Benutzer |
| `system_alert` | Warnung oder Hinweis auf Systemebene | Admin |

### Benutzerdefinierte Typen hinzufügen

1. Wählen Sie eine beschreibende Zeichenfolge (z. B. `survey_response_received` ).
2. Fügen Sie `NotificationService` eine praktische Methode hinzu, die die richtige Nutzlast erstellt.
3. Rufen Sie die Methode über die entsprechende API-Route oder den entsprechenden API-Dienst auf.
4. Aktualisieren Sie optional das Dropdown-Menü für Administratorbenachrichtigungen, um ein benutzerdefiniertes Symbol anzuzeigen.

Es ist keine Datenbankmigration erforderlich, da `type` eine Freiformtextspalte ist.

## NotificationService

Der Dienst liegt bei `lib/services/notification.service.ts` und bietet praktische Methoden zum Erstellen von Benachrichtigungen aus serverseitigem Code:

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

Jede praktische Methode erstellt die korrekten `type` -, `title` -, `message` - und `data` -Nutzdaten, bevor sie an die generische `create` -Methode delegiert wird.

### Nutzung

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

## API-Endpunkte

Alle Benachrichtigungsendpunkte erfordern eine Administratorauthentifizierung.

### GET /api/admin/notifications

Ruft die 50 neuesten Benachrichtigungen für den authentifizierten Administrator ab, sortiert nach dem Neuesten zuerst. Gibt Benachrichtigungen und die Anzahl der ungelesenen Nachrichten in einer einzigen Antwort zurück.

```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 3
  }
}
```

Für die ungelesene Anzahl wird aus Effizienzgründen ein separates `SELECT count(*)` mit `isRead = false` verwendet.

### POST /api/admin/notifications

Erstellt eine neue Benachrichtigung für einen bestimmten Benutzer.

| Feld | Erforderlich | Beschreibung |
|-------|----------|-------------|
| `type` | Ja | Kennung der Benachrichtigungskategorie |
| `title` | Ja | Kurzer Überschriftentext |
| `message` | Ja | Fließtext |
| `userId` | Ja | Benutzer-ID des Empfängers |
| `data` | Nein | Zusätzliche Nutzlast (automatisch stringifiziert) |

### POST /api/admin/notifications/mark-all-read

Markiert alle ungelesenen Benachrichtigungen für den aktuellen Administrator als gelesen. Setzt `isRead = true` und `readAt` auf den aktuellen Zeitstempel in einer einzelnen Batch-Aktualisierung.

### PATCH /api/admin/notifications/[id]/read

Markiert eine einzelne Benachrichtigung als von der ID gelesen.

## Admin-Dashboard-Integration

In der Admin-Kopfzeile wird ein Glockensymbol mit einem Abzeichen für die Anzahl ungelesener Nachrichten angezeigt. Die Dropdown-Komponente:

1. Ruft Benachrichtigungen vom GET-Endpunkt ab.
2. Rendert jede Benachrichtigung mit typspezifischen Symbolen und Farbcodierungen.
3. Markiert einzelne Benachrichtigungen beim Klicken als gelesen.
4. Bietet eine Massenaktion „Alle als gelesen markieren“.
5. Umfragen per Timer oder Aktualisierungen in der Admin-Navigation.

## Überlegungen zur Echtzeit

Die aktuelle Implementierung verwendet eine abfragebasierte Aktualisierung. Für Echtzeit-Updates unterstützt die Architektur Erweiterungspunkte:

- **Vom Server gesendete Ereignisse** – Fügen Sie einen SSE-Endpunkt hinzu, der neue Benachrichtigungen streamt.
- **WebSocket** – Integration mit einem WebSocket-Anbieter für bidirektionale Kommunikation.
- **Abfrageintervall** – einstellbar über den Aktualisierungstimer der Administratorbenachrichtigungskomponente.

## E-Mail-Integration

Das Benachrichtigungssystem konzentriert sich auf In-App-Benachrichtigungen. Ausgehende E-Mail-Benachrichtigungen werden separat über den E-Mail-Dienst (Resend/Novu) verarbeitet, haben aber dieselben Triggerpunkte. Bei der Erstellung einer Benachrichtigung über `NotificationService` kann der Aufrufcode optional im selben Vorgang eine E-Mail auslösen.

## Struktur der Datennutzlast

In der Spalte `data` werden JSON-Zeichenfolgen mit ereignisspezifischem Kontext gespeichert:

```ts
// Item-related notification
{ "itemId": "item_789", "itemName": "Awesome Tool", "itemSlug": "awesome-tool" }

// Comment-related notification
{ "commentId": "comment_123", "content": "Great tool!", "itemId": "item_789" }

// Payment-related notification
{ "subscriptionId": "sub_456", "errorMessage": "Card declined" }
```

Dieses flexible Schema ermöglicht es Benachrichtigungsrenderern, einen Deep-Link zu relevanten Seiten herzustellen und kontextbezogene Informationen anzuzeigen.

## Barrierefreiheit

- Das Glockensymbol-Badge verwendet `aria-label` , um Screenreadern die Anzahl der ungelesenen Inhalte mitzuteilen.
- Benachrichtigungselemente im Dropdown-Menü sind fokussierbar und über die Tastatur navigierbar.
- Typspezifische Symbole sind dekorativ ( `aria-hidden="true"` ) und verfügen über Textbeschriftungen, die den Kontext bereitstellen.
- Die Schaltfläche „Alle als gelesen markieren“ bietet eine klare Rückmeldung per Toast-Benachrichtigung.
- Zeitstempel verwenden relative Formatierung („vor 2 Stunden“) mit vollständigem Datum in `title` -Attributen.

## Verwandte Dokumentation

– [Admin-Komponenten](/docs/template/components/admin-components) – Benutzeroberfläche für Admin-Benachrichtigungen
– [Dashboard-Komponenten](/docs/template/components/dashboard-components) – Benachrichtigungsstatistiken
– [Berichte und Moderation](/docs/template/features/reports-moderation) – Durch Berichte ausgelöste Benachrichtigungen
- [Abstimmung und Kommentare](/docs/template/features/voting-comments) – Durch Kommentare ausgelöste Benachrichtigungen
