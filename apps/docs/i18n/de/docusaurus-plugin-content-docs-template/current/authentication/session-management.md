---
id: session-management
title: Sitzungsverwaltung
sidebar_label: Sitzungsverwaltung
sidebar_position: 5
---

# Sitzungsverwaltung

## Sitzungsstrategie

Die Vorlage unterstützt zwei Sitzungsstrategien:
1. JWT (Standard) – Zustandslos, in Cookies gespeichert
2. Datenbank – In der Datenbank gespeichert, unterstützt Widerruf

## Sitzungskonfiguration

```typescript
// auth.config.ts
export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 Tage
  }
}
```

## Sicherheit

- HttpOnly-Cookies verhindern XSS
- SameSite=Lax verhindert CSRF
- Automatische Sitzungsaktualisierung
- Secure-Flag in der Produktion

## Abmelden

Die Sitzung wird beim Abmelden gelöscht. Alle aktiven Sitzungen können durch Ändern von AUTH_SECRET ungültig gemacht werden.
