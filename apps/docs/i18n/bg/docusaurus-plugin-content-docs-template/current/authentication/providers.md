---
id: providers
title: Доставчици на Удостоверяване
sidebar_label: Доставчици
sidebar_position: 3
---

# Доставчици на Удостоверяване

## Поддържани Доставчици

### Google OAuth
1. Отидете в Google Cloud Console
2. Създайте OAuth 2.0 идентификационни данни
3. Добавете URI за пренасочване: http://localhost:3000/api/auth/callback/google
4. Задайте GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET

### GitHub OAuth
1. Отидете в Настройки на GitHub > Настройки за разработчици > OAuth Apps
2. Ново OAuth приложение
3. URL за обратно извикване: http://localhost:3000/api/auth/callback/github
4. Задайте GITHUB_CLIENT_ID и GITHUB_CLIENT_SECRET

### Facebook OAuth
1. Отидете на developers.facebook.com
2. Създайте приложение
3. Добавете продукт Facebook Login
4. Задайте FACEBOOK_CLIENT_ID и FACEBOOK_CLIENT_SECRET

### Microsoft OAuth
1. Отидете в Azure Active Directory
2. Регистрирайте ново приложение
3. Добавете URI за пренасочване
4. Задайте MICROSOFT_CLIENT_ID и MICROSOFT_CLIENT_SECRET

### Идентификационни Данни (Email/Парола)
Вграден доставчик за удостоверяване с email и парола. Използва bcrypt за хеширане на пароли.
