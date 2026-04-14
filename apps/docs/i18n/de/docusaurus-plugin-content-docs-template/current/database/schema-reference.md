---
id: schema-reference
title: Schema-Referenz
sidebar_label: Schema-Referenz
sidebar_position: 1
---

# Schema-Referenz

Alle Datenbanktabellen sind in `lib/db/schema.ts` definiert. Dieses Dokument katalogisiert jede Tabelle, ihre Schlüsselspalten, Beziehungen und ihren Zweck.

## Benutzer und Authentifizierung

### Benutzer

Kernbenutzertabelle, die von NextAuth.js zur Authentifizierung verwendet wird.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID, automatisch generiert|
|`email`|Text|Einzigartig|
|`image`|Text|Profilbild-URL|
|`emailVerified`|Zeitstempel|Datum der E-Mail-Bestätigung|
|`passwordHash`|Text|Bcrypt-Hash für die Authentifizierung der Anmeldeinformationen|
|`createdAt`|Zeitstempel|Automatisch eingestellt|
|`updatedAt`|Zeitstempel|Automatisch eingestellt|
|`deletedAt`|Zeitstempel|Vorläufiges Löschen|

**Indizes**: `users_created_at_idx`

### Konten

OAuth- und Anmeldeinformationskontoverknüpfungen gemäß dem NextAuth.js-Adapterschema.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`userId`|Text (FK)|Referenzen `users.id` (Kaskadenlöschung)|
|`type`|Text|Kontotyp (OAuth, Anmeldeinformationen usw.)|
|`provider`|Text|Anbietername (Google, Github, Anmeldeinformationen)|
|`providerAccountId`|Text|Anbieterspezifische Konto-ID|
|`email`|Text|E-Mail-Adresse des Kontos|
|`passwordHash`|Text|Für Client-Anmeldeinformationen Authentifizierung|
|`refresh_token`|Text|OAuth-Aktualisierungstoken|
|`access_token`|Text|OAuth-Zugriffstoken|
|`expires_at`|Ganzzahl|Ablauf des Tokens|

**Primärschlüssel**: Zusammengesetzt auf (`provider`, `providerAccountId`)
**Indizes**: `accounts_email_idx`, `accounts_provider_idx`

### Sitzungen

Aktive Benutzersitzungen.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`sessionToken`|Text (PK)|Sitzungskennung|
|`userId`|Text (FK)|Referenzen `users.id`|
|`expires`|Zeitstempel|Sitzungsablauf|

### Verifizierungstokens

E-Mail-Verifizierungstoken.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`identifier`|Text|Benutzerkennung|
|`email`|Text|E-Mail-Adresse|
|`token`|Text|Verifizierungstoken|
|`expires`|Zeitstempel|Ablauf des Tokens|

**Primärschlüssel**: Zusammengesetzt auf (`identifier`, `token`)

### Authentifikatoren

WebAuthn/FIDO2-Anmeldeinformationsspeicher.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`credentialID`|Text|Eindeutige Anmeldeinformations-ID|
|`userId`|Text (FK)|Referenzen `users.id`|
|`providerAccountId`|Text|Referenz zum Anbieterkonto|
|`credentialPublicKey`|Text|Öffentlicher Schlüssel zur Verifizierung|
|`counter`|Ganzzahl|Authentifizierungszähler|

### passwortResetTokens

Passwort-Reset-Tokens für den Fluss „Passwort vergessen“.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`email`|Text|Ziel-E-Mail|
|`token`|Text|Einzigartiges Reset-Token|
|`expires`|Zeitstempel|Ablauf des Tokens|

### Aktivitätsprotokolle

Verfolgt Benutzer- und Kundenaktivitäten zu Prüfzwecken.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|seriell (PK)|Automatisches Inkrementieren|
|`userId`|Text (FK)|Referenzen `users.id` (nullable)|
|`clientId`|Text (FK)|Referenzen `clientProfiles.id` (nullable)|
|`action`|Text|Aktivitätstyp (SIGN_UP, SIGN_IN usw.)|
|`timestamp`|Zeitstempel|Wann die Aktivität stattgefunden hat|
|`ipAddress`|varchar(45)|Client-IP-Adresse|

**Indizes**: `activity_logs_user_idx`, `activity_logs_timestamp_idx`, `activity_logs_action_idx`

## Rollen und Berechtigungen

### Rollen

Rollendefinitionen für RBAC.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|Rollenkennung (z. B. „admin“, „client“)|
|`name`|Text|Eindeutiger Rollenname|
|`description`|Text|Für Menschen lesbare Beschreibung|
|`isAdmin`|Boolescher Wert|Ob es sich um eine Administratorrolle handelt|
|`status`|Text|„aktiv“ oder „inaktiv“|
|`created_by`|Text|Wer hat die Rolle erstellt?|

### Berechtigungen

Detaillierte Berechtigungsdefinitionen.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`key`|Text|Eindeutiger Berechtigungsschlüssel (z. B. „items:create“)|
|`description`|Text|Für Menschen lesbare Beschreibung|

### Rollenberechtigungen

Viele-zu-viele-Join-Tabelle, die Rollen mit Berechtigungen verknüpft.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`roleId`|Text (FK)|Referenzen `roles.id` (Kaskade)|
|`permissionId`|Text (FK)|Referenzen `permissions.id` (Kaskade)|

**Primärschlüssel**: Zusammengesetzt auf (`roleId`, `permissionId`)

### Benutzerrollen

Viele-zu-viele-Join-Tabelle, die Benutzer mit Rollen verknüpft.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`userId`|Text (FK)|Referenzen `users.id` (Kaskade)|
|`roleId`|Text (FK)|Referenzen `roles.id` (Kaskade)|

**Primärschlüssel**: Zusammengesetzt auf (`userId`, `roleId`)

## Kundenprofile

### clientProfiles

Erweiterte Profilinformationen für registrierte Kundenbenutzer.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`userId`|Text (FK)|Referenzen `users.id` (einzigartig, Kaskade)|
|`email`|Text|Kunden-E-Mail|
|`name`|Text|Vollständiger Name|
|`displayName`|Text|Anzeigename|
|`username`|Text|Eindeutiger Benutzername|
|`bio`|Text|Benutzerbiografie|
|`jobTitle`|Text|Berufsbezeichnung|
|`company`|Text|Firmenname|
|`industry`|Text|Industriesektor|
|`phone`|Text|Telefonnummer|
|`website`|Text|Persönliche Website|
|`location`|Text|Standortzeichenfolge|
|`avatar`|Text|Avatar-URL|
|`accountType`|Text|„Einzelperson“, „Unternehmen“ oder „Unternehmen“|
|`status`|Text|„aktiv“, „inaktiv“, „suspendiert“, „gesperrt“, „vor Gericht“|
|`plan`|Text|„kostenlos“, „Standard“ oder „Premium“|
|`timezone`|Text|Zeitzone (Standard „UTC“)|
|`language`|Text|Bevorzugte Sprache (Standard „en“)|
|`country`|Text|Ländercode|
|`currency`|Text|Bevorzugte Währung (Standard „USD“)|
|`defaultLatitude`|doppelt|Standard-Breitengrad des Standorts|
|`defaultLongitude`|doppelt|Standardmäßiger Längengrad des Standorts|
|`twoFactorEnabled`|Boolescher Wert|2FA-Status|
|`totalSubmissions`|Ganzzahl|Anzahl der Einreichungen|
|`warningCount`|Ganzzahl|Anzahl der Moderationswarnungen|
|`suspendedAt`|Zeitstempel|Wenn suspendiert|
|`bannedAt`|Zeitstempel|Wenn verboten|

**Indizes**: Mehrere Indizes für `userId`, `email`, `status`, `plan`, `accountType`, `username`, `createdAt`

## Inhalt und Engagement

### Kommentare

Benutzerkommentare zu Artikeln.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`content`|Text|Kommentartext|
|`userId`|Text (FK)|Referenzen `clientProfiles.id`|
|`itemId`|Text|Artikelschnecke|
|`rating`|Ganzzahl|Bewertung (0-5)|
|`editedAt`|Zeitstempel|Letzte Bearbeitungszeit|
|`deletedAt`|Zeitstempel|Vorläufiges Löschen|

### Stimmen

Upvote/Downvote für Artikel.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`userId`|Text (FK)|Referenzen `clientProfiles.id`|
|`itemId`|Text|Artikelschnecke|
|`voteType`|Text|„Upvote“ oder „Downvote“|

**Eindeutiger Index**: (`userId`, `itemId`) – eine Stimme pro Benutzer und Artikel

### Favoriten

Benutzerfavoriten (Lesezeichen).

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`userId`|Text (FK)|Referenzen `users.id`|
|`itemSlug`|Text|Artikelschnecke|
|`itemName`|Text|Denormalisierter Elementname|
|`itemIconUrl`|Text|Symbol für denormalisiertes Element|
|`itemCategory`|Text|Denormalisierte Kategorie|

**Eindeutiger Index**: (`userId`, `itemSlug`)

### itemViews

Verfolgt einzigartige tägliche Artikelansichten für Analysen.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`itemId`|Text|Artikelschnecke|
|`viewerId`|Text|Anonyme, Cookie-basierte Zuschauer-ID|
|`viewedDateUtc`|Text|Datum im Format JJJJ-MM-TT|
|`viewedAt`|Zeitstempel|Genaue Ansichtszeit|

**Einzigartiger Index**: (`itemId`, `viewerId`, `viewedDateUtc`) – ein Aufruf pro Betrachter und Tag

## Abonnements und Zahlungen

### Abonnements

Benutzerabonnementdatensätze, die mehrere Zahlungsanbieter unterstützen.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`userId`|Text (FK)|Referenzen `users.id`|
|`planId`|Text|Plan-ID (kostenlos, Standard, Premium)|
|`status`|Text|aktiv, abgebrochen, abgelaufen, ausstehend, pausiert|
|`paymentProvider`|Text|Streifen, Lemonsqueezy, Polar, Solidgate|
|`subscriptionId`|Text|Abonnement-ID des Anbieters|
|`customerId`|Text|Kunden-ID des Anbieters|
|`autoRenewal`|Boolescher Wert|Automatische Verlängerung aktiviert|
|`cancelAtPeriodEnd`|Boolescher Wert|Am Ende der Periode stornieren|
|`amount`|Ganzzahl|Abonnementbetrag (Cent)|
|`currency`|Text|Währungscode|
|`interval`|Text|Abrechnungsintervall (Monat, Jahr)|

**Indizes**: `user_subscription_idx`, `subscription_status_idx`, `provider_subscription_idx` (eindeutig)

### Abonnementverlauf

Audit-Trail für Abonnementänderungen.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`subscriptionId`|Text (FK)|Referenzen `subscriptions.id`|
|`action`|Text|Aktion ändern|
|`previousStatus`|Text|Status vor Änderung|
|`newStatus`|Text|Status nach Änderung|

### Zahlungsanbieter

Verzeichnis der verfügbaren Zahlungsanbieter.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`name`|Text|Anbietername (eindeutig)|
|`isActive`|Boolescher Wert|Ob der Anbieter aktiviert ist|

### Zahlungskonten

Verknüpft Benutzer mit ihren Zahlungsanbieterkonten.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`userId`|Text (FK)|Referenzen `users.id`|
|`providerId`|Text (FK)|Referenzen `paymentProviders.id`|
|`customerId`|Text|Kunden-ID des Anbieters|

**Eindeutige Indizes**: (`userId`, `providerId`), (`customerId`, `providerId`)

## Verwaltung und Moderation

### Benachrichtigungen

In-App-Administratorbenachrichtigungen.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`userId`|Text (FK)|Referenzen `users.id`|
|`type`|Text|item_submission, comment_reported usw.|
|`title`|Text|Titel der Benachrichtigung|
|`message`|Text|Benachrichtigungsstelle|
|`isRead`|Boolescher Wert|Status lesen|

### Berichte

Inhaltsberichtssystem für Elemente und Kommentare.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`contentType`|Text|„Artikel“ oder „Kommentar“|
|`contentId`|Text|ID des gemeldeten Inhalts|
|`reason`|Text|Spam, Belästigung, unangemessen, Sonstiges|
|`status`|Text|anhängig, überprüft, gelöst, abgewiesen|
|`resolution`|Text|content_removed, user_warned usw.|
|`reportedBy`|Text (FK)|Referenzen `clientProfiles.id`|
|`reviewedBy`|Text (FK)|Referenzen `users.id`|

### ModerationGeschichte

Vollständiger Verlauf der Moderationsaktionen.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`userId`|Text (FK)|Referenzen `clientProfiles.id`|
|`action`|Text|warnen, suspendieren, sperren, Suspendierung aufheben, entsperren, content_removed|
|`reportId`|Text (FK)|Referenzen `reports.id`|
|`performedBy`|Text (FK)|Referenzen `users.id`|
|`details`|jsonb|Zusätzlicher Kontext|

### itemAuditLogs

Verfolgt Änderungen an Elementen im Admin-Bereich.

|Spalte|Typ|Notizen|
|--------|------|-------|
|`id`|Text (PK)|UUID|
|`itemId`|Text|Item-Slug (nicht FK; Items sind in Git)|
|`itemName`|Text|Denormalisierter Elementname|
|`action`|Text|erstellt, aktualisiert, Status_geändert, überprüft, gelöscht, wiederhergestellt|
|`changes`|jsonb|Änderungsdetails auf Feldebene|
|`performedBy`|Text (FK)|Referenzen `users.id`|

## Andere Tische

### sponsorAds

Werbung für gesponserte Artikel mit vollständigem Zahlungslebenszyklus.

Schlüsselspalten: `userId`, `itemSlug`, `status` (ausstehende_Zahlung, ausstehend, abgelehnt, aktiv, abgelaufen, storniert), `interval` (wöchentlich, monatlich), `amount`, `paymentProvider`, `subscriptionId`.

### Firmen / ArtikelFirmen

Firmendatensätze und Artikel-Firmen-Zuordnungen für Verzeichniseinträge.

### Umfragen / Umfrageantworten

Umfrage-Builder mit JSON-basierten Fragedefinitionen und Antwortspeicher.

### twentyCrmConfig/integrationMappings

CRM-Integrationstabellen für Twenty CRM-Synchronisierungsfunktionen. Die Konfigurationstabelle erzwingt ein Singleton-Muster (nur eine Zeile zulässig).

### Newsletter-Abonnements

Verfolgung von E-Mail-Newsletter-Abonnements mit Zeitstempeln zum Abonnieren/Abmelden.

### SeedStatus

Singleton-Tabelle verfolgt den Seeding-Status der Datenbank (Seeding, abgeschlossen, fehlgeschlagen), um gleichzeitige Seeding-Vorgänge zu verhindern.

## Geben Sie Exporte ein

Die Schemadatei exportiert TypeScript-Typen für jede Tabelle mithilfe der Drizzle-Inferenz:

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
// ... and so on for all tables
```

Diese Typen werden in der gesamten Anwendung für typsichere Datenbankoperationen verwendet.
