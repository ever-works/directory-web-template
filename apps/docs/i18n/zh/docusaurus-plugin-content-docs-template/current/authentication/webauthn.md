---
id: webauthn
title: WebAuthn / 通行密钥
sidebar_label: WebAuthn
sidebar_position: 6
---

# WebAuthn / 通行密钥

## 概述

WebAuthn 使用以下方式实现免密码认证：
- 生物特征认证（指纹、Face ID）
- 硬件安全密钥（YubiKey）
- 平台认证器（Windows Hello、Touch ID）

## 配置

在 auth.config.ts 中启用 WebAuthn：
```typescript
import { WebAuthn } from 'next-auth/providers/webauthn';

providers: [
  WebAuthn,
]
```

## 要求

- 生产环境需要 HTTPS（开发环境 localhost 可用）
- 支持 WebAuthn 的现代浏览器
- 用户必须拥有支持通行密钥的设备

## 用户体验

1. 用户点击"使用通行密钥登录"
2. 浏览器提示输入生物特征或安全密钥
3. 用户完成认证
4. 会话创建
