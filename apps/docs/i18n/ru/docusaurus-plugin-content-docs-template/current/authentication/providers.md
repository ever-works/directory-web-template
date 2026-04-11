---
id: providers
title: Провайдеры Аутентификации
sidebar_label: Провайдеры
sidebar_position: 3
---

# Провайдеры Аутентификации

## Поддерживаемые Провайдеры

### Google OAuth
1. Перейдите в Google Cloud Console
2. Создайте учётные данные OAuth 2.0
3. Добавьте URI перенаправления: http://localhost:3000/api/auth/callback/google
4. Установите GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET

### GitHub OAuth
1. Перейдите в Настройки GitHub > Настройки разработчика > OAuth Apps
2. Новое приложение OAuth
3. URL обратного вызова: http://localhost:3000/api/auth/callback/github
4. Установите GITHUB_CLIENT_ID и GITHUB_CLIENT_SECRET

### Facebook OAuth
1. Перейдите на developers.facebook.com
2. Создайте приложение
3. Добавьте продукт Facebook Login
4. Установите FACEBOOK_CLIENT_ID и FACEBOOK_CLIENT_SECRET

### Microsoft OAuth
1. Перейдите в Azure Active Directory
2. Зарегистрируйте новое приложение
3. Добавьте URI перенаправления
4. Установите MICROSOFT_CLIENT_ID и MICROSOFT_CLIENT_SECRET

### Учётные Данные (Email/Пароль)
Встроенный провайдер для аутентификации по email и паролю. Использует bcrypt для хэширования паролей.
