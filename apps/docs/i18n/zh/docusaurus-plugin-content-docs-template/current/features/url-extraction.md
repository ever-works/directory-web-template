---
id: url-extraction
title: URL提取系统
sidebar_label: 网址提取
sidebar_position: 13
---

# URL提取系统

Ever Works Template 包括一个人工智能驱动的 URL 提取系统，可以自动从 URL 中提取元数据，包括产品名称、描述、类别、标签、品牌信息和图像。此功能通过从提供的 URL 自动填充表单字段来简化项目提交过程。

## 架构概述

|组件|路径|目的|
|---|---|---|
| 0 钩子 | 1 |用于触发提取的客户端 React hook |
| 2终点| 3 |执行实际提取的服务器端 API 路由 |

## 它是如何工作的

1. 用户在提交表单中提供一个URL
2. `useUrlExtraction` 钩子将 URL 发送到 `/api/extract` 端点
3. 服务器提取元数据（名称、描述、类别、标签、品牌、图像）
4.返回提取的数据，可用于自动填写表单字段

## 6 钩子

### 接口

```tsx
interface ExtractionResult {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  brand?: string;
  brand_logo_url?: string;
  images?: string[];
}

interface UseUrlExtractionReturn {
  isLoading: boolean;
  extractFromUrl: (url: string, existingCategories?: string[]) => Promise<ExtractionResult | null>;
}
```

＃＃＃ 用法

```tsx
import { useUrlExtraction } from '@/hooks/use-url-extraction';

function SubmitForm() {
  const { isLoading, extractFromUrl } = useUrlExtraction();

  const handleUrlSubmit = async (url: string) => {
    const existingCategories = ['Project Management', 'Time Tracking', 'CRM'];
    const result = await extractFromUrl(url, existingCategories);

    if (result) {
      // Auto-fill form fields with extracted data
      setFormData({
        name: result.name,
        description: result.description,
        category: result.category || '',
        tags: result.tags || [],
      });
    }
  };

  return (
    <div>
      <input
        type="url"
        placeholder="Enter product URL..."
        onBlur={(e) => handleUrlSubmit(e.target.value)}
      />
      {isLoading && <span>Extracting data...</span>}
    </div>
  );
}
```

## 提取的数据字段

|领域 |类型 |描述 |
|---|---|---|
| 0 | 1 |从页面提取的产品或服务名称 |
| 2 | 3 |产品描述或元描述 |
| 4 | 5 |建议的类别，在提供时与现有类别相匹配|
| 6 | 7 |从页面内容中提取相关标签|
| 8 | 9 |品牌或公司名称|
| 10 | 11 |品牌标志图像的 URL |
| 12 | 13 |页面上找到的相关图像 URL 数组 |

## 类别匹配

14 函数接受可选的15 参数。提供后，提取 API 会尝试将提取的内容与这些类别进行匹配，确保建议的类别与网站的分类法一致：

```tsx
const existingCategories = ['Analytics', 'Marketing', 'Development'];
const result = await extractFromUrl('https://example.com/product', existingCategories);
// result.category will be one of the existing categories if a match is found
```

## 错误处理

该钩子实现了多层错误处理：

|场景 |行为 |
|---|---|
|空网址 |抛出“未提供 URL”错误 |
| HTTP 请求失败 |记录错误，显示 toast 通知 |
|功能已禁用 |默默地返回0（优雅降级）|
| API 失败 |记录错误，显示带有消息的 toast |
|意外错误 |捕获所有错误，显示通用 toast，返回 1 |

### 优雅的降级

未配置提取功能时系统支持优雅降级：

```tsx
// Server response when feature is disabled
if (response.data.featureDisabled) {
  // Returns null without showing an error
  return null;
}
```

这样即使没有配置AI提取服务，提交表单也可以正常工作，只需跳过自动填写步骤即可。

## React 查询集成

该钩子使用 TanStack Query 的 0 来管理提取请求：

```tsx
const mutation = useMutation({
  mutationFn: async ({ url, existingCategories }) => {
    const response = await serverClient.post('/api/extract', {
      url,
      existingCategories
    });
    // ... validation and error handling
    return response.data.data;
  },
  onError: (error) => {
    toast.error(error.message || 'Failed to extract data from URL');
  }
});
```

使用0的好处：
- 通过1自动加载状态管理
- 带有 2 回调的内置错误处理
- 基于 Promise 的 API，通过 3

## 与提交表单集成

URL 提取通常集成到项目提交流程中：

```tsx
function ItemSubmitForm() {
  const { isLoading, extractFromUrl } = useUrlExtraction();
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', tags: []
  });

  const handleUrlChange = async (url: string) => {
    if (!url) return;

    const result = await extractFromUrl(url, availableCategories);
    if (result) {
      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        description: result.description || prev.description,
        category: result.category || prev.category,
        tags: result.tags?.length ? result.tags : prev.tags,
      }));
    }
  };

  return (
    <form>
      <input
        name="url"
        placeholder="Product URL"
        onBlur={(e) => handleUrlChange(e.target.value)}
        disabled={isLoading}
      />
      {/* Form fields auto-populated from extraction */}
    </form>
  );
}
```

## API 客户端

该钩子使用模板的 0 进行 HTTP 通信：

```tsx
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

// POST request to the extraction endpoint
const response = await serverClient.post('/api/extract', { url, existingCategories });

// Response validation
if (!apiUtils.isSuccess(response)) {
  throw new Error(apiUtils.getErrorMessage(response));
}
```

## 关键文件

|文件|路径|
|---|---|
| URL 提取钩子 | 0 |
|提取API路线| 1 |
|服务器 API 客户端 | 2 |
