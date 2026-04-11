---
id: contributing
title: 贡献指南
sidebar_label: 贡献
---

# 贡献指南

感谢您对 Directory Web Template 做出贡献的兴趣。本指南涵盖您进行有意义贡献所需了解的一切。

## 仓库

Template 的源代码托管在 [github.com/ever-works/directory-web-template](https://github.com/ever-works/directory-web-template)。

有关对 Ever Works 平台的贡献，请参见[平台仓库](https://github.com/ever-works/ever-works)及其贡献指南 [docs.ever.works](https://docs.ever.works)。

## 前提条件

开始之前，请确保已安装以下内容：

- **Node.js** >= 20.19.0（推荐 LTS）
- **pnpm** >= 10.x（严格要求；请勿使用 npm 或 yarn）
- **Git** >= 2.30
- **PostgreSQL**（用于数据库；Supabase 提供托管选项）

### 安装 pnpm

```bash
# 使用 corepack（推荐，Node.js 20+ 自带）
corepack enable
corepack prepare pnpm@latest --activate

# 或通过 npm（一次性引导）
npm install -g pnpm
```

**重要：** 仓库使用特定于 pnpm 的 `packageManager` 字段和锁文件。运行 `npm install` 或 `yarn install` 将失败或产生不正确的依赖关系树。

## 开发环境搭建

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install

# 复制环境文件并配置
cp .env.example .env.local
# 使用您的值编辑 .env.local（详见 README）

pnpm dev        # Next.js 开发服务器，端口 3000
```

## 代码规范

### TypeScript

Template 处处使用 TypeScript。请勿引入普通的 `.js` 文件。遵循严格的 TypeScript 实践：

- 在 `tsconfig.json` 中启用并遵守 `strict` 模式设置
- 对导出函数优先使用显式返回类型
- 尽可能使用 `unknown` 而非 `any`
- 使用 **Zod** 架构验证输入

### 格式化（Prettier）

格式化通过 Prettier 强制执行。配置位于根目录的 `package.json` 中：

```json
{
	"printWidth": 120,
	"singleQuote": true,
	"semi": true,
	"useTabs": true,
	"tabWidth": 4,
	"arrowParens": "always",
	"trailingComma": "none",
	"quoteProps": "as-needed"
}
```

提交前运行格式化工具：

```bash
pnpm format          # 格式化所有文件
pnpm format:check    # 检查而不修改（CI 友好）
```

### 代码检查（ESLint）

Template 使用带有 React、React Hooks 和 TypeScript 插件的扁平 ESLint 配置（`eslint.config.mjs`）：

```bash
pnpm lint
```

### 命名规范

| 元素                  | 规范             | 示例                                  |
| --------------------- | ---------------- | ------------------------------------- |
| 文件                  | kebab-case       | `auth.service.ts`, `user-profile.tsx` |
| 类、接口、类型        | PascalCase       | `DirectoryService`, `UserProfile`     |
| 函数、变量            | camelCase        | `getDirectoryById`, `itemCount`       |
| 常量                  | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_LOCALE`   |

## 提交规范

仓库通过 **commitlint** 和 **husky** 预提交钩子强制执行[约定式提交](https://www.conventionalcommits.org/)。

| 前缀        | 用途                                      |
| ----------- | ----------------------------------------- |
| `feat:`     | 新功能                                    |
| `fix:`      | 错误修复                                  |
| `docs:`     | 文档变更                                  |
| `refactor:` | 不改变行为的代码重组                      |
| `test:`     | 添加或更新测试                            |
| `chore:`    | 维护任务、依赖更新                        |
| `style:`    | 格式变更（无逻辑变更）                    |
| `perf:`     | 性能改进                                  |
| `ci:`       | CI/CD 配置变更                            |

示例：

```bash
git commit -m "feat: add search filtering by category in directory listing"
git commit -m "fix: resolve authentication redirect loop on expired sessions"
```

## 分支命名

使用带前缀的描述性分支名称：

```
feat/add-category-filter
fix/auth-redirect-loop
docs/update-deployment-guide
refactor/simplify-auth-middleware
```

## Pull Request 流程

1. **Fork** 仓库（或如果有写入权限则创建分支）。
2. 从 `main` **创建功能分支**。
3. 按照上述代码规范**进行更改**。
4. 推送前**运行质量检查**（见下文）。
5. **推送**分支并对 `main` 开启 Pull Request。
6. **填写 PR 模板**，包括描述、相关 issue 和测试说明。
7. **等待审查。** 维护者将审查您的 PR，可能会请求更改。
8. 批准后，维护者将合并您的 PR。

### 提交 PR 前的质量检查

```bash
pnpm lint           # ESLint
pnpm tsc --noEmit   # TypeScript 检查
pnpm build          # 完整生产构建
```

### 测试

Template 使用 **Playwright** 进行端到端测试：

```bash
pnpm test:e2e
```

如果您的更改涉及现有功能，请确保所有相关测试通过。如果您添加了新功能，请为其编写测试。

## 许可证

Directory Web Template 在 **GNU Affero General Public License v3.0 (AGPL-3.0)** 下授权。提交贡献即表示您同意您的工作在同一许可证下发布。

## 行为准则

所有贡献者都应遵守项目的行为准则。请保持尊重、建设性和协作精神。

## 获取帮助

如果您有关于贡献的问题：

- 开启 [GitHub Discussion](https://github.com/ever-works/directory-web-template/discussions)
- 加入 [Discord 社区](https://discord.gg/ever) 获取实时帮助
- 发送邮件至 [ever@ever.co](mailto:ever@ever.co) 进行私人咨询
