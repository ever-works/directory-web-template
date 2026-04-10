---
id: webauthn
title: WebAuthn / Passkeys
sidebar_label: WebAuthn
sidebar_position: 6
---

# WebAuthn / Passkeys

## Überblick

WebAuthn ermöglicht passwortlose Authentifizierung mit:
- Biometrische Authentifizierung (Fingerabdruck, Face ID)
- Hardware-Sicherheitsschlüssel (YubiKey)
- Plattform-Authentifikatoren (Windows Hello, Touch ID)

## Einrichtung

WebAuthn in auth.config.ts aktivieren:
```typescript
import { WebAuthn } from 'next-auth/providers/webauthn';

providers: [
  WebAuthn,
]
```

## Anforderungen

- HTTPS in der Produktion (localhost funktioniert in der Entwicklung)
- Moderner Browser mit WebAuthn-Unterstützung
- Benutzer muss ein passkey-fähiges Gerät haben

## Benutzererfahrung

1. Benutzer klickt auf „Mit Passkey anmelden"
2. Browser fordert Biometrie oder Sicherheitsschlüssel an
3. Benutzer authentifiziert sich
4. Sitzung wird erstellt
