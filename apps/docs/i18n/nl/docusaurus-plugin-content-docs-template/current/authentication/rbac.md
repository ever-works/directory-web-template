---
id: rbac
title: Rolgebaseerde toegangscontrole
sidebar_label: RBAC
sidebar_position: 4
---

# Rolgebaseerde toegangscontrole

## Overzicht

Het sjabloon implementeert RBAC met rollen opgeslagen in de database.

## Standaardrollen

| Rol | Beschrijving |
|-----|--------------|
| admin | Volledige systeemtoegang |
| moderator | Toegang voor contentmoderatie |
| user | Standaard geverifieerde toegang |
| guest | Beperkte openbare toegang |

## Rollen Toewijzen

Rollen worden toegewezen in de database. Beheerders kunnen rollen beheren via het beheerderspaneel op /admin/users.

## Rechten Controleren

```typescript
// In API-routes
const session = await auth();
if (!session?.user?.role || session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Routes Beveiligen

Gebruik middleware om routes te beveiligen op basis van rollen. De auth-middleware controleert sessie en rol voordat toegang wordt verleend.
