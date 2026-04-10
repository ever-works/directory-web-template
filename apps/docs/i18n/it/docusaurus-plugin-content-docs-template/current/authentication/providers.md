---
id: providers
title: Provider di Autenticazione
sidebar_label: Provider
sidebar_position: 3
---

# Provider di Autenticazione

## Provider Supportati

### Google OAuth
1. Andare alla Google Cloud Console
2. Creare le credenziali OAuth 2.0
3. Aggiungere URI di reindirizzamento: http://localhost:3000/api/auth/callback/google
4. Impostare GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET

### GitHub OAuth
1. Andare alle Impostazioni GitHub > Impostazioni sviluppatore > OAuth Apps
2. Nuova OAuth App
3. URL di callback: http://localhost:3000/api/auth/callback/github
4. Impostare GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET

### Facebook OAuth
1. Andare a developers.facebook.com
2. Creare un'App
3. Aggiungere il prodotto Facebook Login
4. Impostare FACEBOOK_CLIENT_ID e FACEBOOK_CLIENT_SECRET

### Microsoft OAuth
1. Andare ad Azure Active Directory
2. Registrare una nuova applicazione
3. Aggiungere URI di reindirizzamento
4. Impostare MICROSOFT_CLIENT_ID e MICROSOFT_CLIENT_SECRET

### Credenziali (Email/Password)
Provider integrato per l'autenticazione tramite email e password. Utilizza bcrypt per l'hashing delle password.
