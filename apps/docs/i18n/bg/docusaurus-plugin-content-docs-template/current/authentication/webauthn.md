---
id: webauthn
title: WebAuthn / Passkeys
sidebar_label: WebAuthn
sidebar_position: 6
---

# WebAuthn / Passkeys

## Преглед

WebAuthn позволява удостоверяване без парола чрез:
- Биометрично удостоверяване (пръстов отпечатък, Face ID)
- Хардуерни ключове за сигурност (YubiKey)
- Платформени удостоверители (Windows Hello, Touch ID)

## Настройка

Активирайте WebAuthn в auth.config.ts:
```typescript
import { WebAuthn } from 'next-auth/providers/webauthn';

providers: [
  WebAuthn,
]
```

## Изисквания

- HTTPS в продукция (localhost работи в разработка)
- Съвременен браузър с поддръжка на WebAuthn
- Потребителят трябва да има устройство, съвместимо с passkey

## Потребителско Изживяване

1. Потребителят кликва „Влизане с Passkey"
2. Браузърът иска биометрия или ключ за сигурност
3. Потребителят се удостоверява
4. Сесията е създадена
