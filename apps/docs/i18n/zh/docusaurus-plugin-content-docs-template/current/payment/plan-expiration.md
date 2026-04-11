---
id: plan-expiration
title: 计划到期实用程序
sidebar_label: 计划到期
sidebar_position: 8
---

# 计划过期实用程序

0模块(11)提供集中逻辑来处理订阅计划到期。它计算到期状态、宽限期、警告窗口和有效计划级别。这些实用程序在后端和前端使用，以实现一致的行为。

## 配置

该模块导出一个具有默认值的配置对象：

```ts
export const EXPIRATION_CONFIG = {
  /** Days before expiration to show warning */
  WARNING_DAYS: 7,
  /** Days of grace period after expiration */
  GRACE_PERIOD_DAYS: 0,
} as const;
```

这两个值都可以在每次调用时通过函数参数进行覆盖。

## 核心功能

### 计划已过期

根据结束日期检查订阅是否已过期，并具有可选的宽限期：

```ts
import { isPlanExpired } from '@/lib/utils/plan-expiration.utils';

// Basic expiration check
isPlanExpired(new Date('2024-01-01')); // true (past date)
isPlanExpired(new Date('2099-12-31')); // false (future date)
isPlanExpired(null);                   // false (no end date)

// With grace period
isPlanExpired(new Date('2024-12-31'), 30); // May still be false if within 30-day grace
```

＃＃＃＃ 执行

```ts
export function isPlanExpired(
  endDate: Date | string | null | undefined,
  gracePeriodDays: number = EXPIRATION_CONFIG.GRACE_PERIOD_DAYS
): boolean {
  if (!endDate) return false;

  const expirationDate =
    typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(expirationDate.getTime())) return false;

  const now = new Date();
  const graceEndDate = new Date(expirationDate);
  graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);

  return now > graceEndDate;
}
```

关键行为：
- 对于 1 或 2 结束日期返回 0（计划永不过期）
- 对于无效日期字符串返回3
- 接受 4 对象和 ISO 日期字符串
- 宽限期延长有效到期日期

### 获取有效计划

考虑到期时间和状态，确定用户应有权访问的实际计划：

```ts
import { getEffectivePlan } from '@/lib/utils/plan-expiration.utils';

// Active paid plan
getEffectivePlan('pro', new Date('2099-12-31'));
// "pro"

// Expired paid plan falls back to FREE
getEffectivePlan('pro', new Date('2024-01-01'));
// "free"

// Free plan never expires
getEffectivePlan('free', null);
// "free"

// Explicitly cancelled
getEffectivePlan('pro', new Date('2099-12-31'), 'cancelled');
// "free"
```

＃＃＃＃ 执行

```ts
export function getEffectivePlan(
  planId: string,
  endDate: Date | string | null | undefined,
  status?: string
): string {
  // Free plan never expires
  if (planId === PaymentPlan.FREE) {
    return PaymentPlan.FREE;
  }

  // Explicit status check
  if (
    status &&
    ['expired', 'cancelled'].includes(status.toLowerCase())
  ) {
    return PaymentPlan.FREE;
  }

  // Date-based expiration check
  if (isPlanExpired(endDate)) {
    return PaymentPlan.FREE;
  }

  return planId;
}
```

该函数按顺序应用三项检查：

1. **免费计划绕过** -- 免费计划始终按原样返回
2. **显式状态** -- 如果状态为0或1，用户将获得免费
3. **日期检查** -- 如果结束日期已过，用户将免费获得

### getDaysUntilExpiration

计算订阅到期之前的完整天数：

```ts
import { getDaysUntilExpiration } from '@/lib/utils/plan-expiration.utils';

getDaysUntilExpiration(new Date('2099-12-31'));  // Large positive number
getDaysUntilExpiration(new Date('2024-01-01'));  // Negative number (already expired)
getDaysUntilExpiration(null);                    // null (no end date)
```

＃＃＃＃ 执行

```ts
export function getDaysUntilExpiration(
  endDate: Date | string | null | undefined
): number | null {
  if (!endDate) return null;

  const expirationDate =
    typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(expirationDate.getTime())) return null;

  const now = new Date();
  const diffTime = expirationDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
```

该函数使用 0 来计算剩余的完整天数。这意味着 1 小时后到期的订阅将返回 1（今天到期），而不是2。

### isInExpirationWarningPeriod

检查订阅是否在到期前的警告窗口内：

```ts
import { isInExpirationWarningPeriod } from '@/lib/utils/plan-expiration.utils';

// Expires in 5 days with default 7-day warning
isInExpirationWarningPeriod(fiveDaysFromNow);   // true

// Expires in 10 days
isInExpirationWarningPeriod(tenDaysFromNow);    // false

// Already expired
isInExpirationWarningPeriod(yesterday);          // false

// Custom warning window
isInExpirationWarningPeriod(threeDaysFromNow, 3); // true
```

仅当计划**尚未过期**但处于警告窗口内时，该函数才会返回0。已经过期的计划返回1。

### isInGracePeriod

检查订阅是否处于到期后宽限期内：

```ts
import { isInGracePeriod } from '@/lib/utils/plan-expiration.utils';

// Plan expired 2 days ago, 7-day grace period
isInGracePeriod(twoDaysAgo, 7);  // true

// Plan expired 10 days ago, 7-day grace period
isInGracePeriod(tenDaysAgo, 7);  // false

// No grace period configured (default)
isInGracePeriod(yesterday);       // false (grace period is 0)
```

宽限期是**过期后**的窗口，在此期间用户的访问权限仍然受到限制。由于默认值 01，此函数始终返回22。

### 获取计划状态信息

返回一个综合状态对象，将所有过期检查合并到一个调用中：

```ts
import { getPlanStatusInfo } from '@/lib/utils/plan-expiration.utils';

const status = getPlanStatusInfo('pro', new Date('2025-04-01'));
// {
//   planId: 'pro',
//   effectivePlan: 'pro',       // or 'free' if expired
//   isExpired: false,
//   isInWarningPeriod: true,    // if within 7 days
//   isInGracePeriod: false,
//   daysUntilExpiration: 5,
//   expiresAt: Date,
//   canAccessPlanFeatures: true,
// }
```

#### 返回类型

```ts
{
  planId: string;               // Original plan ID
  effectivePlan: string;        // Actual plan after expiration logic
  isExpired: boolean;           // Whether the plan has expired
  isInWarningPeriod: boolean;   // Within warning days before expiration
  isInGracePeriod: boolean;     // In post-expiration grace period
  daysUntilExpiration: number | null;
  expiresAt: Date | null;       // Parsed expiration date
  canAccessPlanFeatures: boolean; // true if not expired OR in grace period
}
```

0字段是关键决策字段：当用户仍然可以使用付费功能时，它是1，因为计划处于活动状态或者因为它们处于宽限期内。

### 格式过期消息

生成用户可读的到期消息以供 UI 显示：

```ts
import { formatExpirationMessage } from '@/lib/utils/plan-expiration.utils';

formatExpirationMessage('Pro', 0, false);
// "Your Pro subscription expires today."

formatExpirationMessage('Pro', 1, false);
// "Your Pro subscription expires tomorrow."

formatExpirationMessage('Pro', 5, false);
// "Your Pro subscription expires in 5 days."

formatExpirationMessage('Pro', -3, true);
// "Your Pro subscription has expired. Please renew to restore full access."

formatExpirationMessage('Pro', 30, false);
// null (outside warning period, no message needed)

formatExpirationMessage('Pro', null, false);
// null (no end date)
```

当不应显示任何消息时（在警告期限之外且未过期），该函数返回0。

## 使用模式

### API 路由守卫

```ts
import { getEffectivePlan } from '@/lib/utils/plan-expiration.utils';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  const effectivePlan = getEffectivePlan(
    user.planId,
    user.subscriptionEndDate,
    user.subscriptionStatus
  );

  if (effectivePlan === 'free') {
    return Response.json(
      { error: 'This feature requires a paid plan' },
      { status: 403 }
    );
  }

  // Proceed with paid-tier logic
}
```

### 过期横幅组件

```ts
import {
  getPlanStatusInfo,
  formatExpirationMessage,
} from '@/lib/utils/plan-expiration.utils';

function ExpirationBanner({ user }) {
  const status = getPlanStatusInfo(
    user.planId,
    user.subscriptionEndDate,
    user.subscriptionStatus
  );

  const message = formatExpirationMessage(
    user.planName,
    status.daysUntilExpiration,
    status.isExpired
  );

  if (!message) return null;

  return (
    <div className={status.isExpired ? 'bg-red-100' : 'bg-yellow-100'}>
      <p>{message}</p>
      <a href="/pricing">Renew Now</a>
    </div>
  );
}
```

### 功能访问检查

```ts
import { getPlanStatusInfo } from '@/lib/utils/plan-expiration.utils';

function useCanAccessFeature(user) {
  const status = getPlanStatusInfo(
    user.planId,
    user.subscriptionEndDate
  );

  return status.canAccessPlanFeatures;
}
```

## 时间线可视化

过期生命周期会经历以下状态：

```
Active -> Warning Period -> Expired -> Grace Period -> Fully Expired
  |          |                |            |               |
  |     (7 days before)  (end date)  (grace days)   (grace ended)
  |          |                |            |               |
  | canAccess=true    canAccess=true  canAccess=true  canAccess=false
  | warning=false     warning=true    expired=true    expired=true
  | expired=false     expired=false   grace=true      grace=false
```

## 源文件

|文件|目的|
|------|---------|
| 0 |订阅过期逻辑 |
| 1 | 2 带有免费计划标识符的枚举 |
