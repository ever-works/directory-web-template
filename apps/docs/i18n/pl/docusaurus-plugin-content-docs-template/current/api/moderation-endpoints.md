---
id: moderation-endpoints
title: "System Moderacji"
sidebar_label: "Moderacja"
---

# System Moderacji

System moderacji zapewnia programową moderację treści poprzez warstwę usług, a nie oddzielne punkty końcowe API. Akcje moderacji są wyzwalane automatycznie, gdy administratorzy rozwiązują raporty treści za pośrednictwem API Raportów. System obsługuje ostrzeżenia użytkowników, zawieszanie kont, banowanie kont i usuwanie treści, z pełną historią audytu i powiadomieniami e-mail.

## Przegląd

Moderacja nie jest eksponowana jako oddzielne punkty końcowe REST. Zamiast tego jest wywoływana poprzez przepiływ pracy z rozwiązywaniem raportów:

```
PUT /api/admin/reports/[id]  -->  rozwiązanie wyzwala akcję moderacji
```

Gdy administrator ustawi wartość `resolution` w raporcie, odpowiednia funkcja moderacji wykonuje się automatycznie.

| Wartość rozwiązania | Funkcja moderacji | Efekt |
|---|---|---|
| `content_removed` | `removeContent()` | Miękkie usunięcie zgłoszonego komentarza lub elementu |
| `user_warned` | `warnUser()` | Zwiększa licznik ostrzeżeń użytkownika |
| `user_suspended` | `suspendUser()` | Ustawia status użytkownika na `"suspended"` |
| `user_banned` | `banUser()` | Ustawia status użytkownika na `"banned"` |
| `no_action` | Brak | Nie podejmuje żadnej akcji moderacji |

## Akcje Moderacji

### Usuń Treść

```typescript
removeContent(contentType, contentId, reportId, adminId): Promise<ModerationResult>
```

Usuwa zgłoszoną treść na podstawie jej typu. W przypadku komentarzy wykonuje miękkie usunięcie (ustawia `deletedAt`). W przypadku elementów usuwa element z repozytorium treści opartego na Git.

**Parametry:**

| Parametr | Typ | Opis |
|---|---|---|
| `contentType` | `"item"` lub `"comment"` | Typ treści do usunięcia |
| `contentId` | string | ID lub slug treści |
| `reportId` | string | Powiązany ID raportu |
| `adminId` | string | Administrator wykonujący akcję |

**Kroki przetwarzania:**

1. Odszukaj właściciela treści za pomocą `getContentOwner()`
2. Jeśli komentarz: miękkie usunięcie przez `deleteComment()`
3. Jeśli element: usuń z repozytorium Git przez `itemRepository.delete()`
4. Rejestruj historię moderacji z akcją `CONTENT_REMOVED`
5. Wyślij e-mail z powiadomieniem o usunięciu treści do właściciela

### Ostrzeż Użytkownika

```typescript
warnUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Wydaje ostrzeżenie użytkownikowi poprzez zwiększenie pola `warningCount`. Użytkownicy, którzy są już zbanowani, nie mogą otrzymywać ostrzeżeń.

**Wynik sukcesu:**

```json
{
  "success": true,
  "message": "User warned successfully. Total warnings: 3"
}
```

### Zawiesz Użytkownika

```typescript
suspendUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Zawiesza konto użytkownika poprzez ustawienie jego statusu na `"suspended"` i rejestrowanie znacznika czasu `suspendedAt`. Zawieszeni użytkownicy nie mogą tworzyć komentarzy, przesyłać głosów ani składać raportów.

**Zabezpieczenia:**

- Zwraca błąd, jeśli użytkownik jest już zawieszony
- Zwraca błąd, jeśli użytkownik jest już zbanowany

### Zbanuj Użytkownika

```typescript
banUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Na stałe banuje konto użytkownika poprzez ustawienie jego statusu na `"banned"` i rejestrowanie znacznika czasu `bannedAt`. Zbanowani użytkownicy są zablokowani od wszystkich uwierzytelnionych akcji.

**Zabezpieczenia:**

- Zwraca błąd, jeśli użytkownik jest już zbanowany

## Rozwiązywanie Właściciela Treści

Funkcja `getContentOwner()` określa, kto jest właścicielem zgłoszonej treści:

| Typ treści | Źródło właściciela |
|---|---|
| `comment` | Pole `comment.userId` z tabeli komentarzy |
| `item` | Pole `item.submitted_by` z repozytorium elementów |

## Historia Moderacji

Wszystkie akcje moderacji tworzą ścierżke audytu w tabeli bazy danych `moderationHistory`.

### Pola rekordu historii

| Pole | Typ | Opis |
|---|---|---|
| `id` | string | Unikalny ID rekordu |
| `userId` | string | ID profilu klienta dotkniętego użytkownika |
| `action` | string | `"CONTENT_REMOVED"`, `"WARN"`, `"SUSPEND"` lub `"BAN"` |
| `reason` | string lub null | Powód akcji moderacji |
| `reportId` | string lub null | Powiązany ID raportu |
| `performedBy` | string lub null | ID administratora, który wykonał akcję |
| `contentType` | string lub null | `"item"` lub `"comment"` (przy usuwaniu treści) |
| `contentId` | string lub null | ID usuwanej treści |
| `details` | object lub null | Dodatkowy kontekst (np. liczba ostrzeżeń, nazwa elementu) |
| `createdAt` | timestamp | Kiedy akcja została wykonana |

## Zarządzanie Statusem Użytkownika

### Wartości statusu

| Status | Opis |
|---|---|
| `active` | Normalne konto, wszystkie funkcje dostępne |
| `suspended` | Tymczasowo ograniczone, nie może tworzyć treści |
| `banned` | Na stałe ograniczone, zablokowane od wszystkich akcji |

## Powiadomienia E-mail

`EmailNotificationService` wysyła nieblokujące powiadomienia o akcjach moderacji:

| Metoda | Wyzwalacz |
|---|---|
| `sendContentRemovedEmail(email, type, reason)` | Treść usunięta przez administratora |
| `sendUserWarningEmail(email, reason, count)` | Wydano ostrzeżenie |
| `sendUserSuspensionEmail(email, reason)` | Konto zawieszone |
| `sendUserBanEmail(email, reason)` | Konto zbanowane |

Wszystkie wysyłki e-mail używają `.catch()`, aby zapobiec błędom przerywającym przepiływ pracy moderacji.

## Kluczowe Szczegóły Implementacji

- **Wzorzec warstwy usług:** Logika moderacji żyje w `lib/services/moderation.service.ts`, nie w obsługach tras API.
- **Ścieżka audytu:** Każda akcja moderacji tworzy rekord `moderationHistory`, zapewniając kompletny dziennik audytu.
- **Nieblokujące e-maile:** Powiadomienia e-mail są wysyłane asynchronicznie z obsługą `.catch()`. Jeśli usługa e-mail jest niedostępna, akcja moderacji nadal się powiedzie.
- **Zabezpieczenia idempotencji:** Każda akcja sprawdza aktualny status użytkownika przed kontynuowaniem. Banowanie już zbanowanego użytkownika zwraca błąd zamiast tworzyć zduplikowaną akcję.
- **Miękkie usunięcie vs twarde usunięcie:** Komentarze są miękko usuwane (ustawiając `deletedAt`), podczas gdy elementy są w pełni usuwane z repozytorium Git.
