---
id: session-management
title: Gerenciamento de Sessão
sidebar_label: Gerenciamento de Sessão
sidebar_position: 5
---

# Gerenciamento de Sessão

## Estratégia de Sessão

O template suporta duas estratégias de sessão:
1. JWT (padrão) - Sem estado, armazenada em cookies
2. Banco de dados - Armazenada no banco de dados, suporta revogação

## Configuração de Sessão

```typescript
// auth.config.ts
export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  }
}
```

## Segurança

- Cookies HttpOnly previnem XSS
- SameSite=Lax previne CSRF
- Atualização automática de sessão
- Flag Secure em produção

## Logout

A sessão é limpa no logout. Todas as sessões ativas podem ser invalidadas alterando AUTH_SECRET.
