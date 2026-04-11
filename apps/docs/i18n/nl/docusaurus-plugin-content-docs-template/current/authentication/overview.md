---
id: overview
title: Authenticatie Overzicht
sidebar_label: Overzicht
sidebar_position: 1
---

# Authenticatie Overzicht

Ever Works biedt een flexibel, veilig authenticatiesysteem dat meerdere providers en authenticatiemethoden ondersteunt.

## Authenticatie Architectuur

Het sjabloon gebruikt een hybride authenticatieaanpak, die zowel NextAuth.js als Supabase Auth tegelijkertijd ondersteunt, zodat u de beste oplossing voor uw behoeften kunt kiezen.

(mermaid diagram - keep as-is)

## Ondersteunde Authenticatiemethoden

### 1. OAuth Providers

NextAuth.js OAuth ondersteunt: Google, GitHub, Facebook, Twitter/X, Microsoft
Supabase OAuth ondersteunt: Google, GitHub, Facebook, Twitter/X, Discord, Apple

### 2. E-mail/Wachtwoord Authenticatie

NextAuth.js Credentials: Aangepaste e-mail/wachtwoord, bcrypt hashing, database sessieopslag
Supabase Auth: Ingebouwde e-mail/wachtwoord, e-mailverificatie, wachtwoord resetten

### 3. Magic Links
Supabase Auth: Wachtwoordloze authenticatie via e-mail magic links

### 4. WebAuthn / Passkeys
NextAuth.js: Biometrische authenticatie, hardware beveiligingssleutels, FIDO2

## Sessiebeheer
JWT-tokens voor stateless authenticatie, databasesessies voor persistente staat, veilige cookie-verwerking, automatische token vernieuwing

## Beveiligingsfuncties
CSRF-bescherming, snelheidsbeperking, brute force bescherming, veilig wachtwoord hashing met bcrypt
