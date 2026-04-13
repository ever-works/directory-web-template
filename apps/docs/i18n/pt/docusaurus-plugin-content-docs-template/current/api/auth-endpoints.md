---
id: auth-endpoints
title: Endpoints de API de Autenticação
sidebar_label: Endpoints de Auth
---

# Endpoints de API de Autenticação

Os endpoints de autenticação gerenciam o roteamento do NextAuth.js, gerenciamento de senhas e recuperação de sessão do usuário atual. A rota catch-all principal do NextAuth gerencia automaticamente todos os callbacks OAuth, gerenciamento de sessão e proteção CSRF.

## Handler do NextAuth (`/api/auth/[...nextauth]`)

A rota catch-all exporta os handlers do NextAuth de `lib/auth/index.ts`:

```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

Esta única rota gerencia todas as operações do NextAuth:

### Endpoints GET (via NextAuth)

| Caminho | Descrição |
|---------|-----------|
| `/api/auth/signin` | Renderizar página de login ou redirecionar para provedor |
| `/api/auth/signout` | Processar logout |
| `/api/auth/session` | Obter sessão atual como JSON |
| `/api/auth/csrf` | Obter token CSRF |
| `/api/auth/providers` | Listar provedores de auth disponíveis |
| `/api/auth/callback/[provider]` | Handler de callback OAuth |

### Endpoints POST (via NextAuth)

| Caminho | Descrição |
|---------|-----------|
| `/api/auth/signin/[provider]` | Iniciar login com provedor |
| `/api/auth/signout` | Processar logout |
| `/api/auth/callback/credentials` | Processar login com credenciais |
| `/api/auth/_log` | Log interno do Auth.js |

### Fluxo de Callback OAuth

Quando um usuário se autentica com um provedor OAuth:

```
1. Usuário clica em "Entrar com Google"
2. Redirecionamento para a tela de consentimento do Google
3. Google redireciona de volta para /api/auth/callback/google
4. NextAuth verifica o código OAuth
5. Callback signIn executa (lib/auth/index.ts)
   -> Valida e-mail do usuário
   -> Permite vinculação de conta para OAuth
6. Callback jwt enriquece o token
   -> Define userId, provider, isAdmin
   -> Cria perfil de cliente para novos usuários OAuth
7. Sessão criada, usuário redirecionado para a URL de callback
```

### Páginas Personalizadas

O NextAuth está configurado para usar páginas de autenticação personalizadas em vez da UI padrão do NextAuth:

| Finalidade | Caminho Personalizado |
|------------|----------------------|
| Login | `/auth/signin` |
| Logout | `/auth/signout` |
| Erro | `/auth/error` |
| Verificar Solicitação | `/auth/verify-request` |
| Registro de Novo Usuário | `/auth/register` |

## Gerenciamento de Senha (`/api/auth/change-password`)

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `POST` | `/api/auth/change-password` | Alterar senha do usuário autenticado |

### Corpo da solicitação

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

### Autenticação

Requer sessão válida. O endpoint verifica a senha atual antes de atualizar.

### Resposta

```json
// Sucesso
{ "success": true, "message": "Password changed successfully" }

// Erro
{ "success": false, "error": "Current password is incorrect" }
```

## Usuário Atual (`/api/current-user`)

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/current-user` | Obter dados do usuário autenticado atual |

### Resposta

Retorna o objeto de usuário da sessão enriquecido com campos específicos da aplicação:

```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "isAdmin": false,
    "clientProfileId": "profile-uuid",
    "provider": "google"
  }
}
```

### Resposta sem Autenticação

Retorna `null` ou status `401` quando não há sessão válida.

## Gerenciamento de Token de Sessão

O NextAuth armazena tokens de sessão em cookies HTTP-only:

| Nome do Cookie | Ambiente |
|----------------|----------|
| `next-auth.session-token` | Desenvolvimento (HTTP) |
| `__Secure-next-auth.session-token` | Produção (HTTPS) |

### Proteção CSRF

O NextAuth inclui proteção CSRF integrada. Um cookie de token CSRF (`next-auth.csrf-token`) é definido no cliente e deve ser incluído nas requisições POST para endpoints do NextAuth.

## Tratamento de Erros

Os erros de autenticação são mapeados para mensagens amigáveis ao usuário em `lib/auth/error-handler.ts`:

| Padrão de Erro | Mensagem ao Usuário |
|----------------|---------------------|
| Relacionado a `GOOGLE_CLIENT_ID` | A autenticação com Google não está configurada corretamente |
| Relacionado a `GITHUB_CLIENT_ID` | A autenticação com GitHub não está configurada corretamente |
| Relacionado a `FB_CLIENT_ID` | A autenticação com Facebook não está configurada corretamente |
| Relacionado a `MICROSOFT_CLIENT_ID` | A autenticação com Microsoft não está configurada corretamente |
| Relacionado a `SUPABASE` | A autenticação com Supabase não está configurada corretamente |
| Relacionado a `NEXTAUTH` | O NextAuth não está configurado corretamente |

A função `handleAuthError()` captura esses erros e retorna uma resposta estruturada `{ error: string }`.

## Eventos de Auth

A configuração do NextAuth em `lib/auth/index.ts` gerencia eventos de ciclo de vida:

### Evento de Logout

Invalida o cache de sessão do usuário para garantir que dados de sessão desatualizados não sejam servidos:

```typescript
events: {
  signOut: async (event) => {
    const token = 'token' in event ? event.token : undefined;
    if (token?.userId) {
      await invalidateSessionCache(undefined, token.userId);
    }
  }
}
```

### Evento de Atualização de Usuário

Invalida o cache de sessão quando os dados do usuário mudam (ex.: atualização de perfil, mudança de função):

```typescript
events: {
  updateUser: async ({ user }) => {
    if (user?.id) {
      await invalidateSessionCache(undefined, user.id);
    }
  }
}
```

## Configuração Relacionada

| Arquivo | Finalidade |
|---------|-----------|
| `auth.config.ts` | Configuração de provedores de nível superior |
| `lib/auth/index.ts` | Instância NextAuth com callbacks e eventos |
| `lib/auth/providers.ts` | Fábrica de provedores OAuth |
| `lib/auth/credentials.ts` | Provedor de e-mail/senha |
| `lib/auth/cached-session.ts` | Camada de cache de sessão |
| `lib/auth/admin-guard.ts` | Middleware de rota de administrador |
