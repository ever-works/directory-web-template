---
id: features
title: Возможности платформы
sidebar_label: Особенности
sidebar_position: 3
---

# Возможности платформы

В этом документе представлен подробный обзор всех функций, доступных на платформе Ever Works, сгруппированных по функциональным областям.

## Аутентификация пользователей и управление учетными записями

### Регистрация пользователя

**Описание**: позволяет новым пользователям создавать учетные записи на платформе.

**Как это работает**:

- Пользователи могут зарегистрироваться через электронную почту/пароль или через поставщиков OAuth (Google, GitHub, Facebook, Twitter).
- Подтверждение по электронной почте отправляется при регистрации.
- Пароль хешируется с использованием bcrypt перед сохранением.
- При успешной регистрации автоматически создается профиль клиента.

**Последовательность действий**:

1. Пользователь нажимает «Зарегистрироваться» на главной странице.
2. Выбирает способ регистрации (электронная почта или OAuth)
3. Заполняет необходимую информацию (имя, адрес электронной почты, пароль)
4. Получает письмо с подтверждением
5. Нажимает ссылку подтверждения, чтобы активировать учетную запись.
6. Перенаправлено на личный кабинет клиента

**Ключевые файлы**: `/lib/auth/index.ts`, `/app/[locale]/auth/`

[Подробнее о настройке аутентификации →](/authentication/setup-guide)

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

### Управление паролями

**Описание**: позволяет пользователям изменять или сбрасывать свои пароли.

**Особенности**:

- **Изменить пароль**: пользователи, прошедшие проверку подлинности, могут обновить свой пароль в настройках.
- **Забыли пароль**: пользователи получают электронное письмо со ссылкой для сброса.
- **Токен сброса**: ограниченный по времени токен для безопасного сброса пароля.

**Как это работает**:

1. Пользователь запрашивает сброс пароля
2. Система генерирует безопасный токен, хранящийся в таблице `passwordResetTokens`.
3. Электронное письмо отправлено со ссылкой для сброса, содержащей токен.
4. Пользователь нажимает ссылку и вводит новый пароль
5. Токен становится недействительным после использования

**Ключевые файлы**: `/app/api/auth/change-password/`, `/lib/db/schema.ts`

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

### Поиск и фильтрация

**Описание**: позволяет пользователям находить определенные элементы по различным критериям.

**Типы фильтров**:

- **Текстовый поиск**: полнотекстовый поиск по названиям и описаниям элементов.
- **Фильтр по категориям**: фильтрация по одной или нескольким категориям.
- **Фильтр по тегам**: фильтрация по тегам, присвоенным элементам.
- **Комбинированные фильтры**: одновременное применение нескольких фильтров.

**Как это работает**:

1. Фильтры хранятся в параметрах URL для возможности совместного использования.
2. `FilterProvider` контекст управляет состоянием фильтра
3. `FilterURLParser` синхронизирует URL с состоянием фильтра
4. Элементы фильтруются на стороне сервера и возвращаются клиенту.

**Пользовательский опыт**:

- Фильтры сохраняются в URL-адресе (с возможностью добавления в закладки или совместного использования)
- Обновление результатов в режиме реального времени
- Опция «Очистить все фильтры»

**Ключевые файлы**: `/components/filter-provider.tsx`, `/components/filter-url-parser.tsx`

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

### Система тегов

**Описание**: плоская таксономия для организации элементов по нескольким категориям.

**Особенности**:

- Несколько тегов для каждого элемента
- Отображение облака тегов
- Фильтрация на основе тегов
- Можно включить/отключить через настройки администратора.

**Как это работает**:

- Теги хранятся в `.content/tags/` в виде файлов уценки.
- Отношения «многие ко многим» с элементами
- Список элементов фильтра кликабельных тегов

**Ключевые файлы**: `/app/[locale]/tags/`, `/lib/services/tag-git.service.ts`

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

### Рейтинговая система

**Описание**. Пользователи могут оценивать товары по шкале от 1 до 5 звезд.

**Как это работает**:

- Рейтинг является частью системы комментариев.
- Каждый комментарий может включать оценку
- Средний рейтинг рассчитывается и отображается
- Показано распределение рейтингов (сколько 5-звездочных, 4-звездочных и т. д.)

**Дисплей**:

- Значки звездочек, показывающие средний рейтинг
- Рейтинг указан рядом со звездами
- Разбивка рейтинга на странице сведений об элементе

**Ключевые файлы**: `/hooks/use-item-rating.ts`, `/lib/db/schema.ts` (таблица комментариев)

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

### Система избранного

**Описание**: пользователи могут сохранять элементы в список избранного для быстрого доступа.

**Как это работает**:

1. Пользователь нажимает значок сердечка/любимого на элементе
2. Элемент добавлен в таблицу `favorites`
3. Избранное, доступное из профиля пользователя
4. Переключить действие (нажмите еще раз, чтобы удалить)

**Особенности**:

- Список избранного на клиентском портале
- Быстрое удаление любимого действия
- Избранное рассчитывается на элементы (необязательно)
- Экспортировать список избранного

**Ключевые файлы**: `/hooks/use-favorites.ts`, `/app/api/favorites/`, `/app/[locale]/favorites/`

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

## Отправка товара

**Описание**: позволяет пользователям отправлять на платформу новые элементы.

**Как это работает**:

1. Пользователь переходит на страницу отправки
2. Заполняет сведения об элементе (название, описание, URL-адрес, логотип)
3. Выбирает категорию и теги
4. Отправляет на рассмотрение
5. Администратор получает уведомление о новой отправке
6. Администратор проверяет и одобряет/отклоняет
7. Одобренные товары появляются на платформе

**Поля формы**:

- Название товара (обязательно)
- Описание (обязательно)
- URL-адрес веб-сайта
- Загрузка логотипа/изображения
- Выбор категории
- Выбор тега
- Дополнительные метаданные

**Состояния рабочего процесса**:

- Черновик → Ожидает рассмотрения → Утверждено/Отклонено

**Ключевые файлы**: `/app/[locale]/submit/`, `/app/api/admin/items/[id]/review/`

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

## Подписка и платежная система

**Описание**: Монетизация через доступ на основе подписки или премиум-функции.

**Поддерживаемые поставщики**:

- **Stripe**: полное управление подписками, выставление счетов, клиентский портал.
- **LemonSqueezy**: альтернативный платежный процессор, соответствующий требованиям налогового законодательства.

**Как это работает**:

1. Планы, определенные в платежной системе (Stripe/LemonSqueezy)
2. Пользователи выбирают план на странице цен.
3. Перенаправлено на кассу платежного провайдера
4. Webhook обрабатывает успешный платеж
5. Запись о подписке создана в базе данных
6. Пользователь получает доступ к премиум-функциям

**Ключевые файлы**: `/app/api/stripe/`, `/app/api/lemonsqueezy/`

[Подробнее об интеграции платежей →](/pay)

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

## Система уведомлений

**Описание**: генерируемые системой уведомления о важных событиях.

**Типы уведомлений**:

- Новые комментарии к записям пользователя
- Обновления подписки
- Объявления администратора
- Утверждение/отклонение объекта

**Каналы доставки**:

- Уведомления в приложении
- Уведомления по электронной почте (через Resend/Novu)
- Push-уведомления (необязательно)

**Ключевые файлы**: `/lib/services/notification.service.ts`, `/app/api/notifications/`

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

## Интеграция CRM (Twenty CRM)

**Описание**: Синхронизируйте данные платформы с Twenty CRM для управления взаимоотношениями с клиентами.

**Особенности**:

- Автоматическое создание контактов на основе регистраций пользователей
- Синхронизируйте действия и взаимодействия пользователей
- Отслеживайте подписки и платежи
- Пользовательское сопоставление полей
- Синхронизация на основе вебхука

**Ключевые файлы**: `/lib/services/crm.service.ts`, `/app/api/webhooks/crm/`

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

**Описание**: Многоязычная поддержка платформы.

**Поддерживаемые языки**: более 13 языков, включая английский, французский, испанский, китайский, немецкий, арабский (RTL) и другие.

**Особенности**:

- Автоматическое определение локали
- Переключение локали на основе URL-адреса
- Поддержка RTL для арабского языка
- Форматирование даты/числа для каждой локали
- Правила множественного числа

**Ключевые файлы**: `/messages/`, `/lib/i18n/`, `/middleware.ts`

[Подробнее об интернационализации →](/интернационализация)

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

## Панель администратора

**Описание**: Центральный хаб для администраторов для мониторинга и управления платформой.

**Виджеты информационной панели**:

- Всего пользователей, элементов, подписок
- Лента последних действий
- Ожидающие отправки
- Состояние работоспособности системы
- Обзор аналитики

**Основные особенности**:

- Статистика в реальном времени
- Быстрые действия
- Системные уведомления
- Показатели производительности

**Ключевые файлы**: `/app/[locale]/admin/dashboard/`

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

## Управление клиентами

**Описание**: Административное управление профилями клиентов.

**Особенности**:

- Посмотреть все профили клиентов
- Редактировать информацию о клиенте
- Свяжите клиентов с компаниями
- Просмотр материалов клиентов
- Управление подписками клиентов

**Ключевые файлы**: `/app/[locale]/admin/clients/`, `/app/api/admin/clients/`

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

## Управление настройками

**Описание**: параметры конфигурации всей платформы.

**Категории настроек**:

- **Общие**: название сайта, описание, логотип.
- **Функции**: Включение/отключение функций (категории, теги, голосование и т. д.).
- **Электронная почта**: конфигурация SMTP, шаблоны электронной почты.
- **Оплата**: ключи API Stripe/LemonSqueezy.
- **Аналитика**: конфигурация PostHog, Sentry.
- **Безопасность**: ReCAPTCHA, ограничение скорости.

**Ключевые файлы**: `/app/[locale]/admin/settings/`, `/lib/config/`

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

## Дополнительные возможности

### Шаблоны электронной почты

Настраиваемые шаблоны электронной почты для:

- Приветственные письма
- Сброс пароля
- Проверка электронной почты
- Подтверждения подписки
- Информационный бюллетень

[Подробнее о шаблонах электронных писем →](/guides/email-templates)

### Система тем

Несколько готовых тем:

- EverWorks (по умолчанию)
- Корпоративный
- Материал
- Смешно

[Подробнее о темах →](/guides/theming)

### Динамическая система цвета

Автоматическое создание цветовой палитры (оттенки 50-950) из базовых цветов.

[Подробнее о динамических цветах →](/guides/dynamic-colors)

### Адаптивное тестирование

Рекомендации и лучшие практики кросс-девайсного тестирования.

[Подробнее о тестировании →](/development/testing)

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

## Следующие шаги

- [Tech Stack](./tech-stack) — Изучите стек технологий.
- [Обзор архитектуры](./overview) — понимание архитектуры.

## Ресурсы

- [Настройка разработки](/development/local-setup) — настройка среды.
- [Руководство по развертыванию](/deployment/overview) – развертывание в рабочей среде
- [Документация API](/development/api-documentation) — справочник по API
