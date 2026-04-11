---
title: "快速入门"
sidebar_label: "快速入门"
sidebar_position: 2
---

# 快速入门

## 第一步：配置 config.yml

编辑 `config.yml` 文件以设置目录的基本参数。

## 第二步：Fork 数据仓库

1. 在 GitHub 上 Fork 数据仓库
2. 设置以下环境变量：
   - `DATA_REPOSITORY` – 您的 Fork 仓库 URL
   - `GH_TOKEN` – 您的 GitHub 访问令牌

## 第三步：启动开发服务器

```bash
pnpm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

## 第四步：添加第一个条目

在数据目录中创建一个新的 YAML 文件：

```yaml
name: "我的工具"
description: "工具描述"
url: "https://example.com"
category: "工具"
```
