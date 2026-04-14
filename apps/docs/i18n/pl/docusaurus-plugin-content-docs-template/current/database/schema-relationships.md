---
id: schema-relationships
title: Schemat relacji
sidebar_label: Schemat relacji
sidebar_position: 15
---

# Schemat relacji

Na tej stronie dokumentowane są wszystkie relacje między tabelami, klucze obce i tabele połączeń w schemacie szablonowej bazy danych. Schemat jest zdefiniowany w `lib/db/schema.ts` przy użyciu Drizzle ORM z PostgreSQL.

## Przegląd relacji encji

Baza danych skupia się wokół trzech głównych jednostek: **użytkownicy** (administrator), **profile_klienta** (użytkownicy końcowi) i **przedmioty** (przechowywane w Git, do których odwołuje się ślimak). Większość tabel zaangażowania i handlu odnosi się do tych trzech.

## Podstawowe tablice uwierzytelniające

### użytkownicy

Tabela tożsamości najwyższego poziomu dla wszystkich uwierzytelnionych kont.

**Odniesienie:**
- `accounts.userId` (usuwanie kaskadowe)
- `sessions.userId` (usuwanie kaskadowe)
- `authenticators.userId` (usuwanie kaskadowe)
- `activityLogs.userId` (usuwanie kaskadowe)
- `client_profiles.userId` (usuwanie kaskadowe)
- `subscriptions.userId` (usuwanie kaskadowe)
- `payment_accounts.userId` (usuwanie kaskadowe)
- `notifications.user_id` (usuwanie kaskadowe)
- `favorites.userId` (usuwanie kaskadowe)
- `user_roles.user_id` (usuwanie kaskadowe)
- `reports.reviewed_by` (ustaw wartość null)
- `sponsor_ads.user_id` (usuwanie kaskadowe)
- `moderation_history.performed_by` (ustaw wartość null)

### konta

Konta OAuth i dane uwierzytelniające powiązane z użytkownikami.

|Związek|Cel|Przy usuwaniu|
|-------------|--------|-----------|
|`userId`|`users.id`|KASKADA|

Złożony klucz podstawowy na `(provider, providerAccountId)`.

### sesje

Aktywne sesje logowania.

|Związek|Cel|Przy usuwaniu|
|-------------|--------|-----------|
|`userId`|`users.id`|KASKADA|

### uwierzytelniacze

Poświadczenia WebAuthn/hasła.

|Związek|Cel|Przy usuwaniu|
|-------------|--------|-----------|
|`userId`|`users.id`|KASKADA|

Złożony klucz podstawowy na `(userId, credentialID)`.

## System Profilu Klienta

### profile_klienta

Profile użytkowników końcowych z danymi dotyczącymi planu, stanu i lokalizacji.

|Związek|Cel|Przy usuwaniu|
|-------------|--------|-----------|
|`userId`|`users.id`|KASKADA|

Unikalny indeks na `userId` zapewnia jeden profil na użytkownika.

**Odniesienie:**
- `comments.userId` (usuwanie kaskadowe)
- `votes.userid` (usuwanie kaskadowe)
- `reports.reported_by` (usuwanie kaskadowe)
- `moderation_history.user_id` (usuwanie kaskadowe)
- `activityLogs.clientId` (usuwanie kaskadowe)

## Kontrola dostępu oparta na rolach

System RBAC wykorzystuje trzy tabele w układzie wiele do wielu.

### role

Nazwane role z flagą administratora.

### uprawnienia

Indywidualne klucze uprawnień (np. `items:create`).

### role_permissions (tabela połączeń)

Łączy role z uprawnieniami.

|Kolumna|Cel|Przy usuwaniu|
|--------|--------|-----------|
|`role_id`|`roles.id`|KASKADA|
|`permission_id`|`permissions.id`|KASKADA|

Złożony klucz podstawowy na `(role_id, permission_id)`.

### user_roles (tabela połączeń)

Przypisuje role użytkownikom.

|Kolumna|Cel|Przy usuwaniu|
|--------|--------|-----------|
|`user_id`|`users.id`|KASKADA|
|`role_id`|`roles.id`|KASKADA|

Złożony klucz podstawowy na `(user_id, role_id)`.

### Diagram jednostki RBAC

```
users ---< user_roles >--- roles ---< role_permissions >--- permissions
```

Użytkownik może mieć wiele ról, każda rola może mieć wiele uprawnień, a wielu użytkowników może współdzielić tę samą rolę.

## Tabele zaangażowania

### komentarze

|Związek|Cel|Przy usuwaniu|
|-------------|--------|-----------|
|`userId`|`client_profiles.id`|KASKADA|

Kolumna `itemId` przechowuje informację o produkcie (nie klucz obcy, ponieważ elementy znajdują się w Git).

### głosów

|Związek|Cel|Przy usuwaniu|
|-------------|--------|-----------|
|`userid`|`client_profiles.id`|KASKADA|

Unikalny indeks `(userid, item_id)` zapewnia jeden głos na użytkownika na każdy element. Kolumna `item_id` przechowuje informację o pozycji.

### ulubione

|Związek|Cel|Przy usuwaniu|
|-------------|--------|-----------|
|`userId`|`users.id`|KASKADA|

Unikalny indeks `(userId, item_slug)` zapewnia, że każdy użytkownik ma jednego ulubionego elementu. Kolumna `item_slug` przechowuje informację o pozycji.

### widoki_przedmiotu

Brak kluczy obcych. Używa unikalnego indeksu `(item_id, viewer_id, viewed_date_utc)` do codziennej deduplikacji.

## Tabele moderacji treści

### raporty

|Kolumna|Cel|Przy usuwaniu|
|--------|--------|-----------|
|`reported_by`|`client_profiles.id`|KASKADA|
|`reviewed_by`|`users.id`|USTAW NULL|

Indeksy na `content_type`, `content_id`, `status`, `reported_by` i kompozyt `(content_type, content_id)`.

### historia_moderacji

|Kolumna|Cel|Przy usuwaniu|
|--------|--------|-----------|
|`user_id`|`client_profiles.id`|KASKADA|
|`performed_by`|`users.id`|USTAW NULL|
|`report_id`|`reports.id`|USTAW NULL|

## Tabele płatności i subskrypcji

### subskrypcje

|Związek|Cel|Przy usuwaniu|
|-------------|--------|-----------|
|`userId`|`users.id`|KASKADA|

Unikalny indeks na `(payment_provider, subscription_id)`.

### Historia subskrypcji

|Związek|Cel|Przy usuwaniu|
|-------------|--------|-----------|
|`subscription_id`|`subscriptions.id`|KASKADA|

### Dostawcy płatności

Brak kluczy obcych. Przechowuje dostępnych dostawców płatności.

### Konta płatnicze

|Kolumna|Cel|Przy usuwaniu|
|--------|--------|-----------|
|`userId`|`users.id`|KASKADA|
|`providerId`|`paymentProviders.id`|KASKADA|

Unikalne indeksy `(userId, providerId)` i `(customerId, providerId)`.

## Reklamy sponsorskie

### sponsor_reklamy

|Kolumna|Cel|Przy usuwaniu|
|--------|--------|-----------|
|`user_id`|`users.id`|KASKADA|
|`reviewed_by`|`users.id`|USTAW NULL|

## System powiadomień

### powiadomienia

|Związek|Cel|Przy usuwaniu|
|-------------|--------|-----------|
|`user_id`|`users.id`|KASKADA|

Indeksy na `user_id`, `type`, `is_read` i `created_at`.

## Rejestrowanie aktywności

### dzienniki aktywności

|Kolumna|Cel|Przy usuwaniu|
|--------|--------|-----------|
|`userId`|`users.id`|KASKADA|
|`clientId`|`client_profiles.id`|KASKADA|

Obie kolumny dopuszczają wartość null; każdy wpis dziennika dotyczy użytkownika administratora lub klienta.

## Inne tabele

### Subskrypcje biuletynu

Brak kluczy obcych. Kolumna `email` posiada unikalny indeks.

### hasłoResetTokens

Brak kluczy obcych. Złożony klucz podstawowy na `(identifier, token)`.

### Tokeny weryfikacji

Brak kluczy obcych. Złożony klucz podstawowy na `(identifier, token)`.

### polecane_przedmioty

Brak kluczy obcych. Używa `item_slug` do odwoływania się do elementów opartych na Git i `featured_by` jako zwykłego pola tekstowego (nie klucza obcego).

### ankiety

Brak kluczy obcych. Kolumna `slug` posiada unikalny indeks.

### dwadzieścia_crm_config

Brak kluczy obcych. Wzorzec singletonu wymuszony przez unikalny indeks wyrażenia.

### mapowania_integracji

Brak kluczy obcych. Unikalny indeks na `(ever_id, object_type)`.

### firmy

Brak kluczy obcych.

### status_nasiona

Tabela Singleton z unikalnym indeksem na `id`.

## Podsumowanie usuwania kaskadowego

Kiedy **użytkownik** zostanie usunięty, następujące elementy zostaną usunięte kaskadowo:

- Konta, sesje, uwierzytelniacze
- Profile klientów (oraz przechodnio: komentarze, głosy, raporty tego klienta, historia moderacji)
- Subskrypcje
- Rachunki płatnicze
- Powiadomienia
- Ulubione
- Przypisywanie ról użytkowników
- Dzienniki aktywności
- Reklamy sponsorskie

Kiedy **profil klienta** zostanie usunięty:

- Komentarze tego użytkownika
- Głosy tego użytkownika
- Raporty złożone przez tego użytkownika
- Historia moderacji dla tego użytkownika
- Dzienniki aktywności dla tego klienta

Kiedy **rola** zostanie usunięta:

- Wszystkie przypisania uprawnień ról dla tej roli
- Wszystkie przypisania ról użytkownika dla tej roli

## Referencje pozycji

Elementy są przechowywane w systemie CMS opartym na Git, a nie w bazie danych. Kilka tabel odwołuje się do elementów według ślimaka:

- `comments.itemId` — błąd przedmiotu
- `votes.item_id` — błąd przedmiotu
- `favorites.item_slug` — błąd przedmiotu
- `item_views.item_id` — błąd przedmiotu
- `featured_items.item_slug` — błąd przedmiotu
- `sponsor_ads.item_slug` — błąd przedmiotu

Są to kolumny zwykłego tekstu bez ograniczeń klucza obcego.

## Powiązana dokumentacja

- [Odniesienie do schematu](/template/database/schema-reference) -- Dokumentacja schematu na poziomie kolumny
- [Wzory Drizzle](/template/database/drizzle-patterns) -- Wzorce użycia ORM
- [Przewodnik po migracji](/template/database/migrations-guide) – Migracje baz danych
