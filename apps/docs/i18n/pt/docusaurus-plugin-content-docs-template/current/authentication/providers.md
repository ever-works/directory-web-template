---
id: providers
title: Provedores de Autenticação
sidebar_label: Provedores
sidebar_position: 3
---

# Provedores de Autenticação

## Provedores Suportados

### Google OAuth
1. Ir para o Google Cloud Console
2. Criar credenciais OAuth 2.0
3. Adicionar URI de redirecionamento: http://localhost:3000/api/auth/callback/google
4. Definir GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET

### GitHub OAuth
1. Ir para Configurações do GitHub > Configurações do desenvolvedor > OAuth Apps
2. Novo OAuth App
3. URL de callback: http://localhost:3000/api/auth/callback/github
4. Definir GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET

### Facebook OAuth
1. Ir para developers.facebook.com
2. Criar App
3. Adicionar produto Facebook Login
4. Definir FACEBOOK_CLIENT_ID e FACEBOOK_CLIENT_SECRET

### Microsoft OAuth
1. Ir para Azure Active Directory
2. Registrar nova aplicação
3. Adicionar URI de redirecionamento
4. Definir MICROSOFT_CLIENT_ID e MICROSOFT_CLIENT_SECRET

### Credenciais (Email/Senha)
Provedor integrado para autenticação por email e senha. Usa bcrypt para hashing de senha.
