---
id: schema-reference
title: Odniesienie do schematu
sidebar_label: Odniesienie do schematu
sidebar_position: 1
---

# Odniesienie do schematu

Wszystkie tabele bazy danych są zdefiniowane w `lib/db/schema.ts`. Dokument ten kataloguje każdą tabelę, jej kluczowe kolumny, relacje i cel.

## Użytkownicy i uwierzytelnianie

### użytkownicy

Podstawowa tabela użytkowników używana przez NextAuth.js do uwierzytelniania.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID, wygenerowany automatycznie|
|`email`|tekst|Wyjątkowy|
|`image`|tekst|Adres URL zdjęcia profilowego|
|`emailVerified`|znacznik czasu|Data weryfikacji e-maila|
|`passwordHash`|tekst|Skrót Bcrypt do uwierzytelniania poświadczeń|
|`createdAt`|znacznik czasu|Automatyczne ustawianie|
|`updatedAt`|znacznik czasu|Automatyczne ustawianie|
|`deletedAt`|znacznik czasu|Miękkie usuwanie|

**Indeksy**: `users_created_at_idx`

### konta

Połączenia kont OAuth i poświadczeń zgodnie ze schematem adaptera NextAuth.js.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`userId`|tekst (FK)|Referencje `users.id` (usuwanie kaskadowe)|
|`type`|tekst|Typ konta (oauth, dane uwierzytelniające itp.)|
|`provider`|tekst|Nazwa dostawcy (google, github, dane uwierzytelniające)|
|`providerAccountId`|tekst|Identyfikator konta specyficzny dla dostawcy|
|`email`|tekst|Adres e-mail konta|
|`passwordHash`|tekst|W przypadku danych uwierzytelniających klienta|
|`refresh_token`|tekst|Token odświeżania OAuth|
|`access_token`|tekst|Token dostępu OAuth|
|`expires_at`|liczba całkowita|Wygaśnięcie tokena|

**Klucz podstawowy**: Kompozyt na (`provider`, `providerAccountId`)
**Indeksy**: `accounts_email_idx`, `accounts_provider_idx`

### sesje

Aktywne sesje użytkowników.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`sessionToken`|tekst (PK)|Identyfikator sesji|
|`userId`|tekst (FK)|Referencje `users.id`|
|`expires`|znacznik czasu|Wygaśnięcie sesji|

### Tokeny weryfikacji

Tokeny weryfikacyjne poczty elektronicznej.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`identifier`|tekst|Identyfikator użytkownika|
|`email`|tekst|Adres e-mail|
|`token`|tekst|Token weryfikacyjny|
|`expires`|znacznik czasu|Wygaśnięcie tokena|

**Klucz podstawowy**: Kompozyt na (`identifier`, `token`)

### uwierzytelniacze

Magazyn danych uwierzytelniających WebAuthn/FIDO2.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`credentialID`|tekst|Unikalny identyfikator danych uwierzytelniających|
|`userId`|tekst (FK)|Referencje `users.id`|
|`providerAccountId`|tekst|Numer konta dostawcy|
|`credentialPublicKey`|tekst|Klucz publiczny do weryfikacji|
|`counter`|liczba całkowita|Licznik uwierzytelniania|

### hasłoResetTokens

Tokeny resetowania hasła w przypadku zapomnienia hasła.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`email`|tekst|Docelowy e-mail|
|`token`|tekst|Unikalny token resetowania|
|`expires`|znacznik czasu|Wygaśnięcie tokena|

### dzienniki aktywności

Śledzi działania użytkowników i klientów do celów audytu.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|seryjny (PK)|Automatyczna inkrementacja|
|`userId`|tekst (FK)|Referencje `users.id` (zero)|
|`clientId`|tekst (FK)|Referencje `clientProfiles.id` (zero)|
|`action`|tekst|Typ działania (SIGN_UP, SIGN_IN itp.)|
|`timestamp`|znacznik czasu|Kiedy wystąpiła czynność|
|`ipAddress`|Varchar(45)|Adres IP klienta|

**Indeksy**: `activity_logs_user_idx`, `activity_logs_timestamp_idx`, `activity_logs_action_idx`

## Role i uprawnienia

### role

Definicje ról dla RBAC.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|Identyfikator roli (np. „admin”, „klient”)|
|`name`|tekst|Unikalna nazwa roli|
|`description`|tekst|Opis czytelny dla człowieka|
|`isAdmin`|wartość logiczna|Czy jest to rola administratora|
|`status`|tekst|„aktywny” lub „nieaktywny”|
|`created_by`|tekst|Kto stworzył tę rolę|

### uprawnienia

Szczegółowe definicje uprawnień.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`key`|tekst|Unikalny klucz uprawnień (np. „przedmioty: utwórz”)|
|`description`|tekst|Opis czytelny dla człowieka|

### rolaUprawnienia

Tabela łączenia wiele do wielu łącząca role z uprawnieniami.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`roleId`|tekst (FK)|Referencje `roles.id` (kaskada)|
|`permissionId`|tekst (FK)|Referencje `permissions.id` (kaskada)|

**Klucz podstawowy**: Kompozyt na (`roleId`, `permissionId`)

### Role użytkownika

Tabela łączenia wiele do wielu łącząca użytkowników z rolami.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`userId`|tekst (FK)|Referencje `users.id` (kaskada)|
|`roleId`|tekst (FK)|Referencje `roles.id` (kaskada)|

**Klucz podstawowy**: Kompozyt na (`userId`, `roleId`)

## Profile klientów

### Profile klienta

Rozszerzone informacje profilowe dla zarejestrowanych użytkowników klienta.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`userId`|tekst (FK)|Referencje `users.id` (unikalne, kaskadowe)|
|`email`|tekst|E-mail klienta|
|`name`|tekst|Pełne imię i nazwisko|
|`displayName`|tekst|Nazwa wyświetlana|
|`username`|tekst|Unikalna nazwa użytkownika|
|`bio`|tekst|Biografia użytkownika|
|`jobTitle`|tekst|Tytuł zawodowy|
|`company`|tekst|Nazwa firmy|
|`industry`|tekst|Sektor przemysłu|
|`phone`|tekst|Numer telefonu|
|`website`|tekst|Osobista witryna internetowa|
|`location`|tekst|Ciąg lokalizacji|
|`avatar`|tekst|Adres URL awatara|
|`accountType`|tekst|„osoba fizyczna”, „biznes” lub „przedsiębiorstwo”|
|`status`|tekst|„aktywny”, „nieaktywny”, „zawieszony”, „zablokowany”, „próbny”|
|`plan`|tekst|„bezpłatny”, „standardowy” lub „premium”|
|`timezone`|tekst|Strefa czasowa (domyślnie „UTC”)|
|`language`|tekst|Preferowany język (domyślnie „en”)|
|`country`|tekst|Kod kraju|
|`currency`|tekst|Preferowana waluta (domyślnie „USD”)|
|`defaultLatitude`|podwójne|Domyślna szerokość geograficzna lokalizacji|
|`defaultLongitude`|podwójne|Domyślna długość geograficzna lokalizacji|
|`twoFactorEnabled`|wartość logiczna|stan 2FA|
|`totalSubmissions`|liczba całkowita|Liczba zgłoszeń|
|`warningCount`|liczba całkowita|Liczba ostrzeżeń o moderacji|
|`suspendedAt`|znacznik czasu|Gdy zawieszony|
|`bannedAt`|znacznik czasu|Kiedy zakazane|

**Indeksy**: Wiele indeksów na `userId`, `email`, `status`, `plan`, `accountType`, `username`, `createdAt`

## Treść i zaangażowanie

### komentarze

Komentarze użytkowników dotyczące elementów.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`content`|tekst|Tekst komentarza|
|`userId`|tekst (FK)|Referencje `clientProfiles.id`|
|`itemId`|tekst|Problem z przedmiotem|
|`rating`|liczba całkowita|Ocena (0-5)|
|`editedAt`|znacznik czasu|Czas ostatniej edycji|
|`deletedAt`|znacznik czasu|Miękkie usuwanie|

### głosów

Głosuj w górę/w dół na elementy.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`userId`|tekst (FK)|Referencje `clientProfiles.id`|
|`itemId`|tekst|Problem z przedmiotem|
|`voteType`|tekst|„głosuj za” lub „głosuj przeciw”|

**Unikalny indeks**: (`userId`, `itemId`) — jeden głos na użytkownika na element

### ulubione

Ulubione użytkownika (zakładki).

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`userId`|tekst (FK)|Referencje `users.id`|
|`itemSlug`|tekst|Problem z przedmiotem|
|`itemName`|tekst|Zdenormalizowana nazwa elementu|
|`itemIconUrl`|tekst|Ikona zdenormalizowanego elementu|
|`itemCategory`|tekst|Kategoria zdenormalizowana|

**Unikalny indeks**: (`userId`, `itemSlug`)

### Wyświetlenia pozycji

Śledzi unikalne codzienne wyświetlenia przedmiotów na potrzeby analiz.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`itemId`|tekst|Problem z przedmiotem|
|`viewerId`|tekst|Anonimowy identyfikator przeglądarki oparty na plikach cookie|
|`viewedDateUtc`|tekst|Data w formacie RRRR-MM-DD|
|`viewedAt`|znacznik czasu|Dokładny czas oglądania|

**Unikalny indeks**: (`itemId`, `viewerId`, `viewedDateUtc`) – jedno wyświetlenie na widza dziennie

## Subskrypcje i płatności

### subskrypcje

Rekordy subskrypcji użytkowników obsługujące wielu dostawców płatności.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`userId`|tekst (FK)|Referencje `users.id`|
|`planId`|tekst|Identyfikator planu (bezpłatny, standardowy, premium)|
|`status`|tekst|aktywne, anulowane, wygasłe, oczekujące, wstrzymane|
|`paymentProvider`|tekst|pasek, lemonsqueezy, polar, solidgate|
|`subscriptionId`|tekst|Identyfikator subskrypcji dostawcy|
|`customerId`|tekst|Identyfikator klienta dostawcy|
|`autoRenewal`|wartość logiczna|Włączono automatyczne odnawianie|
|`cancelAtPeriodEnd`|wartość logiczna|Anuluj na koniec okresu|
|`amount`|liczba całkowita|Kwota abonamentu (centy)|
|`currency`|tekst|Kod waluty|
|`interval`|tekst|Okres rozliczeniowy (miesiąc, rok)|

**Indeksy**: `user_subscription_idx`, `subscription_status_idx`, `provider_subscription_idx` (unikalne)

### Historia subskrypcji

Ścieżka audytu zmian w subskrypcji.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`subscriptionId`|tekst (FK)|Referencje `subscriptions.id`|
|`action`|tekst|Zmień działanie|
|`previousStatus`|tekst|Stan przed zmianą|
|`newStatus`|tekst|Stan po zmianie|

### Dostawcy płatności

Rejestr dostępnych dostawców płatności.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`name`|tekst|Nazwa dostawcy (unikalna)|
|`isActive`|wartość logiczna|Czy dostawca jest włączony|

### Konta płatnicze

Łączy użytkowników z ich kontami dostawców usług płatniczych.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`userId`|tekst (FK)|Referencje `users.id`|
|`providerId`|tekst (FK)|Referencje `paymentProviders.id`|
|`customerId`|tekst|Identyfikator klienta dostawcy|

**Unikalne indeksy**: (`userId`, `providerId`), (`customerId`, `providerId`)

## Administracja i moderacja

### powiadomienia

Powiadomienia administratora w aplikacji.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`userId`|tekst (FK)|Referencje `users.id`|
|`type`|tekst|zgłoszenie_przedmiotu, zgłoszenie_komentarza itp.|
|`title`|tekst|Tytuł powiadomienia|
|`message`|tekst|Organ notyfikacyjny|
|`isRead`|wartość logiczna|Przeczytaj stan|

### raporty

System raportowania treści dla elementów i komentarzy.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`contentType`|tekst|„element” lub „komentarz”|
|`contentId`|tekst|Zgłoszony identyfikator treści|
|`reason`|tekst|spam, nękanie, nieodpowiednie, inne|
|`status`|tekst|w toku, przejrzane, rozwiązane, odrzucone|
|`resolution`|tekst|treść_usunięta, ostrzeżenie użytkownika itp.|
|`reportedBy`|tekst (FK)|Referencje `clientProfiles.id`|
|`reviewedBy`|tekst (FK)|Referencje `users.id`|

### moderacjaHistoria

Pełna historia działań moderacyjnych.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`userId`|tekst (FK)|Referencje `clientProfiles.id`|
|`action`|tekst|ostrzegaj, zawieszaj, banuj, cofaj zawieszenie, odbanuj, content_removed|
|`reportId`|tekst (FK)|Referencje `reports.id`|
|`performedBy`|tekst (FK)|Referencje `users.id`|
|`details`|jsonb|Dodatkowy kontekst|

### itemLogi audytu

Śledzi zmiany elementów w panelu administracyjnym.

|Kolumna|Wpisz|Notatki|
|--------|------|-------|
|`id`|tekst (PK)|UUID|
|`itemId`|tekst|Problem z elementem (nie FK; elementy znajdują się w Git)|
|`itemName`|tekst|Zdenormalizowana nazwa elementu|
|`action`|tekst|utworzony, zaktualizowany, zmieniony_status, sprawdzony, usunięty, przywrócony|
|`changes`|jsonb|Szczegóły zmian na poziomie pola|
|`performedBy`|tekst (FK)|Referencje `users.id`|

## Inne tabele

### sponsorReklamy

Reklamy przedmiotów sponsorowanych z pełnym cyklem płatności.

Kluczowe kolumny: `userId`, `itemSlug`, `status` (płatność oczekująca, oczekująca, odrzucona, aktywna, wygasła, anulowana), `interval` (tygodniowo, miesięcznie), `amount`, `paymentProvider`, `subscriptionId`.

### firmy/przedmiotyFirmy

Akta firmowe i powiązania między firmami i przedmiotami w przypadku wpisów do katalogów.

### ankiety / odpowiedzi na ankiety

Kreator ankiet z definicjami pytań w formacie JSON i przechowywaniem odpowiedzi.

### dwadzieściaCrmConfig / IntegrationMappings

Tabele integracji CRM dla funkcji synchronizacji Twenty CRM. Tabela konfiguracyjna wymusza wzorzec singletonu (dozwolony jest tylko jeden wiersz).

### Subskrypcje biuletynu

Śledzenie subskrypcji biuletynu e-mailowego ze znacznikami czasu subskrypcji/rezygnacji z subskrypcji.

### stan nasion

Stan inicjowania bazy danych tabeli Singleton (wypełnianie, ukończone, nieudane), aby zapobiec jednoczesnym operacjom inicjującym.

## Wpisz Eksport

Plik schematu eksportuje typy TypeScript dla każdej tabeli, korzystając z wnioskowania Drizzle:

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
// ... and so on for all tables
```

Typy te są używane w całej aplikacji do operacji na bazach danych bezpiecznych dla typów.
