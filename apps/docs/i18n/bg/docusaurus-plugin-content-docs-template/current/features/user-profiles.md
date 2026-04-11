---
id: user-profiles
title: Потребителски профили и настройки
sidebar_label: Потребителски профили
sidebar_position: 18
---

# Потребителски профили и настройки

Шаблонът Ever Works включва система за потребителски профили със страници с обществени профили, навигация с раздели, управление на аватар, социални връзки и компоненти за показване на профили. Потребителите могат да покажат своята информация, портфолио, умения и изпратени елементи чрез структуриран интерфейс на профила.

## Преглед на архитектурата

| Компонент | Път | Цел |
|---|---|---|
| `ProfileContent` | `components/profile/profile-content.tsx` | Съдържание на страницата на основния профил с маршрутизиране на раздели |
| `ProfileNavigation` | `components/profile/profile-navigation.tsx` | Лента за навигация на лепкав раздел |
| `ProfileHeader` | `components/profile/profile-header.tsx` | Корица на профила, аватар, биография и социални връзки |
| `ProfileTag` | `components/profile/profile-tag.tsx` | Компонент на маркер за умения/интереси |
| `ProfileButton` | `components/header/profile-button.tsx` | Задействане на менюто за профил на заглавката |
| `ProfileMenu` | `components/profile-button/profile-menu.tsx` | Падащо меню с профил |

## Структура на данните на профила

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

## Заглавка на профила

Компонентът `ProfileHeader` изобразява горната секция на потребителски профил с банер с градиентно покритие, аватар с бутон за редактиране и биографична информация:

```tsx
import { ProfileHeader } from '@/components/profile/profile-header';

<ProfileHeader profile={userProfile} isOwnProfile={true} />
```

### Характеристики

| Характеристика | Описание |
|---|---|
| Банер на корицата | Градиентен фон, използващ основни и вторични цветове на темата |
| Аватар | Кръгло изображение с пръстеновидна рамка, адаптивно оразмеряване (24x24 до 28x28) |
| Бутон за редактиране | Показва се само когато `isOwnProfile` е вярно |
| Резервно изображение | Показва контейнер за потребителска икона при грешка при зареждане на изображение |
| Социални връзки | Изобразява специфични за платформата икони (GitHub, LinkedIn, Twitter) |
| Местоположение и компания | Дисплеи с щифт на карта и икони на куфарче |
| Връзка към уебсайт | Външна връзка с икона на глобус |

### Обработка на грешки в аватара

Компонентът включва надеждна обработка на грешки в изображенията:

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

### Икони на социални платформи

| Платформа | Икона |
|---|---|
| `github` | `FiGithub` |
| `linkedin` | `FiLinkedin` |
| `twitter` | `FiTwitter` |
| Други | `FiGlobe` (общо) |

## Навигация в профила

Компонентът `ProfileNavigation` предоставя лепкава навигация с раздели:

```tsx
import { ProfileNavigation } from '@/components/profile/profile-navigation';

<ProfileNavigation
  activeTab="about"
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

### Налични раздели

| ID на раздел | Етикет | Икона |
|---|---|---|
| `about` | Относно | `FiUser` |
| `portfolio` | Портфолио | `FiBriefcase` |
| `skills` | Умения | `FiAward` |
| `submissions` | Изпращания | `FiFileText` |

### Функции за навигация

- **Залепващо позициониране** -- Остава отгоре при превъртане с размазан фон
- **Удобен за мобилни устройства** -- Хоризонтално превъртане на малки екрани
- **Видим фокус** -- Индикатор на звънене за навигация с клавиатура
- **Отчитане на темата** -- Активният раздел използва основните цветове на темата

## Съдържание на профила

Компонентът `ProfileContent` организира страницата на профила, като комбинира навигация и съдържание на раздели:

```tsx
import { ProfileContent } from '@/components/profile/profile-content';

function ProfilePage({ profile }) {
  return <ProfileContent profile={profile} />;
}
```

### Раздели на раздели

| Раздел | Компонент | Съдържание |
|---|---|---|
| Относно | `AboutSection` | Лична информация, биография, подробности |
| Портфолио | `PortfolioSection` | Работни образци и проекти |
| Умения | `SkillsSection` | Тагове за умения и опит |
| Изпращания | `SubmissionsSection` | Артикули, изпратени от потребителя |

Всеки раздел се изобразява с последователна заглавка:

```tsx
function ProfileSectionHeader({ title }) {
  return (
    <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-800 pb-2">
      {title}
    </h2>
  );
}
```

## Компоненти на бутона за профил

### Бутон за профил на заглавката

Бутон в заглавката на сайта, който отваря менюто на профила:

```tsx
import { ProfileButton } from '@/components/header/profile-button';

<ProfileButton />
```

### Показване на заглавката на профила

Показва името и аватара на потребителя в компактна форма:

```tsx
import { ProfileHeaderButton } from '@/components/profile-button/profile-header';

<ProfileHeaderButton user={currentUser} />
```

### Меню на профила

Падащо меню с действия в профила:

```tsx
import { ProfileMenu } from '@/components/profile-button/profile-menu';

<ProfileMenu
  user={currentUser}
  onSignOut={handleSignOut}
/>
```

## Отзивчив дизайн

Компонентите на профила са изградени с подход на първо място за мобилни устройства:

| Точка на прекъсване | Поведение |
|---|---|
| Мобилен | Центриран аватар, подредено оформление, хоризонтално превъртане на раздел |
| Таблет+ | Подравнен вляво аватар, оформление един до друг |
| Работен плот | Карта с пълна ширина с ограничения за максимална ширина |

### Оразмеряване на аватар

| Екран | Размер |
|---|---|
| Мобилен | 24x24 (96px) |
| Работен плот | 28x28 (112px) |

## Интегриране на тема

Профилната система използва системата от теми на шаблона:

- Градиентът на банера на корицата използва `--theme-primary` и `--theme-secondary` CSS променливи
- Състоянията на активните раздели използват основните цветове на темата
- Тъмният режим се поддържа напълно с подходящи съотношения на контраста
- Състоянията при задържане на мишката използват цветови преходи, съобразени с темата

## Структура на оформлението

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

## Ключови файлове

| Файл | Път |
|---|---|
| Съдържание на профила | `components/profile/profile-content.tsx` |
| Навигация в профила | `components/profile/profile-navigation.tsx` |
| Заглавка на профил | `components/profile/profile-header.tsx` |
| Етикет на профил | `components/profile/profile-tag.tsx` |
| Бутон за профил на заглавката | `components/header/profile-button.tsx` |
| Меню на профил | `components/profile-button/profile-menu.tsx` |
| Типове профили | `lib/types/profile.ts` |
