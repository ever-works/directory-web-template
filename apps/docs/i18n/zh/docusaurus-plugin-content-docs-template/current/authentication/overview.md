---
id: overview
title: 认证概述
sidebar_label: 概述
sidebar_position: 1
---

# 认证概述

Ever Works 提供灵活、安全的认证系统，支持多种提供商和认证方法。

## 认证架构

该模板采用混合认证方式，同时支持 NextAuth.js 和 Supabase Auth，让您可以根据需求选择最佳解决方案。

(mermaid diagram - keep as-is)

## 支持的认证方法

### 1. OAuth 提供商

NextAuth.js OAuth 支持：Google、GitHub、Facebook、Twitter/X、Microsoft
Supabase OAuth 支持：Google、GitHub、Facebook、Twitter/X、Discord、Apple

### 2. 邮箱/密码认证

NextAuth.js Credentials：自定义邮箱/密码、bcrypt 哈希、数据库会话存储
Supabase Auth：内置邮箱/密码、邮箱验证、密码重置

### 3. 魔法链接
Supabase Auth：通过邮箱魔法链接实现免密码认证

### 4. WebAuthn / 通行密钥
NextAuth.js：生物特征认证、硬件安全密钥、FIDO2

## 会话管理
JWT 令牌用于无状态认证，数据库会话用于持久状态，安全的 Cookie 处理，自动令牌刷新

## 安全功能
CSRF 防护、速率限制、暴力破解防护、使用 bcrypt 进行安全密码哈希
