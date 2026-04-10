---
id: providers
title: Authentifizierungsanbieter
sidebar_label: Anbieter
sidebar_position: 3
---

# Authentifizierungsanbieter

## Unterstützte Anbieter

### Google OAuth
1. Gehen Sie zur Google Cloud Console
2. Erstellen Sie OAuth 2.0-Anmeldedaten
3. Fügen Sie Umleitungs-URI hinzu: http://localhost:3000/api/auth/callback/google
4. Setzen Sie GOOGLE_CLIENT_ID und GOOGLE_CLIENT_SECRET

### GitHub OAuth
1. Gehen Sie zu GitHub-Einstellungen > Entwicklereinstellungen > OAuth Apps
2. Neue OAuth App
3. Callback-URL: http://localhost:3000/api/auth/callback/github
4. Setzen Sie GITHUB_CLIENT_ID und GITHUB_CLIENT_SECRET

### Facebook OAuth
1. Gehen Sie zu developers.facebook.com
2. App erstellen
3. Facebook Login-Produkt hinzufügen
4. Setzen Sie FACEBOOK_CLIENT_ID und FACEBOOK_CLIENT_SECRET

### Microsoft OAuth
1. Gehen Sie zu Azure Active Directory
2. Neue Anwendung registrieren
3. Umleitungs-URI hinzufügen
4. Setzen Sie MICROSOFT_CLIENT_ID und MICROSOFT_CLIENT_SECRET

### Anmeldedaten (E-Mail/Passwort)
Integrierter Anbieter für E-Mail- und Passwort-Authentifizierung. Verwendet bcrypt für Passwort-Hashing.
