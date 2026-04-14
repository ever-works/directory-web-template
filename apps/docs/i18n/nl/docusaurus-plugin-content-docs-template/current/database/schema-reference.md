---
id: schema-reference
title: Schemareferentie
sidebar_label: Schemareferentie
sidebar_position: 1
---

# Schemareferentie

Alle databasetabellen zijn gedefinieerd in `lib/db/schema.ts`. Dit document catalogiseert elke tabel, de belangrijkste kolommen, relaties en doel ervan.

## Gebruikers & Authenticatie

### gebruikers

Kerngebruikerstabel, gebruikt door NextAuth.js voor authenticatie.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID, automatisch gegenereerd|
|`email`|tekst|Uniek|
|`image`|tekst|URL van profielafbeelding|
|`emailVerified`|tijdstempel|Datum van e-mailverificatie|
|`passwordHash`|tekst|Bcrypt-hash voor verificatie van inloggegevens|
|`createdAt`|tijdstempel|Automatisch ingesteld|
|`updatedAt`|tijdstempel|Automatisch ingesteld|
|`deletedAt`|tijdstempel|Zacht verwijderen|

**Indexen**: `users_created_at_idx`

### rekeningen

OAuth- en inloggegevensaccountkoppelingen, volgens het NextAuth.js-adapterschema.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`userId`|tekst (FK)|Referenties `users.id` (cascade verwijderen)|
|`type`|tekst|Accounttype (eed, inloggegevens, etc.)|
|`provider`|tekst|Providernaam (google, github, inloggegevens)|
|`providerAccountId`|tekst|Providerspecifieke account-ID|
|`email`|tekst|Account-e-mailadres|
|`passwordHash`|tekst|Voor clientreferenties auth|
|`refresh_token`|tekst|OAuth-vernieuwingstoken|
|`access_token`|tekst|OAuth-toegangstoken|
|`expires_at`|geheel getal|Vervaldatum van tokens|

**Primaire sleutel**: Composiet aan (`provider`, `providerAccountId`)
**Indexen**: `accounts_email_idx`, `accounts_provider_idx`

### sessies

Actieve gebruikerssessies.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`sessionToken`|tekst (PK)|Sessie-ID|
|`userId`|tekst (FK)|Referenties `users.id`|
|`expires`|tijdstempel|Sessie verlopen|

### verificatieTokens

Tokens voor e-mailverificatie.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`identifier`|tekst|Gebruikers-ID|
|`email`|tekst|E-mailadres|
|`token`|tekst|Verificatietoken|
|`expires`|tijdstempel|Vervaldatum van tokens|

**Primaire sleutel**: Composiet aan (`identifier`, `token`)

### authenticatoren

WebAuthn/FIDO2-referentieopslag.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`credentialID`|tekst|Unieke identificatie-ID|
|`userId`|tekst (FK)|Referenties `users.id`|
|`providerAccountId`|tekst|Accountreferentie van de provider|
|`credentialPublicKey`|tekst|Openbare sleutel voor verificatie|
|`counter`|geheel getal|Authenticatie teller|

### wachtwoordResetTokens

Tokens voor het opnieuw instellen van wachtwoorden voor het vergeten van wachtwoorden.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`email`|tekst|Doel-e-mail|
|`token`|tekst|Uniek resettoken|
|`expires`|tijdstempel|Vervaldatum van tokens|

### activiteitLogs

Volgt gebruikers- en klantactiviteiten voor auditdoeleinden.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|serieel (PK)|Automatische verhoging|
|`userId`|tekst (FK)|Referenties `users.id` (nullbaar)|
|`clientId`|tekst (FK)|Referenties `clientProfiles.id` (nullbaar)|
|`action`|tekst|Activiteitstype (SIGN_UP, SIGN_IN, enz.)|
|`timestamp`|tijdstempel|Wanneer de activiteit plaatsvond|
|`ipAddress`|Varchar(45)|IP-adres van de klant|

**Indexen**: `activity_logs_user_idx`, `activity_logs_timestamp_idx`, `activity_logs_action_idx`

## Rollen en machtigingen

### rollen

Roldefinities voor RBAC.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|Rol-ID (bijvoorbeeld 'admin', 'klant')|
|`name`|tekst|Unieke rolnaam|
|`description`|tekst|Voor mensen leesbare beschrijving|
|`isAdmin`|Booleaans|Of dit een beheerdersrol is|
|`status`|tekst|"actief" of "inactief"|
|`created_by`|tekst|Wie heeft de rol gecreëerd|

### machtigingen

Gedetailleerde machtigingsdefinities.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`key`|tekst|Unieke toestemmingssleutel (bijvoorbeeld 'items:create')|
|`description`|tekst|Voor mensen leesbare beschrijving|

### rolPermissies

Veel-op-veel-jointabel die rollen aan machtigingen koppelt.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`roleId`|tekst (FK)|Referenties `roles.id` (cascade)|
|`permissionId`|tekst (FK)|Referenties `permissions.id` (cascade)|

**Primaire sleutel**: Composiet aan (`roleId`, `permissionId`)

### gebruikerRollen

Veel-op-veel join-tabel die gebruikers aan rollen koppelt.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`userId`|tekst (FK)|Referenties `users.id` (cascade)|
|`roleId`|tekst (FK)|Referenties `roles.id` (cascade)|

**Primaire sleutel**: Composiet aan (`userId`, `roleId`)

## Klantprofielen

### klantprofielen

Uitgebreide profielinformatie voor geregistreerde klantgebruikers.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`userId`|tekst (FK)|Referenties `users.id` (uniek, cascade)|
|`email`|tekst|E-mailadres van klant|
|`name`|tekst|Volledige naam|
|`displayName`|tekst|Weergavenaam|
|`username`|tekst|Unieke gebruikersnaam|
|`bio`|tekst|Gebruiker biografie|
|`jobTitle`|tekst|Professionele titel|
|`company`|tekst|Bedrijfsnaam|
|`industry`|tekst|Industriesector|
|`phone`|tekst|Telefoonnummer|
|`website`|tekst|Persoonlijke website|
|`location`|tekst|Locatiereeks|
|`avatar`|tekst|Avatar-URL|
|`accountType`|tekst|"individu", "bedrijf" of "onderneming"|
|`status`|tekst|"actief", "inactief", "opgeschort", "verboden", "proef"|
|`plan`|tekst|'gratis', 'standaard' of 'premium'|
|`timezone`|tekst|Tijdzone (standaard "UTC")|
|`language`|tekst|Voorkeurstaal (standaard "en")|
|`country`|tekst|Landcode|
|`currency`|tekst|Voorkeursvaluta (standaard 'USD')|
|`defaultLatitude`|dubbel|Standaardlocatiebreedte|
|`defaultLongitude`|dubbel|Standaardlocatielengte|
|`twoFactorEnabled`|Booleaans|2FA-status|
|`totalSubmissions`|geheel getal|Aantal inzendingen|
|`warningCount`|geheel getal|Aantal moderatiewaarschuwingen|
|`suspendedAt`|tijdstempel|Wanneer geschorst|
|`bannedAt`|tijdstempel|Wanneer verboden|

**Indexen**: Meerdere indexen op `userId`, `email`, `status`, `plan`, `accountType`, `username`, `createdAt`

## Inhoud en betrokkenheid

### opmerkingen

Gebruikerscommentaar op items.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`content`|tekst|Commentaartekst|
|`userId`|tekst (FK)|Referenties `clientProfiles.id`|
|`itemId`|tekst|Artikel slak|
|`rating`|geheel getal|Beoordeling (0-5)|
|`editedAt`|tijdstempel|Laatste bewerkingstijd|
|`deletedAt`|tijdstempel|Zacht verwijderen|

### stemmen

Stem omhoog/omlaag op items.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`userId`|tekst (FK)|Referenties `clientProfiles.id`|
|`itemId`|tekst|Artikel slak|
|`voteType`|tekst|"omhoog stemmen" of "omlaag stemmen"|

**Unieke index**: (`userId`, `itemId`) -- één stem per gebruiker per item

### favorieten

Gebruikersfavorieten (bladwijzers).

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`userId`|tekst (FK)|Referenties `users.id`|
|`itemSlug`|tekst|Artikel slak|
|`itemName`|tekst|Gedenormaliseerde itemnaam|
|`itemIconUrl`|tekst|Gedenormaliseerd itempictogram|
|`itemCategory`|tekst|Gedenormaliseerde categorie|

**Unieke index**: (`userId`, `itemSlug`)

### itemBezichtigingen

Houdt unieke dagelijkse itemweergaven bij voor analyse.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`itemId`|tekst|Artikel slak|
|`viewerId`|tekst|Anonieme, op cookies gebaseerde kijkers-ID|
|`viewedDateUtc`|tekst|Datum in het formaat JJJJ-MM-DD|
|`viewedAt`|tijdstempel|Exacte kijktijd|

**Unieke index**: (`itemId`, `viewerId`, `viewedDateUtc`) -- één weergave per kijker per dag

## Abonnementen en betalingen

### abonnementen

Gebruikersabonnementsrecords die meerdere betalingsproviders ondersteunen.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`userId`|tekst (FK)|Referenties `users.id`|
|`planId`|tekst|Plan-ID (gratis, standaard, premium)|
|`status`|tekst|actief, geannuleerd, verlopen, in behandeling, gepauzeerd|
|`paymentProvider`|tekst|streep, citroensqueezy, polair, solidgate|
|`subscriptionId`|tekst|Abonnement-ID van provider|
|`customerId`|tekst|Klant-ID van de aanbieder|
|`autoRenewal`|Booleaans|Automatische verlenging ingeschakeld|
|`cancelAtPeriodEnd`|Booleaans|Annuleer aan het einde van de periode|
|`amount`|geheel getal|Abonnementsbedrag (cent)|
|`currency`|tekst|Valutacode|
|`interval`|tekst|Factureringsinterval (maand, jaar)|

**Indexen**: `user_subscription_idx`, `subscription_status_idx`, `provider_subscription_idx` (uniek)

### abonnementGeschiedenis

Audittrail voor abonnementswijzigingen.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`subscriptionId`|tekst (FK)|Referenties `subscriptions.id`|
|`action`|tekst|Wijzig actie|
|`previousStatus`|tekst|Status vóór wijziging|
|`newStatus`|tekst|Status na wijziging|

### betalingsaanbieders

Register van beschikbare betalingsproviders.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`name`|tekst|Providernaam (uniek)|
|`isActive`|Booleaans|Of de provider is ingeschakeld|

### betalingAccounts

Koppelt gebruikers aan de accounts van hun betalingsprovider.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`userId`|tekst (FK)|Referenties `users.id`|
|`providerId`|tekst (FK)|Referenties `paymentProviders.id`|
|`customerId`|tekst|Klant-ID van de aanbieder|

**Unieke indexen**: (`userId`, `providerId`), (`customerId`, `providerId`)

## Beheer & Moderatie

### meldingen

In-app beheerdersmeldingen.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`userId`|tekst (FK)|Referenties `users.id`|
|`type`|tekst|item_submission, comment_reported, etc.|
|`title`|tekst|Titel van melding|
|`message`|tekst|Kennisgevingsinstantie|
|`isRead`|Booleaans|Leesstatus|

### rapporten

Inhoudsrapportagesysteem voor items en opmerkingen.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`contentType`|tekst|"item" of "opmerking"|
|`contentId`|tekst|Gerapporteerde inhouds-ID|
|`reason`|tekst|spam, intimidatie, ongepast, anders|
|`status`|tekst|in behandeling, beoordeeld, opgelost, afgewezen|
|`resolution`|tekst|content_removed, user_warned, etc.|
|`reportedBy`|tekst (FK)|Referenties `clientProfiles.id`|
|`reviewedBy`|tekst (FK)|Referenties `users.id`|

### moderatieGeschiedenis

Volledige moderatieactiegeschiedenis.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`userId`|tekst (FK)|Referenties `clientProfiles.id`|
|`action`|tekst|waarschuwen, opschorten, verbannen, opschorten opheffen, verbannen, content_removed|
|`reportId`|tekst (FK)|Referenties `reports.id`|
|`performedBy`|tekst (FK)|Referenties `users.id`|
|`details`|jsonb|Aanvullende context|

### itemAuditLogs

Houdt wijzigingen aan items bij in het beheerdersdashboard.

|Kolom|Typ|Opmerkingen|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`itemId`|tekst|Item-slug (niet FK; items staan in Git)|
|`itemName`|tekst|Gedenormaliseerde itemnaam|
|`action`|tekst|gemaakt, bijgewerkt, status_changed, beoordeeld, verwijderd, hersteld|
|`changes`|jsonb|Wijzigingsdetails op veldniveau|
|`performedBy`|tekst (FK)|Referenties `users.id`|

## Andere tabellen

### sponsoradvertenties

Advertenties voor gesponsorde artikelen met volledige betalingslevenscyclus.

Sleutelkolommen: `userId`, `itemSlug`, `status` (betaling in behandeling, in behandeling, afgewezen, actief, verlopen, geannuleerd), `interval` (wekelijks, maandelijks), `amount`, `paymentProvider`, `subscriptionId`.

### bedrijven / artikelenBedrijven

Bedrijfsgegevens en item-bedrijfsassociaties voor directoryvermeldingen.

### enquêtes / enquêtereacties

Enquêtebouwer met op JSON gebaseerde vraagdefinities en antwoordopslag.

### TwentyCrmConfig / IntegrationMappings

CRM-integratietabellen voor Twenty CRM-synchronisatiefunctionaliteit. De configuratietabel dwingt een singleton-patroon af (slechts één rij toegestaan).

### nieuwsbriefAbonnementen

Volgen van abonnementen op e-mailnieuwsbrieven met tijdstempels voor in- en uitschrijven.

### zaadStatus

Singleton-tabel-tracking database-zaaistatus (zaaien, voltooid, mislukt) om gelijktijdige zaadbewerkingen te voorkomen.

## Typ Exporten

Het schemabestand exporteert TypeScript-typen voor elke tabel met behulp van de gevolgtrekking van Drizzle:

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
// ... and so on for all tables
```

Deze typen worden in de hele toepassing gebruikt voor typeveilige databasebewerkingen.
