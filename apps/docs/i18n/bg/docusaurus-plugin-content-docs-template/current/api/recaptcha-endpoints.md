---
id: recaptcha-endpoints
title: "ReCAPTCHA API Reference"
sidebar_label: "ReCAPTCHA"
sidebar_position: 57
---

# ReCAPTCHA API Reference

## Преглед

Крайната точка на ReCAPTCHA осигурява проверка от страна на сървъра на Google ReCAPTCHA v3 токени. Той действа като защитен прокси между клиента и приложния програмен интерфейс (API) за проверка на Google, запазвайки тайния ключ от страна на сървъра. В режим на разработка проверката може да бъде заобиколена, когато секретният ключ не е конфигуриран.

## Крайни точки

### POST /api/verify-recaptcha

Потвърждава токен на Google ReCAPTCHA v3 чрез комуникация с крайната точка на `siteverify` API на Google. Връща резултата от проверката, включително резултата от бот/човек.

**Заявка**
```typescript
{
  token: string;   // ReCAPTCHA token from client-side grecaptcha.execute()
}
```

**Отговор**
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

### Поведение в режим на разработка

Когато `RECAPTCHA_SECRET_KEY` не е конфигуриран и `NODE_ENV` е `"development"`, крайната точка заобикаля проверката на Google и връща:

```typescript
{
  success: true,
  score: 1.0,
  action: "bypass"
}
```

В конзолата се регистрира предупреждение, което показва, че проверката се заобикаля.

## Удостоверяване

Тази крайна точка е **публична** -- не се изисква удостоверяване. Той е проектиран да бъде извикван от потоци за подаване на формуляр от страна на клиента преди или по време на обработка на формуляр.

## Отговори за грешки

|Статус|Описание|
|--------|-------------|
| 400 |Липсващ или празен `token` в тялото на заявката|
| 500 |`RECAPTCHA_SECRET_KEY` не е конфигуриран (само производство), неуспешна заявка за API на Google или неочаквана грешка по време на изпълнение|

## Ограничаване на скоростта

Не се прилага ограничение на скоростта на ниво приложение. ReCAPTCHA API на Google има свои собствени ограничения на скоростта. Крайната точка използва формат `application/x-www-form-urlencoded`, когато комуникира с API на Google.

## Свързани крайни точки

Това е самостоятелна крайна точка за сигурност. Обикновено се извиква преди изпращане на формуляр или чувствителни действия в цялото приложение.
