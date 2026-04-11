---
id: multi-currency
title: Мультивалютная интеграция
sidebar_label: Мультивалютность
sidebar_position: 5
---

# Руководство по мультивалютной интеграции

В этом документе объясняется, как мультивалютная система интегрирована в приложение и как она работает с платежными системами (Stripe, LemonSqueezy и Polar).

## Архитектура

Мультивалютная система работает на нескольких уровнях:

1. **Базовая конфигурация** ( `lib/types.ts` ): конфигурация по умолчанию с поддержкой нескольких валют.
2. **ConfigProvider** ( `app/[locale]/config.tsx` ): дополняет конфигурацию валютой пользователя.
3. **Приемы оформления заказа**: используйте мультивалютные конфигурации, чтобы получить правильные идентификаторы цен.

## Поток данных

```
CurrencyProvider (user currency)
    ↓
ConfigProvider (enriches config.pricing with currency)
    ↓
usePricingSection / useCreateCheckoutSession
    ↓
getStripePriceConfig / getLemonSqueezyPriceConfig (currency + plan)
    ↓
Correct Price ID for the user's currency
```

## Измененные файлы

### 1. `app/[locale]/config.tsx` - Использует `useCurrencyContext()` для получения валюты пользователя.
- Автоматически генерирует конфигурацию цен на основе валюты, если конфигурация не указана.
- Использует `getDefaultPricingConfigWithCurrency()` для создания мультивалютной конфигурации.

### 2. `hooks/use-create-checkout.ts` - Использует `useCurrencyContext()` для получения валюты
- Вызывает `getStripePriceConfig()` , чтобы получить правильный идентификатор цены в зависимости от валюты.
- Возвращается к `plan.stripePriceId` , если мультивалютная конфигурация недоступна.

### 3. `hooks/use-pricing-section.ts` - Использует `useCurrencyContext()` для получения валюты
- Вызывает `getLemonSqueezyPriceConfig()` для LemonSqueezy
- Использует идентификаторы цен на основе валюты во время оформления заказа.

## Использование

### Для разработчиков

Система работает автоматически. Никаких модификаций существующих компонентов не требуется.

**Пример использования в компоненте:**

```tsx
import { useConfig } from '@/app/[locale]/config';
import { useCurrencyContext } from '@/components/context/currency-provider';

function PricingComponent() {
  const config = useConfig();
  const { currency } = useCurrencyContext();
  
  // config.pricing is automatically enriched with the user's currency
  // Price IDs are based on the user's currency
  const standardPlan = config.pricing?.plans.STANDARD;
  
  // Currency symbol is automatically updated
  const currencySymbol = config.pricing?.currency; // €, £, $, etc.
}
```

### Для крючков оформления заказа

Перехватчики Checkout автоматически используют мультивалютные конфигурации:

```tsx
// In useCreateCheckoutSession (Stripe)
const currencyPriceConfig = getStripePriceConfig(planName, currency, interval);
const priceId = currencyPriceConfig?.priceId || plan.stripePriceId;

// In usePricingSection (LemonSqueezy)
const currencyVariantConfig = getLemonSqueezyPriceConfig(planName, currency, interval);
const variantId = currencyVariantConfig?.priceId || plan.lemonVariantId;
```

## Конфигурация переменных среды

Чтобы система работала, необходимо настроить переменные среды для каждой валюты в:

- `lib/config/billing/stripe.config.ts` : `NEXT_PUBLIC_STRIPE_*_PRICE_ID_*` переменные
- `lib/config/billing/lemonsqueezy.config.ts` : `NEXT_PUBLIC_LEMONSQUEEZY_*_PRICE_ID_*` переменные

**Пример для Stripe:**
```env
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_yyy
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_zzz
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_aaa
```

## Поддерживаемые валюты

Поддерживаемые валюты определены в `lib/config/billing/types.ts` :

- USD, EUR, GBP, CAD (настраивается в настройках биллинга)
- Другие валюты ISO 4217 (возврат к доллару США)

## Резервный вариант

Если валюта не поддерживается или мультивалютные конфигурации недоступны:

1. Система использует `plan.stripePriceId` / `plan.lemonVariantId` (статическая конфигурация)
2. Валюта по умолчанию — доллар США.
3. Символ по умолчанию — $.

## Тестирование

Чтобы протестировать мультивалютную систему:

1. Измените валюту пользователя с помощью `/api/user/currency` 2. Убедитесь, что идентификаторы цен меняются в зависимости от валюты.
3. Тестовая оплата в разных валютах

## Важные примечания

– Идентификаторы цен обрабатываются **во время оформления заказа**, а не во время отображения.
- Конфигурация цен в `content/config.yml` имеет приоритет над конфигурацией по умолчанию.
- Мультивалютные конфигурации используются только в том случае, если настроены переменные среды.

## Интеграция с платежными системами

Мультивалютная система бесперебойно работает со всеми платежными системами:

- **Полоса**: используется `getStripePriceConfig()` для получения идентификаторов цен для конкретной валюты.
- **LemonSqueezy**: использует `getLemonSqueezyPriceConfig()` для получения идентификаторов вариантов для конкретной валюты.
- **Polar**: поддержка мультивалютности посредством конфигурации продукта.

Подробную настройку для конкретного поставщика см. в разделе:
- [Конфигурация полосы](./stripe)
- [Конфигурация LemonSqueezy](./lemonsqueezy)
- [Полярная конфигурация](./полярный)
