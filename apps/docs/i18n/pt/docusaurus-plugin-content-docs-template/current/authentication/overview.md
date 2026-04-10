---
id: overview
title: Visão Geral da Autenticação
sidebar_label: Visão Geral
sidebar_position: 1
---

# Visão Geral da Autenticação

O Ever Works fornece um sistema de autenticação flexível e seguro que suporta múltiplos provedores e métodos de autenticação.

## Arquitetura de Autenticação

O template utiliza uma abordagem de autenticação híbrida, suportando tanto NextAuth.js quanto Supabase Auth simultaneamente, permitindo que você escolha a melhor solução para suas necessidades.

(mermaid diagram - keep as-is)

## Métodos de Autenticação Suportados

### 1. Provedores OAuth

NextAuth.js OAuth suporta: Google, GitHub, Facebook, Twitter/X, Microsoft
Supabase OAuth suporta: Google, GitHub, Facebook, Twitter/X, Discord, Apple

### 2. Autenticação por Email/Senha

NextAuth.js Credentials: Email/senha personalizado, hashing bcrypt, armazenamento de sessão no banco de dados
Supabase Auth: Email/senha integrado, verificação de email, redefinição de senha

### 3. Magic Links
Supabase Auth: Autenticação sem senha via magic links por email

### 4. WebAuthn / Passkeys
NextAuth.js: Autenticação biométrica, chaves de segurança de hardware, FIDO2

## Gerenciamento de Sessão
Tokens JWT para autenticação sem estado, sessões de banco de dados para estado persistente, manipulação segura de cookies, atualização automática de token

## Recursos de Segurança
Proteção CSRF, limitação de taxa, proteção contra força bruta, hashing seguro de senha com bcrypt
