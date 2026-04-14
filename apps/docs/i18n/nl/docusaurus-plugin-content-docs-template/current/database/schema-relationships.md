---
id: schema-relationships
title: Schema-relaties
sidebar_label: Schema-relaties
sidebar_position: 15
---

# Schema-relaties

Op deze pagina worden alle tabelrelaties, externe sleutels en knooppunttabellen in het sjabloondatabaseschema gedocumenteerd. Het schema is gedefinieerd in `lib/db/schema.ts` met behulp van Drizzle ORM met PostgreSQL.

## Overzicht entiteitsrelaties

De database is gecentreerd rond drie primaire entiteiten: **users** (admin), **client_profiles** (eindgebruikers) en **items** (opgeslagen in Git, waarnaar wordt verwezen door slug). De meeste engagement- en commercietabellen hebben betrekking op deze drie.

## Kernverificatietabellen

### gebruikers

De identiteitstabel op het hoogste niveau voor alle geverifieerde accounts.

**Verwezen door:**
- `accounts.userId` (cascade verwijderen)
- `sessions.userId` (cascade verwijderen)
- `authenticators.userId` (cascade verwijderen)
- `activityLogs.userId` (cascade verwijderen)
- `client_profiles.userId` (cascade verwijderen)
- `subscriptions.userId` (cascade verwijderen)
- `payment_accounts.userId` (cascade verwijderen)
- `notifications.user_id` (cascade verwijderen)
- `favorites.userId` (cascade verwijderen)
- `user_roles.user_id` (cascade verwijderen)
- `reports.reviewed_by` (nul instellen)
- `sponsor_ads.user_id` (cascade verwijderen)
- `moderation_history.performed_by` (nul instellen)

### rekeningen

OAuth- en inloggegevensaccounts gekoppeld aan gebruikers.

|Relatie|Doel|Bij Verwijderen|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADE|

Samengestelde primaire sleutel op `(provider, providerAccountId)`.

### sessies

Actieve inlogsessies.

|Relatie|Doel|Bij Verwijderen|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADE|

### authenticatoren

WebAuthn/wachtwoordreferenties.

|Relatie|Doel|Bij Verwijderen|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADE|

Samengestelde primaire sleutel op `(userId, credentialID)`.

## Klantprofielsysteem

### klantprofielen

Eindgebruikersprofielen met abonnements-, status- en locatiegegevens.

|Relatie|Doel|Bij Verwijderen|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADE|

Unieke index op `userId` zorgt voor één profiel per gebruiker.

**Verwezen door:**
- `comments.userId` (cascade verwijderen)
- `votes.userid` (cascade verwijderen)
- `reports.reported_by` (cascade verwijderen)
- `moderation_history.user_id` (cascade verwijderen)
- `activityLogs.clientId` (cascade verwijderen)

## Op rollen gebaseerde toegangscontrole

Het RBAC-systeem gebruikt drie tabellen in een veel-op-veel-patroon.

### rollen

Benoemde rollen met beheerdersvlag.

### machtigingen

Individuele toestemmingssleutels (bijvoorbeeld `items:create`).

### rol_permissies (knooppunttabel)

Koppelt rollen aan machtigingen.

|Kolom|Doel|Bij Verwijderen|
|--------|--------|-----------|
|`role_id`|`roles.id`|CASCADE|
|`permission_id`|`permissions.id`|CASCADE|

Samengestelde primaire sleutel op `(role_id, permission_id)`.

### user_roles (knooppunttabel)

Wijst rollen toe aan gebruikers.

|Kolom|Doel|Bij Verwijderen|
|--------|--------|-----------|
|`user_id`|`users.id`|CASCADE|
|`role_id`|`roles.id`|CASCADE|

Samengestelde primaire sleutel op `(user_id, role_id)`.

### RBAC-entiteitsdiagram

```
users ---< user_roles >--- roles ---< role_permissions >--- permissions
```

Een gebruiker kan veel rollen hebben, elke rol kan veel machtigingen hebben en meerdere gebruikers kunnen dezelfde rol delen.

## Betrokkenheidstabellen

### opmerkingen

|Relatie|Doel|Bij Verwijderen|
|-------------|--------|-----------|
|`userId`|`client_profiles.id`|CASCADE|

In de kolom `itemId` wordt de item-slug opgeslagen (geen externe sleutel, aangezien items in Git aanwezig zijn).

### stemmen

|Relatie|Doel|Bij Verwijderen|
|-------------|--------|-----------|
|`userid`|`client_profiles.id`|CASCADE|

Unieke index op `(userid, item_id)` zorgt voor één stem per gebruiker per item. In de kolom `item_id` wordt de item-slug opgeslagen.

### favorieten

|Relatie|Doel|Bij Verwijderen|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADE|

Unieke index op `(userId, item_slug)` zorgt voor één favoriet per gebruiker per item. In de kolom `item_slug` wordt de item-slug opgeslagen.

### item_views

Geen vreemde sleutels. Gebruikt een unieke index op `(item_id, viewer_id, viewed_date_utc)` voor dagelijkse ontdubbeling.

## Tabellen voor inhoudsmoderatie

### rapporten

|Kolom|Doel|Bij Verwijderen|
|--------|--------|-----------|
|`reported_by`|`client_profiles.id`|CASCADE|
|`reviewed_by`|`users.id`|SET NUL|

Indexen op `content_type`, `content_id`, `status`, `reported_by`, en een samengestelde `(content_type, content_id)`.

### moderatie_geschiedenis

|Kolom|Doel|Bij Verwijderen|
|--------|--------|-----------|
|`user_id`|`client_profiles.id`|CASCADE|
|`performed_by`|`users.id`|SET NUL|
|`report_id`|`reports.id`|SET NUL|

## Betalings- en abonnementstabellen

### abonnementen

|Relatie|Doel|Bij Verwijderen|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADE|

Unieke index op `(payment_provider, subscription_id)`.

### abonnementGeschiedenis

|Relatie|Doel|Bij Verwijderen|
|-------------|--------|-----------|
|`subscription_id`|`subscriptions.id`|CASCADE|

### betalingsaanbieders

Geen vreemde sleutels. Slaat beschikbare betalingsproviders op.

### betalingAccounts

|Kolom|Doel|Bij Verwijderen|
|--------|--------|-----------|
|`userId`|`users.id`|CASCADE|
|`providerId`|`paymentProviders.id`|CASCADE|

Unieke indexen op `(userId, providerId)` en `(customerId, providerId)`.

## Sponsoradvertenties

### sponsoradvertenties

|Kolom|Doel|Bij Verwijderen|
|--------|--------|-----------|
|`user_id`|`users.id`|CASCADE|
|`reviewed_by`|`users.id`|SET NUL|

## Meldingssysteem

### meldingen

|Relatie|Doel|Bij Verwijderen|
|-------------|--------|-----------|
|`user_id`|`users.id`|CASCADE|

Indexen op `user_id`, `type`, `is_read` en `created_at`.

## Activiteitenregistratie

### activiteitLogs

|Kolom|Doel|Bij Verwijderen|
|--------|--------|-----------|
|`userId`|`users.id`|CASCADE|
|`clientId`|`client_profiles.id`|CASCADE|

Beide kolommen kunnen nulwaarden bevatten; elke logvermelding heeft betrekking op een admin-gebruiker of een client-gebruiker.

## Andere tabellen

### nieuwsbriefAbonnementen

Geen vreemde sleutels. De kolom `email` heeft een unieke index.

### wachtwoordResetTokens

Geen vreemde sleutels. Samengestelde primaire sleutel op `(identifier, token)`.

### verificatieTokens

Geen vreemde sleutels. Samengestelde primaire sleutel op `(identifier, token)`.

### aanbevolen_items

Geen vreemde sleutels. Gebruikt `item_slug` om te verwijzen naar op Git gebaseerde items en `featured_by` als tekstveld zonder opmaak (geen externe sleutel).

### enquêtes

Geen vreemde sleutels. De kolom `slug` heeft een unieke index.

### twintig_crm_config

Geen vreemde sleutels. Singleton-patroon afgedwongen door een unieke expressie-index.

### integratie_toewijzingen

Geen vreemde sleutels. Unieke index op `(ever_id, object_type)`.

### bedrijven

Geen vreemde sleutels.

### zaad_status

Singleton tafel met een unieke index op `id`.

## Samenvatting trapsgewijs verwijderen

Wanneer een **gebruiker** wordt verwijderd, worden de volgende stappen trapsgewijs verwijderd:

- Accounts, sessies, authenticators
- Klantprofielen (en transitief: opmerkingen, stemmen, rapporten van die klant, moderatiegeschiedenis)
- Abonnementen
- Betaalrekeningen
- Meldingen
- Favorieten
- Toewijzingen van gebruikersrollen
- Activiteitenlogboeken
- Advertenties sponsoren

Wanneer een **klantprofiel** wordt verwijderd:

- Opmerkingen van die gebruiker
- Stemmen door die gebruiker
- Rapporten die door die gebruiker zijn ingediend
- Moderatiegeschiedenis voor die gebruiker
- Activiteitenlogboeken voor die client

Wanneer een **rol** wordt verwijderd:

- Alle rolmachtigingstoewijzingen voor die rol
- Alle gebruikersroltoewijzingen voor die rol

## Artikelreferenties

Items worden opgeslagen in het op Git gebaseerde CMS, niet in de database. Verschillende tabellen verwijzen naar items per naaktslak:

- `comments.itemId` -- artikelslak
- `votes.item_id` -- artikelslak
- `favorites.item_slug` -- artikelslak
- `item_views.item_id` -- artikelslak
- `featured_items.item_slug` -- artikelslak
- `sponsor_ads.item_slug` -- artikelslak

Dit zijn kolommen met platte tekst zonder beperkingen van externe sleutels.

## Gerelateerde documentatie

- [Schemareferentie](/template/database/schema-reference) -- Schemadocumentatie op kolomniveau
- [Motregenpatronen](/template/database/drizzle-patterns) -- ORM-gebruikspatronen
- [Migratiehandleiding](/template/database/migrations-guide) -- Databasemigraties
