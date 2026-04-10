---
id: providers
title: Dostawcy Uwierzytelniania
sidebar_label: Dostawcy
sidebar_position: 3
---

# Dostawcy Uwierzytelniania

## Obsługiwani Dostawcy

### Google OAuth
1. Przejdź do Google Cloud Console
2. Utwórz dane uwierzytelniające OAuth 2.0
3. Dodaj URI przekierowania: http://localhost:3000/api/auth/callback/google
4. Ustaw GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET

### GitHub OAuth
1. Przejdź do Ustawień GitHub > Ustawienia deweloperskie > OAuth Apps
2. Nowa aplikacja OAuth
3. URL wywołania zwrotnego: http://localhost:3000/api/auth/callback/github
4. Ustaw GITHUB_CLIENT_ID i GITHUB_CLIENT_SECRET

### Facebook OAuth
1. Przejdź do developers.facebook.com
2. Utwórz aplikację
3. Dodaj produkt Facebook Login
4. Ustaw FACEBOOK_CLIENT_ID i FACEBOOK_CLIENT_SECRET

### Microsoft OAuth
1. Przejdź do Azure Active Directory
2. Zarejestruj nową aplikację
3. Dodaj URI przekierowania
4. Ustaw MICROSOFT_CLIENT_ID i MICROSOFT_CLIENT_SECRET

### Dane Uwierzytelniające (Email/Hasło)
Wbudowany dostawca uwierzytelniania email i hasło. Używa bcrypt do haszowania haseł.
