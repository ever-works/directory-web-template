---
id: pricing-pages
title: Страницы цен и оформления заказа
sidebar_label: Страницы цен
sidebar_position: 19
---

# Страницы цен и оформления заказа

Шаблон Ever Works включает в себя полнофункциональную систему страниц цен с поддержкой оформления заказа у нескольких поставщиков (Stripe, LemonSqueezy, Polar), переключением интервала выставления счетов, динамическим ценообразованием на продукты Stripe, форматированием валюты, карточками сравнения планов, разделами спонсорской рекламы, а также встроенными или перенаправленными потоками платежей.

## Обзор архитектуры

| Компонент | Путь | Цель |
|---|---|---|
| `usePricingFeatures` | `hooks/use-pricing-features.ts` | Планируйте конфигурации, списки функций и средства получения текста действий |
| `usePricingSection` | `hooks/use-pricing-section.ts` | Управляет всей логикой ценообразования, оформления заказа и оплаты |
| `PricingSection` | `components/pricing/pricing-section.tsx` | Полный пользовательский интерфейс страницы цен с карточками планов и процессом оформления заказа |
| `PlanCard` | `components/pricing/plan-card.tsx` | Карточка индивидуального плана |
| `PaymentFormModal` | `components/payment/stripe-payment-modal.tsx` | Встроенная модальная форма оплаты |
| `PaymentFlowSelectorModal` | `components/payment/` | Модальное окно выбора потока (оплата сейчас или оплата в конце) |

## Конфигурация плана

Система поддерживает три уровня плана, настроенные через `usePricingFeatures` :

| План | Текст действия (вход в систему) | Текст действия (не авторизован) |
|---|---|---|
| `free` | «Начните бесплатно» | «Отправить бесплатно» |
| `standard` | «Обновление до стандарта» | «Подпишитесь сейчас» |
| `premium` | «Премиум» | «Подпишитесь сейчас» |

### Интерфейс конфигурации плана

```tsx
interface PlanConfig {
  name: string;      // Localized plan name
  period: string;    // Billing period label
  description: string; // Plan description
}
```

### Списки функций

Каждый план имеет типизированный список функций:

```tsx
interface PlanFeature {
  included: boolean;  // Whether the feature is included
  text: string;       // Localized feature description
}
```

| План | Количество функций | Заметные включения |
|---|---|---|
| Бесплатно | 9 функций | Отправьте продукт, основное описание, одно изображение, ссылку на сайт |
| Стандарт | 9 функций | Все бесплатные функции, проверенный значок, приоритетный обзор, ежемесячная статистика |
| Премиум | 11 функций | Все стандартные функции, спонсорская позиция, главная страница, неограниченное количество галерей |

## Крючок `usePricingSection` Этот комплексный хук управляет всей логикой страницы цен:

```tsx
import { usePricingSection } from '@/hooks/use-pricing-section';

const pricing = usePricingSection({
  onSelectPlan: (plan) => console.log('Selected:', plan),
  initialSelectedPlan: PaymentPlan.STANDARD,
  isReview: false
});
```

### Состояние

| Недвижимость | Тип | Описание |
|---|---|---|
| `showSelector` | `boolean` | Виден ли селектор потока платежей |
| `billingInterval` | `PaymentInterval` | Текущий интервал выставления счетов (ежемесячно/ежегодно) |
| `processingPlan` | `string \| null` | Идентификатор плана, который в данный момент обрабатывается |
| `selectedPlan` | `PaymentPlan \| null` | Выбранный в данный момент план |
| `selectedFlow` | `PaymentFlow` | Тип потока платежей (оплата сейчас или оплата в конце) |
| `isButton` | `boolean` | Использует ли выбранный поток режим кнопок |

### Действия

| Метод | Описание |
|---|---|
| `setBillingInterval(interval)` | Переключение между ежемесячным и ежегодным выставлением счетов |
| `handleSelectPlan(plan)` | Выберите план и сообщите об этом родителю через обратный звонок |
| `handleCheckout(plan)` | Начать оформление заказа для данной конфигурации плана |
| `calculatePrice(plan)` | Рассчитать цену на основе интервала выставления счетов и годовой скидки |
| `getSavingsText(plan)` | Получите текст годовой экономии (например, «Сэкономьте 24 доллара в год») |
| `cancelCurrentProcess()` | Отменить текущее оформление заказа и сбросить состояние |
| `formatPrice(amount)` | Формат суммы с символом валюты |

### Расчет цены

Хук рассчитывает цены на основе интервала выставления счетов:

```tsx
const calculatePrice = (plan: PricingConfig): number => {
  if (billingInterval !== PaymentInterval.YEARLY || !plan.annualDiscount) {
    return plan.price;
  }
  const annualPrice = plan.price * 12;
  const discountMultiplier = 1 - plan.annualDiscount / 100;
  return Math.round(annualPrice * discountMultiplier);
};
```

## Поставщики платежей

Система поддерживает трех поставщиков платежей, выбираемых для каждой конфигурации или предпочтений пользователя:

| Провайдер | Крючок для оформления заказа | Встроенная поддержка |
|---|---|---|
| Полоса | `useCreateCheckoutSession` | Да (SetupIntent) |
| ЛимонныйСкуизи | `useCheckoutButton` | Да (наложение) |
| Полярный | `usePolarCheckout` | Да (встроенный URL-адрес) |

### Выбор поставщика

```tsx
// Provider is determined by: user setting > config default
const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);
```

### Порядок оформления заказа

Когда пользователь нажимает кнопку действия плана:

1. Убедитесь, что пользователь вошел в систему (если нет, откройте модальное окно входа).
2. Отмените любой существующий процесс оформления заказа.
3. Определите поставщика платежей
4. Получите идентификатор цены или идентификатор варианта с учетом валюты.
5. Откройте встроенную форму оплаты или перенаправьте на страницу оформления заказа поставщика.

```tsx
const handleCheckout = async (plan: PricingConfig) => {
  if (!user?.id) {
    loginModal.onOpen('Please sign in to continue with your purchase.');
    return;
  }

  if (paymentProvider === PaymentProvider.LEMONSQUEEZY) {
    await lemonsqueezyHook.handleSubmitWithParams({ variantId, metadata, embedded });
  } else if (paymentProvider === PaymentProvider.POLAR) {
    await polarHook.createCheckoutSession(priceId, user, plan, billingInterval);
  } else if (paymentProvider === PaymentProvider.STRIPE) {
    await stripeHook.createCheckoutSession(plan, user, billingInterval);
  }
};
```

## Динамическое ценообразование (полоса)

Когда Stripe является активным поставщиком и включено динамическое ценообразование, перехватчик извлекает актуальные данные о продукте:

```tsx
const isDynamicPricingEnabled = paymentProvider === PaymentProvider.STRIPE
  && isStripeDynamicPricingEnabled();

const { data: stripeProductsData } = useStripeProducts({
  enabled: isDynamicPricingEnabled && !isReview
});

// Merge: dynamic values override static, but keep static as fallback
const { FREE, STANDARD, PREMIUM } = useMemo(() => {
  if (isDynamicPricingEnabled && stripeProductsData?.products?.length) {
    const dynamicPlans = mapStripeProductsToPricingPlans(stripeProductsData.products, currency);
    return {
      FREE: dynamicPlans.FREE ?? staticPlans.FREE,
      STANDARD: dynamicPlans.STANDARD ?? staticPlans.STANDARD,
      PREMIUM: dynamicPlans.PREMIUM ?? staticPlans.PREMIUM
    };
  }
  return staticPlans;
}, [isDynamicPricingEnabled, stripeProductsData, staticPlans, currency]);
```

## Валютная поддержка

Система ценообразования поддерживает мультивалютное отображение:

```tsx
const { currency } = useCurrencyContext();
const currencySymbol = getCurrencySymbol(currency);
const formatPrice = (amount: number) => formatAmountWithSymbol(amount, currency);
```

Идентификаторы вариантов с учетом валюты разрешаются с помощью функций конфигурации, специфичных для поставщика:

| Провайдер | Функция конфигурации |
|---|---|
| ЛимонныйСкуизи | `getLemonSqueezyPriceConfig(planName, currency, interval)` |
| Полярный | `getPolarPriceConfig(planName, currency, interval)` |

## Модальное окно формы оплаты

Встроенная форма оплаты поддерживает всех трех провайдеров:

```tsx
<PaymentFormModal
  isOpen={paymentForm.isOpen}
  onClose={paymentForm.closePaymentForm}
  onSuccess={paymentForm.onPaymentSuccess}
  onError={paymentForm.onPaymentError}
  planName={paymentForm.planForPayment?.name}
  planPrice={formatPrice(calculatePrice(paymentForm.planForPayment))}
  amount={calculatePrice(paymentForm.planForPayment)}
  currency={currency}
  clientSecret={clientSecret}
  checkoutUrl={paymentForm.checkoutUrl}
  provider={provider}
  theme={theme}
/>
```

## Компонент раздела цен

Компонент `PricingSection` отображает полную страницу с ценами:

```tsx
<PricingSection
  onSelectPlan={(plan) => handlePlanSelect(plan)}
  isReview={false}
  initialSelectedPlan={PaymentPlan.STANDARD}
/>
```

### Визуальные возможности

| Особенность | Описание |
|---|---|
| Переключение интервала выставления счетов | Анимированный слайдер между ежемесячными и ежегодными |
| План сетки карт | Адаптивный макет от 1 столбца (мобильный) до 3 столбцов (настольный компьютер) |
| Популярный значок | Стандартный план отмечен как «популярный» с эффектами свечения |
| Сберегательные значки | Зеленые таблетки, показывающие ежегодную экономию, когда это применимо |
| Индикаторы доверия | Иконки «Без скрытых комиссий», «Мгновенная активация», «Премиум-поддержка» |
| Раздел спонсорских объявлений | Анимированные радарные круги с ценами на спонсорское размещение |
| Продолжить раздел | Отображается после выбора плана с призывом к действию |

### Условный рендеринг

Компонент условно отображает платные планы в зависимости от наличия платежей:

```tsx
const { shouldShowPaidPlans } = usePaymentAvailability();

// Grid adapts: 3-column for paid plans, 1-column for free-only
<div className={cn(
  'grid gap-6',
  shouldShowPaidPlans ? 'grid-cols-1 md:grid-cols-3 max-w-6xl' : 'grid-cols-1 max-w-md'
)}>
```

## Интернационализация

Все строки, ориентированные на пользователя, используют `next-intl` с двумя пространствами имен перевода:

| Пространство имен | Использование |
|---|---|
| `pricing` | Названия планов, функции, содержимое страниц, раздел спонсоров |
| `billing` | Месячные/годовые метки, состояния обработки, сообщения об ошибках |

## Ключевые файлы

| Файл | Путь |
|---|---|
| Ценообразование Особенности Крючок | `hooks/use-pricing-features.ts` |
| Раздел цен Крючок | `hooks/use-pricing-section.ts` |
| Компонент раздела цен | `components/pricing/pricing-section.tsx` |
| Компонент карты плана | `components/pricing/plan-card.tsx` |
| Форма оплаты Модальная | `components/payment/stripe-payment-modal.tsx` |
| Платежные константы | `lib/constants.ts` |
| Тип конфигурации цен | `lib/content.ts` |
