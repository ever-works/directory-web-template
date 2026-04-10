---
id: overview
title: Authentifizierungsübersicht
sidebar_label: Überblick
sidebar_position: 1
---

# Authentifizierungsübersicht

Ever Works bietet ein flexibles, sicheres Authentifizierungssystem, das mehrere Anbieter und Authentifizierungsmethoden unterstützt.

## Authentifizierungsarchitektur

Die Vorlage verwendet einen hybriden Authentifizierungsansatz, der sowohl NextAuth.js als auch Supabase Auth gleichzeitig unterstützt, sodass Sie die beste Lösung für Ihre Anforderungen wählen können.

(mermaid diagram - keep as-is)

## Unterstützte Authentifizierungsmethoden

### 1. OAuth-Anbieter

NextAuth.js OAuth unterstützt: Google, GitHub, Facebook, Twitter/X, Microsoft
Supabase OAuth unterstützt: Google, GitHub, Facebook, Twitter/X, Discord, Apple

### 2. E-Mail/Passwort-Authentifizierung

NextAuth.js Credentials: Benutzerdefinierte E-Mail/Passwort, bcrypt-Hashing, Datenbank-Sitzungsspeicherung
Supabase Auth: Integrierte E-Mail/Passwort-Funktion, E-Mail-Verifizierung, Passwort zurücksetzen

### 3. Magic Links
Supabase Auth: Passwortlose Authentifizierung über E-Mail-Magic-Links

### 4. WebAuthn / Passkeys
NextAuth.js: Biometrische Authentifizierung, Hardware-Sicherheitsschlüssel, FIDO2

## Sitzungsverwaltung
JWT-Token für zustandslose Authentifizierung, Datenbanksitzungen für persistenten Zustand, sichere Cookie-Verarbeitung, automatische Token-Aktualisierung

## Sicherheitsfunktionen
CSRF-Schutz, Ratenbegrenzung, Brute-Force-Schutz, sichere Passwort-Hashing mit bcrypt
