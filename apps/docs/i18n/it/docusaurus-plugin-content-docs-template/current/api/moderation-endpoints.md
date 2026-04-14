---
id: moderation-endpoints
title: Sistema di Moderazione
sidebar_label: Moderazione
sidebar_position: 28
---

# Sistema di Moderazione

Il sistema di moderazione fornisce moderazione programmatica dei contenuti tramite un livello di servizio anziché endpoint REST autonomi. Le azioni di moderazione vengono attivate automaticamente quando gli amministratori risolvono le segnalazioni di contenuto tramite l'API dei Report. Il sistema supporta l'avvertimento degli utenti, la sospensione degli account, il ban degli account e la rimozione dei contenuti, con completa cronologia di audit e notifiche email.

## Panoramica

La moderazione non è esposta come endpoint REST separati. Viene invece invocata tramite il flusso di lavoro di risoluzione delle segnalazioni:

```
PUT /api/admin/reports/[id]  -->  la risoluzione attiva l'azione di moderazione
```

Quando un amministratore imposta un valore `resolution` su una segnalazione, la corrispondente funzione di moderazione viene eseguita automaticamente.

| Valore di Risoluzione | Funzione di Moderazione | Effetto |
|---|---|---|
| `content_removed` | `removeContent()` | Elimina temporaneamente il commento o l'elemento segnalato |
| `user_warned` | `warnUser()` | Incrementa il contatore degli avvertimenti dell'utente |
| `user_suspended` | `suspendUser()` | Imposta lo stato dell'utente su `"suspended"` |
| `user_banned` | `banUser()` | Imposta lo stato dell'utente su `"banned"` |
| `no_action` | Nessuna | Nessuna azione di moderazione intrapresa |

## Azioni di Moderazione

### Rimuovi Contenuto

```typescript
removeContent(contentType, contentId, reportId, adminId): Promise<ModerationResult>
```

Rimuove il contenuto segnalato in base al suo tipo. Per i commenti, esegue un'eliminazione temporanea (imposta `deletedAt`). Per gli elementi, elimina l'elemento dal repository di contenuti basato su Git.

**Parametri:**

| Parametro | Tipo | Descrizione |
|---|---|---|
| `contentType` | `"item"` o `"comment"` | Tipo di contenuto da rimuovere |
| `contentId` | string | ID o slug del contenuto |
| `reportId` | string | ID della segnalazione associata |
| `adminId` | string | Utente amministratore che esegue l'azione |

**Fasi di Elaborazione:**

1. Cerca il proprietario del contenuto tramite `getContentOwner()`
2. Se commento: eliminazione temporanea tramite `deleteComment()`
3. Se elemento: eliminazione dal repository Git tramite `itemRepository.delete()`
4. Registra la cronologia di moderazione con azione `CONTENT_REMOVED`
5. Invia email di notifica di rimozione contenuto al proprietario del contenuto

**Sorgente:** `template/lib/services/moderation.service.ts`

### Avverti Utente

```typescript
warnUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Emette un avvertimento a un utente incrementando il campo `warningCount`. Gli utenti già bannati non possono ricevere avvertimenti.

**Parametri:**

| Parametro | Tipo | Descrizione |
|---|---|---|
| `userId` | string | ID del profilo client dell'utente |
| `reason` | string | Motivo dell'avvertimento |
| `reportId` | string | ID della segnalazione associata |
| `adminId` | string | Utente amministratore che esegue l'azione |

**Fasi di Elaborazione:**

1. Verifica che l'utente esista e non sia già bannato
2. Incrementa il contatore degli avvertimenti tramite `incrementWarningCount()`
3. Registra la cronologia di moderazione con azione `WARN`
4. Invia notifica email di avvertimento con il contatore attuale degli avvertimenti

**Risultato di Successo:**

```json
{
  "success": true,
  "message": "User warned successfully. Total warnings: 3"
}
```

**Sorgente:** `template/lib/services/moderation.service.ts`

### Sospendi Utente

```typescript
suspendUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Sospende un account utente impostando il suo stato su `"suspended"` e registrando un timestamp `suspendedAt`. Gli utenti sospesi non possono creare commenti, inviare voti o presentare segnalazioni.

**Controlli:**

- Restituisce errore se l'utente è già sospeso
- Restituisce errore se l'utente è già bannato

**Fasi di Elaborazione:**

1. Verifica che l'utente esista e non sia già sospeso o bannato
2. Imposta lo stato su `"suspended"` con il timestamp `suspendedAt`
3. Registra la cronologia di moderazione con azione `SUSPEND`
4. Invia notifica email di sospensione

**Sorgente:** `template/lib/services/moderation.service.ts`

### Banna Utente

```typescript
banUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Banna permanentemente un account utente impostando il suo stato su `"banned"` e registrando un timestamp `bannedAt`. Gli utenti bannati sono bloccati da tutte le azioni autenticate.

**Controlli:**

- Restituisce errore se l'utente è già bannato

**Fasi di Elaborazione:**

1. Verifica che l'utente esista e non sia già bannato
2. Imposta lo stato su `"banned"` con il timestamp `bannedAt`
3. Registra la cronologia di moderazione con azione `BAN`
4. Invia notifica email di ban

**Sorgente:** `template/lib/services/moderation.service.ts`

## Risoluzione del Proprietario del Contenuto

La funzione `getContentOwner()` determina chi possiede il contenuto segnalato:

| Tipo di Contenuto | Sorgente del Proprietario |
|---|---|
| `comment` | Campo `comment.userId` dalla tabella dei commenti |
| `item` | Campo `item.submitted_by` dal repository degli elementi |

Viene utilizzata da tutte le azioni di moderazione a livello utente (`user_warned`, `user_suspended`, `user_banned`) per identificare l'utente target dell'azione.

**Sorgente:** `template/lib/services/moderation.service.ts`

## Cronologia di Moderazione

Tutte le azioni di moderazione creano una traccia di audit nella tabella del database `moderationHistory`.

### Campi del Record della Cronologia

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | string | ID univoco del record |
| `userId` | string | ID del profilo client dell'utente interessato |
| `action` | string | `"CONTENT_REMOVED"`, `"WARN"`, `"SUSPEND"` o `"BAN"` |
| `reason` | string o null | Motivo dell'azione di moderazione |
| `reportId` | string o null | ID della segnalazione associata |
| `performedBy` | string o null | ID dell'utente amministratore che ha eseguito l'azione |
| `contentType` | string o null | `"item"` o `"comment"` (per la rimozione del contenuto) |
| `contentId` | string o null | ID del contenuto rimosso |
| `details` | object o null | Contesto aggiuntivo (es. contatore avvertimenti, nome elemento) |
| `createdAt` | timestamp | Quando è stata eseguita l'azione |

### Query sulla Cronologia

| Funzione | Descrizione |
|---|---|
| `getModerationHistoryByUser(userId, limit)` | Ottieni tutte le azioni di moderazione per un utente (limite predefinito: 50) |
| `getModerationHistoryByReport(reportId)` | Ottieni le azioni di moderazione collegate a una segnalazione specifica |

Entrambe le funzioni di query arricchiscono i risultati con le informazioni del profilo utente e i dettagli dell'amministratore che ha eseguito l'azione.

**Sorgente:** `template/lib/db/queries/moderation.queries.ts`

## Gestione dello Stato Utente

### Valori di Stato

| Stato | Descrizione |
|---|---|
| `active` | Account normale, tutte le funzionalità disponibili |
| `suspended` | Temporaneamente limitato, non può creare contenuti |
| `banned` | Permanentemente limitato, bloccato da tutte le azioni |

### Operazioni sul Database

| Funzione | Descrizione |
|---|---|
| `suspendUser(userId)` | Imposta lo stato su `"suspended"`, registra `suspendedAt` |
| `unsuspendUser(userId)` | Ripristina lo stato su `"active"`, cancella `suspendedAt` |
| `banUser(userId)` | Imposta lo stato su `"banned"`, registra `bannedAt` |
| `unbanUser(userId)` | Ripristina lo stato su `"active"`, cancella `bannedAt` |
| `incrementWarningCount(userId)` | Incrementa `warningCount` usando SQL `COALESCE` |

### Controlli Utente Bloccato

Due funzioni di supporto verificano lo stato dell'utente in tutta l'applicazione:

- **`isUserBlocked(status)`** -- Restituisce `true` se lo stato è `"suspended"` o `"banned"`
- **`getBlockReasonMessage(status)`** -- Restituisce un messaggio comprensibile all'utente che spiega perché l'azione è limitata

Questi controlli vengono utilizzati dagli endpoint di commenti, voti e segnalazioni per impedire agli utenti bloccati di creare contenuti.

**Sorgente:** `template/lib/db/queries/moderation.queries.ts`

## Notifiche Email

Il servizio `EmailNotificationService` invia notifiche non bloccanti per le azioni di moderazione:

| Metodo | Trigger |
|---|---|
| `sendContentRemovedEmail(email, type, reason)` | Contenuto rimosso dall'amministratore |
| `sendUserWarningEmail(email, reason, count)` | Avvertimento emesso |
| `sendUserSuspensionEmail(email, reason)` | Account sospeso |
| `sendUserBanEmail(email, reason)` | Account bannato |

Tutti gli invii di email usano `.catch()` per impedire che i fallimenti interrompano il flusso di lavoro di moderazione. Un'email fallita non causa il fallimento dell'azione di moderazione stessa.

## Dettagli Chiave di Implementazione

- **Pattern del Livello di Servizio:** La logica di moderazione risiede in `lib/services/moderation.service.ts`, non negli handler delle route API. Questo consente il riutilizzo su diversi punti di ingresso.
- **Traccia di Audit:** Ogni azione di moderazione crea un record `moderationHistory`, fornendo un log di audit completo per la conformità e la revisione.
- **Email Non Bloccanti:** Le notifiche email vengono inviate in modo asincrono con handler `.catch()`. Se il servizio email non è disponibile, l'azione di moderazione ha comunque successo.
- **Controlli di Idempotenza:** Ogni azione verifica lo stato attuale dell'utente prima di procedere. Bannare un utente già bannato restituisce un errore anziché creare un'azione duplicata.
- **Eliminazione Temporanea vs Definitiva:** I commenti vengono eliminati temporaneamente (impostando `deletedAt`), mentre gli elementi vengono completamente rimossi dal repository Git. Questa differenza riflette il modello di archiviazione (database vs contenuto basato su file).
