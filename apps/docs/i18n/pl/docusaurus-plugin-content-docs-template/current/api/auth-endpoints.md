---
id: auth-endpoints
title: Punkty końcowe API Uwierzytelniania
sidebar_label: Auth Endpoints
sidebar_position: 4
---

# Punkty końcowe API Uwierzytelniania

Architektura uwierzytelniania opiera się na NextAuth.js (Auth.js v5) z niestandardowymi rozszerzeniami dla zarządzania hasłami i informacjami o bieżącym użytkowniku.

## Przegląd tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET/POST` | `/api/auth/[...nextauth]` | Brak | Obsługa NextAuth (sesja, logowanie, wylogowanie, callback OAuth) |
| `POST` | `/api/auth/change-password` | Zalogowany użytkownik | Zmień hasło |
| `GET` | `/api/current-user` | Opcjonalne | Pobierz dane bieżącej sesji użytkownika |

---

## Procedura obsługi NextAuth

```
GET /api/auth/[...nextauth]
POST /api/auth/[...nextauth]
```

Znormalizowana procedura obsługi NextAuth. Obsługuje wszystkie standardowe przepływy OAuth, sesji i CSRF.

**Uwierzytelnianie:** Brak (zarządzane wewnętrznie przez NextAuth)

### Punkty końcowe NextAuth

| Punkt końcowy | Metoda | Opis |
|---------------|--------|------|
| `/api/auth/session` | GET | Pobierz bieżącą sesję użytkownika |
| `/api/auth/signin` | GET/POST | Inicjuj logowanie |
| `/api/auth/signout` | POST | Wyloguj użytkownika |
| `/api/auth/callback/[provider]` | GET | Callback OAuth |
| `/api/auth/csrf` | GET | Pobierz token CSRF |
| `/api/auth/providers` | GET | Wyświetl skonfigurowanych dostawców |

---

## Przepływ callbacku OAuth

Przepływ autoryzacji OAuth przebiega w następujący sposób:

1. Użytkownik klika "Zaloguj się przez [Provider]"
2. NextAuth przekierowuje do strony autoryzacji dostawcy
3. Po autoryzacji dostawca przekierowuje z powrotem do `/api/auth/callback/[provider]`
4. NextAuth weryfikuje kod autoryzacji
5. Tworzone lub aktualizowane jest konto użytkownika
6. Przypisywana jest sesja JWT
7. Użytkownik jest przekierowywany na stronę `callbackUrl`

---

## Niestandardowe strony

| Strona | Ścieżka | Opis |
|--------|---------|------|
| Logowanie | `/auth/signin` | Niestandardowy formularz logowania |
| Rejestracja | `/auth/signup` | Formularz rejestracji nowych użytkowników |
| Błąd | `/auth/error` | Strona błędu uwierzytelniania |
| Weryfikacja | `/auth/verify-request` | Potwierdzenie wysłania linku |

---

## Zmień hasło

```
POST /api/auth/change-password
```

Zmienia hasło zalogowanego użytkownika po weryfikacji bieżącego hasła.

**Uwierzytelnianie:** Wymagana aktywna sesja

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `currentPassword` | string | Tak | Bieżące hasło użytkownika |
| `newPassword` | string | Tak | Nowe hasło (min. 8 znaków) |
| `confirmPassword` | string | Tak | Potwierdzenie nowego hasła |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "message": "Hasło zostało zmienione pomyślnie"
}
```

**Kody błędów:**

| Kod | Opis |
|-----|------|
| 400 | Brakujące pola, hasła nie zgadzają się lub nie spełniają wymagań |
| 401 | Brak sesji lub nieprawidłowe bieżące hasło |
| 500 | Wewnętrzny błąd serwera |

---

## Bieżący użytkownik

```
GET /api/current-user
```

Zwraca dane zalogowanego użytkownika z sesji.

**Uwierzytelnianie:** Opcjonalne — zwraca `null` dla niezalogowanych użytkowników (bez błędu 401)

**Buforowanie:** Wyłączone — zawsze zwraca aktualne dane sesji.

**Odpowiedź sukcesu (200) — zalogowany:**

```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "image": "https://example.com/avatar.jpg"
  }
}
```

**Odpowiedź sukcesu (200) — niezalogowany:**

```json
{
  "success": true,
  "data": null
}
```

---

## Ciasteczka sesji

| Nazwa ciasteczka | Opis |
|-----------------|------|
| `next-auth.session-token` | Zaszyfrowany token sesji JWT (HTTP, Secure) |
| `next-auth.csrf-token` | Token ochrony CSRF |
| `next-auth.callback-url` | Adres URL przekierowania po logowaniu |

---

## Ochrona CSRF

NextAuth automatycznie obsługuje ochronę CSRF dla wszystkich punktów końcowych POST. Token `next-auth.csrf-token` musi być zawarty w żądaniach formularzy.

---

## Obsługa błędów

| Wzorzec błędu | Komunikat |
|---------------|-----------|
| `OAuthSignin` | Błąd podczas inicjowania OAuth |
| `OAuthCallback` | Błąd podczas callbacku OAuth |
| `OAuthCreateAccount` | Nie można utworzyć konta OAuth |
| `EmailCreateAccount` | Nie można utworzyć konta e-mail |
| `Callback` | Ogólny błąd callbacku |
| `OAuthAccountNotLinked` | Adres e-mail powiązany z innym dostawcą |
| `EmailSignin` | Błąd wysyłania e-maila |
| `CredentialsSignin` | Nieprawidłowe dane logowania |
| `SessionRequired` | Dostęp wymaga sesji |

---

## Zdarzenia Auth

| Zdarzenie | Opis |
|-----------|------|
| `signOut` | Wywoływane gdy użytkownik wyloguje się |
| `updateUser` | Wywoływane gdy dane użytkownika są aktualizowane |

---

## Powiązane pliki konfiguracyjne

| Plik | Opis |
|------|------|
| `auth.config.ts` | Konfiguracja NextAuth (dostawcy, strony, wywołania zwrotne) |
| `lib/auth.ts` | Pomocnicze funkcje uwierzytelniające |
| `lib/db/schema.ts` | Schema bazy danych tabel użytkowników i sesji |
| `.env.local` | `AUTH_SECRET`, opcjonalne zmienne aplikacji OAuth |

**Źródło:** `template/app/api/auth/**`, `template/app/api/current-user/**`
