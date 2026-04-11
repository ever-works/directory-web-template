---
id: overview
title: Przegląd Uwierzytelniania
sidebar_label: Przegląd
sidebar_position: 1
---

# Przegląd Uwierzytelniania

Ever Works zapewnia elastyczny, bezpieczny system uwierzytelniania obsługujący wielu dostawców i metody uwierzytelniania.

## Architektura Uwierzytelniania

Szablon używa hybrydowego podejścia do uwierzytelniania, obsługując jednocześnie NextAuth.js i Supabase Auth, pozwalając wybrać najlepsze rozwiązanie dla swoich potrzeb.

(mermaid diagram - keep as-is)

## Obsługiwane Metody Uwierzytelniania

### 1. Dostawcy OAuth

NextAuth.js OAuth obsługuje: Google, GitHub, Facebook, Twitter/X, Microsoft
Supabase OAuth obsługuje: Google, GitHub, Facebook, Twitter/X, Discord, Apple

### 2. Uwierzytelnianie Email/Hasło

NextAuth.js Credentials: Niestandardowy email/hasło, haszowanie bcrypt, przechowywanie sesji w bazie danych
Supabase Auth: Wbudowany email/hasło, weryfikacja email, resetowanie hasła

### 3. Magic Links
Supabase Auth: Uwierzytelnianie bez hasła za pomocą magic linków email

### 4. WebAuthn / Passkeys
NextAuth.js: Uwierzytelnianie biometryczne, sprzętowe klucze bezpieczeństwa, FIDO2

## Zarządzanie Sesją
Tokeny JWT dla uwierzytelniania bezstanowego, sesje bazy danych dla trwałego stanu, bezpieczna obsługa plików cookie, automatyczne odświeżanie tokenów

## Funkcje Bezpieczeństwa
Ochrona CSRF, ograniczenie liczby żądań, ochrona przed atakami brute force, bezpieczne haszowanie haseł z bcrypt
