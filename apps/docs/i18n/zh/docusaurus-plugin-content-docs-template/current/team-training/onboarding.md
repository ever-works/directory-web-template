---
id: onboarding
title: 入职指南
sidebar_label: 入职
sidebar_position: 2
---

# 入职指南

欢迎加入 Ever Works！本指南将帮助您搭建开发环境并做出第一个贡献。

## 🎯 目标

完成本模块后：

- ✅ 拥有完整配置的开发环境
- ✅ 理解项目结构
- ✅ 能够在本地运行应用程序
- ✅ 完成第一次代码更改
- ✅ 理解开发工作流程

**预计时间**：1–2 天

---

## 第一步：环境搭建

### 1.1 安装必要工具

按照详细的[安装指南](/getting-started/installation)安装：

- Node.js 20.19.0+
- pnpm（[安装](https://pnpm.io/installation)）
- PostgreSQL 14+
- Git
- VS Code（推荐）

### 1.2 克隆仓库

```bash
git clone https://github.com/ever-co/ever-works.git
cd ever-works
pnpm install
```

### 1.3 配置环境变量

**快速检查清单**：

- [ ] 数据库连接已配置
- [ ] 认证密钥已设置
- [ ] 支付服务商密钥已添加（开发环境可选）

---

## 第二步：数据库设置

### 2.1 启动 PostgreSQL

```bash
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=everworks \
  -p 5432:5432 \
  -d postgres:14
```

### 2.2 运行迁移

```bash
cd apps/web
pnpm exec drizzle-kit push
pnpm run db:seed
```

---

## 第三步：启动开发服务器

```bash
pnpm run dev
```

在浏览器中验证：

- [ ] 主页在 `http://localhost:3000` 加载成功
- [ ] 可以创建账户
- [ ] 可以登录/退出
- [ ] API 文档可在 `http://localhost:3000/api/reference` 访问

---

## 第四步：了解项目结构

```
directory-web-template/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   └── messages/
│   └── web-e2e/
├── packages/
└── turbo.json
```

---

## 第五步：开发工作流程

### 5.1 创建功能分支

```bash
git checkout main
git pull origin main
git checkout -b feature/功能名称
```

### 5.2 提交和推送

```bash
git add .
git commit -m "feat: 添加用户通知系统"
git push origin feature/功能名称
```

---

## ✅ 入职检查清单

- [ ] 开发环境完整配置
- [ ] 应用程序在本地正常运行
- [ ] 数据库已连接并初始化数据
- [ ] 已理解项目结构
- [ ] 已创建第一个分支
- [ ] 已完成第一次提交

---

## 下一步

1. [API 文档](/team-training/api-documentation) – 学习文档系统
2. [最佳实践](/team-training/best-practices) – 学习代码标准
3. [练习](/team-training/exercises) – 通过真实任务实践

需要帮助？请询问导师或查看团队 Slack 频道！🚀
