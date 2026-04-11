---
id: notification-system
title: Meldingssysteem Deep Dive
sidebar_label: Meldingssysteem
sidebar_position: 34
---

# Meldingssysteem Deep Dive

De sjabloon biedt een in-app-meldingssysteem dat wordt ondersteund door PostgreSQL. Meldingen worden gemaakt door services op de server en gebruikt via een REST API, voornamelijk door het beheerdersdashboard. Het systeem ondersteunt meerdere typen meldingen, batchbewerkingen en uitbreidbare typedefinities.

## Architectuuroverzicht

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

## Databaseschema

Meldingen worden opgeslagen in de tabel `notifications` :

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

### Schemaontwerp

- ** `type` kolom** -- vrije tekenreeks die de melding categoriseert. Niet afgedwongen door een enum, waardoor nieuwe typen zonder migraties mogelijk zijn.
- ** `data` kolom** -- slaat aanvullende context op als een JSON-tekenreeks. Geparseerd bij lezen om toegang te krijgen tot item-ID's, commentaarinhoud of gebeurtenisspecifieke informatie.
- ** `isRead` / `readAt` ** -- Booleaanse vlag voor snelle ongelezen aantallen plus een tijdstempel voor auditing.
- **Vier indexen** - omvat het opzoeken van gebruikers, typefiltering, ongelezen filtering en chronologische lijst.

## Meldingstypen

Het systeem maakt gebruik van op tekenreeksen gebaseerde type-ID's. Ingebouwde typen zijn onder meer:

| Typ | Trigger | Typische ontvanger |
|------|---------|------------------|
| `item_approved` | Beheerder keurt een ingediend item goed | Artikelindiener |
| `item_rejected` | Beheerder wijst een ingediend item af | Artikelindiener |
| `comment_received` | Iemand geeft commentaar op een item van een gebruiker | Artikeleigenaar |
| `comment_reported` | Een reactie is gemarkeerd voor beoordeling | Beheerder |
| `item_reported` | Een item is gemarkeerd ter beoordeling | Beheerder |
| `user_registered` | Een nieuwe gebruiker meldt zich aan | Beheerder |
| `payment_failed` | Een betaalpoging mislukt | Betrokken gebruiker |
| `system_alert` | Waarschuwing of mededeling op systeemniveau | Beheerder |

### Aangepaste typen toevoegen

1. Kies een beschrijvende tekenreeks (bijvoorbeeld `survey_response_received` ).
2. Voeg een handige methode toe aan `NotificationService` die de juiste lading opbouwt.
3. Roep de methode aan vanuit de relevante API-route of service.
4. Werk optioneel de vervolgkeuzelijst voor beheerdersmeldingen bij om een ​​aangepast pictogram weer te geven.

Er is geen databasemigratie vereist omdat `type` een vrije tekstkolom is.

## Meldingsservice

De service bevindt zich op `lib/services/notification.service.ts` en biedt handige methoden voor het maken van meldingen op basis van server-side code:

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

Elke gemaksmethode construeert de juiste `type` , `title` , `message` en `data` payload voordat deze wordt gedelegeerd aan de generieke `create` -methode.

### Gebruik

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

## API-eindpunten

Voor alle meldingseindpunten is beheerdersverificatie vereist.

### KRIJG /api/admin/notificaties

Haalt de 50 meest recente meldingen op voor de geverifieerde beheerder, gesorteerd als nieuwste eerst. Retourneert meldingen en het aantal ongelezen berichten in één reactie.

```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 3
  }
}
```

Het ongelezen aantal gebruikt een aparte `SELECT count(*)` met `isRead = false` voor efficiëntie.

### POST /api/admin/notificaties

Creëert een nieuwe melding voor een specifieke gebruiker.

| Veld | Vereist | Beschrijving |
|-------|----------|------------|
| `type` | Ja | Meldingscategorie-ID |
| `title` | Ja | Korte koptekst |
| `message` | Ja | Hoofdtekst |
| `userId` | Ja | Gebruikers-ID van ontvanger |
| `data` | Nee | Extra lading (automatisch bespannen) |

### POST /api/admin/notifications/mark-all-read

Markeert alle ongelezen meldingen voor de huidige beheerder als gelezen. Stelt `isRead = true` en `readAt` in op de huidige tijdstempel in een enkele batchupdate.

### PATCH /api/admin/notifications/[id]/read

Markeert een enkele melding als gelezen door ID.

## Beheerdashboard-integratie

In de beheerderskop wordt een belpictogram weergegeven met een ongelezen tellingsbadge. Het vervolgkeuzemenu:

1. Haalt meldingen op van het GET-eindpunt.
2. Geeft elke melding weer met typespecifieke pictogrammen en kleurcodering.
3. Markeert individuele meldingen als gelezen als u erop klikt.
4. Biedt een bulkactie "Alles markeren als gelezen".
5. Polls op een timer of vernieuwingen in de beheerdersnavigatie.

## Realtime overwegingen

De huidige implementatie maakt gebruik van op polling gebaseerde vernieuwing. Voor realtime updates ondersteunt de architectuur uitbreidingspunten:

- **Door de server verzonden gebeurtenissen**: voeg een SSE-eindpunt toe dat nieuwe meldingen streamt.
- **WebSocket** -- integreer met een WebSocket-provider voor bidirectionele communicatie.
- **Pollinginterval** -- instelbaar via de vernieuwingstimer van de beheerdersmeldingscomponent.

## E-mailintegratie

Het notificatiesysteem richt zich op in-app notificaties. Uitgaande e-mailmeldingen worden afzonderlijk afgehandeld via de e-mailservice (Resend/Novu), maar delen dezelfde triggerpunten. Wanneer er via `NotificationService` een melding wordt aangemaakt, kan de belcode tijdens dezelfde handeling optioneel een e-mail activeren.

## Structuur van de gegevenspayload

In de kolom `data` worden JSON-tekenreeksen met gebeurtenisspecifieke context opgeslagen:

```ts
// Item-related notification
{ "itemId": "item_789", "itemName": "Awesome Tool", "itemSlug": "awesome-tool" }

// Comment-related notification
{ "commentId": "comment_123", "content": "Great tool!", "itemId": "item_789" }

// Payment-related notification
{ "subscriptionId": "sub_456", "errorMessage": "Card declined" }
```

Met dit flexibele schema kunnen renderers van meldingen deep-linken naar relevante pagina's en contextuele informatie weergeven.

## Toegankelijkheid

- De belpictogrambadge gebruikt `aria-label` om het aantal ongelezen berichten aan schermlezers bekend te maken.
- Meldingsitems in de vervolgkeuzelijst kunnen worden gefocust en kunnen via het toetsenbord worden genavigeerd.
- Typespecifieke pictogrammen zijn decoratief ( `aria-hidden="true"` ) met tekstlabels die context bieden.
- De knop "Alles markeren als gelezen" geeft duidelijke feedback via toastmeldingen.
- Tijdstempels gebruiken relatieve opmaak ("2 uur geleden") met de volledige datum in `title` -attributen.

## Gerelateerde documentatie

- [Beheercomponenten](/docs/template/components/admin-components) -- Gebruikersinterface voor beheerdersmeldingen
- [Dashboardcomponenten](/docs/template/components/dashboard-components) -- Meldingsstatistieken
- [Rapporten en moderatie] (/docs/template/features/reports-moderation) -- Door rapporten geactiveerde meldingen
- [Stemmen en reacties](/docs/template/features/voting-comments) -- Door reacties geactiveerde meldingen
