---
id: checkout-utilities
title: "Утилиты Оформления Заказа"
sidebar_label: "Утилиты Оформления Заказа"
sidebar_position: 7
---

# Утилиты Оформления Заказа

Модуль `checkout-utils` (`lib/utils/checkout-utils.ts`) предоставляет вспомогательные функции для открытия платёжных процессов оформления заказа в браузере. Он обрабатывает блокировку всплывающих окон, резервные перенаправления, обработку ошибок и создаёт повторно используемые обработчики нажатий для кнопок оформления заказа.

## Основные концепции

Утилиты оформления заказа решают распространённые задачи браузера при открытии страниц оформления заказа платёжных провайдеров:

- **Блокировка всплывающих окон** -- Браузеры могут блокировать вызовы `window.open()`. Утилиты определяют это и переключаются на прямую навигацию.
- **Обработка ошибок** -- Сетевые сбои и неожиданные ошибки перехватываются и передаются через обратные вызовы.
- **Повторно используемые обработчики** -- Функция-фабрика создаёт обработчики нажатий, которые можно прикрепить к любому компоненту кнопки.

## Типы

```ts
interface CheckoutWindowOptions {
  url: string;
  windowName?: string;       // По умолчанию: '_blank'
  windowFeatures?: string;   // По умолчанию: 'noopener,noreferrer'
  fallbackToRedirect?: boolean; // По умолчанию: true
}
```

## Функции

### openCheckoutInNewTab

Открывает URL оформления заказа в новой вкладке браузера с определением блокировки всплывающих окон и резервным вариантом:

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

const success = openCheckoutInNewTab({
  url: 'https://checkout.stripe.com/pay/cs_test_...',
});

if (!success) {
  // И всплывающее окно, и перенаправление не сработали
  console.error('Не удалось открыть оформление заказа');
}
```

#### Реализация

```ts
export function openCheckoutInNewTab(
  options: CheckoutWindowOptions
): boolean {
  const {
    url,
    windowName = '_blank',
    windowFeatures = 'noopener,noreferrer',
    fallbackToRedirect = true,
  } = options;

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const newWindow = window.open(url, windowName, windowFeatures);

    if (!newWindow) {
      console.warn('Popup blocked by browser');

      if (fallbackToRedirect) {
        window.location.href = url;
        return true;
      }

      return false;
    }

    try {
      newWindow.focus();
    } catch (focusError) {
      console.warn('Could not focus new window:', focusError);
    }

    return true;
  } catch {
    if (fallbackToRedirect) {
      window.location.href = url;
      return true;
    }
    return false;
  }
}
```

#### Поток поведения

1. **Защита SSR** -- Немедленно возвращает `false` при выполнении на сервере
2. **Открытие всплывающего окна** -- Пытается выполнить `window.open()` с указанными параметрами
3. **Заблокированное всплывающее окно** -- Если `window.open()` возвращает `null`, всплывающее окно было заблокировано
4. **Резервное перенаправление** -- Если `fallbackToRedirect` равно `true` (по умолчанию), перенаправляет текущую страницу на URL оформления заказа
5. **Попытка фокусировки** -- Пытается сфокусировать новое окно (может не сработать в некоторых браузерах без ошибки)
6. **Перехват ошибок** -- Любое исключение переключается на перенаправление, если оно включено

#### Параметры

| Параметр | По умолчанию | Описание |
|--------|---------|-------------|
| `url` | Обязательный | URL оформления заказа для открытия |
| `windowName` | `'_blank'` | Имя целевого окна |
| `windowFeatures` | `'noopener,noreferrer'` | Функции безопасности для нового окна |
| `fallbackToRedirect` | `true` | Перенаправить текущую страницу, если всплывающее окно заблокировано |

### openCheckoutWithErrorHandling

Обёртка вокруг `openCheckoutInNewTab`, добавляющая обратный вызов ошибки:

```ts
import { openCheckoutWithErrorHandling } from '@/lib/utils/checkout-utils';

const success = openCheckoutWithErrorHandling(
  'https://checkout.stripe.com/pay/cs_test_...',
  (error) => {
    showToast(error); // Показать ошибку пользователю
  }
);
```

#### Реализация

```ts
export function openCheckoutWithErrorHandling(
  url: string,
  onError?: (error: string) => void
): boolean {
  const success = openCheckoutInNewTab({ url });

  if (!success && onError) {
    onError(
      'Unable to open checkout. Please check your popup blocker settings.'
    );
  }

  return success;
}
```

### createCheckoutClickHandler

Функция-фабрика, создающая обработчик нажатия для оформления заказа с обратными вызовами успеха, ошибки и toast-уведомлений. Предназначена для непосредственной передачи в свойства `onClick` кнопок:

```ts
import { createCheckoutClickHandler } from '@/lib/utils/checkout-utils';

function PricingCard({ checkoutUrl }: { checkoutUrl: string }) {
  const handleCheckout = createCheckoutClickHandler(checkoutUrl, {
    onSuccess: () => {
      analytics.track('checkout_opened');
    },
    onError: (error) => {
      console.error(error);
    },
    showAlert: true, // Показать toast-уведомление при ошибке
  });

  return (
    <button onClick={handleCheckout}>
      Подписаться сейчас
    </button>
  );
}
```

#### Реализация

```ts
export function createCheckoutClickHandler(
  checkoutUrl: string,
  options?: {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    showAlert?: boolean;
  }
) {
  return () => {
    const success = openCheckoutWithErrorHandling(
      checkoutUrl,
      options?.onError
    );

    if (success && options?.onSuccess) {
      options.onSuccess();
    }

    if (!success && options?.showAlert) {
      toast.error(
        'Unable to open checkout. Please try again or contact support.'
      );
    }
  };
}
```

#### Параметры

| Параметр | Тип | Описание |
|--------|------|-------------|
| `onSuccess` | `() => void` | Вызывается при успешном открытии оформления заказа |
| `onError` | `(error: string) => void` | Вызывается с сообщением об ошибке при сбое |
| `showAlert` | `boolean` | Показать toast-уведомление через `sonner` при сбое |

## Паттерны использования

### Базовая кнопка оформления заказа

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

function CheckoutButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => openCheckoutInNewTab({ url })}
    >
      Перейти к оформлению заказа
    </button>
  );
}
```

### Оформление заказа с аналитикой

```ts
import { createCheckoutClickHandler } from '@/lib/utils/checkout-utils';
import { analytics } from '@/lib/analytics';

function PricingTier({ plan, checkoutUrl }) {
  const handleClick = createCheckoutClickHandler(checkoutUrl, {
    onSuccess: () => {
      analytics.track('checkout_initiated', {
        plan: plan.name,
        price: plan.price,
      });
    },
    onError: (error) => {
      analytics.captureException(new Error(error), {
        plan: plan.name,
      });
    },
    showAlert: true,
  });

  return (
    <button onClick={handleClick}>
      Выбрать {plan.name}
    </button>
  );
}
```

### Отключение резервного всплывающего окна

Если вы хотите предотвратить навигацию текущей страницы (например, в модальном окне), отключите резервное перенаправление:

```ts
const success = openCheckoutInNewTab({
  url: checkoutUrl,
  fallbackToRedirect: false,
});

if (!success) {
  // Показать встроенное сообщение вместо навигации
  setShowPopupBlockedMessage(true);
}
```

## Вопросы безопасности

- Параметры окна `noopener,noreferrer` предотвращают доступ открытой страницы к `window.opener`, защищая от атак подмены вкладки
- `fallbackToRedirect` использует присвоение `window.location.href` (не `window.open`), которое не подвержено блокировщикам всплывающих окон
- Защита SSR предотвращает доступ к `window` во время серверного рендеринга

## Исходные файлы

| Файл | Назначение |
|------|---------|
| `lib/utils/checkout-utils.ts` | Управление окнами оформления заказа и обработчики нажатий |
