---
id: payment-endpoints
title: 支付 API 端点
sidebar_label: 支付端点
sidebar_position: 3
---

# 支付 API 端点

该模板支持四种支付提供商：**Stripe**、**Lemon Squeezy**、**Polar** 和 **Solidgate**。每个提供商都有自己的一套 API 路由，用于结帐、订阅管理和 Webhook 处理。通用 `/api/payment` 组提供与提供商无关的订阅查询。

## 条纹 (`/api/stripe`)

Stripe 是功能最完整的集成，具有 17 个路由处理程序，涵盖结帐、订阅、支付方式、设置意图和产品。

### 结账

|方法|路径|描述|
|--------|------|-------------|
|`POST`|`/api/stripe/checkout`|创建 Stripe 结账会话|

### 订阅

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/stripe/subscription`|获取当前用户的活跃订阅|
|`POST`|`/api/stripe/subscription`|创建新订阅|
|`GET`|`/api/stripe/subscriptions`|列出所有用户订阅|
|`POST`|`/api/stripe/subscription/[subscriptionId]/cancel`|取消订阅|
|`POST`|`/api/stripe/subscription/[subscriptionId]/reactivate`|重新激活已取消的订阅|
|`POST`|`/api/stripe/subscription/[subscriptionId]/update`|更新订阅（更改计划）|
|`POST`|`/api/stripe/subscription/portal`|创建 Stripe 客户门户会话|

### 付款方式

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/stripe/payment-methods/list`|列出已保存的付款方式|
|`POST`|`/api/stripe/payment-methods/create`|添加新的付款方式|
|`PUT`|`/api/stripe/payment-methods/update`|更新默认付款方式|
|`DELETE`|`/api/stripe/payment-methods/delete`|删除付款方式|
|`GET`|`/api/stripe/payment-methods/[id]`|获取付款方式详细信息|

### 设置意图

|方法|路径|描述|
|--------|------|-------------|
|`POST`|`/api/stripe/setup-intent`|创建用于保存付款方式的设置意图|
|`GET`|`/api/stripe/setup-intent/[id]`|获取设置意图状态|

### 付款意向

|方法|路径|描述|
|--------|------|-------------|
|`POST`|`/api/stripe/payment-intent`|创建一次性付款意向|

### 产品展示

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/stripe/products`|列出可用的 Stripe 产品/价格|

### 网络钩子

|方法|路径|描述|
|--------|------|-------------|
|`POST`|`/api/stripe/webhook`|Stripe Webhook 事件处理程序|

Stripe webhook 处理程序处理以下事件：
- `checkout.session.completed` - 结帐完成
- `customer.subscription.created` - 新订阅
- `customer.subscription.updated` - 订阅变更
- `customer.subscription.deleted` - 取消订阅
- `invoice.payment_succeeded` - 付款成功
- `invoice.payment_failed` - 支付失败

## 挤柠檬 (`/api/lemonsqueezy`)

Lemon Squeezy 提供了具有 7 个端点的更简单的订阅模型。

|方法|路径|描述|
|--------|------|-------------|
|`POST`|`/api/lemonsqueezy/checkout`|创建 Lemon Squeezy 结帐|
|`GET`|`/api/lemonsqueezy/list`|列出用户的订阅|
|`POST`|`/api/lemonsqueezy/cancel`|取消订阅|
|`POST`|`/api/lemonsqueezy/reactivate`|重新激活已取消的订阅|
|`POST`|`/api/lemonsqueezy/update`|更新订阅详细信息|
|`POST`|`/api/lemonsqueezy/update-plan`|更改订阅计划|
|`POST`|`/api/lemonsqueezy/webhook`|Lemon Squeezy webhook 处理程序|

### Webhook 事件

Lemon Squeezy webhook 处理：
- `subscription_created` - 新订阅
- `subscription_updated` - 计划变更
- `subscription_cancelled` - 取消
- `subscription_payment_success` - 付款确认
- `subscription_payment_failed` - 付款失败

## 极地 (`/api/polar`)

Polar 提供 5 个用于结账和订阅管理的端点。

|方法|路径|描述|
|--------|------|-------------|
|`POST`|`/api/polar/checkout`|创建 Polar 结账会话|
|`POST`|`/api/polar/subscription/[subscriptionId]/cancel`|取消订阅|
|`POST`|`/api/polar/subscription/[subscriptionId]/reactivate`|重新激活订阅|
|`POST`|`/api/polar/subscription/portal`|访问订阅门户|
|`POST`|`/api/polar/webhook`|Polar Webhook 处理程序|

## Solidgate (`/api/solidgate`)

Solidgate 是具有 2 个端点的最小集成。

|方法|路径|描述|
|--------|------|-------------|
|`POST`|`/api/solidgate/checkout`|创建 Solidgate 结账|
|`POST`|`/api/solidgate/webhook`|Solidgate Webhook 处理程序|

## 通用付款 (`/api/payment`)

与提供商无关的支付端点，用于管理订阅，无论底层支付提供商如何。

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/payment/[subscriptionId]`|通过ID获取订阅详情|
|`GET`|`/api/payment/account`|获取当前用户的支付账户|
|`GET`|`/api/payment/account/[userId]`|获取特定用户（管理员）的付款帐户|

## Webhook 安全

所有 webhook 端点都实现特定于提供者的签名验证：

### 条纹

Stripe Webhook 使用 `STRIPE_WEBHOOK_SECRET` 环境变量和 `stripe.webhooks.constructEvent()` 方法验证 `stripe-signature` 标头。

### 柠檬榨汁

Lemon Squeezy Webhooks 使用 HMAC-SHA256 和 `LEMONSQUEEZY_WEBHOOK_SECRET` 验证 `x-signature` 标头。

### 极地

Polar webhook 使用 `POLAR_WEBHOOK_SECRET` 验证请求签名。

### 固体门

Solidgate webhook 使用其 SDK 的内置签名验证和`SOLIDGATE_SECRET_KEY`。

## 环境变量

### 条纹

|变量|描述|
|----------|-------------|
|`STRIPE_SECRET_KEY`|Stripe API 密钥|
|`STRIPE_PUBLISHABLE_KEY`|Stripe 可发布密钥（客户端）|
|`STRIPE_WEBHOOK_SECRET`|Webhook 签名秘密|

### 柠檬榨汁

|变量|描述|
|----------|-------------|
|`LEMONSQUEEZY_API_KEY`|柠檬挤压 API 密钥|
|`LEMONSQUEEZY_STORE_ID`|商店标识符|
|`LEMONSQUEEZY_WEBHOOK_SECRET`|Webhook 签名秘密|

### 极地

|变量|描述|
|----------|-------------|
|`POLAR_ACCESS_TOKEN`|Polar API 访问令牌|
|`POLAR_WEBHOOK_SECRET`|Webhook 签名秘密|
|`POLAR_ORGANIZATION_ID`|组织标识符|

### 固体门

|变量|描述|
|----------|-------------|
|`SOLIDGATE_MERCHANT_ID`|商户标识符|
|`SOLIDGATE_SECRET_KEY`|API密钥|

## 身份验证要求

|端点类型|需要身份验证|
|--------------|---------------|
|结帐创建|是（经过身份验证的用户）|
|订阅管理|是（订阅所有者）|
|支付方式管理|是（Stripe 客户）|
|产品清单|公共（条纹产品）|
|Webhook 处理程序|签名验证（无会话）|
|通用付款查询|是（帐户所有者或管理员）|
