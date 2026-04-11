---
title: "安装"
sidebar_label: "安装"
sidebar_position: 1
---

# 安装

## 前提条件

- **Node.js >= 20.19.0**
- **pnpm** – 包管理器
- **Git**
- **PostgreSQL**（本地开发可选）

## 系统要求

- **操作系统**: Windows、macOS 或 Linux
- **内存**: 最低 4 GB RAM
- **存储空间**: 最低 2 GB

## 安装步骤

### 1. 克隆仓库

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
```

### 2. 安装依赖项

```bash
pnpm install
```

### 3. 设置环境

```bash
cp apps/web/.env.example apps/web/.env.local
```

### 4. 配置环境变量

编辑 `apps/web/.env.local` 并设置必要的值。

### 5. 启动开发服务器

```bash
pnpm run dev
```
