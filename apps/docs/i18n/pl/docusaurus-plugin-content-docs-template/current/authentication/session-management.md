---
id: session-management
title: Zarządzanie Sesją
sidebar_label: Zarządzanie Sesją
sidebar_position: 5
---

# Zarządzanie Sesją

## Strategia Sesji

Szablon obsługuje dwie strategie sesji:
1. JWT (domyślna) - Bezstanowa, przechowywana w plikach cookie
2. Baza danych - Przechowywana w bazie danych, obsługuje unieważnianie

## Konfiguracja Sesji

```typescript
// auth.config.ts
export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dni
  }
}
```

## Bezpieczeństwo

- Pliki cookie HttpOnly zapobiegają XSS
- SameSite=Lax zapobiega CSRF
- Automatyczne odświeżanie sesji
- Flaga Secure w środowisku produkcyjnym

## Wylogowanie

Sesja jest czyszczona przy wylogowaniu. Wszystkie aktywne sesje można unieważnić, zmieniając AUTH_SECRET.
