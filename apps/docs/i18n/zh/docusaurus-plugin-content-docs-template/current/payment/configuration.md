---
id: configuration
title: 支付配置
sidebar_label: 配置指南
sidebar_position: 6
description: 配置支付提供商（Stripe、LemonSqueezy、Polar、Solidgate）及多货币支持的完整指南
keywords: [支付, 配置, stripe, lemonsqueezy, polar, solidgate, 多货币]
---

# 支付配置

本指南说明如何配置应用程序支持的各种支付提供商。

## 目录

- [概述](#overview)
- [支持的提供商](#supported-providers)
- [通用配置](#common-configuration)
- [Stripe](#stripe)
- [LemonSqueezy](#lemonsqueezy)
- [Polar](#polar)
- [Solidgate](#solidgate)
- [多货币](#multi-currency)
- [试用期和设置费用](#trials-and-setup-fees)
- [提供商选择](#provider-selection)
- [故障排除](#troubleshooting)

---

## 概述

应用程序支持多种支付提供商用于订阅：

| 提供商       | 类型   | 多货币      | 试用期      |
|-------------|--------|------------|------------|
| Stripe      | 订阅   | ✅ 是      | ✅ 是      |
| LemonSqueezy | 订阅  | ✅ 是      | ✅ 是      |
| Polar       | 订阅   | ❌ 否      | ❌ 否      |
| Solidgate   | 订阅   | ⚠️ 部分   | ❌ 否      |

### 可用套餐

- **免费** - 免费，基本功能
- **标准** - 中级套餐，具有更高知名度
- **高级** - 具有全部功能的完整套餐

---

## 支持的提供商

### 架构

```
lib/
├── config/
│   └── billing/
│       ├── index.ts              # 导出
│       ├── types.ts              # 通用类型
│       ├── stripe.config.ts      # Stripe 多货币配置
│       ├── lemonsqueezy.config.ts # LemonSqueezy 多货币配置
│       └── solidgate.config.ts   # Solidgate 配置（开发中）
├── payment/
│   └── lib/
│       └── providers/
│           ├── stripe-provider.ts
│           ├── lemonsqueezy-provider.ts
│           ├── polar-provider.ts
│           └── solidgate-provider.ts  # (开发中)
└── utils/
    └── payment-provider.ts       # 提供商选择
```

---

## 通用配置

### 显示价格（用于用户界面）

这些变量定义用户界面中显示的价格：

```bash
# 以美元（或主要货币）计价 - 仅用于显示
NEXT_PUBLIC_PRODUCT_PRICE_FREE=0
NEXT_PUBLIC_PRODUCT_PRICE_STANDARD=10
NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM=20
```

### 试用期（trial）

```bash
# 试用金额 ID（试用期内的初始费用）
NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID=price_xxx
NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID=price_xxx

# 启用/禁用带授权金额的试用期
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

---

## Stripe

### 前提条件

1. 在 [Stripe Dashboard](https://dashboard.stripe.com) 创建账户
2. 获取 API 密钥（设置 → API 密钥）
3. 配置 webhook

### 基本环境变量

```bash
# ============================================
# STRIPE - 基本配置
# ============================================

# API 密钥（必填）
STRIPE_SECRET_KEY=sk_live_xxx           # 密钥（服务器端）
STRIPE_PUBLISHABLE_KEY=pk_live_xxx      # 可发布密钥
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # 可发布密钥（客户端）

# Webhook（事件所需）
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 产品配置（旧版 - 仅 USD）

```bash
# 简单价格（用于向后兼容性，仅 USD）
NEXT_PUBLIC_STRIPE_FREE_PRICE=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_xxx
```

### 多货币配置（推荐）

#### 标准套餐

```bash
# ============================================
# STRIPE 标准套餐
# ============================================

NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=prod_xxx

# 按货币的月度价格
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_xxx

# 按货币的年度价格
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_CAD=price_xxx

# 按货币的设置费用/试用金额
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_CAD=price_xxx
```

#### 高级套餐

```bash
# ============================================
# STRIPE 高级套餐
# ============================================

NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID=prod_xxx

NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_CAD=price_xxx

NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_CAD=price_xxx

NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_CAD=price_xxx
```

### 在 Stripe 中创建价格

1. 转到**产品** → 创建产品
2. 为每种货币添加价格：
   - 点击"添加另一个价格"
   - 选择货币（EUR、GBP、CAD）
   - 设置等值金额
3. 将每个 `price_xxx` 复制到相应的变量中

### Stripe Webhook

在 Stripe Dashboard 中配置 webhook：

- **URL**: `https://您的域名.com/api/stripe/webhook`
- **要监听的事件**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

---

## LemonSqueezy

### 前提条件

1. 在 [LemonSqueezy](https://lemonsqueezy.com) 创建账户
2. 创建商店
3. 创建产品和变体

### 环境变量

```bash
# ============================================
# LEMONSQUEEZY - 基本配置
# ============================================

LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_WEBHOOK_URL=https://您的域名.com/api/lemonsqueezy/webhook
LEMONSQUEEZY_TEST_MODE=false
```

### 变体配置（旧版）

```bash
NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_WITH_SETUP_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_WITH_SETUP_VARIANT_ID=xxx
```

### 多货币配置

```bash
# 标准套餐
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_CAD=xxx

# 高级套餐
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_PRODUCT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_CAD=xxx
```

---

## Polar

### 前提条件

1. 在 [Polar](https://polar.sh) 创建账户
2. 创建组织
3. 创建订阅计划

### 环境变量

```bash
# ============================================
# POLAR - 配置
# ============================================

POLAR_ACCESS_TOKEN=xxx
POLAR_ORGANIZATION_ID=xxx
POLAR_WEBHOOK_SECRET=xxx
POLAR_SANDBOX=true
POLAR_API_URL=https://api.polar.sh
NEXT_PUBLIC_POLAR_FREE_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_TRIAL_AMOUNT_ID=xxx
```

---

## Solidgate

:::warning 开发中
Solidgate 集成目前正在开发中。某些功能可能尚未完全运行。
:::

### 环境变量

```bash
# ============================================
# SOLIDGATE - 配置（开发中）
# ============================================

SOLIDGATE_MERCHANT_ID=xxx
SOLIDGATE_SECRET_KEY=xxx
SOLIDGATE_PUBLIC_KEY=xxx
SOLIDGATE_WEBHOOK_SECRET=xxx
SOLIDGATE_ENVIRONMENT=test

NEXT_PUBLIC_SOLIDGATE_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_YEARLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_YEARLY_PRICE_ID=xxx
```

### 当前限制

| 功能         | 状态        | 备注               |
|-------------|-------------|-------------------|
| 基本支付     | ✅ 已实现   | 一次性和订阅付款   |
| 多货币       | ⚠️ 部分    | 目前仅 USD        |
| 试用期       | ❌ 尚未     | 计划在未来版本中   |
| Webhooks    | ⚠️ 部分    | 仅基本事件        |
| 退款         | ❌ 尚未     | 计划在未来版本中   |

---

## 多货币

### 支持的货币

| 代码 | 货币     | 符号 |
|-----|---------|------|
| USD | 美元     | $    |
| EUR | 欧元     | €    |
| GBP | 英镑     | £    |
| CAD | 加拿大元 | CA$  |

### 工作原理

1. 自动检测用户货币（地理位置、偏好设置）
2. 系统选择与货币对应的 `price_id`
3. 如果未配置货币，则回退到 USD

### 使用示例

```typescript
import { getStripePriceConfig } from '@/lib/config/billing';
import { useCurrencyContext } from '@/components/context/currency-provider';

function CheckoutButton({ plan }: { plan: 'standard' | 'premium' }) {
  const { currency } = useCurrencyContext();
  const priceConfig = getStripePriceConfig(plan, currency, 'monthly');
  
  return (
    <button onClick={() => createCheckout(priceConfig?.priceId)}>
      订阅 {priceConfig?.symbol}{price}
    </button>
  );
}
```

---

## 试用期和设置费用

### 概念

- **试用期**：免费或折扣测试期
- **设置费用**：试用期开始时收取的初始费用

### 配置

```bash
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

### 重要：货币一致性

:::caution
结账会话中的所有价格必须使用相同的货币。
:::

```bash
# ❌ 错误：设置费用为 USD + 主价格为 GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx

# ✅ 正确：两者都为 GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
```

---

## 提供商选择

### 优先级

1. **用户选择的提供商**（设置）
2. **默认提供商**（配置）
3. **回退**：Stripe

### 默认提供商配置

```typescript
pricing: {
  provider: PaymentProvider.STRIPE  // 或 LEMONSQUEEZY, POLAR
}
```

### 使用示例

```typescript
import { determinePaymentProvider } from '@/lib/utils/payment-provider';
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';

function PaymentComponent() {
  const { getActiveProvider } = useSelectedCheckoutProvider();
  const config = useConfig();
  
  const provider = determinePaymentProvider(
    getActiveProvider(),
    config.pricing?.provider
  );
  // provider = 'stripe' | 'lemonsqueezy' | 'polar' | 'solidgate'
}
```

---

## 故障排除

### 错误：货币冲突

```
Error: This price has currency=gbp, but other items use currency=usd
```

**原因**：主价格和设置费用使用不同货币。

**解决方案**：为每种支持的货币创建设置费用。

### 错误：无效的价格 ID

```
Error: Invalid price ID
```

**原因**：`price_id` 不存在或未配置。

**解决方案**：确认环境变量包含有效 ID。

### Webhook 未接收事件

1. 在提供商控制面板中检查 webhook URL
2. 确认 `WEBHOOK_SECRET` 正确
3. 使用提供商的调试工具进行测试

### 价格显示不正确

1. 检查 `NEXT_PUBLIC_PRODUCT_PRICE_*` 显示值
2. 确认 `price_id` 值与正确的货币对应
3. 修改 `.env` 文件后重启开发服务器
