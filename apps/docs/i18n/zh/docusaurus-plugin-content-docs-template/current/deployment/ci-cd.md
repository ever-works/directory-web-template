---
id: ci-cd
title: CI/CD 流水线
sidebar_label: CI/CD 流水线
sidebar_position: 3
---

# CI/CD 流水线

Ever Works 模板包含一个基于 GitHub Actions 构建的完整 CI/CD 流水线。本指南涵盖工作流结构、安全扫描、分支保护策略和部署提升流程。

## 工作流概述

流水线由 `.github/workflows/` 中的六个工作流文件组成：

| 工作流 | 文件 | 触发器 | 用途 |
|---|---|---|---|
| CI | `ci.yml` | 推送/PR 到 `main`、`develop` | Lint、类型检查、构建 |
| CodeQL | `codeql.yml` | 推送/PR 到 `main`、`develop` + 每周定时 | 安全漏洞分析 |
| Dev Deploy | `deploy_dev.yaml` | 推送到 `develop` | 部署到预览环境 |
| Prod Deploy | `deploy_prod.yaml` | 推送到 `main` | 部署到生产环境 |
| Vercel Deploy | `deploy_vercel.yaml` | 由 dev/prod 调用 | 共享 Vercel 部署逻辑 |
| Disable CodeQL | `disable-default-codeql.yml` | 仅手动 | CodeQL 冲突解决工具 |

### 流水线流程

```
Feature Branch --> PR to develop --> CI runs
                                     |
                                     v
                               Merge to develop --> Dev Deploy (preview)
                                     |
                                     v
                               PR to main --> CI runs
                                     |
                                     v
                               Merge to main --> Prod Deploy (production)
```

## CI 工作流（ci.yml）

CI 在每次推送和 pull request 到 `main` 和 `develop` 时运行。它验证代码质量并确保项目成功构建。

### 作业

工作流包含一个在 `ubuntu-latest` 上运行的 `lint-and-build` 作业：

**步骤**：

1. **检出代码** -- 克隆仓库
2. **检测包管理器** -- 从锁文件自动检测 pnpm、yarn 或 npm
3. **设置 pnpm** -- 如果检测到则安装 pnpm v9
4. **设置 Node.js** -- 安装带包管理器缓存的 Node 20
5. **安装依赖** -- 运行 `pnpm install`
6. **运行 lint** -- 运行 `pnpm lint`（PR 出错时继续）
7. **类型检查** -- 运行 `pnpm typecheck` 或 `pnpm check:types`
8. **创建内容目录** -- 为构建创建 `.content/data`
9. **构建项目** -- 运行带所有必要环境变量的 `pnpm build`
10. **验证构建成功** -- 验证 `.next` 目录已创建

### 并发控制

```yaml
concurrency:
  group: ${{ github.ref }}-${{ github.workflow }}
  cancel-in-progress: true
```

如果 CI 运行期间同一分支发生新推送，之前的运行会自动取消。这节省了 CI 分钟数，并确保只验证最新的提交。

### 环境变量

CI 工作流使用硬编码默认值和 GitHub Secrets 的组合：

| 变量 | 来源 | 用途 |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | 硬编码 | 构建用应用程序 URL |
| `DATABASE_URL` | Secret 或默认值 | 构建用数据库连接 |
| `AUTH_SECRET` | 硬编码 CI 值 | 认证令牌签名（非生产用） |
| `DATA_REPOSITORY` | Secret 或默认值 | 内容仓库 URL |
| `CONTENT_WARNINGS_SILENT` | 硬编码 `true` | 静默 CI 中的内容警告 |
| `CI` | 硬编码 `true` | 指示 CI 环境 |
| OAuth Secrets | GitHub Secrets | Google、GitHub、Facebook、Twitter 凭据 |
| `RESEND_API_KEY` | GitHub Secret | 构建检查用邮件服务 |

### 权限

工作流请求最小权限：

```yaml
permissions:
  contents: read
```

CI 作业只需要对仓库内容的读取权限。

## CodeQL 安全分析（codeql.yml）

### 功能说明

CodeQL 对 JavaScript/TypeScript 代码执行语义分析以检测安全漏洞。运行时机：

- 每次推送和 PR 到 `main` 和 `develop`
- 每周一 UTC 时间凌晨 6 点（定时扫描）
- 手动触发时

### 分析步骤

1. **检出**和**设置** Node.js + pnpm
2. **初始化 CodeQL**，语言为 `javascript-typescript`
3. 通过 `scripts/codeql-setup.js` **配置 CodeQL 环境**
4. **安装依赖**/分析上下文
5. **Autobuild** -- CodeQL 自动构建检测
6. **上传分析** -- 将结果上传到 GitHub Security 标签页
7. **备用分析** -- 如果上传失败，在不上传的情况下分析

### 权限

CodeQL 需要更广泛的权限来报告安全事件：

```yaml
permissions:
  actions: read
  contents: read
  security-events: write
  pull-requests: read
```

### 查看结果

成功上传运行后：
1. 转到 GitHub 上的仓库
2. 进入 **Security** > **Code scanning**
3. 查看结果，按严重程度筛选并管理警报

### 解决 CodeQL 冲突

如果遇到 GitHub 默认 CodeQL 配置的 SARIF 处理冲突，请使用 `disable-default-codeql.yml` 工作流：

```bash
# Trigger manually from GitHub Actions tab
# This disables the default configuration that may conflict with your custom setup
```

## 部署流程

### 分支-环境映射

| 分支 | 工作流 | 环境 | 域名 |
|---|---|---|---|
| `develop` | `deploy_dev.yaml` | `preview` | Vercel 预览 URL |
| `main` | `deploy_prod.yaml` | `production` | 生产域名 |

### 部署提供商门控

两个部署流程在继续前都会检查仓库变量：

```yaml
jobs:
  Vercel:
    if: ${{ vars.DEPLOY_PROVIDER == 'vercel' }}
```

在仓库的**设置 > 变量**中设置 `DEPLOY_PROVIDER=vercel` 以启用 Vercel 部署。这允许在不修改工作流文件的情况下切换部署提供商。

### Vercel 部署（deploy_vercel.yaml）

共享的 Vercel 部署流程处理预览和生产部署。

**部署策略**：工作流使用两阶段方法：

1. **API 部署**（主要）：通过 Vercel API 触发部署以加快构建速度
2. **CLI 回退**：如果 API 调用失败，回退到 `vercel build` + `vercel deploy --prebuilt`

**步骤**：

1. **检出**代码
2. **检测包管理器**并设置 pnpm
3. **全局安装 Vercel CLI**
4. 使用 `VERCEL_TOKEN` 和可选团队范围**链接 Vercel 项目**
5. 通过 Vercel CLI **设置环境变量**（DATA_REPOSITORY、GH_TOKEN、CRON_SECRET）
6. 为目标环境**获取 Vercel 设置**
7. **触发 API 部署**或回退到 CLI 构建/部署
8. 通过 `scripts/update-cron.ts` **更新 cron 计划**

### 必需的 Secrets

在 GitHub 仓库 Secrets 中配置：

| Secret | 是否必需 | 用途 |
|---|---|---|
| `VERCEL_TOKEN` | 是 | Vercel API 认证 |
| `VERCEL_TEAM_SCOPE` | 使用团队时 | Vercel 团队 Slug |
| `DATA_REPOSITORY` | 是 | 内容仓库名称 |
| `GH_TOKEN` | 是 | 克隆内容用的 GitHub 令牌 |
| `CRON_SECRET` | 推荐 | 认证 cron 端点调用 |
| `DATABASE_URL` | 构建时 | 数据库连接字符串 |
| OAuth Secrets | 使用 OAuth 时 | 提供商凭据 |

### Cron 计划更新

成功部署后，工作流运行 `scripts/update-cron.ts` 以同步 cron 计划：

```yaml
- name: Update cron schedule
  if: success() && steps.trigger_deployment.outputs.deployment_id != ''
  run: npx tsx scripts/update-cron.ts
```

## 分支保护规则

### `main` 的推荐设置

| 设置 | 值 | 用途 |
|---|---|---|
| 需要 pull request | 是 | 禁止直接推送到生产 |
| 所需审查 | 1+ | 合并前代码审查 |
| 需要状态检查 | CI (lint-and-build) | 合并前 CI 必须通过 |
| 需要 CodeQL | CodeQL 分析 | 安全扫描必须通过 |
| 需要最新分支 | 是 | PR 必须基于最新的 main rebase |
| 包含管理员 | 是 | 规则适用于所有人 |

### `develop` 的推荐设置

| 设置 | 值 | 用途 |
|---|---|---|
| 需要 pull request | 可选 | 允许直接推送以快速迭代 |
| 需要的状态检查 | CI (lint-and-build) | 基本质量门控 |
| 需要最新分支 | 否 | 允许更快迭代 |

### 配置分支保护

1. 转到仓库的**设置** > **分支**
2. 点击**添加分支保护规则**
3. 输入分支名称模式（如 `main`）
4. 配置上表中的设置
5. 保存更改

## 提升流程

模板遵循标准提升流程：

### 开发周期

```
1. Create feature branch from develop
2. Implement changes
3. Open PR to develop
4. CI validates (lint, type check, build)
5. CodeQL scans for vulnerabilities
6. Code review and approval
7. Merge to develop --> automatic preview deployment
```

### 生产发布

```
1. Open PR from develop to main
2. CI validates against main
3. CodeQL security scan
4. Final code review
5. Merge to main --> automatic production deployment
```

### 热修复流程

```
1. Create hotfix branch from main
2. Implement fix
3. Open PR directly to main
4. CI + CodeQL validation
5. Emergency review and merge
6. Backport to develop
```

## 自定义

### 添加新的 CI 步骤

要添加测试或额外验证，在 `ci.yml` 的作业中添加步骤：

```yaml
- name: Run unit tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test

- name: Run E2E tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test:e2e
```

### 添加部署通知

在部署流程末尾添加通知步骤：

```yaml
- name: Notify Slack
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    payload: '{"text": "Deployed to ${{ inputs.environment }}"}'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 特定环境变量

使用 GitHub **环境**将 Secrets 限制到特定部署目标：

1. 转到**设置** > **环境**
2. 创建 `production` 和 `preview` 环境
3. 添加特定于环境的 Secrets
4. 在工作流中使用 `environment:` 配置引用它们
