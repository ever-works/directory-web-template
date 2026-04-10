---
id: session-management
title: 会话管理
sidebar_label: 会话管理
sidebar_position: 5
---

# 会话管理

## 会话策略

该模板支持两种会话策略：
1. JWT（默认）— 无状态，存储在 Cookie 中
2. 数据库 — 存储在数据库中，支持撤销

## 会话配置

```typescript
// auth.config.ts
export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 天
  }
}
```

## 安全性

- HttpOnly Cookie 防止 XSS
- SameSite=Lax 防止 CSRF
- 自动会话刷新
- 生产环境中的 Secure 标志

## 注销

注销时清除会话。更改 AUTH_SECRET 可以使所有活动会话失效。
