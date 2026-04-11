---
id: user-profiles
title: Профили пользователей и настройки
sidebar_label: Профили пользователей
sidebar_position: 18
---

# Профили пользователей и настройки

Шаблон Ever Works включает в себя систему профилей пользователей с общедоступными страницами профиля, навигацией с вкладками, управлением аватарами, социальными ссылками и компонентами отображения профиля. Пользователи могут демонстрировать свою информацию, портфолио, навыки и представленные элементы через структурированный интерфейс профиля.

## Обзор архитектуры

| Компонент | Путь | Цель |
|---|---|---|
| `ProfileContent` | `components/profile/profile-content.tsx` | Содержимое главной страницы профиля с маршрутизацией вкладок |
| `ProfileNavigation` | `components/profile/profile-navigation.tsx` | Липкая панель навигации |
| `ProfileHeader` | `components/profile/profile-header.tsx` | Обложка профиля, аватар, биография и ссылки на социальные сети |
| `ProfileTag` | `components/profile/profile-tag.tsx` | Компонент тега навыков/интересов |
| `ProfileButton` | `components/header/profile-button.tsx` | Триггер меню профиля заголовка |
| `ProfileMenu` | `components/profile-button/profile-menu.tsx` | Выпадающее меню профиля |

## Структура данных профиля

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

## Шапка профиля

Компонент `ProfileHeader` отображает верхнюю часть профиля пользователя с баннером с градиентной обложкой, аватаром с кнопкой редактирования и биографической информацией:

```tsx
import { ProfileHeader } from '@/components/profile/profile-header';

<ProfileHeader profile={userProfile} isOwnProfile={true} />
```

### Особенности

| Особенность | Описание |
|---|---|
| Обложка баннера | Градиентный фон с использованием основных и дополнительных цветов темы |
| Аватар | Круглое изображение с кольцевой рамкой, адаптивный размер (от 24 x 24 до 28 x 28) |
| Кнопка редактирования | Отображается только тогда, когда `isOwnProfile` истинно |
| Резервное изображение | Показывает заполнитель значка пользователя при ошибке загрузки изображения |
| Социальные ссылки | Отрисовывает значки для конкретных платформ (GitHub, LinkedIn, Twitter) |
| Местоположение и компания | Дисплеи с значками карты и портфеля |
| Ссылка на сайт | Внешняя ссылка со значком глобуса |

### Обработка ошибок аватара

Компонент включает в себя надежную обработку ошибок изображений:

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

### Иконки социальных платформ

| Платформа | Значок |
|---|---|
| `github` | `FiGithub` |
| `linkedin` | `FiLinkedin` |
| `twitter` | `FiTwitter` |
| Другое | `FiGlobe` (общий) |

## Навигация по профилю

Компонент `ProfileNavigation` обеспечивает липкую навигацию с вкладками:

```tsx
import { ProfileNavigation } from '@/components/profile/profile-navigation';

<ProfileNavigation
  activeTab="about"
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

### Доступные вкладки

| Идентификатор вкладки | Этикетка | Значок |
|---|---|---|
| `about` | О нас | `FiUser` |
| `portfolio` | Портфолио | `FiBriefcase` |
| `skills` | Навыки | `FiAward` |
| `submissions` | Материалы | `FiFileText` |

### Функции навигации

- **Привязчивое позиционирование** – остается вверху при прокрутке с размытием фона.
– **Удобство для мобильных устройств** – Горизонтальная прокрутка на маленьких экранах.
- **Фокус виден** – Кольцевой индикатор для навигации с помощью клавиатуры.
- **С учетом темы** – на активной вкладке используются основные цвета темы.

## Содержание профиля

Компонент `ProfileContent` управляет страницей профиля, комбинируя навигацию и содержимое вкладок:

```tsx
import { ProfileContent } from '@/components/profile/profile-content';

function ProfilePage({ profile }) {
  return <ProfileContent profile={profile} />;
}
```

### Разделы вкладок

| Раздел | Компонент | Содержание |
|---|---|---|
| О нас | `AboutSection` | Личная информация, биография, подробности |
| Портфолио | `PortfolioSection` | Образцы работ и проекты |
| Навыки | `SkillsSection` | Навыки и опыт теги |
| Материалы | `SubmissionsSection` | Предметы, представленные пользователем |

Каждый раздел отображается с последовательным заголовком:

```tsx
function ProfileSectionHeader({ title }) {
  return (
    <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-800 pb-2">
      {title}
    </h2>
  );
}
```

## Компоненты кнопок профиля

### Кнопка профиля в заголовке

Кнопка в шапке сайта, открывающая меню профиля:

```tsx
import { ProfileButton } from '@/components/header/profile-button';

<ProfileButton />
```

### Отображение шапки профиля

Показывает имя и аватар пользователя в компактной форме:

```tsx
import { ProfileHeaderButton } from '@/components/profile-button/profile-header';

<ProfileHeaderButton user={currentUser} />
```

### Меню профиля

Выпадающее меню с действиями профиля:

```tsx
import { ProfileMenu } from '@/components/profile-button/profile-menu';

<ProfileMenu
  user={currentUser}
  onSignOut={handleSignOut}
/>
```

## Адаптивный дизайн

Компоненты профиля созданы с учетом подхода, ориентированного на мобильные устройства:

| Точка останова | Поведение |
|---|---|
| Мобильный | Центрированный аватар, многоуровневый макет, горизонтальная прокрутка вкладок |
| Планшет+ | Аватар с выравниванием по левому краю, расположение рядом |
| Рабочий стол | Полноразмерная карта с ограничениями максимальной ширины |

### Размер аватара

| Экран | Размер |
|---|---|
| Мобильный | 24x24 (96 пикселей) |
| Рабочий стол | 28x28 (112 пикселей) |

## Интеграция тем

Система профилей использует систему тем шаблона:

- Градиент обложки баннера использует переменные CSS `--theme-primary` и `--theme-secondary` .
- В активных состояниях вкладок используются основные цвета темы.
- Темный режим полностью поддерживается с соответствующими коэффициентами контрастности.
- В состояниях при наведении используются цветовые переходы с учетом темы.

## Структура макета

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

## Ключевые файлы

| Файл | Путь |
|---|---|
| Содержание профиля | `components/profile/profile-content.tsx` |
| Навигация по профилю | `components/profile/profile-navigation.tsx` |
| Шапка профиля | `components/profile/profile-header.tsx` |
| Тег профиля | `components/profile/profile-tag.tsx` |
| Кнопка профиля в заголовке | `components/header/profile-button.tsx` |
| Меню профиля | `components/profile-button/profile-menu.tsx` |
| Типы профилей | `lib/types/profile.ts` |
