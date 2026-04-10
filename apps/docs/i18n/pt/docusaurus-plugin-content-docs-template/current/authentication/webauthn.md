---
id: webauthn
title: WebAuthn / Passkeys
sidebar_label: WebAuthn
sidebar_position: 6
---

# WebAuthn / Passkeys

## Visão Geral

WebAuthn permite autenticação sem senha usando:
- Autenticação biométrica (impressão digital, Face ID)
- Chaves de segurança de hardware (YubiKey)
- Autenticadores de plataforma (Windows Hello, Touch ID)

## Configuração

Habilitar WebAuthn em auth.config.ts:
```typescript
import { WebAuthn } from 'next-auth/providers/webauthn';

providers: [
  WebAuthn,
]
```

## Requisitos

- HTTPS em produção (localhost funciona em desenvolvimento)
- Navegador moderno com suporte a WebAuthn
- O usuário deve ter um dispositivo compatível com passkey

## Experiência do Usuário

1. Usuário clica em "Entrar com Passkey"
2. Navegador solicita biometria ou chave de segurança
3. Usuário autenticado
4. Sessão criada
