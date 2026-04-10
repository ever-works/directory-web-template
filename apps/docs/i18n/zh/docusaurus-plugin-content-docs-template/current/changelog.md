---
id: changelog
title: 变更日志
sidebar_label: 变更日志
---

# 变更日志

本页面介绍 Directory Web Template 如何管理版本控制、发布和升级路径。

## 语义化版本控制

模板遵循[语义化版本控制（SemVer）](https://semver.org/)规范。版本号采用 **MAJOR.MINOR.PATCH** 格式：

| 组件         | 何时递增                                      |
| ------------ | --------------------------------------------- |
| **MAJOR**    | 需要迁移步骤的破坏性更改                        |
| **MINOR**    | 以向后兼容方式添加的新功能                      |
| **PATCH**    | 向后兼容的错误修复和小幅改进                    |

预发布版本可使用 `-alpha.1`、`-beta.2` 或 `-rc.1` 等后缀进行早期测试。

## 数据库迁移

模板使用 **Drizzle ORM** 搭配 PostgreSQL。数据库架构更改通过 Drizzle Kit 进行管理：

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply migrations to the database
pnpm db:migrate

# Open Drizzle Studio for visual database management
pnpm db:studio
```

迁移文件存储在 `lib/db/migrations/` 目录下。每个迁移文件都是根据 `lib/db/schema/` 中 Drizzle 架构定义的更改生成的 SQL 文件。

## 升级模板

升级到较新版本时：

```bash
cd directory-web-template

# Pull latest changes
git pull origin main

# Install updated dependencies
pnpm install

# Apply database migrations
pnpm db:migrate

# Verify build
pnpm build
```

### 处理升级期间的冲突

如果您已自定义模板，在拉取更新时可能会遇到合并冲突。推荐的处理方式：

1. **尽量将自定义内容保存在单独的文件中**（自定义组件、新路由、附加服务）。
2. **使用基于 Git 的 CMS** 进行内容更改，而不是修改核心文件。
3. **升级前查阅发布说明**，了解哪些文件发生了变化。
4. **解决冲突后进行全面测试**，运行 `pnpm lint`、`pnpm tsc --noEmit` 和 `pnpm build`。

## 跟踪发布

### GitHub Releases

发布内容发布于 GitHub：[github.com/ever-works/directory-web-template/releases](https://github.com/ever-works/directory-web-template/releases)

每个发布包含：

- 版本标签（例如 `v0.1.0`）
- 描述更改、新功能、错误修复和破坏性更改的发布说明
- 相关 pull request 和 issue 的链接

### 提交历史

仓库使用[约定式提交](https://www.conventionalcommits.org/)规范，便于浏览提交历史以查找更改：

```bash
# View recent commits with conventional commit prefixes
git log --oneline --since="2025-01-01"

# Filter for feature commits only
git log --oneline --grep="^feat:"

# Filter for breaking changes
git log --oneline --grep="BREAKING CHANGE"
```

## 破坏性更改政策

破坏性更改被认真对待。项目遵循以下原则：

1. **提前通知。** 在可能的情况下，破坏性更改至少在生效前一个次要版本发布时宣布。
2. **迁移指南。** 每个破坏性更改都在发布说明中包含迁移指南。
3. **最小化干扰。** 破坏性更改集中在主要版本发布中，而不是分散在多个次要版本中。
4. **数据库向后兼容性。** 迁移被设计为非破坏性的，优先选择添加列和创建表，而不是删除或重命名。

### 破坏性更改示例

- 删除或重命名公共 API 端点
- 更改 API 请求或响应体的结构
- 删除或重命名数据库列或表
- 更改必需的环境变量
- 放弃对某个 Node.js 版本的支持
- 更改身份验证或授权行为
- 删除或重命名导出的 TypeScript 类型或接口

### 非破坏性更改示例

- 添加新的 API 端点
- 向请求或响应体添加新的可选字段
- 添加具有默认值的新数据库列
- 添加具有合理默认值的新环境变量
- 添加新功能或集成
- 性能改进
- 错误修复

## 变更日志格式

发布说明遵循以下结构：

```markdown
## [0.2.0] - 2025-04-15

### Added

- Category-based directory filtering
- New Polar payment provider integration

### Changed

- Improved authentication flow with better error messages

### Fixed

- Resolved race condition in concurrent directory updates
- Fixed pagination offset calculation for search results

### Deprecated

- Legacy REST endpoints under /api/v1/ (use /api/v2/ instead)

### Breaking Changes

- Removed `LEGACY_AUTH_MODE` environment variable
- Renamed `DirectoryItem` type to `Item` across all APIs
```

此格式遵循 [Keep a Changelog](https://keepachangelog.com/) 的约定。
