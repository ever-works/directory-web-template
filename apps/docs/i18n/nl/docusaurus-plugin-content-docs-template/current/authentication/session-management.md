---
id: session-management
title: Sessiebeheer
sidebar_label: Sessiebeheer
sidebar_position: 5
---

# Sessiebeheer

## Sessiestrategie

Het sjabloon ondersteunt twee sessiestrategieën:
1. JWT (standaard) – Staatloos, opgeslagen in cookies
2. Database – Opgeslagen in database, ondersteunt intrekking

## Sessieconfiguratie

```typescript
// auth.config.ts
export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dagen
  }
}
```

## Beveiliging

- HttpOnly-cookies voorkomen XSS
- SameSite=Lax voorkomt CSRF
- Automatische sessie vernieuwing
- Secure-vlag in productie

## Uitloggen

Sessie wordt gewist bij uitloggen. Alle actieve sessies kunnen ongeldig worden gemaakt door AUTH_SECRET te wijzigen.
