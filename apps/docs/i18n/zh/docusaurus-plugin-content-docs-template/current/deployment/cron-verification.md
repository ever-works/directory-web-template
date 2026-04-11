---
id: cron-verification
title: Vercel Cron 验证
sidebar_label: Cron 验证
sidebar_position: 9
---

# ✅ Vercel Cron Jobs – 验证检查清单

## 🎯 问题快速解答

### 问题 1：不使用 Trigger.dev 能在 Vercel 上运行吗？
**✅ 可以** – 当以下条件满足时，系统已正确配置为使用 Vercel Crons：
- `VERCEL=1`（由 Vercel 自动设置）
- Trigger.dev 环境变量**未**设置

### 问题 2：如何验证是否正常运行？
**✅ 按照以下 4 个步骤进行**

---

## 📊 当前配置状态

### ✅ 已修复内容

| 组件 | 状态 | 详情 |
|------|------|------|
| `vercel.json` | ✅ **已修复** | 现在包含**全部 3 个** cron 任务（之前只有 1 个）|
| `initialize-jobs.ts` | ✅ **已修复** | 现在注册**全部 3 个**任务（之前只有 2 个）|
| API 端点 | ✅ **正常** | 全部 3 个端点均存在且正常运行 |
| 文档 | ✅ **已创建** | 新指南 `CRON_JOBS.md` |

### 📋 完整 Cron Jobs 列表

| # | 任务名称 | Endpoint | 调度 | 用途 |
|---|---------|----------|------|------|
| 1 | 仓库同步 | `/api/cron/sync` | `*/5 * * * *` | 每 5 分钟同步内容 |
| 2 | 续订提醒 | `/api/cron/subscription-reminders` | `0 9 * * *` | 每天 9:00 发送提醒邮件 |
| 3 | 过期清理 | `/api/cron/subscription-expiration` | `0 0 * * *` | 午夜处理过期订阅 |

---

## 🔍 4 步验证流程

### 第 1 步：检查 Vercel 控制台 – Cron Jobs

**URL 模板：**
```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

**awesome-time-tracking-website 的地址：**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**要检查的内容：**
- [ ] 显示 **3 个 cron 任务**（不只是 1 个）
- [ ] 每个任务都有正确的调度
- [ ] 全部显示"活跃"状态

**预期结果：**

| 路径 | 调度 | 状态 |
|------|------|------|
| `/api/cron/sync` | 每 5 分钟 | ✅ 活跃 |
| `/api/cron/subscription-reminders` | 0 9 * * * | ✅ 活跃 |
| `/api/cron/subscription-expiration` | 0 0 * * * | ✅ 活跃 |

---

### 第 2 步：检查 Vercel 日志

**URL 模板：**
```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths={PATH}
```

**检查每个端点：**

#### A. 同步日志
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```
- [ ] 日志每 5 分钟出现一次
- [ ] 状态码为 200（成功）
- [ ] 无 401 错误（认证）
- [ ] 无 500 错误（故障）

#### B. 提醒日志
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-reminders
```
- [ ] 日志每天 9:00 出现一次
- [ ] 状态码为 200 或 207（成功/部分成功）

#### C. 过期日志
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-expiration
```
- [ ] 日志每天午夜出现一次
- [ ] 状态码为 200（成功）

---

### 第 3 步：检查应用日志

#### 应用启动时
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

**✅ 这确认了：** 系统检测到了 Vercel 环境

#### 每次同步时（每 5 分钟）
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

#### 续订提醒时（每天 9:00）
```
[Cron] Subscription reminders job completed
```

#### 过期清理时（每天午夜）
```
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: N subscriptions expired
```

---

### 第 4 步：检查环境变量

**必需：**
```bash
CRON_SECRET=<已在 vercel 中设置>
```

**不应设置（使用 Vercel 而非 Trigger.dev）：**
```bash
TRIGGER_SECRET_KEY=<应为空>
TRIGGER_API_KEY=<应为空>
TRIGGER_API_URL=<应为空>
```

**通过 Vercel CLI 检查：**
```bash
vercel env ls
```

---

## 🚨 常见问题和解决方案

### 问题 1：Vercel 中只显示 1 个 cron 任务

**原因：** 部署了旧的 `vercel.json`  
**解决方案：**
1. ✅ `vercel.json` 现已修复（3 个 cron）
2. 重新部署到 Vercel：`git push` 或 `vercel --prod`
3. 等待 1-2 分钟让 Vercel 注册新的 cron

---

### 问题 2：401 未授权错误

**原因：** `CRON_SECRET` 未设置或不匹配  
**解决方案：**
```bash
# Generate a new secret
openssl rand -base64 32

# Add to Vercel
vercel env add CRON_SECRET

# Redeploy
vercel --prod
```

---

### 问题 3：任务完全不运行

**原因：** 使用了 Trigger.dev 模式而非 Vercel 模式

**检查：**
```bash
# Should NOT be set
vercel env ls | grep TRIGGER
```
