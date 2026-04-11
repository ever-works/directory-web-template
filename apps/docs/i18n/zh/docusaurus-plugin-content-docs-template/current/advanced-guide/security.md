---
id: security
title: 安全加固
sidebar_label: 安全
sidebar_position: 6
---

# 安全强化

Ever Works 模板默认包含多层安全性。本指南记录了内置保护并提供了进一步强化生产部署的建议。

## 安全标头

该模板在 0 中为所有路由全局配置安全标头：

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: "..." },
      ],
    },
  ];
},
```

### 标头细分

|标题|价值|目的|
|---|---|---|
| 0 | 1 |防止MIME类型嗅探攻击|
| 2 | 3 |阻止网站嵌入 iframe（点击劫持保护）|
| 4 | 5 |限制发送至外部来源的引荐来源网址信息 |
| 6 | 7 |启用 DNS 预取以提高性能 |
| 8 | 9 |强制执行 HTTPS 约 2 年，涵盖所有子域，符合 HSTS 预加载列表 |
| 10 |见下文 |限制资源加载源 |

### 内容安全政策

CSP 配置为：

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https:;
frame-ancestors 'none';
```

|指令|价值|笔记|
|---|---|---|
| 0 | 1 |默认只允许同源资源 |
| 2 | 3 + LemonSqueezy |内联脚本和支付小部件所需 |
| 4 | 5 | CSS-in-JS 和 Tailwind 所必需的 |
| 6 | 7 |允许来自相同来源、数据 URI 和任何 HTTPS 源的图像 |
| 8 | 9 |仅自托管字体 |
| 10 | 11 |对同源和任何 HTTPS 端点的 API 调用
| 12 | 13 |防止嵌入任何 iframe（相当于14）|

### SVG 图像安全

SVG 图像接受额外的沙箱处理：

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
},
```

SVG 作为附件，脚本完全禁用并沙箱化，防止基于 SVG 的 XSS 攻击。

### 额外强化

0 被禁用：

```typescript
poweredByHeader: false,
```

这会删除 0 标头，从而防止技术指纹识别。

## 身份验证安全

### NextAuth.js 集成

该模板使用 NextAuth.js (Auth.js) 进行身份验证。主要安全功能包括：

- **JWT 或数据库会话** 具有可配置的会话策略
- 所有表单提交的 **CSRF 保护**
- **安全 cookie 配置**，带有 1、、2、和 3 标志
- **输入验证**在所有表单操作上使用 Zod 模式

### 已验证的操作

服务器操作使用 4 中定义的经过验证的操作包装器进行保护：

```typescript
// Validate input with Zod before processing
export function validatedAction<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData);
  };
}

// Validate input AND require authentication
export function validatedActionWithUser<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("User is not authenticated");
    }
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData, session.user);
  };
}
```

**始终使用 0** 进行经过身份验证的操作。这确保了输入验证和会话验证在任何业务逻辑执行之前发生。

## RBAC 执行

该模板包括1 中完整的基于角色的访问控制系统。

### 权限格式

权限遵循 2 模式：

```
items:read, items:create, items:update, items:delete
users:read, users:create, users:assignRoles
analytics:read, analytics:export
system:settings
```

### 权限检查函数

|功能|目的|示例|
|---|---|---|
| 0 |检查单个权限 | 1 |
| 2 |检查用户是否至少有一个 | 3 |
| 4 |检查用户是否已列出所有内容 | 5 |
| 6 |通过资源+操作字符串检查 | 7 |
| 8 |检查创建/更新/删除 | 9 |
| 10 |检查项目审核权限 | 11 |
| 12 |检查用户管理权限| 13 |
| 14 |检查角色管理权限 | 15 |
| 16 |检查分析访问 | 17 |
| 18 |检查超级管理员角色或所有权限 | 19 |

### 在 API 路由中使用权限

```typescript
import { hasPermission, UserPermissions } from '@/lib/middleware/permission-check';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userPerms: UserPermissions = {
    userId: session.user.id,
    roles: session.user.roles,
    permissions: session.user.permissions,
  };

  if (!hasPermission(userPerms, 'items:create')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with authorized logic
}
```

### 超级管理员检测

0 功能使用双重方法来实现最大程度的安全性：

1. **角色检查**：检查用户是否具有1角色
2. **权限回退**：验证用户拥有每个定义的系统权限

这可确保部分权限集不会意外授予超级管理员访问权限。

## 速率限制

### API路由保护

对面向公众的 API 路由实施速率限制以防止滥用：

```typescript
// Example using a simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record || now > record.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;
  record.count++;
  return true;
}
```

对于生产部署，请考虑使用：
- **Vercel Edge 中间件**，具有 0 速率限制
- **Upstash Redis** 用于跨无服务器实例的分布式速率限制
- CDN 层的 **Cloudflare 速率限制**

### Cron 端点保护

Cron API 端点应验证共享密钥以防止未经授权的调用：

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Execute cron job
}
```

0 通过环境变量设置并在部署期间进行配置（请参阅 CI/CD 管道的 Vercel 部署工作流程）。

## 输入验证

### Zod 模式验证

所有表单输入和 API 有效负载都应使用 Zod 模式进行验证：

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  url: z.string().url(),
  categoryId: z.string().uuid(),
});
```

### SQL注入预防

该模板对所有数据库查询使用 Drizzle ORM，它会自动参数化所有值。切勿使用用户输入构造原始 SQL 字符串。

### XSS预防

- 服务器组件在服务器上呈现，并且不会向客户端公开原始 HTML。
- 所有用户生成的内容都应该使用 React 的内置转义（JSX 自动转义字符串）进行转义。
- CSP 标头阻止来自不受信任来源的内联脚本。

## 环境变量安全

### 所需的秘密

|变量|目的|一代|
|---|---|---|
| 0 |签署 JWT 令牌和会话 cookie | 1 |
| 2 |加密 cookie 值 | 3 |
| 4 |验证 cron 端点请求 | 5 |
| 6 |数据库连接字符串 |数据库主机提供|

### 最佳实践

1. **永远不要向版本控制提交秘密**。使用 7 进行开发，使用平台级机密进行生产。
2. **定期轮换机密**，尤其是8和9。
3. **每个环境使用单独的机密** - 不要与登台或开发共享生产机密。
4. 使用平台的 RBAC（Vercel 团队角色、GitHub 环境保护规则）**限制对生产环境变量的访问**。

## 生产安全检查表

|类别 |项目 |状态 |
|---|---|---|
| **标题** | 10 | 中配置的所有安全标头内置|
| **标题** | 11 禁用 |内置|
| **标题** |启用 HSTS 预加载，最大期限为 2 年 |内置|
| **授权** | 12 是一个强随机值 |手册|
| **授权** |会话 cookie 使用 13、14、15 |内置|
| **授权** |所有服务器操作均使用16 |评论 |
| **RBAC** |检查每条受保护路由的权限 |评论 |
| **RBAC** |超级管理员访问权限需要明确的角色分配 |内置|
| **输入** | Zod 对所有表单输入和 API 负载进行验证 |评论 |
| **输入** |没有原始 SQL 查询（仅限 Drizzle ORM）|评论 |
| **计划** | Cron 端点验证17 |评论 |
| **秘密** |所有秘密均轮换且针对特定环境 |手册|
| **CSP** |审查生产域的内容安全策略 |手册|
| **部门** | CodeQL 分析每周在代码库上运行 |内置|
| **部门** |已审核的依赖关系 (18) |手册|

## 报告安全问题

如果您发现安全漏洞，请私下报告：

- **电子邮件**：security@ever.co
- **不要**针对安全漏洞打开公共 GitHub 问题。
- 如果可能，包括复制步骤和影响评估。
