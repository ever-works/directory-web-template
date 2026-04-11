---
id: rbac
title: Kontrola Dostępu Oparta na Rolach
sidebar_label: RBAC
sidebar_position: 4
---

# Kontrola Dostępu Oparta na Rolach

## Przegląd

Szablon implementuje RBAC z rolami przechowywanymi w bazie danych.

## Domyślne Role

| Rola | Opis |
|------|------|
| admin | Pełny dostęp do systemu |
| moderator | Dostęp do moderacji treści |
| user | Standardowy uwierzytelniony dostęp |
| guest | Ograniczony publiczny dostęp |

## Przypisywanie Ról

Role są przypisywane w bazie danych. Użytkownicy administracyjni mogą zarządzać rolami poprzez panel administracyjny pod /admin/users.

## Sprawdzanie Uprawnień

```typescript
// W trasach API
const session = await auth();
if (!session?.user?.role || session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Ochrona Tras

Użyj oprogramowania pośredniczącego do ochrony tras na podstawie ról. Oprogramowanie pośredniczące auth sprawdza sesję i rolę przed udzieleniem dostępu.
