---
id: rbac
title: Rollenbasierte Zugriffskontrolle
sidebar_label: RBAC
sidebar_position: 4
---

# Rollenbasierte Zugriffskontrolle

## Überblick

Die Vorlage implementiert RBAC mit in der Datenbank gespeicherten Rollen.

## Standardrollen

| Rolle | Beschreibung |
|-------|--------------|
| admin | Vollständiger Systemzugriff |
| moderator | Zugriff zur Inhaltsmoderation |
| user | Standardmäßiger authentifizierter Zugriff |
| guest | Begrenzter öffentlicher Zugriff |

## Rollen zuweisen

Rollen werden in der Datenbank zugewiesen. Admin-Benutzer können Rollen über das Admin-Dashboard unter /admin/users verwalten.

## Berechtigungen prüfen

```typescript
// In API-Routen
const session = await auth();
if (!session?.user?.role || session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Routen schützen

Verwenden Sie Middleware, um Routen basierend auf Rollen zu schützen. Die Auth-Middleware prüft Sitzung und Rolle, bevor der Zugriff gewährt wird.
