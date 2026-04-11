---
id: webauthn
title: WebAuthn / Passkeys
sidebar_label: WebAuthn
sidebar_position: 6
---

# WebAuthn / Passkeys

## Panoramica

WebAuthn abilita l'autenticazione senza password utilizzando:
- Autenticazione biometrica (impronta digitale, Face ID)
- Chiavi di sicurezza hardware (YubiKey)
- Autenticatori di piattaforma (Windows Hello, Touch ID)

## Configurazione

Abilitare WebAuthn in auth.config.ts:
```typescript
import { WebAuthn } from 'next-auth/providers/webauthn';

providers: [
  WebAuthn,
]
```

## Requisiti

- HTTPS in produzione (localhost funziona in sviluppo)
- Browser moderno con supporto WebAuthn
- L'utente deve avere un dispositivo compatibile con passkey

## Esperienza Utente

1. L'utente clicca su "Accedi con Passkey"
2. Il browser richiede biometria o chiave di sicurezza
3. L'utente si autentica
4. Sessione creata
