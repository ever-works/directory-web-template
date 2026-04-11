---
id: setup-guide
title: Guia de Configuração da Autenticação
sidebar_label: Guia de Configuração
sidebar_position: 2
---

# Guia de Configuração da Autenticação

Como configurar a autenticação em sua aplicação Ever Works.

## Variáveis de Ambiente Necessárias

```env
AUTH_SECRET="your-generated-secret"
NEXTAUTH_SECRET="same-as-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Gerar Segredo Seguro:
```bash
openssl rand -base64 32
# ou
npx auth secret
```

## Configuração do Provedor OAuth

Adicionar a .env.local:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

## Configuração do NextAuth.js

A configuração de autenticação está em apps/web/auth.config.ts. Inclui:
- Estratégia de sessão: JWT
- Callbacks para dados de sessão
- Manipuladores de eventos para criação de usuário

## Testando a Autenticação

1. Iniciar servidor de desenvolvimento: pnpm run dev
2. Ir para http://localhost:3000/sign-in
3. Testar com credenciais
4. Testar fluxos OAuth
