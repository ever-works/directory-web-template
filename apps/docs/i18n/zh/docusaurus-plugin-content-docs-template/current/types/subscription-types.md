---
id: subscription-types
title: 订阅类型定义
sidebar_label: 订阅类型
sidebar_position: 12
---

# 订阅类型定义

**来源：** `lib/payment/types/payment-types.ts`、`lib/db/schema.ts`

订阅类型模拟了定期计费的整个生命周期——从试用创建到取消和续订。

## 枚举

### `SubscriptionStatus`（提供商级别）

支付提供商 SDK 返回的状态值。

```typescript
enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}
```

|价值|描述|
|-------|-------------|
|`incomplete`|首期付款仍待处理|
|`trialing`|客户处于试用期内|
|`active`|订阅已激活且已付费|
|`past_due`|付款失败但订阅尚未取消|
|`canceled`|订阅已取消|
|`unpaid`|多次付款失败；订阅已暂停|

### `SubscriptionStatus`（数据库级）

状态值存储在 `subscriptions` 表中。

```typescript
const SubscriptionStatus = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  PENDING: 'pending',
  PAUSED: 'paused',
} as const;

type SubscriptionStatusValues =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
```

### `SubscriptionPlanType`

区分订阅的启动方式。

```typescript
enum SubscriptionPlanType {
  TRIAL = 'trial',       // 7-day trial converting to recurring
  RECURRING = 'recurring', // Direct recurring (1-month)
}
```

## 接口

### `SubscriptionInfo`

从任何提供商返回的标准化订阅数据。

```typescript
interface SubscriptionInfo {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: number | null;  // Unix timestamp
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  trialEnd?: number | null;
  priceId: string;
  paymentIntentId?: string;
  checkoutData?: Record<string, any>;
}
```

|领域|描述|
|-------|-------------|
|`id`|提供者订阅标识符|
|`customerId`|提供商客户标识符|
|`currentPeriodEnd`|当前计费周期结束时的 Unix 时间戳|
|`cancelAtPeriodEnd`|如果`true`，订阅将在周期结束时取消，而不是立即取消|
|`trialEnd`|试用期结束时的 Unix 时间戳|

### `CreateSubscriptionParams`

用于创建新订阅的参数。

```typescript
interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  paymentMethodId?: string;
  trialPeriodDays?: number;
  metadata?: Record<string, any>;
}
```

### `UpdateSubscriptionParams`

用于修改现有订阅的参数。

```typescript
interface UpdateSubscriptionParams {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  metadata?: Record<string, any>;
}
```

### `PriceDetails`

用于显示的格式化定价信息。

```typescript
interface PriceDetails {
  amount: number;      // Amount in cents
  formatted: string;   // e.g., "$9.99/mo"
}

interface SubscriptionDetails extends OneTimeDetails {
  weekly?: PriceDetails;
}

interface OneTimeDetails extends PriceDetails {
  collect_tax: boolean;
}
```

### `CountryPricing`

特定国家/地区的本地化定价。

```typescript
interface CountryPricing {
  country: string;
  currency: string;
  symbol: string;
  subscription: SubscriptionDetails;
  oneTime: OneTimeDetails;
  free: OneTimeDetails;
}
```

## 数据库架构

`subscriptions`表存储订阅记录：

```typescript
// Key columns from lib/db/schema.ts
{
  id: text,
  userId: text,                // FK -> users.id
  planId: text,                // 'free' | 'standard' | 'premium'
  status: text,                // 'active' | 'cancelled' | 'expired' | 'pending' | 'paused'
  startDate: timestamp,
  endDate: timestamp,
  paymentProvider: text,       // 'stripe' | 'lemonsqueezy' | 'polar'
  subscriptionId: text,        // Provider subscription ID
  customerId: text,            // Provider customer ID
  autoRenewal: boolean,
  cancelAtPeriodEnd: boolean,
  trialStart: timestamp,
  trialEnd: timestamp,
}
```

## 使用示例

```typescript
import type {
  CreateSubscriptionParams,
  SubscriptionInfo,
} from '@/lib/payment/types/payment-types';

const params: CreateSubscriptionParams = {
  customerId: 'cus_abc123',
  priceId: 'price_monthly_premium',
  trialPeriodDays: 7,
};

// After creation
const sub: SubscriptionInfo = await provider.createSubscription(params);
console.log(sub.status); // 'trialing'
```

## 相关类型

- [Payment Types](./ payment-types.md) -- 付款意图、结帐参数
- [Auth Types](./auth-types.md) -- 链接到订阅的用户和会话类型
