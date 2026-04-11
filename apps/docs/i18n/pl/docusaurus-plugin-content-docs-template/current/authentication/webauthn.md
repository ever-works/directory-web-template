---
id: webauthn
title: WebAuthn / Passkeys
sidebar_label: WebAuthn
sidebar_position: 6
---

# WebAuthn / Passkeys

## Przegląd

WebAuthn umożliwia uwierzytelnianie bez hasła przy użyciu:
- Uwierzytelniania biometrycznego (odcisk palca, Face ID)
- Sprzętowych kluczy bezpieczeństwa (YubiKey)
- Uwierzytelniatorów platformy (Windows Hello, Touch ID)

## Konfiguracja

Włącz WebAuthn w auth.config.ts:
```typescript
import { WebAuthn } from 'next-auth/providers/webauthn';

providers: [
  WebAuthn,
]
```

## Wymagania

- HTTPS w środowisku produkcyjnym (localhost działa w trybie deweloperskim)
- Nowoczesna przeglądarka z obsługą WebAuthn
- Użytkownik musi mieć urządzenie obsługujące klucze passkey

## Doświadczenie Użytkownika

1. Użytkownik klika „Zaloguj się z Passkey"
2. Przeglądarka prosi o biometrię lub klucz bezpieczeństwa
3. Użytkownik się uwierzytelnia
4. Sesja utworzona
