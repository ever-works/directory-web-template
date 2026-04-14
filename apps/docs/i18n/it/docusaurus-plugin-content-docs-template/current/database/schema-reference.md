---
id: schema-reference
title: Riferimento allo schema
sidebar_label: Riferimento allo schema
sidebar_position: 1
---

# Riferimento allo schema

Tutte le tabelle del database sono definite in `lib/db/schema.ts`. Questo documento cataloga ogni tabella, le sue colonne chiave, le relazioni e lo scopo.

## Utenti e autenticazione

### utenti

Tabella utente principale, utilizzata da NextAuth.js per l'autenticazione.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID, generato automaticamente|
|`email`|testo|Unico|
|`image`|testo|URL dell'immagine del profilo|
|`emailVerified`|timestamp|Data di verifica dell'e-mail|
|`passwordHash`|testo|Hash Bcrypt per l'autenticazione delle credenziali|
|`createdAt`|timestamp|Impostazione automatica|
|`updatedAt`|timestamp|Impostazione automatica|
|`deletedAt`|timestamp|Eliminazione temporanea|

**Indici**: `users_created_at_idx`

### conti

Collegamenti agli account OAuth e credenziali, seguendo lo schema dell'adattatore NextAuth.js.

|Colonna|Digitare|Note|
|--------|------|-------|
|`userId`|testo (FK)|Riferimenti `users.id` (cancellazione a cascata)|
|`type`|testo|Tipo di account (OAuth, credenziali, ecc.)|
|`provider`|testo|Nome del provider (google, github, credenziali)|
|`providerAccountId`|testo|ID account specifico del fornitore|
|`email`|testo|E-mail dell'account|
|`passwordHash`|testo|Per l'autenticazione delle credenziali del client|
|`refresh_token`|testo|Token di aggiornamento OAuth|
|`access_token`|testo|Token di accesso OAuth|
|`expires_at`|intero|Scadenza del token|

**Chiave primaria**: Composito attivo (`provider`, `providerAccountId`)
**Indici**: `accounts_email_idx`, `accounts_provider_idx`

### sessioni

Sessioni utente attive.

|Colonna|Digitare|Note|
|--------|------|-------|
|`sessionToken`|testo (PC)|Identificatore di sessione|
|`userId`|testo (FK)|Riferimenti `users.id`|
|`expires`|timestamp|Scadenza della sessione|

### verificaToken

Token di verifica e-mail.

|Colonna|Digitare|Note|
|--------|------|-------|
|`identifier`|testo|Identificatore dell'utente|
|`email`|testo|Indirizzo e-mail|
|`token`|testo|Token di verifica|
|`expires`|timestamp|Scadenza del token|

**Chiave primaria**: Composito attivo (`identifier`, `token`)

### autenticatori

Archiviazione credenziali WebAuthn/FIDO2.

|Colonna|Digitare|Note|
|--------|------|-------|
|`credentialID`|testo|Identificatore credenziale univoco|
|`userId`|testo (FK)|Riferimenti `users.id`|
|`providerAccountId`|testo|Riferimento all'account del fornitore|
|`credentialPublicKey`|testo|Chiave pubblica per la verifica|
|`counter`|intero|Contatore di autenticazione|

### passwordResetTokens

Token di reimpostazione della password per il flusso di password dimenticata.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`email`|testo|E-mail di destinazione|
|`token`|testo|Token di ripristino unico|
|`expires`|timestamp|Scadenza del token|

### registri di attività

Tiene traccia delle attività degli utenti e dei clienti a fini di controllo.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|seriale (PK)|Incremento automatico|
|`userId`|testo (FK)|Riferimenti `users.id` (nullable)|
|`clientId`|testo (FK)|Riferimenti `clientProfiles.id` (nullable)|
|`action`|testo|Tipo di attività (SIGN_UP, SIGN_IN, ecc.)|
|`timestamp`|timestamp|Quando si è verificata l'attività|
|`ipAddress`|varchar(45)|Indirizzo IP del cliente|

**Indici**: `activity_logs_user_idx`, `activity_logs_timestamp_idx`, `activity_logs_action_idx`

## Ruoli e autorizzazioni

### ruoli

Definizioni dei ruoli per RBAC.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|Identificatore del ruolo (ad esempio "amministratore", "cliente")|
|`name`|testo|Nome del ruolo univoco|
|`description`|testo|Descrizione leggibile dall'uomo|
|`isAdmin`|booleano|Se si tratta di un ruolo di amministratore|
|`status`|testo|"attivo" o "inattivo"|
|`created_by`|testo|Chi ha creato il ruolo|

### autorizzazioni

Definizioni di autorizzazioni granulari.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`key`|testo|Chiave di autorizzazione univoca (ad esempio "items:create")|
|`description`|testo|Descrizione leggibile dall'uomo|

### ruoloPermessi

Tabella di join molti-a-molti che collega i ruoli alle autorizzazioni.

|Colonna|Digitare|Note|
|--------|------|-------|
|`roleId`|testo (FK)|Riferimenti `roles.id` (cascata)|
|`permissionId`|testo (FK)|Riferimenti `permissions.id` (cascata)|

**Chiave primaria**: Composito attivo (`roleId`, `permissionId`)

### userRoles

Tabella di join molti-a-molti che collega gli utenti ai ruoli.

|Colonna|Digitare|Note|
|--------|------|-------|
|`userId`|testo (FK)|Riferimenti `users.id` (cascata)|
|`roleId`|testo (FK)|Riferimenti `roles.id` (cascata)|

**Chiave primaria**: Composito attivo (`userId`, `roleId`)

## Profili dei clienti

### clientProfiles

Informazioni sul profilo estese per gli utenti clienti registrati.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`userId`|testo (FK)|Riferimenti `users.id` (unico, a cascata)|
|`email`|testo|E-mail del cliente|
|`name`|testo|Nome completo|
|`displayName`|testo|Nome visualizzato|
|`username`|testo|Nome utente univoco|
|`bio`|testo|Biografia dell'utente|
|`jobTitle`|testo|Titolo professionale|
|`company`|testo|Nome dell'azienda|
|`industry`|testo|Settore industriale|
|`phone`|testo|Numero di telefono|
|`website`|testo|Sito personale|
|`location`|testo|Stringa di posizione|
|`avatar`|testo|URL dell'avatar|
|`accountType`|testo|"individuo", "azienda" o "impresa"|
|`status`|testo|"attivo", "inattivo", "sospeso", "vietato", "prova"|
|`plan`|testo|"gratuito", "standard" o "premium"|
|`timezone`|testo|Fuso orario (predefinito "UTC")|
|`language`|testo|Lingua preferita (predefinita "en")|
|`country`|testo|Codice paese|
|`currency`|testo|Valuta preferita (predefinita "USD")|
|`defaultLatitude`|doppio|Latitudine della posizione predefinita|
|`defaultLongitude`|doppio|Longitudine della posizione predefinita|
|`twoFactorEnabled`|booleano|Stato 2FA|
|`totalSubmissions`|intero|Conteggio degli invii|
|`warningCount`|intero|Conteggio avvisi di moderazione|
|`suspendedAt`|timestamp|Quando sospeso|
|`bannedAt`|timestamp|Quando vietato|

**Indici**: Indici multipli su `userId`, `email`, `status`, `plan`, `accountType`, `username`, `createdAt`

## Contenuto e coinvolgimento

### commenti

Commenti degli utenti sugli articoli.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`content`|testo|Testo del commento|
|`userId`|testo (FK)|Riferimenti `clientProfiles.id`|
|`itemId`|testo|Lumaca dell'oggetto|
|`rating`|intero|Voto (0-5)|
|`editedAt`|timestamp|Ora dell'ultima modifica|
|`deletedAt`|timestamp|Eliminazione temporanea|

### voti

Voto positivo/negativo sugli articoli.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`userId`|testo (FK)|Riferimenti `clientProfiles.id`|
|`itemId`|testo|Lumaca dell'oggetto|
|`voteType`|testo|"voto positivo" o "voto negativo"|

**Indice univoco**: (`userId`, `itemId`) -- un voto per utente per elemento

### preferiti

Preferiti dell'utente (segnalibri).

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`userId`|testo (FK)|Riferimenti `users.id`|
|`itemSlug`|testo|Lumaca dell'oggetto|
|`itemName`|testo|Nome dell'articolo denormalizzato|
|`itemIconUrl`|testo|Icona dell'oggetto denormalizzato|
|`itemCategory`|testo|Categoria denormalizzata|

**Indice univoco**: (`userId`, `itemSlug`)

### itemViews

Tiene traccia delle visualizzazioni giornaliere uniche degli articoli per l'analisi.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`itemId`|testo|Lumaca dell'oggetto|
|`viewerId`|testo|ID visualizzatore anonimo basato su cookie|
|`viewedDateUtc`|testo|Data nel formato AAAA-MM-GG|
|`viewedAt`|timestamp|Ora esatta di visualizzazione|

**Indice univoco**: (`itemId`, `viewerId`, `viewedDateUtc`) -- una visualizzazione per spettatore al giorno

## Abbonamenti e pagamenti

### abbonamenti

Record di abbonamento utente che supportano più fornitori di servizi di pagamento.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`userId`|testo (FK)|Riferimenti `users.id`|
|`planId`|testo|Identificatore del piano (gratuito, standard, premium)|
|`status`|testo|attivo, annullato, scaduto, in sospeso, in pausa|
|`paymentProvider`|testo|striscia, lemonsqueezy, polare, solidgate|
|`subscriptionId`|testo|ID di abbonamento del fornitore|
|`customerId`|testo|ID cliente fornitore|
|`autoRenewal`|booleano|Rinnovo automatico abilitato|
|`cancelAtPeriodEnd`|booleano|Annulla a fine periodo|
|`amount`|intero|Importo abbonamento (centesimi)|
|`currency`|testo|Codice valuta|
|`interval`|testo|Intervallo di fatturazione (mese, anno)|

**Indici**: `user_subscription_idx`, `subscription_status_idx`, `provider_subscription_idx` (unico)

### abbonamentoStoria

Traccia di controllo per le modifiche all'abbonamento.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`subscriptionId`|testo (FK)|Riferimenti `subscriptions.id`|
|`action`|testo|Cambia azione|
|`previousStatus`|testo|Stato prima della modifica|
|`newStatus`|testo|Stato dopo la modifica|

### pagamentoProvider

Registro dei fornitori di pagamento disponibili.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`name`|testo|Nome del fornitore (univoco)|
|`isActive`|booleano|Se il provider è abilitato|

### account di pagamento

Collega gli utenti ai rispettivi account dei fornitori di servizi di pagamento.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`userId`|testo (FK)|Riferimenti `users.id`|
|`providerId`|testo (FK)|Riferimenti `paymentProviders.id`|
|`customerId`|testo|ID cliente fornitore|

**Indici univoci**: (`userId`, `providerId`), (`customerId`, `providerId`)

## Amministrazione e moderazione

### notifiche

Notifiche di amministrazione in-app.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`userId`|testo (FK)|Riferimenti `users.id`|
|`type`|testo|item_submission, comment_reported, ecc.|
|`title`|testo|Titolo della notifica|
|`message`|testo|Organismo di notifica|
|`isRead`|booleano|Leggi lo stato|

### rapporti

Sistema di report sui contenuti per elementi e commenti.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`contentType`|testo|"elemento" o "commento"|
|`contentId`|testo|ID contenuto segnalato|
|`reason`|testo|spam, molestie, inappropriato, altro|
|`status`|testo|in sospeso, rivisto, risolto, respinto|
|`resolution`|testo|content_removed, user_warned, ecc.|
|`reportedBy`|testo (FK)|Riferimenti `clientProfiles.id`|
|`reviewedBy`|testo (FK)|Riferimenti `users.id`|

### moderazioneStoria

Cronologia completa delle azioni di moderazione.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`userId`|testo (FK)|Riferimenti `clientProfiles.id`|
|`action`|testo|avvisare, sospendere, vietare, annullare la sospensione, sbloccare, contenuto_rimosso|
|`reportId`|testo (FK)|Riferimenti `reports.id`|
|`performedBy`|testo (FK)|Riferimenti `users.id`|
|`details`|jsonb|Contesto aggiuntivo|

### itemAuditLogs

Tiene traccia delle modifiche agli elementi nel pannello di amministrazione.

|Colonna|Digitare|Note|
|--------|------|-------|
|`id`|testo (PC)|UUID|
|`itemId`|testo|Slug dell'elemento (non FK; gli elementi sono in Git)|
|`itemName`|testo|Nome dell'articolo denormalizzato|
|`action`|testo|creato, aggiornato, stato_modificato, rivisto, eliminato, ripristinato|
|`changes`|jsonb|Dettagli della modifica a livello di campo|
|`performedBy`|testo (FK)|Riferimenti `users.id`|

## Altre tabelle

### sponsorAds

Annunci di articoli sponsorizzati con ciclo di vita completo del pagamento.

Colonne chiave: `userId`, `itemSlug`, `status` (pagamento_in sospeso, in sospeso, rifiutato, attivo, scaduto, annullato), `interval` (settimanale, mensile), `amount`, `paymentProvider`, `subscriptionId`.

### aziende / articoliAziende

Record aziendali e associazioni articolo-azienda per gli elenchi di directory.

### sondaggi / risposte ai sondaggi

Generatore di sondaggi con definizioni di domande basate su JSON e archiviazione delle risposte.

### ventiCrmConfig/integrationMappings

Tabelle di integrazione CRM per la funzionalità di sincronizzazione di Twenty CRM. La tabella di configurazione impone un modello singleton (è consentita solo una riga).

### newsletterIscrizioni

Monitoraggio dell'iscrizione alla newsletter via e-mail con timestamp di iscrizione/annullamento dell'iscrizione.

### seedStatus

La tabella singleton tiene traccia dello stato del seeding del database (seeding, completato, non riuscito) per impedire operazioni di seeding simultanee.

## Digitare Esportazioni

Il file di schema esporta i tipi TypeScript per ogni tabella utilizzando l'inferenza di Drizzle:

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
// ... and so on for all tables
```

Questi tipi vengono usati in tutta l'applicazione per operazioni di database indipendenti dai tipi.
