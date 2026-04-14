---
id: features
title: Характеристики на платформата
sidebar_label: Характеристики
sidebar_position: 3
---

# Характеристики на платформата

Този документ предоставя изчерпателен преглед на всички функции, налични в платформата Ever Works, организирани по функционални области.

## Удостоверяване на потребителите и управление на акаунти

### Регистрация на потребител

**Описание**: Позволява на нови потребители да създават акаунти в платформата.

**Как работи**:

- Потребителите могат да се регистрират чрез имейл/парола или OAuth доставчици (Google, GitHub, Facebook, Twitter)
- Имейл за потвърждение се изпраща при регистрация
- Паролата се хешира с помощта на bcrypt преди съхранение
- При успешна регистрация автоматично се създава клиентски профил

**Потребителски поток**:

1. Потребителят кликва върху „Регистрация“ на началната страница
2. Избира метод на регистрация (имейл или OAuth)
3. Попълва необходимата информация (име, имейл, парола)
4. Получава имейл за потвърждение
5. Щраква върху връзката за потвърждение, за да активира акаунта
6. Пренасочено към таблото за управление на клиента

**Ключови файлове**: `/lib/auth/index.ts`, `/app/[locale]/auth/`

[Научете повече за настройката за удостоверяване →](/authentication/setup-guide)

---

### User Login

**Description**: Authenticates existing users to access their accounts.

**How it works**:

- Supports credential-based login (email/password)
- Supports OAuth login via multiple providers
- Creates JWT session token valid for 30 days
- Session refreshes automatically after 24 hours of activity
- Admins are redirected to admin portal; clients to client portal

**Security features**:

- Password hashing with bcrypt
- ReCAPTCHA integration for bot prevention
- Session invalidation on logout
- Automatic session expiration

**Key files**: `/lib/auth/index.ts`, `/app/[locale]/auth/signin/`

---

### Управление на пароли

**Описание**: Позволява на потребителите да променят или нулират своите пароли.

**Характеристики**:

- **Промяна на паролата**: Удостоверените потребители могат да актуализират своята парола от настройките
- **Забравена парола**: Потребителите получават имейл с връзка за нулиране
- **Нулиране на токен**: Ограничен във времето токен за сигурно нулиране на парола

**Как работи**:

1. Потребителят иска нулиране на паролата
2. Системата генерира защитен токен, съхранен в таблица `passwordResetTokens`
3. Изпратен имейл с връзка за нулиране, съдържаща токен
4. Потребителят кликва върху връзката и въвежда новата парола
5. Токенът се анулира след употреба

**Ключови файлове**: `/app/api/auth/change-password/`, `/lib/db/schema.ts`

---

## Item Listing & Discovery

### Item Browsing

**Description**: The core feature allowing users to browse and discover items on the platform.

**How it works**:

- Items are loaded from Git-based CMS (`.content` folder)
- Supports pagination with configurable page sizes
- Two view modes: "classic" grid and "alternative" layout
- Real-time filtering without page reload

**Display options**:

- Grid layout with thumbnails
- List layout with descriptions
- Sorting by popularity, date, or name

**Key files**: `/app/[locale]/(listing)/listing.tsx`, `/components/globals-client.tsx`

---

### Търсене и филтриране

**Описание**: Позволява на потребителите да намерят конкретни елементи, като използват различни критерии.

**Типове филтри**:

- **Текстово търсене**: Пълнотекстово търсене в имена и описания на елементи
- **Филтър по категории**: Филтрирайте по една или няколко категории
- **Филтър за етикети**: Филтрирайте по тагове, присвоени на елементи
- **Комбинирани филтри**: Приложете няколко филтъра едновременно

**Как работи**:

1. Филтрите се съхраняват в URL параметри за споделяне
2. `FilterProvider` контекстът управлява състоянието на филтъра
3. `FilterURLParser` синхронизира URL адреса със състоянието на филтъра
4. Елементите се филтрират от страна на сървъра и се връщат на клиента

**Потребителско изживяване**:

- Филтрите продължават да съществуват в URL (с възможност за отбелязване/споделяне)
- Актуализация на резултатите в реално време
- Изчистване на всички филтри опция

**Ключови файлове**: `/components/filter-provider.tsx`, `/components/filter-url-parser.tsx`

---

### Category Navigation

**Description**: Hierarchical organization of items into categories.

**Features**:

- Nested category structure (parent/child)
- Category pages with item listings
- Category icons and descriptions
- Breadcrumb navigation

**How it works**:

- Categories stored in `.content/categories/` as markdown files
- Support for multi-level hierarchy
- Can be enabled/disabled via admin settings
- Reorderable via admin panel

**Key files**: `/app/[locale]/categories/`, `/lib/services/category-git.service.ts`

---

### Система за етикети

**Описание**: Плоска таксономия за организация на артикули между категории.

**Характеристики**:

- Множество тагове на артикул
- Показване на облак от етикети
- Филтриране на базата на тагове
- Може да се активира/деактивира чрез настройките на администратора

**Как работи**:

- Етикети, съхранявани в `.content/tags/` като файлове за маркиране
- Връзка много към много с елементи
- Етикети с възможност за кликване филтрират списъка с елементи

**Ключови файлове**: `/app/[locale]/tags/`, `/lib/services/tag-git.service.ts`

---

## Item Engagement Features

### Voting System

**Description**: Allows users to upvote or downvote items.

**How it works**:

1. User clicks vote button on item
2. System checks if user is authenticated
3. Checks for existing vote and updates or creates new vote
4. Vote count updates in real-time
5. Stores vote in `votes` table with timestamp

**Rules**:

- One vote per user per item
- Users can change vote direction
- Users can remove their vote
- Vote counts displayed on item cards

**Key files**: `/hooks/use-item-vote.ts`, `/app/api/items/[slug]/votes/`

---

### Рейтингова система

**Описание**: Потребителите могат да оценяват артикулите по скала от 1 до 5 звезди.

**Как работи**:

- Рейтингът е част от системата за коментари
- Всеки коментар може да включва оценка
- Изчислена и показана средна оценка
- Показано разпределение на рейтинга (колко 5-звездни, 4-звездни и т.н.)

**Дисплей**:

- Икони със звезди, показващи средна оценка
- Оценката се брои до звездите
- Разбивка на рейтинга в страницата с подробности за артикула

**Ключови файлове**: `/hooks/use-item-rating.ts`, `/lib/db/schema.ts` (таблица с коментари)

---

### Comments System

**Description**: Users can leave comments and reviews on items.

**Features**:

- Text comments with optional rating
- Edit own comments
- Delete own comments
- Admin moderation capabilities
- Threaded replies (if enabled)

**How it works**:

1. User writes comment on item detail page
2. Optionally selects star rating (1-5)
3. Comment stored in `comments` table linked to user's client profile
4. Comments displayed in chronological or relevance order
5. Admin can delete inappropriate comments

**Moderation**:

- Admin can view all comments in admin panel
- Delete functionality for inappropriate content
- Report system triggers admin notification

**Key files**: `/hooks/use-comments.ts`, `/app/api/items/[slug]/comments/`

---

### Система за любими

**Описание**: Потребителите могат да запазват елементи в списъка си с любими за бърз достъп.

**Как работи**:

1. Потребителят щраква върху иконата на сърце/любим елемент
2. Елементът е добавен към таблицата `favorites`
3. Любими, достъпни от потребителския профил
4. Превключване на действие (щракнете отново, за да премахнете)

**Характеристики**:

- Списък с предпочитани в клиентския портал
- Бързо нелюбимо действие
- Предпочитаните отчитат елементи (по избор)
- Експортиране на списък с любими

**Ключови файлове**: `/hooks/use-favorites.ts`, `/app/api/favorites/`, `/app/[locale]/favorites/`

---

## Featured Items

**Description**: Admin-curated items displayed prominently on the homepage.

**How it works**:

1. Admin selects items to feature from admin panel
2. Sets display order for featured items
3. Featured items appear in dedicated section on homepage
4. Can set expiration date for featured status

**Features**:

- Manual ordering/ranking
- Separate from algorithmic popularity
- Highlighted display on homepage
- Configurable number of featured items

**Key files**: `/hooks/use-admin-featured-items.ts`, `/app/api/admin/featured-items/`

---

## Подаване на артикул

**Описание**: Позволява на потребителите да изпращат нови елементи в платформата.

**Как работи**:

1. Потребителят преминава към страницата за изпращане
2. Попълва подробности за артикула (име, описание, URL, лого)
3. Избира категория и тагове
4. Изпраща за преглед
5. Администраторът получава известие за ново изпращане
6. Администраторът преглежда и одобрява/отхвърля
7. Одобрените елементи се показват на платформата

**Полета на формуляра**:

- Име на артикул (задължително)
- Описание (задължително)
- URL адрес на уебсайт
- Качване на лого/изображение
- Избор на категория
- Избор на етикет
- Допълнителни метаданни

**Състояния на работния процес**:

- Чернова → Очаква преглед → Одобрено/Отхвърлено

**Ключови файлове**: `/app/[locale]/submit/`, `/app/api/admin/items/[id]/review/`

---

## Survey System

**Description**: Create and manage surveys for collecting user feedback.

**Types**:

- **Global surveys**: Available to all users
- **Item-specific surveys**: Attached to specific items

**Question types** (via SurveyJS):

- Multiple choice
- Text input
- Rating scales
- Matrix questions
- File upload

**Features**:

- Survey preview before publishing
- Response analytics
- Export to CSV/Excel
- Anonymous or authenticated responses

**Key files**: `/lib/services/survey.service.ts`, `/app/api/surveys/`

[Learn more about surveys →](/guides/survey-system)

---

## Система за абонамент и плащане

**Описание**: Монетизация чрез достъп, базиран на абонамент, или премиум функции.

**Поддържани доставчици**:

- **Stripe**: Пълно управление на абонаменти, фактуриране, портал за клиенти
- **LemonSqueezy**: Алтернативен процесор за плащане с данъчно съответствие

**Как работи**:

1. Планове, определени в доставчика на плащания (Stripe/LemonSqueezy)
2. Потребителите избират план на страницата с цените
3. Пренасочен към касата на доставчика на плащания
4. Webhook обработва успешно плащане
5. Запис на абонамент, създаден в база данни
6. Потребителят получава достъп до премиум функции

**Ключови файлове**: `/app/api/stripe/`, `/app/api/lemonsqueezy/`

[Научете повече за интегрирането на плащанията →](/payment)

---

## User Profile Management

**Description**: Users can manage their personal information and preferences.

**Basic Profile Information**:

- Name, email, avatar
- Bio and social links
- Notification preferences
- Privacy settings

**Features**:

- Profile editing
- Avatar upload
- Email change with verification
- Account deletion

**Key files**: `/app/[locale]/profile/`, `/app/api/profile/`

---

## Система за уведомяване

**Описание**: Генерирани от системата известия за важни събития.

**Видове известия**:

- Нови коментари за потребителски артикули
- Абонаментни актуализации
- Съобщения на администратора
- Одобрение/отхвърляне на артикул

**Канали за доставка**:

- Известия в приложението
- Известия по имейл (чрез Resend/Novu)
- Насочени известия (по избор)

**Ключови файлове**: `/lib/services/notification.service.ts`, `/app/api/notifications/`

---

## Company Profiles

**Description**: Manage company entities associated with items.

**Features**:

- Company name, logo, description
- Link multiple items to a company
- Company detail pages
- Company directory

**Key files**: `/app/[locale]/companies/`, `/lib/services/company.service.ts`

---

## CRM интеграция (двадесет CRM)

**Описание**: Синхронизирайте данните на платформата с Twenty CRM за управление на взаимоотношенията с клиенти.

**Характеристики**:

- Автоматично създаване на контакти от потребителски регистрации
- Синхронизиране на потребителските дейности и взаимодействия
- Проследявайте абонаменти и плащания
- Персонализирано картографиране на полета
- Синхронизация, базирана на уеб кукичка

**Ключови файлове**: `/lib/services/crm.service.ts`, `/app/api/webhooks/crm/`

---

## Analytics & Reporting

**Description**: Track platform usage and generate reports.

**Analytics providers**:

- **PostHog**: Product analytics, feature flags, session recording
- **Sentry**: Error tracking, performance monitoring
- **Vercel Analytics**: Core Web Vitals

**Tracked events**:

- Page views
- Item interactions (views, votes, favorites)
- User registrations and logins
- Subscription events
- Error occurrences

**Key files**: `/lib/analytics/`, `/lib/error-tracking/`

---

## Интернационализация (i18n)

**Описание**: Многоезична поддръжка за платформата.

**Поддържани езици**: 13+ езика, включително английски, френски, испански, китайски, немски, арабски (RTL) и др.

**Характеристики**:

- Автоматично откриване на локал
- Превключване на локал на базата на URL
- RTL поддръжка за арабски
- Форматиране на дата/число за локал
- Правила за множествено число

**Ключови файлове**: `/messages/`, `/lib/i18n/`, `/middleware.ts`

[Научете повече за интернационализацията →](/internationalization)

---

## Content Management

**Description**: Git-based CMS for managing items, categories, and tags.

**How it works**:

- Content stored in `.content` folder
- Synced from external Git repository
- Markdown files with frontmatter
- Version control via Git
- Collaborative editing

**Content types**:

- Items (`.content/items/`)
- Categories (`.content/categories/`)
- Tags (`.content/tags/`)
- Pages (`.content/pages/`)

**Key files**: `/lib/services/*-git.service.ts`, `/lib/git/`

---

## Администраторско табло

**Описание**: Централен център за администратори за наблюдение и управление на платформата.

**Джанджи на таблото за управление**:

- Общо потребители, елементи, абонаменти
- Емисия за скорошна активност
- Изчакващи изпращания
- Здравословно състояние на системата
- Преглед на анализите

**Основни характеристики**:

- Статистика в реално време
- Бързи действия
- Системни известия
- Показатели за ефективност

**Ключови файлове**: `/app/[locale]/admin/dashboard/`

---

## User & Role Management

**Description**: Admin management of user accounts and permissions.

**User Management**:

- View all users
- Edit user profiles
- Suspend/activate accounts
- Reset passwords
- View user activity

**Role Management**:

- Admin role (full access)
- Client role (standard user)
- Custom roles (extensible)

**Key files**: `/app/[locale]/admin/users/`, `/lib/auth/roles.ts`

---

## Управление на клиенти

**Описание**: Административно управление на клиентски профили.

**Характеристики**:

- Вижте всички клиентски профили
- Редактиране на клиентска информация
- Свържете клиенти с компании
- Преглед на заявките на клиента
- Управление на клиентски абонаменти

**Ключови файлове**: `/app/[locale]/admin/clients/`, `/app/api/admin/clients/`

---

## Content Moderation

**Description**: Admin tools for reviewing and moderating user-generated content.

**Item Review**:

- Approve/reject submitted items
- Edit item details
- Feature/unfeature items
- Delete items

**Comment Moderation**:

- View all comments
- Delete inappropriate comments
- Ban users for violations

**Key files**: `/app/[locale]/admin/moderation/`, `/app/api/admin/items/[id]/review/`

---

## Управление на настройките

**Описание**: Опции за конфигуриране на цялата платформа.

**Категории настройки**:

- **Общи**: Име на сайта, описание, лого
- **Характеристики**: Активирайте/деактивирайте функции (категории, тагове, гласуване и др.)
- **Имейл**: SMTP конфигурация, имейл шаблони
- **Плащане**: Stripe/LemonSqueezy API ключове
- **Анализ**: PostHog, конфигурация Sentry
- **Сигурност**: ReCAPTCHA, ограничаване на скоростта

**Ключови файлове**: `/app/[locale]/admin/settings/`, `/lib/config/`

---

## Data Export

**Description**: Export platform data for analysis or backup.

**Export formats**:

- CSV
- JSON
- Excel

**Exportable data**:

- Users
- Items
- Comments
- Subscriptions
- Survey responses

**Key files**: `/app/api/admin/export/`

---

## Допълнителни функции

### Шаблони за имейли

Персонализируеми имейл шаблони за:

- Добре дошли имейли
- Нулиране на парола
- Проверка на имейл
- Потвърждения за абонамент
- Бюлетин

[Научете повече за имейл шаблоните →](/guides/email-templates)

### Тематична система

Няколко предварително изградени теми:

- EverWorks (по подразбиране)
- Корпоративен
- Материал
- смешно

[Научете повече за тематизирането →](/guides/theming)

### Динамична цветова система

Автоматично генериране на цветова палитра (нюанси 50-950) от базови цветове.

[Научете повече за динамичните цветове →](/guides/dynamic-colors)

### Отзивчиво тестване

Насоки за тестване на различни устройства и най-добри практики.

[Научете повече за тестването →](/development/testing)

---

## Feature Summary

| Category | Features |
|----------|----------|
| **Authentication** | Registration, Login, OAuth, Password Reset |
| **Discovery** | Browsing, Search, Filtering, Categories, Tags |
| **Engagement** | Voting, Rating, Comments, Favorites |
| **Submission** | User submissions, Admin review, Approval workflow |
| **Monetization** | Stripe, LemonSqueezy, Subscriptions |
| **User Management** | Profiles, Notifications, Preferences |
| **Admin Tools** | Dashboard, Moderation, Settings, Export |
| **Integrations** | CRM, Analytics, Email, Surveys |
| **Customization** | Themes, Colors, i18n, Email templates |

---

## Следващи стъпки

- [Tech Stack](./tech-stack) - Разгледайте технологичния стек
- [Общ преглед на архитектурата](./overview) - Разберете архитектурата

## Ресурси

- [Настройка за разработка](/development/local-setup) - Настройте вашата среда
- [Ръководство за внедряване](/deployment/overview) - Внедряване в производствена среда
- [Документация за API](/development/api-documentation) - справка за API
