---
id: user-profiles
title: 用户配置文件和设置
sidebar_label: 用户资料
sidebar_position: 18
---

# 用户配置文件和设置

Ever Works 模板包括一个用户个人资料系统，其中包含公共个人资料页面、选项卡式导航、头像管理、社交链接和个人资料显示组件。用户可以通过结构化的个人资料界面展示他们的信息、作品集、技能和提交的项目。

## 架构概述

|组件|路径|目的|
|---|---|---|
| 0 | 1 |带有选项卡路由的主要个人资料页面内容 |
| 2 | 3 |粘性标签导航栏 |
| 4 | 5 |个人资料封面、头像、简介和社交链接 |
| 6 | 7 |技能/兴趣标签组件 |
| 8 | 9 |标头配置文件菜单触发 |
| 10 | 11 |下拉个人资料菜单|

## 配置文件数据结构

```tsx
// lib/types/profile.ts
interface Profile {
  displayName: string;
  jobTitle: string;
  bio: string;
  avatar: string | null;
  location: string | null;
  company: string | null;
  website: string | null;
  socialLinks: SocialLink[];
}

interface SocialLink {
  platform: string;    // 'github', 'linkedin', 'twitter', etc.
  url: string;
  displayName: string;
}
```

## 配置文件标题

0 组件呈现用户个人资料的顶部部分，其中包含渐变封面横幅、带有编辑按钮的头像以及传记信息：

```tsx
import { ProfileHeader } from '@/components/profile/profile-header';

<ProfileHeader profile={userProfile} isOwnProfile={true} />
```

### 特点

|特色 |描述 |
|---|---|
|封面横幅|使用主题主色和副色的渐变背景|
|头像|带环形边框的圆形图像，响应式大小调整（24x24 至 28x28）|
|编辑按钮|仅当 0 为 true 时才显示 |
|图像后备 |在图像加载错误时显示用户图标占位符 |
|社交链接 |呈现特定于平台的图标（GitHub、LinkedIn、Twitter）|
|地点和公司 |显示地图图钉和公文包图标 |
|网站链接|带有地球图标的外部链接|

### 头像错误处理

该组件包括强大的图像错误处理功能：

```tsx
const [imageError, setImageError] = useState(false);

// Reset error when avatar URL changes
useEffect(() => {
  setImageError(false);
}, [profile.avatar]);

// Render fallback on error
{!imageError && profile.avatar ? (
  <Image src={profile.avatar} onError={() => setImageError(true)} />
) : (
  <FiUser className="w-8 h-8 text-gray-400" />
)}
```

### 社交平台图标

|平台|图标|
|---|---|
| 0 | 1 |
| 2 | 3 |
| 4 | 5 |
|其他| 6（通用）|

## 个人资料导航

7 组件提供粘性选项卡式导航：

```tsx
import { ProfileNavigation } from '@/components/profile/profile-navigation';

<ProfileNavigation
  activeTab="about"
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

### 可用选项卡

|标签 ID |标签|图标|
|---|---|---|
| 0 |关于 | 1 |
| 2 |投资组合 | 3 |
| 4 |技能 | 5 |
| 6 |意见书 | 7 |

### 导航功能

- **粘性定位** -- 在模糊背景下滚动时保持在顶部
- **适合移动设备** -- 小屏幕上的水平滚动
- **焦点可见** -- 用于键盘导航的环形指示器
- **主题感知** -- 活动选项卡使用主题原色

## 个人资料内容

8 组件通过组合导航和选项卡内容来编排个人资料页面：

```tsx
import { ProfileContent } from '@/components/profile/profile-content';

function ProfilePage({ profile }) {
  return <ProfileContent profile={profile} />;
}
```

### 选项卡部分

|部分|组件|内容 |
|---|---|---|
|关于 | 0 |个人信息、简历、详细信息 |
|投资组合 | 1 |工作样本和项目|
|技能 | 2 |技能和专业知识标签|
|意见书 | 3 |用户提交的项目 |

每个部分都使用一致的标题呈现：

```tsx
function ProfileSectionHeader({ title }) {
  return (
    <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-800 pb-2">
      {title}
    </h2>
  );
}
```

## 配置文件按钮组件

### 标题配置文件按钮

站点标题中打开配置文件菜单的按钮：

```tsx
import { ProfileButton } from '@/components/header/profile-button';

<ProfileButton />
```

### 配置文件标题显示

以紧凑的形式显示用户的姓名和头像：

```tsx
import { ProfileHeaderButton } from '@/components/profile-button/profile-header';

<ProfileHeaderButton user={currentUser} />
```

### 个人资料菜单

包含配置文件操作的下拉菜单：

```tsx
import { ProfileMenu } from '@/components/profile-button/profile-menu';

<ProfileMenu
  user={currentUser}
  onSignOut={handleSignOut}
/>
```

## 响应式设计

配置文件组件是采用移动优先方法构建的：

|断点|行为 |
|---|---|
|手机 |居中头像、堆叠布局、水平选项卡滚动 |
|平板电脑+ |左对齐头像，并排布局 |
|桌面|具有最大宽度限制的全宽卡 |

### 头像尺寸

|屏幕|尺寸|
|---|---|
|手机 | 24x24（96 像素）|
|桌面| 28x28（112 像素）|

## 主题整合

配置文件系统使用模板的主题系统：

- 封面横幅渐变使用 0 和 1 CSS 变量
- 活动选项卡状态使用主题原色
- 完全支持深色模式并具有适当的对比度
- 悬停状态使用主题感知的颜色过渡

## 布局结构

```
ProfileHeader (cover + avatar + info card)
  |
  +-- Cover Banner (gradient)
  +-- Avatar (overlapping cover)
  +-- Info Card
      +-- Name & Title
      +-- Bio
      +-- Location / Company / Website
      +-- Social Links

ProfileContent
  |
  +-- ProfileNavigation (sticky tabs)
  +-- Active Section
      +-- AboutSection
      +-- PortfolioSection
      +-- SkillsSection
      +-- SubmissionsSection
```

## 关键文件

|文件|路径|
|---|---|
|简介内容 | 0 |
|简介导航 | 1 |
|个人资料标题 | 2 |
|个人资料标签| 3 |
|标题配置文件按钮| 4 |
|个人资料菜单| 5 |
|型材类型 | 6 |
