---
id: schema-relationships
title: Relazioni tra schemi
sidebar_label: Relazioni tra schemi
sidebar_position: 15
---

# Relazioni tra schemi

Questa pagina documenta tutte le relazioni tra tabelle, chiavi esterne e tabelle di giunzione nello schema del database modello. Lo schema è definito in `lib/db/schema.ts` utilizzando Drizzle ORM con PostgreSQL.

## Panoramica delle relazioni tra entità

Il database è incentrato su tre entità primarie: **utenti** (amministratore), **client_profiles** (utenti finali) e **elementi** (archiviati in Git, a cui fa riferimento lo slug). La maggior parte delle tabelle di coinvolgimento e commercio si riferiscono a questi tre.

## Tabelle di autenticazione principali

### utenti

La tabella delle identità di primo livello per tutti gli account autenticati.

**Fa riferimento a:**
- `accounts.userId` (eliminazione a cascata)
- `sessions.userId` (eliminazione a cascata)
- `authenticators.userId` (eliminazione a cascata)
- `activityLogs.userId` (eliminazione a cascata)
- `client_profiles.userId` (eliminazione a cascata)
- `subscriptions.userId` (eliminazione a cascata)
- `payment_accounts.userId` (eliminazione a cascata)
- `notifications.user_id` (eliminazione a cascata)
- `favorites.userId` (eliminazione a cascata)
- `user_roles.user_id` (eliminazione a cascata)
- `reports.reviewed_by` (imposta null)
- `sponsor_ads.user_id` (eliminazione a cascata)
- `moderation_history.performed_by` (imposta null)

### conti

Account OAuth e credenziali collegati agli utenti.

|Relazione|Obiettivo|All'eliminazione|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCATA|

Chiave primaria composita su `(provider, providerAccountId)`.

### sessioni

Sessioni di accesso attive.

|Relazione|Obiettivo|All'eliminazione|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCATA|

### autenticatori

Credenziali WebAuthn/passkey.

|Relazione|Obiettivo|All'eliminazione|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCATA|

Chiave primaria composita su `(userId, credentialID)`.

## Sistema di profilo cliente

### profili_cliente

Profili degli utenti finali con dati su piano, stato e posizione.

|Relazione|Obiettivo|All'eliminazione|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCATA|

L'indice univoco su `userId` garantisce un profilo per utente.

**Fa riferimento a:**
- `comments.userId` (eliminazione a cascata)
- `votes.userid` (eliminazione a cascata)
- `reports.reported_by` (eliminazione a cascata)
- `moderation_history.user_id` (eliminazione a cascata)
- `activityLogs.clientId` (eliminazione a cascata)

## Controllo degli accessi basato sui ruoli

Il sistema RBAC utilizza tre tabelle in uno schema molti-a-molti.

### ruoli

Ruoli denominati con flag di amministratore.

### autorizzazioni

Chiavi di autorizzazione individuali (ad esempio, `items:create`).

### role_permissions (tabella di giunzione)

Collega i ruoli alle autorizzazioni.

|Colonna|Obiettivo|All'eliminazione|
|--------|--------|-----------|
|`role_id`|`roles.id`|CASCATA|
|`permission_id`|`permissions.id`|CASCATA|

Chiave primaria composita su `(role_id, permission_id)`.

### user_roles (tabella di giunzione)

Assegna ruoli agli utenti.

|Colonna|Obiettivo|All'eliminazione|
|--------|--------|-----------|
|`user_id`|`users.id`|CASCATA|
|`role_id`|`roles.id`|CASCATA|

Chiave primaria composita su `(user_id, role_id)`.

### Diagramma delle entità RBAC

```
users ---< user_roles >--- roles ---< role_permissions >--- permissions
```

Un utente può avere molti ruoli, ogni ruolo può avere molte autorizzazioni e più utenti possono condividere lo stesso ruolo.

## Tabelle di coinvolgimento

### commenti

|Relazione|Obiettivo|All'eliminazione|
|-------------|--------|-----------|
|`userId`|`client_profiles.id`|CASCATA|

La colonna `itemId` memorizza lo slug dell'elemento (non una chiave esterna, poiché gli elementi risiedono in Git).

### voti

|Relazione|Obiettivo|All'eliminazione|
|-------------|--------|-----------|
|`userid`|`client_profiles.id`|CASCATA|

L'indice univoco su `(userid, item_id)` garantisce un voto per utente per articolo. La colonna `item_id` memorizza lo slug dell'elemento.

### preferiti

|Relazione|Obiettivo|All'eliminazione|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCATA|

L'indice univoco su `(userId, item_slug)` garantisce un preferito per utente per articolo. La colonna `item_slug` memorizza lo slug dell'elemento.

### item_views

Nessuna chiave esterna. Utilizza un indice univoco su `(item_id, viewer_id, viewed_date_utc)` per la deduplicazione giornaliera.

## Tabelle di moderazione dei contenuti

### rapporti

|Colonna|Obiettivo|All'eliminazione|
|--------|--------|-----------|
|`reported_by`|`client_profiles.id`|CASCATA|
|`reviewed_by`|`users.id`|IMPOSTA NULL|

Indici su `content_type`, `content_id`, `status`, `reported_by` e un composito `(content_type, content_id)`.

### moderazione_storia

|Colonna|Obiettivo|All'eliminazione|
|--------|--------|-----------|
|`user_id`|`client_profiles.id`|CASCATA|
|`performed_by`|`users.id`|IMPOSTA NULL|
|`report_id`|`reports.id`|IMPOSTA NULL|

## Tabelle di pagamento e abbonamento

### abbonamenti

|Relazione|Obiettivo|All'eliminazione|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCATA|

Indice univoco su `(payment_provider, subscription_id)`.

### abbonamentoStoria

|Relazione|Obiettivo|All'eliminazione|
|-------------|--------|-----------|
|`subscription_id`|`subscriptions.id`|CASCATA|

### pagamentoProvider

Nessuna chiave esterna. Memorizza i fornitori di pagamento disponibili.

### account di pagamento

|Colonna|Obiettivo|All'eliminazione|
|--------|--------|-----------|
|`userId`|`users.id`|CASCATA|
|`providerId`|`paymentProviders.id`|CASCATA|

Indici univoci su `(userId, providerId)` e `(customerId, providerId)`.

## Annunci sponsor

### sponsor_ads

|Colonna|Obiettivo|All'eliminazione|
|--------|--------|-----------|
|`user_id`|`users.id`|CASCATA|
|`reviewed_by`|`users.id`|IMPOSTA NULL|

## Sistema di notifica

### notifiche

|Relazione|Obiettivo|All'eliminazione|
|-------------|--------|-----------|
|`user_id`|`users.id`|CASCATA|

Indici su `user_id`, `type`, `is_read` e `created_at`.

## Registrazione delle attività

### registri di attività

|Colonna|Obiettivo|All'eliminazione|
|--------|--------|-----------|
|`userId`|`users.id`|CASCATA|
|`clientId`|`client_profiles.id`|CASCATA|

Entrambe le colonne sono annullabili; ogni voce di registro si riferisce a un utente amministratore o a un utente client.

## Altre tabelle

### newsletterIscrizioni

Nessuna chiave esterna. La colonna `email` ha un indice univoco.

### passwordResetTokens

Nessuna chiave esterna. Chiave primaria composita su `(identifier, token)`.

### verificaToken

Nessuna chiave esterna. Chiave primaria composita su `(identifier, token)`.

### articoli_in evidenza

Nessuna chiave esterna. Utilizza `item_slug` per fare riferimento a elementi basati su Git e `featured_by` come campo di testo normale (non una chiave esterna).

### sondaggi

Nessuna chiave esterna. La colonna `slug` ha un indice univoco.

### venti_crm_config

Nessuna chiave esterna. Modello singleton applicato da un indice di espressione univoco.

### integrazione_mapping

Nessuna chiave esterna. Indice univoco su `(ever_id, object_type)`.

### aziende

Nessuna chiave esterna.

### seed_status

Tabella singleton con un indice univoco su `id`.

## Riepilogo eliminazione a cascata

Quando un **utente** viene eliminato, i seguenti vengono eliminati a catena:

- Account, sessioni, autenticatori
- Profili dei clienti (e transitivamente: commenti, voti, segnalazioni di quel cliente, cronologia della moderazione)
- Abbonamenti
- Conti di pagamento
- Notifiche
- Preferiti
- Assegnazioni dei ruoli utente
- Registri delle attività
- Annunci sponsorizzati

Quando un **profilo cliente** viene eliminato:

- Commenti di quell'utente
- Voti di quell'utente
- Rapporti archiviati da quell'utente
- Cronologia della moderazione per quell'utente
- Registri delle attività per quel client

Quando un **ruolo** viene eliminato:

- Tutte le assegnazioni di autorizzazioni per quel ruolo
- Tutte le assegnazioni di ruolo utente per quel ruolo

## Riferimenti agli articoli

Gli elementi vengono archiviati nel CMS basato su Git, non nel database. Diverse tabelle fanno riferimento agli elementi in base allo slug:

- `comments.itemId` -- lumaca oggetto
- `votes.item_id` -- lumaca oggetto
- `favorites.item_slug` -- lumaca oggetto
- `item_views.item_id` -- lumaca oggetto
- `featured_items.item_slug` -- lumaca oggetto
- `sponsor_ads.item_slug` -- lumaca oggetto

Si tratta di colonne di testo semplice senza vincoli di chiave esterna.

## Documentazione correlata

- [Riferimento allo schema](/template/database/schema-reference) -- Documenti sullo schema a livello di colonna
- [Modelli Drizzle](/template/database/drizzle-patterns) -- Modelli di utilizzo ORM
- [Guida alle migrazioni](/template/database/migrations-guide) -- Migrazioni di database
