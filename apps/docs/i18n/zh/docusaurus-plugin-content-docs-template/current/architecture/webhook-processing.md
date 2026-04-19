---
id: webhook-processing
title: Webhook 处理
sidebar_label: 网络钩子
sidebar_position: 67
---

# Webhook 处理

## 概述

Ever Works 模板处理来自三个支付提供商的传入 Webhook：**Stripe**、**Lemon Squeezy** 和 **Polar**。每个提供商都有一个专用的 API 路由，用于验证签名、将事件类型标准化为通用 `WebhookEventType` 枚举，并分派到处理程序函数以进行订阅管理、支付跟踪和电子邮件通知。

## 建筑

```mermaid
flowchart TD
    A[Payment Provider] -->|POST| B{Which Provider?}

    B -->|stripe-signature header| C[/api/stripe/webhook]
    B -->|x-signature header| D[/api/lemonsqueezy/webhook]
    B -->|webhook-signature header| E[/api/polar/webhook]

    C --> F[Stripe Provider]
    D --> G[LemonSqueezy Provider]
    E --> H[Polar Provider]

    F --> I[Verify Signature]
    G --> I
    H --> I

    I -->|Valid| J[Normalize to WebhookEventType]
    I -->|Invalid| K[400 Bad Request]

    J --> L{Event Type Router}

    L -->|SUBSCRIPTION_CREATED| M[handleSubscriptionCreated]
    L -->|SUBSCRIPTION_UPDATED| N[handleSubscriptionUpdated]
    L -->|SUBSCRIPTION_CANCELLED| O[handleSubscriptionCancelled]
    L -->|PAYMENT_SUCCEEDED| P[handlePaymentSucceeded]
    L -->|PAYMENT_FAILED| Q[handlePaymentFailed]
    L -->|TRIAL_ENDING| R[handleTrialEnding]

    M --> S{Is Sponsor Ad?}
    S -->|Yes| T[Sponsor Ad Handlers]
    S -->|No| U[WebhookSubscriptionService]
    U --> V[Database Update]
    U --> W[Email Notification]
```

## 源文件

|文件|目的|
|------|---------|
|`template/app/api/stripe/webhook/route.ts`|Stripe Webhook 处理程序|
|`template/app/api/lemonsqueezy/webhook/route.ts`|LemonSqueezy webhook 处理程序|
|`template/app/api/polar/webhook/route.ts`|Polar Webhook 入口点|
|`template/app/api/polar/webhook/router.ts`|极地事件路由|
|`template/app/api/polar/webhook/handlers.ts`|极地事件处理程序|
|`template/app/api/polar/webhook/types.ts`|Polar webhook 类型定义|
|`template/app/api/polar/webhook/utils.ts`|极地效用函数|

## 常见事件类型

所有提供者将其事件标准化为共享`WebhookEventType` 枚举：

|Webhook事件类型|条纹|挤柠檬|极地|
|------------------|--------|--------------|-------|
|`SUBSCRIPTION_CREATED`|`customer.subscription.created`|`subscription_created`|`subscription.created`|
|`SUBSCRIPTION_UPDATED`|`customer.subscription.updated`|`subscription_updated`|`subscription.updated`|
|`SUBSCRIPTION_CANCELLED`|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|
|`PAYMENT_SUCCEEDED`|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|
|`PAYMENT_FAILED`|`payment_intent.payment_failed`| -- |`checkout.failed`|
|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`invoice.payment_succeeded`|`subscription_payment_success`|`invoice.paid`|
|`SUBSCRIPTION_PAYMENT_FAILED`|`invoice.payment_failed`|`subscription_payment_failed`|`invoice.payment_failed`|
|`SUBSCRIPTION_TRIAL_ENDING`|`customer.subscription.trial_will_end`|`subscription_trial_will_end`| -- |

## Stripe Webhook 处理

### 签名验证

```typescript
export async function POST(request: NextRequest) {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
    }

    const stripeProvider = getOrCreateStripeProvider();
    const webhookResult = await stripeProvider.handleWebhook(body, signature);

    if (!webhookResult.received) {
        return NextResponse.json({ error: 'Webhook not processed' }, { status: 400 });
    }

    // Route to handler based on event type
    switch (webhookResult.type) {
        case WebhookEventType.SUBSCRIPTION_CREATED:
            await handleSubscriptionCreated(webhookResult.data);
            break;
        // ... other cases
    }

    return NextResponse.json({ received: true });
}
```

### 处理程序模式（条纹）

每个处理程序都遵循一致的模式：

1. 检查是否是赞助商广告订阅（特殊处理）
2. 通过`WebhookSubscriptionService`更新订阅记录
3. 提取客户信息并准备电子邮件数据
4. 发送适当的通知电子邮件
5. 记录成功或失败

```typescript
async function handleSubscriptionCreated(data: any) {
    // Check for sponsor ad
    if (isSponsorAdSubscription(data)) {
        await handleSponsorAdActivation(data);
        return;
    }

    // Update database
    await webhookSubscriptionService.handleSubscriptionCreated(data);

    // Send email notification
    const customerInfo = extractCustomerInfo(data);
    const emailData = {
        customerName: customerInfo.customerName,
        planName: getPlanName(priceId),
        amount: formatAmount(unitAmount, currency),
        // ...
    };
    await paymentEmailService.sendNewSubscriptionEmail(emailData);
}
```

## LemonSqueezy Webhook 处理

### 事件类型映射

LemonSqueezy 使用映射到公共枚举的不同事件名称：

```typescript
function mapLemonSqueezyEventType(lemonsqueezyEventType: string): string {
    const eventMapping: Record<string, string> = {
        'subscription_created': WebhookEventType.SUBSCRIPTION_CREATED,
        'subscription_updated': WebhookEventType.SUBSCRIPTION_UPDATED,
        'subscription_cancelled': WebhookEventType.SUBSCRIPTION_CANCELLED,
        'subscription_payment_success': WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED,
        'subscription_payment_failed': WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED,
        'order_created': WebhookEventType.PAYMENT_SUCCEEDED,
        'order_refunded': WebhookEventType.REFUND_SUCCEEDED,
    };
    return eventMapping[lemonsqueezyEventType] || lemonsqueezyEventType;
}
```

### 自定义数据访问

LemonSqueezy 使用 `custom_data` 和 `meta.custom_data` 作为元数据（而不是 Stripe 的 `metadata`）：

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
    const customData = data.custom_data as Record<string, string> | undefined;
    const meta = data.meta as Record<string, unknown> | undefined;
    const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
    return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Polar Webhook 处理

Polar 使用更加结构化的架构，具有用于路由、处理和类型的单独文件。

### 路由器模式

```typescript
// router.ts
function isValidWebhookEventType(eventType: string): eventType is WebhookEventType {
    const allowedEventTypes: Set<WebhookEventType> = new Set([
        WebhookEventType.SUBSCRIPTION_CREATED,
        WebhookEventType.SUBSCRIPTION_UPDATED,
        // ... all handled types
    ]);
    return allowedEventTypes.has(eventType as WebhookEventType);
}

export async function routeWebhookEvent(
    eventType: string,
    data: PolarWebhookData
): Promise<void> {
    if (!isValidWebhookEventType(eventType)) {
        logger.warn('Invalid or unhandled webhook event type', { eventType });
        return;
    }

    const eventHandlers: Partial<Record<WebhookEventType, Handler>> = {
        [WebhookEventType.SUBSCRIPTION_CREATED]: handleSubscriptionCreated,
        [WebhookEventType.SUBSCRIPTION_UPDATED]: handleSubscriptionUpdated,
        // ... handler map
    };

    const handler = eventHandlers[eventType];
    if (handler) await handler(data);
}
```

路由器在分派之前根据允许列表验证事件类型，从而防止未经验证的动态方法调用。

### 签名验证（Polar）

```typescript
const WEBHOOK_SIGNATURE_HEADER = 'webhook-signature';
const WEBHOOK_TIMESTAMP_HEADER = 'webhook-timestamp';
const WEBHOOK_ID_HEADER = 'webhook-id';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const bodyText = await request.text();
    const body = JSON.parse(bodyText);

    // Validate payload structure
    if (!validateWebhookPayload(body)) {
        return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Verify signature with all three headers
    const polarProvider = getOrCreatePolarProvider();
    const webhookResult = await polarProvider.handleWebhook(
        body,
        signatureHeader,
        bodyText,           // Raw body for signature verification
        timestampHeader,
        webhookIdHeader
    );

    await routeWebhookEvent(webhookResult.type, webhookResult.data);
    return NextResponse.json({ received: true });
}
```

### 弹性电子邮件处理

Polar 处理程序将电子邮件操作包装在嵌套的 try/catch 块中，因此电子邮件失败永远不会使 Webhook 失败：

```typescript
export async function handleSubscriptionCreated(data: PolarWebhookData): Promise<void> {
    try {
        await webhookSubscriptionService.handleSubscriptionCreated(data);

        try {
            // Email sending - isolated failure domain
            const emailResult = await paymentEmailService.sendNewSubscriptionEmail(emailData);
        } catch (emailError) {
            // Log but don't fail the webhook
            logger.warn('Skipping email notification due to configuration error');
        }
    } catch (error) {
        logger.error('Error handling subscription created');
        throw error;  // Re-throw: database failures should fail the webhook
    }
}
```

## 赞助商广告处理

所有三个提供商都通过元数据检测赞助商广告订阅，并将其路由到专用处理程序：

|行动|功能|描述|
|--------|----------|-------------|
|付款已确认|`handleSponsorAdActivation()`|将广告状态设置为待审核|
|订阅已取消|`handleSponsorAdCancellation()`|取消赞助商广告|
|续订付款|`handleSponsorAdRenewal()`|延长广告结束日期|

## 最佳实践

1. **始终验证签名** -- 绝不处理未经验证的 Webhook
2. **使用raw body进行签名验证** -- 验证后单独解析JSON
3. **快速返回 200** -- 支付提供商重试非 2xx 响应
4. **隔离电子邮件失败** -- 将电子邮件发送封装在嵌套的 try/catch 中
5. **验证事件类型** -- 在分派之前检查许可名单
6. **使用结构化数据进行日志** -- 在所有日志条目中包含事件 ID 和类型
7. **使用单例提供程序** -- `getOrCreateStripeProvider()` 防止多个实例
