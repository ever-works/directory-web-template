---
id: notification-system
title: Approfondimento sul sistema di notifica
sidebar_label: Sistema di notifica
sidebar_position: 34
---

# Approfondimento sul sistema di notifica

Il modello fornisce un sistema di notifica in-app supportato da PostgreSQL. Le notifiche vengono create da servizi lato server e consumate tramite un'API REST, principalmente dal dashboard di amministrazione. Il sistema supporta più tipi di notifica, operazioni batch e definizioni di tipi estendibili.

## Panoramica dell'architettura

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

## Schema del database

Le notifiche vengono memorizzate nella tabella `notifications` :

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

### Progettazione dello schema

- **Colonna `type` ** -- stringa in formato libero che classifica la notifica. Non imposto da un'enumerazione, consentendo nuovi tipi senza migrazioni.
- ** `data` colonna** -- memorizza il contesto aggiuntivo come stringa JSON. Analizzato in lettura per accedere a ID elemento, contenuto dei commenti o informazioni specifiche sull'evento.
- ** `isRead` / `readAt` ** -- flag booleano per conteggi rapidi di documenti non letti più un timestamp per il controllo.
- **Quattro indici** -- coprono la ricerca degli utenti, il filtro del tipo, il filtro dei dati non letti e l'elenco cronologico.

## Tipi di notifica

Il sistema utilizza identificatori di tipo basati su stringa. I tipi integrati includono:

| Digitare | Trigger | Destinatario tipico |
|------|---------|-----|
| `item_approved` | L'amministratore approva un elemento inviato | Chi ha inviato l'articolo |
| `item_rejected` | L'amministratore rifiuta un elemento inviato | Chi ha inviato l'articolo |
| `comment_received` | Qualcuno commenta l'elemento di un utente | Proprietario dell'articolo |
| `comment_reported` | Un commento è contrassegnato per la revisione | Amministratore |
| `item_reported` | Un elemento è contrassegnato per la revisione | Amministratore |
| `user_registered` | Un nuovo utente si registra | Amministratore |
| `payment_failed` | Un tentativo di pagamento fallisce | Utente interessato |
| `system_alert` | Avviso o avviso a livello di sistema | Amministratore |

### Aggiunta di tipi personalizzati

1. Scegli una stringa di tipo descrittivo (es. `survey_response_received` ).
2. Aggiungere un metodo pratico a `NotificationService` che crei il carico utile corretto.
3. Chiamare il metodo dal percorso o dal servizio API pertinente.
4. Facoltativamente, aggiorna il menu a discesa delle notifiche dell'amministratore per visualizzare un'icona personalizzata.

Non è richiesta alcuna migrazione del database poiché `type` è una colonna di testo in formato libero.

## Servizio di notifica

Situato a `lib/services/notification.service.ts` , il servizio fornisce metodi pratici per creare notifiche dal codice lato server:

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

Ciascun metodo pratico costruisce il payload corretto `type` , `title` , `message` e `data` prima di delegare al metodo generico `create` .

### Utilizzo

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

## Endpoint API

Tutti gli endpoint di notifica richiedono l'autenticazione dell'amministratore.

### OTTIENI /api/admin/notifications

Recupera le 50 notifiche più recenti per l'amministratore autenticato, ordinate per prime. Restituisce le notifiche e il conteggio dei dati non letti in un'unica risposta.

```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 3
  }
}
```

Il conteggio dei documenti non letti utilizza un `SELECT count(*)` separato con `isRead = false` per efficienza.

### POST /api/admin/notifications

Crea una nuova notifica per un utente specifico.

| Campo | Obbligatorio | Descrizione |
|-------|----------|-------------|
| `type` | Sì | Identificatore della categoria di notifica |
| `title` | Sì | Testo breve dell'intestazione |
| `message` | Sì | Corpo del testo |
| `userId` | Sì | ID utente destinatario |
| `data` | No | Carico utile extra (autostringificato) |

### POST /api/admin/notifications/mark-all-read

Contrassegna tutte le notifiche non lette per l'amministratore corrente come lette. Imposta `isRead = true` e `readAt` sul timestamp corrente in un singolo aggiornamento batch.

### PATCH /api/admin/notifications/[id]/read

Contrassegna una singola notifica come letta dall'ID.

## Integrazione del pannello di amministrazione

L'intestazione dell'amministratore mostra un'icona a forma di campana con un badge di conteggio non letto. Il componente a discesa:

1. Recupera le notifiche dall'endpoint GET.
2. Rende ogni notifica con icone specifiche del tipo e codifica a colori.
3. Contrassegna le singole notifiche come lette al clic.
4. Fornisce un'azione collettiva "Segna tutto come letto".
5. Sondaggi su timer o aggiornamenti nella navigazione dell'amministratore.

## Considerazioni in tempo reale

L'implementazione attuale utilizza l'aggiornamento basato sul polling. Per gli aggiornamenti in tempo reale, l'architettura supporta i punti di estensione:

- **Eventi inviati dal server**: aggiungi un endpoint SSE che trasmette nuove notifiche.
- **WebSocket**: integrazione con un provider WebSocket per la comunicazione bidirezionale.
- **Intervallo di polling**: regolabile tramite il timer di aggiornamento del componente di notifica dell'amministratore.

## Integrazione e-mail

Il sistema di notifica si concentra sulle notifiche in-app. Le notifiche e-mail in uscita vengono gestite separatamente tramite il servizio e-mail (Rinvia/Novu), ma condividono gli stessi punti di attivazione. Quando viene creata una notifica tramite `NotificationService` , il codice chiamante può facoltativamente attivare un'e-mail nella stessa operazione.

## Struttura del carico utile dei dati

La colonna `data` memorizza le stringhe JSON con contesto specifico dell'evento:

```ts
// Item-related notification
{ "itemId": "item_789", "itemName": "Awesome Tool", "itemSlug": "awesome-tool" }

// Comment-related notification
{ "commentId": "comment_123", "content": "Great tool!", "itemId": "item_789" }

// Payment-related notification
{ "subscriptionId": "sub_456", "errorMessage": "Card declined" }
```

Questo schema flessibile consente ai renderer di notifiche di collegarsi in modo diretto alle pagine pertinenti e visualizzare informazioni contestuali.

## Accessibilità

- Il badge con l'icona della campana utilizza `aria-label` per annunciare il conteggio dei contenuti non letti agli screen reader.
- Gli elementi di notifica nel menu a discesa sono focalizzabili e navigabili tramite tastiera.
- Le icone specifiche del tipo sono decorative ( `aria-hidden="true"` ) con etichette di testo che forniscono il contesto.
- Il pulsante "Segna tutto come letto" fornisce un feedback chiaro tramite notifica di avviso popup.
- I timestamp utilizzano la formattazione relativa ("2 ore fa") con la data completa in `title` attributi.

## Documentazione correlata

- [Componenti amministrativi](/docs/template/components/admin-components) - Interfaccia utente di notifica dell'amministratore
- [Componenti del dashboard](/docs/template/components/dashboard-components) -- Statistiche delle notifiche
- [Rapporti e moderazione](/docs/template/features/reports-moderation) -- Notifiche attivate dai rapporti
- [Votazioni e commenti](/docs/template/features/voting-comments) -- Notifiche attivate dai commenti
