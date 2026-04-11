---
id: setup-guide
title: Guida alla Configurazione dell'Autenticazione
sidebar_label: Guida alla Configurazione
sidebar_position: 2
---

# Guida alla Configurazione dell'Autenticazione

Come configurare l'autenticazione nella propria applicazione Ever Works.

## Variabili d'Ambiente Richieste

```env
AUTH_SECRET="your-generated-secret"
NEXTAUTH_SECRET="same-as-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Generare un Segreto Sicuro:
```bash
openssl rand -base64 32
# o
npx auth secret
```

## Configurazione del Provider OAuth

Aggiungere a .env.local:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

## Configurazione NextAuth.js

La configurazione auth si trova in apps/web/auth.config.ts. Include:
- Strategia di sessione: JWT
- Callback per i dati di sessione
- Gestori di eventi per la creazione degli utenti

## Test dell'Autenticazione

1. Avviare il server di sviluppo: pnpm run dev
2. Andare a http://localhost:3000/sign-in
3. Testare con le credenziali
4. Testare i flussi OAuth
