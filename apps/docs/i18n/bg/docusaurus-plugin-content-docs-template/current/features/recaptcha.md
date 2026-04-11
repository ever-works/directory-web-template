---
id: recaptcha
title: Интегриране на reCAPTCHA
sidebar_label: reCAPTCHA
sidebar_position: 24
---

# Интегриране на reCAPTCHA

Шаблонът интегрира Google reCAPTCHA v3 за защита от ботове при потоци за удостоверяване и подаване на формуляри. Той включва крайна точка за проверка от страна на сървъра, кукички от страна на клиента за управление на токени и режим на разработка, който заобикаля проверката, когато идентификационните данни не са конфигурирани.

## Преглед на архитектурата

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

## Крайна точка за проверка от страна на сървъра

Маршрутът `POST /api/verify-recaptcha` на `app/api/verify-recaptcha/route.ts` обработва проверката на токена спрямо Google reCAPTCHA API:

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

### Ключови подробности за внедряването

- **Проверка на токена**: Връща 400, ако в тялото на заявката не е предоставен токен.
- **Заобикаляне на разработката**: Когато секретният ключ не е конфигуриран и `NODE_ENV` е `development` , крайната точка връща успешен отговор с `score: 1.0` и `action: "bypass"` , без да се свързва с Google.
- **Външен клиент**: Използва предварително конфигурирания `externalClient` от `lib/api/server-api-client.ts` със своя `postForm` метод, който изпраща `application/x-www-form-urlencoded` данни към API за проверка на Google.
- **API помощни програми**: Използва `apiUtils.isSuccess()` и `apiUtils.getErrorMessage()` за последователна обработка на отговорите.
- **Препращане на пълен отговор**: Връща пълния резултат от проверката, включително резултат, действие, име на хост, клеймо за време на предизвикателство и кодове за грешка.

### Байпас на режим на разработка

Когато `RECAPTCHA_SECRET_KEY` не е зададено и приложението работи в режим на разработка, крайната точка автоматично заобикаля проверката:

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

В производството липсващ таен ключ връща грешка 500 вместо безшумно заобикаляне.

## Кука за проверка от страна на клиента

Куката `useRecaptchaVerification` на `app/[locale]/auth/hooks/useRecaptchaVerification.ts` обвива повикването за проверка в мутация на React Query:

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

### Върнати стойности

| Имот | Тип | Описание |
|----------|------|-------------|
| `verifyRecaptcha` | `(token: string) => Promise` | Функция за мутация за проверка на токен |
| `isVerifying` | `boolean` | Дали се извършва проверка |
| `isVerified` | `boolean` | Дали проверката е успешна |
| `error` | `Error or null` | Грешка от последния опит за проверка |
| `reset` | `() => void` | Нулиране на състоянието на проверка |

## Кука за автоматична проверка

Куката `useAutoRecaptchaVerification` задейства проверката на reCAPTCHA автоматично, когато компонент се монтира или когато условие стане истина:

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

### Пример за използване

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

## Google API интеграция

Крайната точка комуникира с reCAPTCHA API на Google, използвайки метода `externalClient.postForm` от `lib/api/server-api-client.ts` . Този метод изпраща URL кодирани данни от формуляр:

```tsx
const response = await externalClient.postForm<RecaptchaApiResponse>(
  "https://www.google.com/recaptcha/api/siteverify",
  { secret: secretKey, response: token }
);
```

`externalClient` е предварително конфигуриран екземпляр `ServerClient` , предназначен за външни извиквания на API. Методът `postForm` обработва автоматично тип съдържание `application/x-www-form-urlencoded` .

### Тълкуване на резултати

reCAPTCHA v3 връща резултат между 0,0 и 1,0:

| Диапазон на резултатите | Тълкуване | Типично действие |
|-------------|--------------|----------------|
| 0,7 - 1,0 | Вероятно човек | Разрешаване на изпращане |
| 0,3 - 0,7 | Несигурно | Може да изисква допълнителна проверка |
| 0,0 - 0,3 | Вероятен бот | Блокиране на изпращане |

## Интеграция с удостоверяване

Компонентът `CredentialsForm` използва проверка с reCAPTCHA, преди да изпрати идентификационни данни:

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

## Променливи на средата

```bash
# Client-side site key (public, exposed to browser)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le...

# Server-side secret key (private, never exposed to client)
RECAPTCHA_SECRET_KEY=6Le...
```

Достъпът до секретния ключ се осъществява чрез `analyticsConfig.recaptcha.secretKey` от централизираната услуга за конфигуриране, а не директно от `process.env` .

## Swagger документация

Крайната точка за проверка включва изчерпателни анотации на Swagger/JSDoc, които документират всички схеми на заявки и отговори, кодове на състояние и примери. Това се обслужва чрез вградената в шаблона API документационна система.

## Условно активиране

| Състояние | Поведение |
|-----------|----------|
| Комплект секретни ключове | Пълна проверка спрямо Google API |
| Липсва таен ключ, режим на разработка | Автоматичен байпас с `success: true` |
| Липсва таен ключ, производствен режим | Връща грешка 500 |
| Ключът на сайта не е зададен на клиента | Скриптът не е зареден, формулярите се изпращат без проверка |

## Обработка на грешки

Крайната точка обработва три категории грешки:

1. **Клиентски грешки (400)**: Липсващ или невалиден токен в тялото на заявката
2. **Грешки в конфигурацията (500)**: Липсва таен ключ в производството
3. **Грешки нагоре (500)**: Неуспешни заявки за API на Google или неочаквани изключения

Всички грешки се записват в конзолата на сървъра и връщат последователна JSON структура със съобщение `success: false` и `error` .

## Референтен файл

| Файл | Цел |
|------|---------|
| `app/api/verify-recaptcha/route.ts` | Крайна точка за проверка от страна на сървъра |
| `app/[locale]/auth/hooks/useRecaptchaVerification.ts` | Мутация за проверка на React Query |
| `app/[locale]/auth/hooks/useAutoRecaptchaVerification.ts` | Кука за автоматично задействане на проверка |
| `lib/api/server-api-client.ts` | Метод `externalClient` и `postForm` |
| `lib/config/config-service.ts` | `analyticsConfig.recaptcha.secretKey` |
