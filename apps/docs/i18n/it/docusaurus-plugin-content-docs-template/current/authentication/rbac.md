---
id: rbac
title: Controllo degli Accessi Basato sui Ruoli
sidebar_label: RBAC
sidebar_position: 4
---

# Controllo degli Accessi Basato sui Ruoli

## Panoramica

Il template implementa RBAC con i ruoli memorizzati nel database.

## Ruoli Predefiniti

| Ruolo | Descrizione |
|-------|-------------|
| admin | Accesso completo al sistema |
| moderator | Accesso alla moderazione dei contenuti |
| user | Accesso autenticato standard |
| guest | Accesso pubblico limitato |

## Assegnazione dei Ruoli

I ruoli vengono assegnati nel database. Gli utenti admin possono gestire i ruoli tramite la dashboard amministrativa su /admin/users.

## Verifica dei Permessi

```typescript
// Nelle route API
const session = await auth();
if (!session?.user?.role || session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Protezione delle Route

Utilizzare il middleware per proteggere le route in base ai ruoli. Il middleware auth verifica la sessione e il ruolo prima di consentire l'accesso.
