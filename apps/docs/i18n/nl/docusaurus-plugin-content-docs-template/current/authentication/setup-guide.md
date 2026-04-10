---
id: setup-guide
title: Authenticatie Installatiegids
sidebar_label: Installatiegids
sidebar_position: 2
---

# Authenticatie Installatiegids

Hoe u authenticatie configureert in uw Ever Works-applicatie.

## Vereiste Omgevingsvariabelen

```env
AUTH_SECRET="your-generated-secret"
NEXTAUTH_SECRET="same-as-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Veilig Geheim Genereren:
```bash
openssl rand -base64 32
# of
npx auth secret
```

## OAuth Provider Instellen

Voeg toe aan .env.local:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

## NextAuth.js Configuratie

De auth-configuratie bevindt zich in apps/web/auth.config.ts. Het bevat:
- Sessiestrategie: JWT
- Callbacks voor sessiegegevens
- Event handlers voor het aanmaken van gebruikers

## Authenticatie Testen

1. Start dev-server: pnpm run dev
2. Ga naar http://localhost:3000/sign-in
3. Test met inloggegevens
4. Test OAuth-stromen
