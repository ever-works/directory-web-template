---
title: "首次部署"
sidebar_label: "首次部署"
sidebar_position: 4
---

# 首次部署

## 选项 1：Vercel（推荐）

1. 将代码推送到 GitHub
2. 登录 [vercel.com](https://vercel.com) 并导入项目
3. 添加必要的环境变量
4. 点击"部署"

## 选项 2：Docker

```bash
docker build -t directory-web-template .
docker run -p 3000:3000 directory-web-template
```

## 选项 3：手动部署

```bash
pnpm build
pnpm start
```

确保在生产环境中设置所有环境变量。
