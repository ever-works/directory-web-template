---
id: checkout-utilities
title: "Помощни Инструменти за Плащане"
sidebar_label: "Помощни Инструменти за Плащане"
sidebar_position: 7
---

# Помощни Инструменти за Плащане

Модулът `checkout-utils` (`lib/utils/checkout-utils.ts`) предоставя помощни функции за отваряне на платежни потоци за плащане в браузъра. Той обработва блокирането на изскачащи прозорци, резервни пренасочвания, обработка на грешки и създава многократно използваеми манипулатори за натискане на бутони за плащане.

## Основни концепции

Помощните инструменти за плащане решават общи предизвикателства на браузъра при отваряне на страниците за плащане на платформите за плащане:

- **Блокиране на изскачащи прозорци** -- Браузърите могат да блокират извикванията на `window.open()`. Помощните инструменти го засичат и преминават към директна навигация.
- **Обработка на грешки** -- Мрежовите неуспехи и неочаквани грешки се прихващат и докладват чрез обратни извиквания.
- **Многократно използваеми манипулатори** -- Фабрична функция създава манипулатори за натискане, които могат да бъдат прикрепени към всеки компонент на бутон.

## Типове

```ts
interface CheckoutWindowOptions {
  url: string;
  windowName?: string;       // По подразбиране: '_blank'
  windowFeatures?: string;   // По подразбиране: 'noopener,noreferrer'
  fallbackToRedirect?: boolean; // По подразбиране: true
}
```

## Функции

### openCheckoutInNewTab

Отваря URL за плащане в нов раздел на браузъра с засичане на изскачащи прозорци и резервен вариант:

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

const success = openCheckoutInNewTab({
  url: 'https://checkout.stripe.com/pay/cs_test_...',
});

if (!success) {
  // И изскачащото окно, и пренасочването са неуспешни
  console.error('Не може да се отвори плащането');
}
```

#### Имплементация

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

#### Поведенчески поток

1. **SSR защита** -- Незабавно връща `false` при изпълнение на сървъра
2. **Отваряне на изскачащо окно** -- Опитва `window.open()` с посочените характеристики
3. **Блокирано изскачащо окно** -- Ако `window.open()` върне `null`, изскачащото окно е блокирано
4. **Резервно пренасочване** -- Ако `fallbackToRedirect` е `true` (по подразбиране), навигира текущата страница към URL за плащане
5. **Опит за фокусиране** -- Опитва да фокусира новия прозорец (може да не успее в някои браузъри без да причини грешка)
6. **Прихващане на грешки** -- Всяко изключение преминава към пренасочване ако е активирано

#### Опции

| Опция | По подразбиране | Описание |
|--------|---------|-------------|
| `url` | Задължителен | URL за плащане за отваряне |
| `windowName` | `'_blank'` | Целево име на прозорец |
| `windowFeatures` | `'noopener,noreferrer'` | Функции за сигурност за новия прозорец |
| `fallbackToRedirect` | `true` | Навигирай текущата страница ако изскачащото окно е блокирано |

### openCheckoutWithErrorHandling

Обвивка около `openCheckoutInNewTab`, която добавя обратно извикване за грешка:

```ts
import { openCheckoutWithErrorHandling } from '@/lib/utils/checkout-utils';

const success = openCheckoutWithErrorHandling(
  'https://checkout.stripe.com/pay/cs_test_...',
  (error) => {
    showToast(error); // Показване на грешката на потребителя
  }
);
```

#### Имплементация

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

Фабрична функция, която създава манипулатор за натискане на бутон за плащане с обратни извиквания за успех, грешка и toast. Проектирана е да бъде предавана директно на свойствата `onClick` на бутоните:

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
    showAlert: true, // Показване на toast известие при неуспех
  });

  return (
    <button onClick={handleCheckout}>
      Абонирайте се сега
    </button>
  );
}
```

#### Имплементация

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

#### Опции

| Опция | Тип | Описание |
|--------|------|-------------|
| `onSuccess` | `() => void` | Извиква се при успешно отваряне на плащането |
| `onError` | `(error: string) => void` | Извиква се с съобщение за грешка при неуспех |
| `showAlert` | `boolean` | Показване на toast известие чрез `sonner` при неуспех |

## Модели на използване

### Основен бутон за плащане

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

function CheckoutButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => openCheckoutInNewTab({ url })}
    >
      Към плащане
    </button>
  );
}
```

### Плащане с анализи

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
      Изберете {plan.name}
    </button>
  );
}
```

### Деактивиране на резервното изскачащо окно

Ако искате да предотвратите навигацията на текущата страница (напр. в модален прозорец), деактивирайте резервното пренасочване:

```ts
const success = openCheckoutInNewTab({
  url: checkoutUrl,
  fallbackToRedirect: false,
});

if (!success) {
  // Показване на вградено съобщение вместо навигиране
  setShowPopupBlockedMessage(true);
}
```

## Съображения за сигурност

- Функциите на прозореца `noopener,noreferrer` предотвратяват достъпа на отворената страница до `window.opener`, защитавайки срещу атаки за подмяна на раздели
- `fallbackToRedirect` използва присвояване на `window.location.href` (не `window.open`), което не е обект на блокери на изскачащи прозорци
- SSR защитата предотвратява достъпа до `window` по време на рендиране на сървъра

## Изходни файлове

| Файл | Цел |
|------|---------|
| `lib/utils/checkout-utils.ts` | Управление на прозорци за плащане и манипулатори за натискане |
