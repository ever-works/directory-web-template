---
id: setup-guide
title: Authentifizierungs-Einrichtungsanleitung
sidebar_label: Einrichtungsanleitung
sidebar_position: 2
---

# Authentifizierungs-Einrichtungsanleitung

So konfigurieren Sie die Authentifizierung in Ihrer Ever Works-Anwendung.

## Erforderliche Umgebungsvariablen

```env
AUTH_SECRET="your-generated-secret"
NEXTAUTH_SECRET="same-as-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Sicheres Geheimnis generieren:
```bash
openssl rand -base64 32
# oder
npx auth secret
```

## OAuth-Anbieter einrichten

Fügen Sie zu .env.local hinzu:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

## NextAuth.js-Konfiguration

Die Auth-Konfiguration befindet sich unter apps/web/auth.config.ts. Sie enthält:
- Sitzungsstrategie: JWT
- Callbacks für Sitzungsdaten
- Event-Handler für die Benutzererstellung

## Authentifizierung testen

1. Dev-Server starten: pnpm run dev
2. Gehen Sie zu http://localhost:3000/sign-in
3. Mit Anmeldedaten testen
4. OAuth-Abläufe testen
