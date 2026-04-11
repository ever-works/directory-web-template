---
id: providers
title: Authenticatie Aanbieders
sidebar_label: Aanbieders
sidebar_position: 3
---

# Authenticatie Aanbieders

## Ondersteunde Aanbieders

### Google OAuth
1. Ga naar Google Cloud Console
2. Maak OAuth 2.0-inloggegevens aan
3. Voeg redirect URI toe: http://localhost:3000/api/auth/callback/google
4. Stel GOOGLE_CLIENT_ID en GOOGLE_CLIENT_SECRET in

### GitHub OAuth
1. Ga naar GitHub-instellingen > Ontwikkelaarsinstellingen > OAuth Apps
2. Nieuwe OAuth App
3. Callback URL: http://localhost:3000/api/auth/callback/github
4. Stel GITHUB_CLIENT_ID en GITHUB_CLIENT_SECRET in

### Facebook OAuth
1. Ga naar developers.facebook.com
2. App aanmaken
3. Facebook Login-product toevoegen
4. Stel FACEBOOK_CLIENT_ID en FACEBOOK_CLIENT_SECRET in

### Microsoft OAuth
1. Ga naar Azure Active Directory
2. Nieuwe applicatie registreren
3. Redirect URI toevoegen
4. Stel MICROSOFT_CLIENT_ID en MICROSOFT_CLIENT_SECRET in

### Inloggegevens (E-mail/Wachtwoord)
Ingebouwde provider voor e-mail- en wachtwoordauthenticatie. Gebruikt bcrypt voor wachtwoord hashing.
