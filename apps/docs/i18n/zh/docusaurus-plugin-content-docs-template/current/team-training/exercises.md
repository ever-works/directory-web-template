---
id: exercises
title: 实践练习
sidebar_label: 练习
sidebar_position: 5
---

# 实践练习

通过真实任务和挑战将所学知识付诸实践。

## 🎯 学习目标

- ✅ 练习创建 API 端点
- ✅ 应用 Swagger 文档标准
- ✅ 实现验证和错误处理
- ✅ 从零开始构建完整功能
- ✅ 建立对开发工作流程的信心

**预计时间**：3–5 天

---

## 练习 1：简单的 GET 路由

**难度**：⭐ 初级  
**时长**：15–30 分钟  
**目标**：学习基本的注解结构和工作流程

### 任务

创建一个简单的 GET 端点，返回服务器信息。

### 步骤

1. **创建文件**：`app/api/training/server-info/route.ts`

2. **实现路由**：

```typescript
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/training/server-info:
 *   get:
 *     tags: ["System"]
 *     summary: "Get server information"
 *     description: "Returns basic server information including version, current timestamp, and uptime."
 *     responses:
 *       200:
 *         description: "Server information retrieved successfully"
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      server: "Ever Works API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
}
```

3. **测试工作流程**：

```bash
yarn generate-docs
open http://localhost:3000/api/reference
curl http://localhost:3000/api/training/server-info
```

### 成功标准

- [ ] 端点在 Scalar UI 中显示在"System"标签下
- [ ] 所有响应字段都有带示例的文档
- [ ] 在 Scalar UI 中测试端点时正常工作
- [ ] 生成时无错误

---

## 练习 2：带验证的 POST 路由

**难度**：⭐⭐ 中级  
**时长**：30–45 分钟  
**目标**：学习请求体文档和错误处理

### 任务

创建带验证的用户反馈 POST 端点。

### 步骤

1. **创建文件**：`app/api/training/feedback/route.ts`

2. **实现带验证的路由**：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const feedbackSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  category: z.enum(['bug', 'feature', 'general']),
  message: z.string().min(10).max(1000),
  rating: z.number().min(1).max(5).optional()
});
```

3. **用有效和无效数据测试**：

```bash
curl -X POST http://localhost:3000/api/training/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "email": "zhang.san@example.cn",
    "category": "feature",
    "message": "很棒的平台！",
    "rating": 5
  }'
```

---

## 练习 3：完整功能实现

**难度**：⭐⭐⭐ 高级  
**时长**：1–2 天  
**目标**：构建带 CRUD 操作和文档的完整功能

### 任务

实现一个带完整 CRUD 功能的简单笔记管理 API。

### 要求

- `GET /api/training/notes` – 列出所有笔记
- `POST /api/training/notes` – 创建新笔记
- `GET /api/training/notes/[id]` – 获取单条笔记
- `PUT /api/training/notes/[id]` – 更新笔记
- `DELETE /api/training/notes/[id]` – 删除笔记
