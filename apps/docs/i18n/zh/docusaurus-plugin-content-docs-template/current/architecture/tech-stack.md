---
id: tech-stack
title: 技术栈
sidebar_label: 技术堆栈
sidebar_position: 2
---

# 技术栈

本文档全面概述了 Ever Works 中使用的所有技术。

## 系统要求

- **Node.js**：20.19.0 或更高版本
- **PostgreSQL**：14.0 或更高版本
- **包管理器**：npm、pnpm、yarn 或 bun

## 前端技术 {#frontend}

### 核心框架

- **[Next.js 15.4.7](https://nextjs.org/)** - 带有 App Router 的 React 框架
  - 服务器端渲染（SSR）
  - 静态站点生成（SSG）
  - 增量静态再生 (ISR)
  - 突变的服务器操作
  - 内置优化
  - 具有 `[locale]` 动态段的基于文件的路由

- **[React 19.1.0](https://react.dev/)** - UI 库
  - 最新功能和改进
  - 并发渲染
  - 自动配料
  - 数据获取暂挂
  - 默认服务器组件

### 语言和类型安全

- **[TypeScript 5.x](https://www.typescriptlang.org/)** - 静态类型检查
  - 启用严格模式
  - 已配置路径映射（`@/` 别名）
  - 自定义类型定义
  - 完整类型推断

### 样式和用户界面

- **[Tailwind CSS 3.4](https://tailwindcss.com/)** - 实用优先的 CSS 框架
  - 定制设计系统
  - 深色模式支持
  - 响应式设计实用程序
  - 即时编译
  - 动态色彩系统（50-950 色度）

- **[HeroUI React 2.6](https://www.heroui.com/)** - 现代 React 组件
  - 可访问的组件
  - 可定制的主题
  - TypeScript 支持
  - 可摇树

- **[Radix UI](https://www.radix-ui.com/)** - 无样式的可访问组件
  - 无头 UI 基元
  - 全键盘导航
  - 符合 ARIA 标准
  - 可组合的

- **[Framer Motion 12.x](https://www.framer.com/motion/)** - 动画库
  - 声明性动画
  - 手势支持
  - 布局动画
  - SVG 动画

### 富文本编辑

- **[TipTap](https://tiptap.dev/)** - 无头富文本编辑器
  - 可扩展的架构
  - 支持降价
  - 协作编辑就绪
  - 自定义扩展

### 状态管理

- **[Zustand 5](https://zustand-demo.pmnd.rs/)** - 轻量级状态管理
  - 简单的API
  - TypeScript 支持
  - 最小样板
  - 开发工具集成
  - 中间件支持

- **[TanStack React 查询 5](https://tanstack.com/query/)** - 服务器状态管理
  - 缓存和同步
  - 后台更新
  - 乐观的更新
  - 错误处理
  - 无限查询

### 数据可视化

- **[TanStack Table](https://tanstack.com/table/)** - 无头表库
  - 排序、过滤、分页
  - 调整列大小
  - 行选择
  - TypeScript 支持

- **[TanStack Virtual](https://tanstack.com/virtual/)** - 虚拟化库
  - 虚拟滚动
  - 性能优化
  - 动态行高

### 表格处理

- **[React Hook Form 7](https://react-hook-form.com/)** - 高性能表单
  - 最少的重新渲染
  - 内置验证
  - TypeScript 支持
  - 轻松集成
  - 字段数组支持

- **[Zod 4](https://zod.dev/)** - 模式验证
  - TypeScript优先
  - 运行时验证
  - 类型推断
  - 错误处理
  - 自定义验证器

## 后端技术

### 数据库与 ORM

- **[PostgreSQL 14+](https://www.postgresql.org/)** - 关系数据库
  - 酸性合规性
  - 高级功能（JSONB、全文搜索）
  - 性能优良
  - JSON 支持
  - 触发器和存储过程

- **[毛毛雨 ORM 0.40.0](https://orm.drizzle.team/)** - TypeScript ORM
  - 类型安全的查询
  - 最小的开销
  - 类似 SQL 的语法
  - 迁移系统
  - 关系查询
  - 准备好的报表

- **[Supabase](https://supabase.com/)** - 后端即服务（可选）
  - 托管 PostgreSQL
  - 实时订阅
  - 行级安全性
  - 内置身份验证
  - 储物桶
  - 边缘函数

### 认证

- **[NextAuth.js 5.0（测试版）](https://authjs.dev/)** - 身份验证库
  - 多个 OAuth 提供商（Google、GitHub、Facebook、Twitter）
  - JWT 和数据库会话
  - TypeScript 支持
  - 安全最佳实践
  - 基于凭证的身份验证
  - 会话管理

- **[Supabase Auth](https://supabase.com/auth)** - 替代身份验证解决方案
  - 内置用户管理
  - 社会提供者
  - 邮箱验证
  - 密码重置
  - 魔法链接
  - 电话验证

### 双重认证架构

Ever Works 同时支持 **NextAuth.js 和 Supabase Auth**：

- 用于传统 OAuth 流程的 NextAuth
- Supabase Auth 的实时功能
- 统一会话管理
- 无缝提供商切换

## 内容管理

### 基于Git的CMS

- **[isomorphic-git](https://isomorphic-git.org/)** - JavaScript 中的 Git 操作
  - 克隆存储库
  - 拉动变更
  - 提交文件
  - 分公司管理

- **[js-yaml](https://github.com/nodeca/js-yaml)** - YAML 解析器
  - 解析 YAML 文件
  - 生成 YAML
  - 模式验证
  - 错误处理

### 文件处理

- **[gray-matter](https://github.com/jonschlinkert/gray-matter)** - Frontmatter 解析器
  - 解析 Markdown 文件
  - 提取元数据
  - 支持多种格式

## 国际化

- **[next-intl 3.26](https://next-intl-docs.vercel.app/)** - Next.js 的 i18n
  - 应用路由器支持
  - 类型安全的翻译
  - 复数化
  - 日期/数字格式

### 支持的语言

Ever Works 开箱即用地支持 **13 种以上语言**：

- 🇬🇧 英语 (en)
- 🇫🇷 法语 (fr)
- 🇪🇸 西班牙语 (es)
- 🇨🇳 中文 (zh)
- 🇩🇪 德语 (de)
- 🇸🇦 阿拉伯语 (ar) - 支持 RTL
- 🇮🇹 意大利语（it）
- 🇵🇹葡萄牙语（pt）
- 🇯🇵 日语 (ja)
- 🇰🇷 韩语 (ko)
- 🇷🇺 俄语 (ru)
- 🇳🇱 荷兰语 (nl)
- 🇵🇱 波兰语 (pl)

[了解更多关于国际化的信息 →](/国际化)

## 分析与监控

### 分析

- **[PostHog](https://posthog.com/)** - 产品分析
  - 事件追踪
  - 用户识别
  - 功能标志
  - 会话录音

### 错误跟踪

- **[Sentry 9.38](https://sentry.io/)** - 错误监控
  - 错误跟踪
  - 性能监控
  - 发布跟踪
  - 用户反馈

### 性能

- **[Vercel Analytics](https://vercel.com/analytics)** - Web Vitals
  - 核心网络生命力
  - 真实用户监控
  - 绩效洞察

## 付款处理

### 支付提供商

- **[Stripe](https://stripe.com/)** - 综合支付平台
  - 一次性付款
  - 定期订阅
  - 多种支付方式（银行卡、Apple Pay、Google Pay）
  - 多种货币
  - 高级分析和报告
  - 客户门户
  - 开具发票
  - 网络钩子

- **[LemonSqueezy](https://lemonsqueezy.com/)** - 记录平台商家
  - 自动税务合规
  - 全球支付（超过 135 个国家/地区）
  - 订阅
  - 预防欺诈
  - 简化的设置
  - 联盟计划支持

[了解有关支付集成的更多信息 →](/ payment)

### 支付SDK

- **[@stripe/stripe-js 7.3.0](https://github.com/stripe/stripe-js)** - Stripe 客户端 SDK
- **[stripe 18.1.0](https://github.com/stripe/stripe-node)** - Stripe 服务器 SDK
- **[@lemonsqueezy/lemonsqueezy.js 3.0.0](https://github.com/lmsqueezy/lemonsqueezy.js)** - LemonSqueezy SDK

## 客户关系管理整合

- **[二十个CRM](https://twenty.com/)** - 开源CRM
  - 客户关系管理
  - 联系人同步
  - 活动追踪
  - 自定义字段
  - API集成
  - 自托管或云

### 客户关系管理功能

- 根据用户注册自动创建联系人
- 同步用户活动和交互
- 跟踪订阅和付款
- 自定义字段映射
- 基于Webhook的同步

## 电子邮件服务

- **[重新发送 4](https://resend.com/)** - 电子邮件 API
  - 交易电子邮件
  - 模板支持
  - 交货追踪
  - 开发者友好

- **[Novu 2.6](https://novu.co/)** - 通知基础设施
  - 多渠道通知
  - 模板管理
  - 工作流程自动化
  - 分析

## 调查系统

- **[SurveyJS](https://surveyjs.io/)** - 调查和表单生成器
  - 多种问题类型（多项选择、文本、评分、矩阵）
  - 条件逻辑
  - 调查预览
  - 响应分析
  - 导出至 CSV/Excel
  - 匿名或经过身份验证的回复
  - 自定义主题

[了解有关调查的更多信息 →](/guides/survey-system)

## 安全性

### 认证安全

- **[bcryptjs 3](https://github.com/dcodeIO/bcrypt.js)** - 密码哈希
  - 安全的密码存储
  - 盐生成
  - 定时攻击防护

- **[何塞 6](https://github.com/panva/jose)** - JWT 操作
  - 代币生成
  - 令牌验证
  - 加密支持

### 输入验证

- **[React Google reCAPTCHA 3](https://github.com/dozoisch/react-google-recaptcha)** - 机器人防护
  - 表单保护
  - 隐形验证码
  - 基于分数的验证

## 开发工具

### 代码质量

- **[ESLint 9](https://eslint.org/)** - JavaScript linter
  - 代码质量规则
  - 定制配置
  - TypeScript 支持
  - Next.js 规则

- **[Prettier 3.5](https://prettier.io/)** - 代码格式化程序
  - 格式一致
  - 编辑器集成
  - 自定义规则

### 构建工具

- **[PostCSS 8](https://postcss.org/)** - CSS 处理器
  - Tailwind CSS 处理
  - 自动前缀器
  - CSS优化

- **[Webpack 5](https://webpack.js.org/)** - 模块捆绑器（通过 Next.js）
  - 代码分割
  - 摇树
  - 资产优化

## 部署和基础设施

### 托管平台

- **[Vercel](https://vercel.com/)** - 推荐平台
  - Next.js 优化
  - 边缘函数
  - 全球CDN
  - 自动部署

- **[Netlify](https://netlify.com/)** - 替代平台
  - 静态网站托管
  - 无服务器功能
  - 表格处理

### 数据库托管

- **[Supabase](https://supabase.com/)** - 托管 PostgreSQL
  - 自动备份
  - 连接池
  - 实时功能

- **[PlanetScale](https://planetscale.com/)** - 无服务器 MySQL
  - 分支工作流程
  - 自动缩放
  - 模式管理

- **[Neon](https://neon.tech/)** - 无服务器 PostgreSQL
  - 即时分支
  - 自动缩放
  - 时间点恢复

## 包管理

- **[pnpm](https://pnpm.io/)** - 快速、磁盘空间高效的包管理器
  - 安装速度更快
  - 共享依赖项
  - 严格的依赖解析

- **[npm](https://npmjs.com/)** - 默认 Node.js 包管理器
  - 广泛支持
  - 大生态系统
  - 安全审计

## 版本要求

### Node.js

- **最低**：Node.js 20.19.0
- **推荐**：最新 LTS 版本
- **包管理器**：npm 10+、yarn 1.13+ 或 pnpm 8+

### 浏览器支持

- **现代浏览器**：Chrome 90+、Firefox 88+、Safari 14+、Edge 90+
- **移动设备**：iOS Safari 14+、Chrome Mobile 90+
- **不支持 IE**：仅限现代功能

## 性能考虑因素

### 捆绑尺寸

- **核心包**：压缩后约 200KB
- **代码分割**：基于路由和基于组件
- **Tree shake**：未使用的代码消除
- **动态导入**：非关键组件的延迟加载

### 运行时性能

- **React 19**：并发功能带来更好的用户体验
- **Next.js 15**：优化渲染和缓存
- **图像优化**：WebP/AVIF 支持延迟加载
- **字体优化**：具有预加载功能的自托管字体

### 数据库性能

- **连接池**：高效的数据库连接
- **查询优化**：索引查询和高效连接
- **缓存**：应用程序级和数据库级缓存

## 安全堆栈

### 应用安全

- **HTTPS**：在生产中强制执行
- **CSRF 保护**：内置于 NextAuth.js 中
- **XSS 防护**：内容清理
- **SQL 注入**：通过 Drizzle 进行参数化查询

### 基础设施安全

- **环境变量**：安全秘密管理
- **速率限制**：API端点保护
- **输入验证**：Zod 模式验证
- **文件上传安全**：类型和大小限制

## 监控堆栈

### 应用监控

- **错误跟踪**：用于错误监控的Sentry
- **性能**：核心 Web Vitals 跟踪
- **分析**：PostHog 用户行为
- **正常运行时间**：外部监控服务

### 基础设施监控

- **数据库**：连接和查询监控
- **API**：响应时间和错误率跟踪
- **CDN**：缓存命中率和性能
- **部署**：构建和部署监控

## 未来的考虑因素

### 计划升级

- **React 19**：稳定版本采用
- **Next.js 16**：可用时
- **TypeScript 5.x**：最新功能
- **Node.js 22**：LTS 升级

### 潜在的补充

- **GraphQL**：针对复杂的数据需求
- **WebSockets**：实时功能
- **PWA**：渐进式网络应用程序功能
- **边缘计算**：增强的性能

## 技术决策矩阵

|要求|技术选择|基本原理|
|-------------|-------------------|-----------|
|**框架**|Next.js 15|带有 App Router 的一流 React 框架|
|**数据库**|PostgreSQL + 毛毛雨|类型安全、高性能、可扩展|
|**授权**|NextAuth.js + Supabase|双提供商灵活性|
|**造型**|Tailwind CSS + HeroUI|快速开发，一致设计|
|**状态**|Zustand + React 查询|简单的客户端状态+强大的服务器状态|
|**表格**|React Hook 形式 + Zod|性能+类型安全|
|**国际化**|下一个国际|最佳 Next.js 应用路由器支持|
|**付款**|条纹+柠檬挤压|灵活性+全球合规性|
|**电子邮件**|重新发送 + Novu|开发者友好+多渠道|
|**分析**|邮差猪 + 哨兵|产品洞察+错误跟踪|

## 下一步

- [架构概述](./overview) - 了解系统架构
- [平台功能](./features) - 探索所有平台功能
- [开发设置](/development/local-setup) - 设置您的环境

## 资源

### 官方文档

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [毛毛雨 ORM 文档](https://orm.drizzle.team/docs/overview)

### 社区资源

- [Next.js GitHub](https://github.com/vercel/next.js)
- [React GitHub](https://github.com/facebook/react)
- [Tailwind GitHub](https://github.com/tailwindlabs/tailwindcss)
- [Ever Works 社区](https://github.com/ever-co/ever-works)
