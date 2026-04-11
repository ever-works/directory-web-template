---
id: session-management
title: Gestione delle Sessioni
sidebar_label: Gestione delle Sessioni
sidebar_position: 5
---

# Gestione delle Sessioni

## Strategia di Sessione

Il template supporta due strategie di sessione:
1. JWT (predefinita) - Senza stato, archiviata nei cookie
2. Database - Archiviata nel database, supporta la revoca

## Configurazione della Sessione

```typescript
// auth.config.ts
export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 giorni
  }
}
```

## Sicurezza

- I cookie HttpOnly prevengono XSS
- SameSite=Lax previene CSRF
- Aggiornamento automatico della sessione
- Flag Secure in produzione

## Disconnessione

La sessione viene cancellata alla disconnessione. Tutte le sessioni attive possono essere invalidate modificando AUTH_SECRET.
