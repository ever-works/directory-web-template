---
id: webauthn
title: WebAuthn / Passkeys
sidebar_label: WebAuthn
sidebar_position: 6
---

# WebAuthn / Passkeys

## Overzicht

WebAuthn maakt wachtwoordloze authenticatie mogelijk met:
- Biometrische authenticatie (vingerafdruk, Face ID)
- Hardware beveiligingssleutels (YubiKey)
- Platform authenticators (Windows Hello, Touch ID)

## Instellen

WebAuthn inschakelen in auth.config.ts:
```typescript
import { WebAuthn } from 'next-auth/providers/webauthn';

providers: [
  WebAuthn,
]
```

## Vereisten

- HTTPS in productie (localhost werkt in ontwikkeling)
- Moderne browser met WebAuthn-ondersteuning
- Gebruiker moet een passkey-geschikt apparaat hebben

## Gebruikerservaring

1. Gebruiker klikt op "Inloggen met Passkey"
2. Browser vraagt om biometrie of beveiligingssleutel
3. Gebruiker authenticeert
4. Sessie aangemaakt
