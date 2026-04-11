---
id: rbac
title: Controle de Acesso Baseado em Funções
sidebar_label: RBAC
sidebar_position: 4
---

# Controle de Acesso Baseado em Funções

## Visão Geral

O template implementa RBAC com funções armazenadas no banco de dados.

## Funções Padrão

| Função | Descrição |
|--------|-----------|
| admin | Acesso total ao sistema |
| moderator | Acesso à moderação de conteúdo |
| user | Acesso autenticado padrão |
| guest | Acesso público limitado |

## Atribuindo Funções

As funções são atribuídas no banco de dados. Usuários administradores podem gerenciar funções através do painel de administração em /admin/users.

## Verificando Permissões

```typescript
// Em rotas de API
const session = await auth();
if (!session?.user?.role || session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Protegendo Rotas

Use middleware para proteger rotas com base em funções. O middleware de autenticação verifica sessão e função antes de permitir o acesso.
