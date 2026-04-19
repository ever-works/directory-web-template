---
id: schema-relationships
title: Schemabeziehungen
sidebar_label: Schemabeziehungen
sidebar_position: 15
---

# Schemabeziehungen

Auf dieser Seite werden alle Tabellenbeziehungen, Fremdschlüssel und Verbindungstabellen im Vorlagendatenbankschema dokumentiert. Das Schema wird in `lib/db/schema.ts` unter Verwendung von Drizzle ORM mit PostgreSQL definiert.

## Übersicht über Entitätsbeziehungen

Die Datenbank konzentriert sich auf drei primäre Entitäten: **Benutzer** (Administrator), **Client-Profile** (Endbenutzer) und **Elemente** (in Git gespeichert, von Slug referenziert). Die meisten Engagement- und Commerce-Tabellen beziehen sich auf diese drei.

## Kernauthentifizierungstabellen

### Benutzer

Die Identitätstabelle der obersten Ebene für alle authentifizierten Konten.

**Referenziert von:**
- `accounts.userId` (Kaskadenlöschung)
- `sessions.userId` (Kaskadenlöschung)
- `authenticators.userId` (Kaskadenlöschung)
- `activityLogs.userId` (Kaskadenlöschung)
- `client_profiles.userId` (Kaskadenlöschung)
- `subscriptions.userId` (Kaskadenlöschung)
- `payment_accounts.userId` (Kaskadenlöschung)
- `notifications.user_id` (Kaskadenlöschung)
- `favorites.userId` (Kaskadenlöschung)
- `user_roles.user_id` (Kaskadenlöschung)
- `reports.reviewed_by` (auf Null setzen)
- `sponsor_ads.user_id` (Kaskadenlöschung)
- `moderation_history.performed_by` (auf Null setzen)

### Konten

Mit Benutzern verknüpfte OAuth- und Anmeldeinformationskonten.

|Beziehung|Ziel|Beim Löschen|
|-------------|--------|-----------|
|`userId`|`users.id`|Kaskade|

Zusammengesetzter Primärschlüssel auf `(provider, providerAccountId)`.

### Sitzungen

Aktive Anmeldesitzungen.

|Beziehung|Ziel|Beim Löschen|
|-------------|--------|-----------|
|`userId`|`users.id`|Kaskade|

### Authentifikatoren

WebAuthn/Passkey-Anmeldeinformationen.

|Beziehung|Ziel|Beim Löschen|
|-------------|--------|-----------|
|`userId`|`users.id`|Kaskade|

Zusammengesetzter Primärschlüssel auf `(userId, credentialID)`.

## Kundenprofilsystem

### client_profiles

Endbenutzerprofile mit Plan-, Status- und Standortdaten.

|Beziehung|Ziel|Beim Löschen|
|-------------|--------|-----------|
|`userId`|`users.id`|Kaskade|

Ein eindeutiger Index für `userId` gewährleistet ein Profil pro Benutzer.

**Referenziert von:**
- `comments.userId` (Kaskadenlöschung)
- `votes.userid` (Kaskadenlöschung)
- `reports.reported_by` (Kaskadenlöschung)
- `moderation_history.user_id` (Kaskadenlöschung)
- `activityLogs.clientId` (Kaskadenlöschung)

## Rollenbasierte Zugriffskontrolle

Das RBAC-System verwendet drei Tabellen in einem Viele-zu-Viele-Muster.

### Rollen

Benannte Rollen mit Admin-Flag.

### Berechtigungen

Individuelle Berechtigungsschlüssel (z. B. `items:create`).

### Role_permissions (Verbindungstabelle)

Verknüpft Rollen mit Berechtigungen.

|Spalte|Ziel|Beim Löschen|
|--------|--------|-----------|
|`role_id`|`roles.id`|Kaskade|
|`permission_id`|`permissions.id`|Kaskade|

Zusammengesetzter Primärschlüssel auf `(role_id, permission_id)`.

### user_roles (Verbindungstabelle)

Weist Benutzern Rollen zu.

|Spalte|Ziel|Beim Löschen|
|--------|--------|-----------|
|`user_id`|`users.id`|Kaskade|
|`role_id`|`roles.id`|Kaskade|

Zusammengesetzter Primärschlüssel auf `(user_id, role_id)`.

### RBAC-Entitätsdiagramm

```
users ---< user_roles >--- roles ---< role_permissions >--- permissions
```

Ein Benutzer kann viele Rollen haben, jede Rolle kann viele Berechtigungen haben und mehrere Benutzer können dieselbe Rolle teilen.

## Verlobungstabellen

### Kommentare

|Beziehung|Ziel|Beim Löschen|
|-------------|--------|-----------|
|`userId`|`client_profiles.id`|Kaskade|

In der Spalte `itemId` wird der Element-Slug gespeichert (kein Fremdschlüssel, da Elemente in Git gespeichert sind).

### Stimmen

|Beziehung|Ziel|Beim Löschen|
|-------------|--------|-----------|
|`userid`|`client_profiles.id`|Kaskade|

Ein eindeutiger Index für `(userid, item_id)` gewährleistet eine Stimme pro Benutzer und Artikel. In der Spalte `item_id` wird der Artikel-Slug gespeichert.

### Favoriten

|Beziehung|Ziel|Beim Löschen|
|-------------|--------|-----------|
|`userId`|`users.id`|Kaskade|

Ein eindeutiger Index für `(userId, item_slug)` gewährleistet einen Favoriten pro Benutzer und Artikel. In der Spalte `item_slug` wird der Artikel-Slug gespeichert.

### item_views

Keine Fremdschlüssel. Verwendet einen eindeutigen Index für `(item_id, viewer_id, viewed_date_utc)` für die tägliche Deduplizierung.

## Tabellen zur Inhaltsmoderation

### Berichte

|Spalte|Ziel|Beim Löschen|
|--------|--------|-----------|
|`reported_by`|`client_profiles.id`|Kaskade|
|`reviewed_by`|`users.id`|NULL SETZEN|

Indizes für `content_type`, `content_id`, `status`, `reported_by` und ein zusammengesetztes `(content_type, content_id)`.

### moderation_history

|Spalte|Ziel|Beim Löschen|
|--------|--------|-----------|
|`user_id`|`client_profiles.id`|Kaskade|
|`performed_by`|`users.id`|NULL SETZEN|
|`report_id`|`reports.id`|NULL SETZEN|

## Zahlungs- und Abonnementtabellen

### Abonnements

|Beziehung|Ziel|Beim Löschen|
|-------------|--------|-----------|
|`userId`|`users.id`|Kaskade|

Eindeutiger Index für `(payment_provider, subscription_id)`.

### Abonnementverlauf

|Beziehung|Ziel|Beim Löschen|
|-------------|--------|-----------|
|`subscription_id`|`subscriptions.id`|Kaskade|

### Zahlungsanbieter

Keine Fremdschlüssel. Speichert verfügbare Zahlungsanbieter.

### Zahlungskonten

|Spalte|Ziel|Beim Löschen|
|--------|--------|-----------|
|`userId`|`users.id`|Kaskade|
|`providerId`|`paymentProviders.id`|Kaskade|

Eindeutige Indizes für `(userId, providerId)` und `(customerId, providerId)`.

## Sponsor-Anzeigen

### sponsor_ads

|Spalte|Ziel|Beim Löschen|
|--------|--------|-----------|
|`user_id`|`users.id`|Kaskade|
|`reviewed_by`|`users.id`|NULL SETZEN|

## Benachrichtigungssystem

### Benachrichtigungen

|Beziehung|Ziel|Beim Löschen|
|-------------|--------|-----------|
|`user_id`|`users.id`|Kaskade|

Indizes für `user_id`, `type`, `is_read` und `created_at`.

## Aktivitätsprotokollierung

### Aktivitätsprotokolle

|Spalte|Ziel|Beim Löschen|
|--------|--------|-----------|
|`userId`|`users.id`|Kaskade|
|`clientId`|`client_profiles.id`|Kaskade|

Beide Spalten können NULL-Werte zulassen. Jeder Protokolleintrag bezieht sich entweder auf einen Admin-Benutzer oder einen Client-Benutzer.

## Andere Tische

### Newsletter-Abonnements

Keine Fremdschlüssel. Die Spalte `email` hat einen eindeutigen Index.

### passwortResetTokens

Keine Fremdschlüssel. Zusammengesetzter Primärschlüssel auf `(identifier, token)`.

### Verifizierungstokens

Keine Fremdschlüssel. Zusammengesetzter Primärschlüssel auf `(identifier, token)`.

### Featured_Items

Keine Fremdschlüssel. Verwendet `item_slug` zum Verweisen auf Git-basierte Elemente und `featured_by` als einfaches Textfeld (kein Fremdschlüssel).

### Umfragen

Keine Fremdschlüssel. Die Spalte `slug` hat einen eindeutigen Index.

### twenty_crm_config

Keine Fremdschlüssel. Singleton-Muster, das durch einen eindeutigen Ausdrucksindex erzwungen wird.

### Integrationszuordnungen

Keine Fremdschlüssel. Eindeutiger Index für `(ever_id, object_type)`.

### Unternehmen

Keine Fremdschlüssel.

### Seed_status

Singleton-Tabelle mit einem eindeutigen Index für `id`.

## Zusammenfassung der Kaskadenlöschung

Wenn ein **Benutzer** gelöscht wird, werden Folgendes nacheinander gelöscht:

- Konten, Sitzungen, Authentifikatoren
- Kundenprofile (und transitiv: Kommentare, Stimmen, Berichte dieses Kunden, Moderationsverlauf)
- Abonnements
- Zahlungskonten
- Benachrichtigungen
- Favoriten
- Benutzerrollenzuweisungen
- Aktivitätsprotokolle
- Sponsor-Anzeigen

Wenn ein **Kundenprofil** gelöscht wird:

- Kommentare dieses Benutzers
- Stimmen dieses Benutzers
- Von diesem Benutzer eingereichte Berichte
- Moderationsverlauf für diesen Benutzer
- Aktivitätsprotokolle für diesen Client

Wenn eine **Rolle** gelöscht wird:

- Alle Rollenberechtigungszuweisungen für diese Rolle
- Alle Benutzerrollenzuweisungen für diese Rolle

## Artikelreferenzen

Elemente werden im Git-basierten CMS gespeichert, nicht in der Datenbank. Mehrere Tabellen verweisen auf Elemente nach Slug:

- `comments.itemId` – Artikel-Slug
- `votes.item_id` – Artikel-Slug
- `favorites.item_slug` – Artikel-Slug
- `item_views.item_id` – Artikel-Slug
- `featured_items.item_slug` – Artikel-Slug
- `sponsor_ads.item_slug` – Artikel-Slug

Dabei handelt es sich um reine Textspalten ohne Fremdschlüsseleinschränkungen.

## Verwandte Dokumentation

- [Schema-Referenz](/template/database/schema-reference) – Schemadokumente auf Spaltenebene
- [Drizzle Patterns](/template/database/drizzle-patterns) – ORM-Nutzungsmuster
- [Migrationsleitfaden](/template/database/migrations-guide) – Datenbankmigrationen
