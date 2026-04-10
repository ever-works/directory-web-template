---
id: overview
title: Panoramica sull'Autenticazione
sidebar_label: Panoramica
sidebar_position: 1
---

# Panoramica sull'Autenticazione

Ever Works fornisce un sistema di autenticazione flessibile e sicuro che supporta più provider e metodi di autenticazione.

## Architettura di Autenticazione

Il template utilizza un approccio ibrido di autenticazione, supportando sia NextAuth.js che Supabase Auth contemporaneamente, consentendovi di scegliere la soluzione migliore per le vostre esigenze.

(mermaid diagram - keep as-is)

## Metodi di Autenticazione Supportati

### 1. Provider OAuth

NextAuth.js OAuth supporta: Google, GitHub, Facebook, Twitter/X, Microsoft
Supabase OAuth supporta: Google, GitHub, Facebook, Twitter/X, Discord, Apple

### 2. Autenticazione Email/Password

NextAuth.js Credentials: Email/password personalizzata, hashing bcrypt, archiviazione sessioni nel database
Supabase Auth: Email/password integrata, verifica email, reimpostazione password

### 3. Magic Links
Supabase Auth: Autenticazione senza password tramite magic link via email

### 4. WebAuthn / Passkeys
NextAuth.js: Autenticazione biometrica, chiavi di sicurezza hardware, FIDO2

## Gestione delle Sessioni
Token JWT per autenticazione stateless, sessioni database per stato persistente, gestione sicura dei cookie, aggiornamento automatico dei token

## Funzionalità di Sicurezza
Protezione CSRF, limitazione della velocità, protezione dalla forza bruta, hashing sicuro delle password con bcrypt
