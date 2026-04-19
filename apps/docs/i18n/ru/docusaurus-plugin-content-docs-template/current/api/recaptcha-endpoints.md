---
id: recaptcha-endpoints
title: "Справочник по API ReCAPTCHA"
sidebar_label: "РеКАПЧА"
sidebar_position: 57
---

# Справочник по API ReCAPTCHA

## Обзор

Конечная точка ReCAPTCHA обеспечивает проверку токенов Google ReCAPTCHA v3 на стороне сервера. Он действует как безопасный прокси-сервер между клиентом и API проверки Google, сохраняя секретный ключ на стороне сервера. В режиме разработки проверку можно обойти, если секретный ключ не настроен.

## Конечные точки

### POST /api/verify-recaptcha

Проверяет токен Google ReCAPTCHA v3, связываясь с конечной точкой API Google `siteverify`. Возвращает результат проверки, включая оценку бота/человека.

**Запрос**
```typescript
{
  token: string;   // ReCAPTCHA token from client-side grecaptcha.execute()
}
```

**Ответ**
```typescript
{
  success: boolean;           // Whether verification passed
  score?: number;             // 0.0 (bot) to 1.0 (human)
  action?: string;            // Action name from the ReCAPTCHA challenge
  hostname?: string;          // Hostname where verification occurred
  challenge_ts?: string;      // ISO 8601 timestamp of the challenge
  error_codes?: string[];     // Error codes from Google's API (if any)
}
```

**Пример**
```typescript
// Client-side: get token
const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' });

// Server verification
const response = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});

const result = await response.json();

if (result.success && result.score > 0.5) {
  // Proceed with form submission
} else {
  // Block suspected bot activity
}
```

### Поведение в режиме разработки

Если `RECAPTCHA_SECRET_KEY` не настроен и `NODE_ENV` имеет значение `"development"`, конечная точка обходит проверку Google и возвращает:

```typescript
{
  success: true,
  score: 1.0,
  action: "bypass"
}
```

На консоль выводится предупреждение, указывающее, что проверка обходится.

## Аутентификация

Эта конечная точка является **общедоступной** – аутентификация не требуется. Он предназначен для вызова из потоков отправки формы на стороне клиента до или во время обработки формы.

## Реакции на ошибки

|Статус|Описание|
|--------|-------------|
| 400 |`token` в теле запроса отсутствует или пусто.|
| 500 |`RECAPTCHA_SECRET_KEY` не настроено (только рабочая среда), не удалось выполнить запрос Google API или непредвиденная ошибка времени выполнения.|

## Ограничение скорости

Ограничение скорости на уровне приложения не применяется. API ReCAPTCHA Google имеет свои собственные ограничения скорости. Конечная точка использует формат `application/x-www-form-urlencoded` при взаимодействии с API Google.

## Связанные конечные точки

Это автономная конечная точка безопасности. Обычно он вызывается перед отправкой формы или конфиденциальными действиями в приложении.
