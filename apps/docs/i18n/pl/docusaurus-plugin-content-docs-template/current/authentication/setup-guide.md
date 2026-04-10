---
id: setup-guide
title: Przewodnik Konfiguracji Uwierzytelniania
sidebar_label: Przewodnik Konfiguracji
sidebar_position: 2
---

# Przewodnik Konfiguracji Uwierzytelniania

Jak skonfigurować uwierzytelnianie w aplikacji Ever Works.

## Wymagane Zmienne Środowiskowe

```env
AUTH_SECRET="your-generated-secret"
NEXTAUTH_SECRET="same-as-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Generowanie Bezpiecznego Sekretu:
```bash
openssl rand -base64 32
# lub
npx auth secret
```

## Konfiguracja Dostawcy OAuth

Dodaj do .env.local:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

## Konfiguracja NextAuth.js

Konfiguracja auth znajduje się w apps/web/auth.config.ts. Zawiera:
- Strategię sesji: JWT
- Wywołania zwrotne dla danych sesji
- Obsługę zdarzeń dla tworzenia użytkowników

## Testowanie Uwierzytelniania

1. Uruchom serwer deweloperski: pnpm run dev
2. Przejdź do http://localhost:3000/sign-in
3. Przetestuj z danymi uwierzytelniającymi
4. Przetestuj przepływy OAuth
