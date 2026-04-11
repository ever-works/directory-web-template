---
id: recaptcha
title: Интеграция reCAPTCHA
sidebar_label: реКАПЧА
sidebar_position: 24
---

# Интеграция reCAPTCHA

Шаблон интегрирует Google reCAPTCHA v3 для защиты ботов при аутентификации и потоках отправки форм. Он включает в себя конечную точку проверки на стороне сервера, перехватчики на стороне клиента для управления токенами и режим разработки, который обходит проверку, если учетные данные не настроены.

## Обзор архитектуры

```
app/api/verify-recaptcha/
  route.ts                          -- Server-side token verification endpoint

app/[locale]/auth/hooks/
  useRecaptchaVerification.ts       -- React Query mutation for verification
  useAutoRecaptchaVerification.ts   -- Auto-trigger on mount or condition

lib/api/
  server-api-client.ts              -- externalClient used for Google API calls

lib/config/
  config-service.ts                 -- analyticsConfig.recaptcha.secretKey
```

## Конечная точка проверки на стороне сервера

Маршрут `POST /api/verify-recaptcha` в `app/api/verify-recaptcha/route.ts` обрабатывает проверку токена по Google reCAPTCHA API:

```tsx
// app/api/verify-recaptcha/route.ts
import { NextRequest, NextResponse } from "next/server";
import { externalClient, apiUtils } from "@/lib/api/server-api-client";
import { coreConfig, analyticsConfig } from "@/lib/config/config-service";

interface RecaptchaApiResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA token is required" },
        { status: 400 }
      );
    }

    const secretKey = analyticsConfig.recaptcha.secretKey;
    if (!secretKey) {
      if (coreConfig.NODE_ENV === "development") {
        console.warn(
          "[ReCAPTCHA] WARNING: Secret key not configured -- bypassing verification in development mode."
        );
        return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
      }
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA not configured" },
        { status: 500 }
      );
    }

    const response = await externalClient.postForm<RecaptchaApiResponse>(
      "https://www.google.com/recaptcha/api/siteverify",
      { secret: secretKey, response: token }
    );

    if (!apiUtils.isSuccess(response)) {
      console.error("ReCAPTCHA API request failed:", apiUtils.getErrorMessage(response));
      return NextResponse.json(
        { success: false, error: "Failed to verify ReCAPTCHA" },
        { status: 500 }
      );
    }

    const data = response.data;

    return NextResponse.json({
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      challenge_ts: data.challenge_ts,
      error_codes: data['error-codes'],
    });
  } catch (error) {
    console.error("ReCAPTCHA verification error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
```

### Ключевые детали реализации

- **Проверка токена**: возвращает 400, если в теле запроса не указан токен.
- **Обход разработки**: если секретный ключ не настроен и `NODE_ENV` равен `development` , конечная точка возвращает успешный ответ с `score: 1.0` и `action: "bypass"` без обращения в Google.
- **Внешний клиент**: использует предварительно настроенный `externalClient` из `lib/api/server-api-client.ts` с его методом `postForm` , который отправляет данные `application/x-www-form-urlencoded` в API проверки Google.
- **Утилиты API**: используются `apiUtils.isSuccess()` и `apiUtils.getErrorMessage()` для единообразной обработки ответов.
- **Пересылка полного ответа**: возвращает полный результат проверки, включая оценку, действие, имя хоста, временную метку запроса и коды ошибок.

### Обход режима разработки

Если `RECAPTCHA_SECRET_KEY` не установлено и приложение работает в режиме разработки, конечная точка автоматически обходит проверку:

```tsx
if (!secretKey) {
  if (coreConfig.NODE_ENV === "development") {
    return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
  }
  return NextResponse.json(
    { success: false, error: "ReCAPTCHA not configured" },
    { status: 500 }
  );
}
```

В производственной среде отсутствие секретного ключа возвращает ошибку 500 вместо молчаливого обхода.

## Перехватчик проверки на стороне клиента

Хук `useRecaptchaVerification` в `app/[locale]/auth/hooks/useRecaptchaVerification.ts` оборачивает проверочный вызов в мутацию React Query:

```tsx
// app/[locale]/auth/hooks/useRecaptchaVerification.ts
import { useMutation } from '@tanstack/react-query';

function useRecaptchaVerification() {
  const mutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('reCAPTCHA verification failed');
      }

      return response.json();
    },
  });

  return {
    verifyRecaptcha: mutation.mutateAsync,
    isVerifying: mutation.isPending,
    isVerified: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
  };
}
```

### Возвращаемые значения

| Недвижимость | Тип | Описание |
|----------|------|-------------|
| `verifyRecaptcha` | `(token: string) => Promise` | Функция мутации для проверки токена |
| `isVerifying` | `boolean` | Идет ли проверка |
| `isVerified` | `boolean` | Удалась ли проверка |
| `error` | `Error or null` | Ошибка последней попытки проверки |
| `reset` | `() => void` | Сбросить состояние проверки |

## Перехватчик автоматической проверки

Хук `useAutoRecaptchaVerification` автоматически запускает проверку reCAPTCHA, когда компонент монтируется или когда условие становится истинным:

```tsx
function useAutoRecaptchaVerification(options?: {
  action?: string;       // reCAPTCHA action name (default: 'submit')
  enabled?: boolean;     // Whether to auto-verify (default: true)
}): {
  isVerified: boolean;
  isVerifying: boolean;
  error: Error | null;
  token: string | null;
}
```

### Пример использования

```tsx
function ProtectedForm() {
  const { isVerified, isVerifying } = useAutoRecaptchaVerification({
    action: 'login',
    enabled: true,
  });

  return (
    <form>
      {/* Form fields */}
      <button disabled={!isVerified || isVerifying}>
        {isVerifying ? 'Verifying...' : 'Submit'}
      </button>
    </form>
  );
}
```

## Интеграция API Google

Конечная точка взаимодействует с API reCAPTCHA Google, используя метод `externalClient.postForm` из `lib/api/server-api-client.ts` . Этот метод отправляет данные формы в URL-кодировке:

```tsx
const response = await externalClient.postForm<RecaptchaApiResponse>(
  "https://www.google.com/recaptcha/api/siteverify",
  { secret: secretKey, response: token }
);
```

`externalClient` — это предварительно настроенный экземпляр `ServerClient` , предназначенный для внешних вызовов API. Метод `postForm` автоматически обрабатывает тип контента `application/x-www-form-urlencoded` .

### Интерпретация очков

reCAPTCHA v3 возвращает оценку от 0,0 до 1,0:

| Диапазон очков | Интерпретация | Типичное действие |
|-------------|---------------|----------------|
| 0,7 - 1,0 | Вероятно, человек | Разрешить отправку |
| 0,3 - 0,7 | Неопределенный | Может потребоваться дополнительная проверка |
| 0,0 - 0,3 | Вероятный бот | Заблокировать отправку |

## Интеграция с аутентификацией

Компонент `CredentialsForm` использует проверку reCAPTCHA перед отправкой учетных данных:

```tsx
function CredentialsForm({ type, onSuccess }) {
  const { verifyRecaptcha, isVerifying } = useRecaptchaVerification();

  const handleSubmit = async (formData: FormData) => {
    const token = await grecaptcha.execute(siteKey, { action: type });
    const result = await verifyRecaptcha(token);

    if (!result.verified) {
      toast.error('Verification failed. Please try again.');
      return;
    }

    await signIn(formData);
  };
}
```

## Переменные среды

```bash
# Client-side site key (public, exposed to browser)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le...

# Server-side secret key (private, never exposed to client)
RECAPTCHA_SECRET_KEY=6Le...
```

Доступ к секретному ключу осуществляется через `analyticsConfig.recaptcha.secretKey` из службы централизованной настройки, а не напрямую из `process.env` .

## Документация Swagger

Конечная точка проверки включает подробные аннотации Swagger/JSDoc, которые документируют все схемы запросов и ответов, коды состояния и примеры. Это осуществляется через встроенную систему документации API шаблона.

## Условная активация

| Состояние | Поведение |
|-----------|----------|
| Набор секретных ключей | Полная проверка по Google API |
| Секретный ключ отсутствует, режим разработки | Автоматический обход с `success: true` |
| Секретный ключ отсутствует, производственный режим | Возвращает ошибку 500 |
| Ключ сайта не установлен на клиенте | Скрипт не загружен, формы отправляются без проверки |

## Обработка ошибок

Конечная точка обрабатывает три категории ошибок:

1. **Ошибки клиента (400)**: токен отсутствует или недействителен в теле запроса.
2. **Ошибки конфигурации (500)**: в рабочей версии отсутствует секретный ключ.
3. **Ошибки восходящего потока (500)**: сбои запросов Google API или непредвиденные исключения.

Все ошибки регистрируются на консоли сервера и возвращают согласованную структуру JSON с сообщением `success: false` и `error` .

## Ссылка на файл

| Файл | Цель |
|------|---------|
| `app/api/verify-recaptcha/route.ts` | Конечная точка проверки на стороне сервера |
| `app/[locale]/auth/hooks/useRecaptchaVerification.ts` | Мутация проверки запроса React |
| `app/[locale]/auth/hooks/useAutoRecaptchaVerification.ts` | Крючок проверки автозапуска |
| `lib/api/server-api-client.ts` | Метод `externalClient` и `postForm` |
| `lib/config/config-service.ts` | `analyticsConfig.recaptcha.secretKey` |
