---
id: testing
title: 响应式测试指南
sidebar_label: 测试
sidebar_position: 4
---

# 响应式测试指南

本指南涵盖了在不同设备和屏幕尺寸上测试响应式设计的最佳实践。

## 测试设备

### 移动端（320px - 768px）

| 设备               | 分辨率    | 备注                  |
|--------------------|-----------|-----------------------|
| iPhone SE          | 375x667   | 最小的现代 iPhone     |
| iPhone 12/13/14    | 390x844   | 标准 iPhone 尺寸      |
| Samsung Galaxy S20 | 360x800   | 流行的 Android 设备   |
| iPad Mini 竖屏     | 768x1024  | 小型平板              |

### 平板（768px - 1024px）

| 设备           | 分辨率    | 备注          |
|----------------|-----------|---------------|
| iPad Air       | 820x1180  | 标准 iPad     |
| iPad Pro 11"   | 834x1194  | 专业平板      |
| Surface Pro 7  | 912x1368  | Windows 平板  |

### 桌面端（1024px+）

| 设备       | 分辨率     | 备注                |
|------------|------------|---------------------|
| 笔记本电脑 | 1366x768   | 典型笔记本分辨率    |
| 桌面 HD    | 1920x1080  | 标准台式机          |
| 4K 显示器  | 3840x2160  | 高分辨率显示器      |

## 测试清单

### 1. 导航

- [ ] **移动端**：汉堡菜单按钮可见且可用
- [ ] **桌面端**：水平导航栏正确显示
- [ ] **所有设备**：所有导航链接均可访问
- [ ] **触控区域**：移动端最小 44x44px
- [ ] **键盘导航**：Tab 键顺序合理

### 2. 内容

- [ ] **文字可读性**：无需缩放即可阅读
- [ ] **图片**：在每个断点上响应式且正确缩放
- [ ] **无水平滚动**：内容适应视口宽度
- [ ] **行长度**：最佳阅读宽度（45-75 字符）
- [ ] **字体大小**：适合各设备尺寸

### 3. 交互

- [ ] **触控区域**：移动端最小 44x44px
- [ ] **间距**：可点击元素之间有足够空间
- [ ] **悬停状态**：仅在支持悬停的设备上显示
- [ ] **焦点状态**：键盘焦点指示器可见
- [ ] **表单**：在移动端易于填写

### 4. 性能

- [ ] **加载时间**：3G 网络下 < 3 秒
- [ ] **图片**：针对每种屏幕尺寸优化
- [ ] **动画**：流畅的 60 FPS 性能
- [ ] **Core Web Vitals**：符合 Google 阈值
- [ ] **包大小**：JavaScript 和 CSS 已优化

### 5. 布局

- [ ] **网格**：在断点处正确自适应
- [ ] **Flexbox/Grid**：无布局错位
- [ ] **间距**：一致的 padding 和 margin
- [ ] **对齐**：所有尺寸下对齐正确
- [ ] **溢出**：无内容溢出问题

## 测试工具

### 浏览器 DevTools

#### Chrome DevTools
1. 打开 DevTools（F12 或 Cmd+Option+I）
2. 点击设备工具栏图标（Cmd+Shift+M）
3. 选择设备或输入自定义尺寸
4. 测试不同的网络速度

#### Firefox Developer Tools
1. 打开 DevTools（F12）
2. 点击"响应式设计模式"（Cmd+Option+M）
3. 选择设备预设
4. 测试触控事件

### 在线测试服务

- **[BrowserStack](https://www.browserstack.com/)** - 真实设备测试
- **[LambdaTest](https://www.lambdatest.com/)** - 跨浏览器测试
- **[Sauce Labs](https://saucelabs.com/)** - 自动化测试平台

### 性能测试

- **[Lighthouse](https://developers.google.com/web/tools/lighthouse)** - 性能审计
- **[WebPageTest](https://www.webpagetest.org/)** - 详细性能分析
- **[PageSpeed Insights](https://pagespeed.web.dev/)** - Google 性能工具

## 目标指标

### Lighthouse 评分

| 指标     | 目标  | 关键值 |
|----------|-------|--------|
| 性能     | > 90  | > 50   |
| 无障碍   | > 95  | > 80   |
| 最佳实践 | > 95  | > 80   |
| SEO      | > 95  | > 80   |

### Core Web Vitals

| 指标 | 良好 | 需要改进 | 差 |
|------|------|----------|-----|
| **LCP**（最大内容渲染） | < 2.5s | 2.5s - 4.0s | > 4.0s |
| **FID**（首次输入延迟） | < 100ms | 100ms - 300ms | > 300ms |
| **CLS**（累积布局偏移） | < 0.1 | 0.1 - 0.25 | > 0.25 |

### 移动端指标

- **首次内容渲染**：< 1.8s
- **可交互时间**：< 3.8s
- **触控区域大小**：>= 48x48px
- **触控延迟**：< 300ms

## 测试工作流

### 1. 本地测试

```bash
# 启动开发服务器
npm run dev

# 在浏览器中打开
http://localhost:3000
```

### 2. 设备测试

1. **使用 DevTools 响应式模式**
2. **在物理设备上测试**（条件允许时）
3. **使用远程调试**调试移动设备
4. **测试不同方向**（竖屏/横屏）

### 3. 自动化测试

```bash
# 运行 Lighthouse 审计
npm run lighthouse

# 运行无障碍测试
npm run test:a11y

# 运行视觉回归测试
npm run test:visual
```

## 常见问题与解决方案

### 问题：移动端出现水平滚动

**解决方案**：检查固定宽度的元素

```css
/* ❌ 不好 */
.container {
  width: 1200px;
}

/* ✅ 好 */
.container {
  max-width: 1200px;
  width: 100%;
  padding: 0 1rem;
}
```

### 问题：移动端文字过小

**解决方案**：使用响应式字体大小

```css
/* ❌ 不好 */
body {
  font-size: 12px;
}

/* ✅ 好 */
body {
  font-size: 16px; /* 移动端基础大小 */
}

@media (min-width: 768px) {
  body {
    font-size: 18px;
  }
}
```

### 问题：触控区域太小

**解决方案**：确保最小尺寸 44x44px

```css
/* ✅ 好 */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
}
```

### 问题：图片不响应

**解决方案**：使用响应式图片技术

```jsx
// ✅ 好 - Next.js Image 组件
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority
/>
```

## 最佳实践

### 1. 移动优先方式
- 先为移动端设计，再针对大屏幕增强
- 使用 `min-width` 媒体查询，而不是 `max-width`

### 2. 渐进增强
- 确保核心功能在没有 JavaScript 的情况下也能正常工作
- 为支持的浏览器添加增强功能

### 3. 适合触控的设计
- 触控区域最小 44x44px
- 可交互元素之间有足够间距
- 避免仅有悬停交互

### 4. 性能优化
- 懒加载图片和组件
- 最小化 JavaScript 包大小
- 使用代码分割
- 优化字体和资源

### 5. 无障碍访问
- 使用屏幕阅读器测试
- 确保键盘导航正常工作
- 保持足够的颜色对比度
- 为图片提供文字替代说明

## 下一步

- [本地设置](./local-setup) - 配置开发环境
- [API 文档](./api-documentation) - 了解 API 文档
- [部署](/docs/deployment) - 部署应用程序

## 资源

- [Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)
- [Mobile-First CSS](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Responsive/Mobile_first)
- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Web.dev Performance](https://web.dev/performance/)
