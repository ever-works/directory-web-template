---
id: pricing-pages
title: 定价和结账页面
sidebar_label: 定价页
sidebar_position: 19
---

# 定价和结帐页面

Ever Works 模板包括功能齐全的定价页面系统，具有多提供商结账支持（Stripe、LemonSqueezy、Polar）、计费间隔切换、Stripe 产品的动态定价、货币格式、计划比较卡、赞助商广告部分以及嵌入式或基于重定向的支付流程。

## 架构概述

|组件|路径|目的|
|---|---|---|
| 0 | 1 |计划配置、功能列表和操作文本获取器 |
| 2 | 3 |协调所有定价状态、结账和支付逻辑 |
| 4 | 5 |包含计划卡和结账流程的完整定价页面 UI
| 6 | 7 |个人计划展示卡|
| 8 | 9 |嵌入式付款表格模式 |
| 10 | 11 |流程选择模式（立即付费与结束付费）|

## 计划配置

系统支持通过12配置的三个计划层：

|计划|操作文本（已登录）|操作文本（未登录）|
|---|---|---|
| 13 | “免费开始”| “免费提交”|
| 14 | “升级到标准”| “立即订阅” |
| 15 | “进入高级版” | “立即订阅” |

### 计划配置界面

```tsx
interface PlanConfig {
  name: string;      // Localized plan name
  period: string;    // Billing period label
  description: string; // Plan description
}
```

### 功能列表

Each plan has a typed feature list:

```tsx
interface PlanFeature {
  included: boolean;  // Whether the feature is included
  text: string;       // Localized feature description
}
```

|计划|功能计数 |值得注意的内含物 |
|---|---|---|
|免费| 9 特点 |提交产品、基本描述、一张图片、网站链接 |
|标准| 9 特点 |所有免费功能、经过验证的徽章、优先审查、每月统计数据 |
|高级| 11 个功能 |所有标准功能、赞助位置、主页精选、无限画廊 |

## 0 钩子

这个综合钩子协调了整个定价页面逻辑：

```tsx
import { usePricingSection } from '@/hooks/use-pricing-section';

const pricing = usePricingSection({
  onSelectPlan: (plan) => console.log('Selected:', plan),
  initialSelectedPlan: PaymentPlan.STANDARD,
  isReview: false
});
```

### 状态

|物业 |类型 |描述 |
|---|---|---|
| 0 | 1 |支付流程选择器是否可见 |
| 2 | 3 |当前计费间隔（每月/每年）|
| 4 | 5 |当前正在处理的计划 ID |
| 6 | 7 |当前选择的计划 |
| 8 | 9 |付款流程类型（立即付款与最终付款）|
| 10 | 11 |所选流程是否采用按钮模式|

### 行动

|方法|描述 |
|---|---|
| 12 |在按月和按年计费之间切换 |
| 13 |选择一个计划并通过回拨通知家长 |
| 14 |启动给定计划配置的结帐 |
| 15 |根据计费间隔和年度折扣计算价格 |
| 16 |获取每年节省的文本（例如，“每年节省 24 美元”）|
| 17 |取消正在进行的结账并重置状态 |
| 18 |使用货币符号格式化金额 |

### 价格计算

该钩子根据计费间隔计算价格：

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

## 支付提供商

该系统支持三个支付提供商，按配置或按用户偏好进行选择：

|供应商|结账钩|嵌入式支持 |
|---|---|---|
|条纹| 0 |是（安装意图）|
|柠檬挤压 | 1 |是（覆盖）|
|极地 | 2 |是（嵌入 URL）|

### 提供商选择

```tsx
// Provider is determined by: user setting > config default
const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);
```

### 结账流程

当用户单击计划的操作按钮时：

1.验证用户是否已登录（如果没有则打开登录模式）
2. 取消任何现有的结账流程
3. 确定支付提供商
4. 获取货币感知价格 ID 或变体 ID
5. 打开嵌入式付款表格或重定向至提供商结帐

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

## 动态定价（Stripe）

当 Stripe 是活跃提供商并启用动态定价时，该挂钩会获取实时产品数据：

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

## 货币支持

定价系统支持多币种显示：

```tsx
const { currency } = useCurrencyContext();
const currencySymbol = getCurrencySymbol(currency);
const formatPrice = (amount: number) => formatAmountWithSymbol(amount, currency);
```

货币感知变体 ID 通过特定于提供商的配置函数来解析：

|供应商|配置功能|
|---|---|
|柠檬挤压 | 0 |
|极地 | 1 |

## 付款表格模式

嵌入式支付表单支持所有三个提供商：

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

## 定价部分组件

0 组件呈现完整的定价页面：

```tsx
<PricingSection
  onSelectPlan={(plan) => handlePlanSelect(plan)}
  isReview={false}
  initialSelectedPlan={PaymentPlan.STANDARD}
/>
```

### 视觉特征

|特色 |描述 |
|---|---|
|计费间隔切换|每月和每年之间的动画滑块 |
|计划卡网格|响应式 1 列（移动设备）到 3 列（桌面）布局 |
|流行徽章|标准计划被标记为“流行”并带有发光效果|
|储蓄徽章|绿色药丸在适用时显示每年节省费用|
|信任指标| “无隐藏费用”、“即时激活”、“高级支持”的图标 |
|赞助商广告部分|带有赞助广告位定价的动画雷达圈 |
|继续部分 |通过号召性用语选择计划后显示 |

### 条件渲染

该组件根据付款可用性有条件地显示付费计划：

```tsx
const { shouldShowPaidPlans } = usePaymentAvailability();

// Grid adapts: 3-column for paid plans, 1-column for free-only
<div className={cn(
  'grid gap-6',
  shouldShowPaidPlans ? 'grid-cols-1 md:grid-cols-3 max-w-6xl' : 'grid-cols-1 max-w-md'
)}>
```

## 国际化

所有面向用户的字符串都使用 0 和两个翻译命名空间：

|命名空间 |用途 |
|---|---|
| 1 |计划名称、功能、页面内容、赞助商部分 |
| 2 |每月/每年标签、处理状态、错误消息 |

## 关键文件

|文件|路径|
|---|---|
|定价功能挂钩| 3 |
|定价部分挂钩| 4 |
|定价部分组件 | 5 |
|计划卡组件 | 6 |
|付款方式模态 | 7 |
|付款常数| 8 |
|定价配置类型 | 9 |
