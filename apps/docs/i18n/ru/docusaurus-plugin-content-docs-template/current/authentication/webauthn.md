---
id: webauthn
title: WebAuthn / Passkeys
sidebar_label: WebAuthn
sidebar_position: 6
---

# WebAuthn / Passkeys

## Обзор

WebAuthn обеспечивает беспарольную аутентификацию с использованием:
- Биометрической аутентификации (отпечаток пальца, Face ID)
- Аппаратных ключей безопасности (YubiKey)
- Платформенных аутентификаторов (Windows Hello, Touch ID)

## Настройка

Включите WebAuthn в auth.config.ts:
```typescript
import { WebAuthn } from 'next-auth/providers/webauthn';

providers: [
  WebAuthn,
]
```

## Требования

- HTTPS в production (localhost работает в разработке)
- Современный браузер с поддержкой WebAuthn
- Пользователь должен иметь устройство с поддержкой passkey

## Пользовательский Опыт

1. Пользователь нажимает «Войти с Passkey»
2. Браузер запрашивает биометрию или ключ безопасности
3. Пользователь аутентифицируется
4. Сессия создана
