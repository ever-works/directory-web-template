---
id: contributing
title: Руководство по Участию
sidebar_label: Участие
---

# Руководство по Участию

Спасибо за интерес к участию в Directory Web Template. Это руководство охватывает всё необходимое для внесения значимого вклада.

## Репозиторий

Исходный код Template размещён по адресу [github.com/ever-works/directory-web-template](https://github.com/ever-works/directory-web-template).

Для участия в разработке Платформы Ever Works смотрите [репозиторий Платформы](https://github.com/ever-works/ever-works) и руководство по участию на [docs.ever.works](https://docs.ever.works).

## Предварительные требования

Перед началом убедитесь, что установлено следующее:

- **Node.js** >= 20.19.0 (рекомендуется LTS)
- **pnpm** >= 10.x (строго обязательно; не используйте npm или yarn)
- **Git** >= 2.30
- **PostgreSQL** (для базы данных; Supabase предоставляет hosted-вариант)

### Установка pnpm

```bash
# Через corepack (рекомендуется, поставляется с Node.js 20+)
corepack enable
corepack prepare pnpm@latest --activate

# Или через npm (одноразовый bootstrap)
npm install -g pnpm
```

**Важно:** Репозиторий использует поля `packageManager` и файлы блокировки, специфичные для pnpm. Запуск `npm install` или `yarn install` завершится ошибкой или сформирует неверные деревья зависимостей.

## Настройка среды разработки

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install

# Скопируйте файл окружения и настройте его
cp .env.example .env.local
# Отредактируйте .env.local своими значениями (см. README для деталей)

pnpm dev        # Dev-сервер Next.js на порту 3000
```

## Стандарты кода

### TypeScript

Template использует TypeScript повсюду. Не добавляйте обычные файлы `.js`. Следуйте строгим практикам TypeScript:

- Включите и соблюдайте настройки режима `strict` в `tsconfig.json`
- Предпочитайте явные типы возврата у экспортируемых функций
- Используйте `unknown` вместо `any` там, где это возможно
- Валидируйте входные данные с помощью схем **Zod**

### Форматирование (Prettier)

Форматирование обеспечивается через Prettier. Конфигурация находится в корневом `package.json`:

```json
{
	"printWidth": 120,
	"singleQuote": true,
	"semi": true,
	"useTabs": true,
	"tabWidth": 4,
	"arrowParens": "always",
	"trailingComma": "none",
	"quoteProps": "as-needed"
}
```

Запускайте форматировщик перед коммитом:

```bash
pnpm format          # Форматировать все файлы
pnpm format:check    # Проверить без модификации (CI-дружественный)
```

### Линтинг (ESLint)

Template использует плоскую конфигурацию ESLint (`eslint.config.mjs`) с плагинами React, React Hooks и TypeScript:

```bash
pnpm lint
```

### Соглашения об именовании

| Элемент                     | Соглашение       | Пример                                |
| --------------------------- | ---------------- | ------------------------------------- |
| Файлы                       | kebab-case       | `auth.service.ts`, `user-profile.tsx` |
| Классы, интерфейсы, типы    | PascalCase       | `DirectoryService`, `UserProfile`     |
| Функции, переменные         | camelCase        | `getDirectoryById`, `itemCount`       |
| Константы                   | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_LOCALE`   |

## Соглашения о коммитах

Репозиторий применяет [Conventional Commits](https://www.conventionalcommits.org/) через **commitlint** и pre-commit хуки **husky**.

| Префикс     | Использование                                        |
| ----------- | ---------------------------------------------------- |
| `feat:`     | Новые функции                                        |
| `fix:`      | Исправления ошибок                                   |
| `docs:`     | Изменения документации                               |
| `refactor:` | Реструктуризация кода без изменения поведения        |
| `test:`     | Добавление или обновление тестов                     |
| `chore:`    | Задачи обслуживания, обновления зависимостей         |
| `style:`    | Изменения форматирования (без изменения логики)      |
| `perf:`     | Улучшения производительности                         |
| `ci:`       | Изменения конфигурации CI/CD                         |

Пример:

```bash
git commit -m "feat: add search filtering by category in directory listing"
git commit -m "fix: resolve authentication redirect loop on expired sessions"
```

## Именование веток

Используйте описательные имена веток с префиксом:

```
feat/add-category-filter
fix/auth-redirect-loop
docs/update-deployment-guide
refactor/simplify-auth-middleware
```

## Процесс Pull Request

1. **Сделайте форк** репозитория (или создайте ветку, если есть доступ на запись).
2. **Создайте feature-ветку** от `main`.
3. **Вносите изменения** согласно вышеуказанным стандартам кода.
4. **Запустите проверки качества** перед push (см. ниже).
5. **Запушьте** ветку и откройте Pull Request в `main`.
6. **Заполните шаблон PR** с описанием, связанными issues и заметками о тестировании.
7. **Ожидайте ревью.** Мейнтейнер проверит ваш PR и может запросить изменения.
8. После одобрения мейнтейнер смерджит ваш PR.

### Проверки качества перед отправкой PR

```bash
pnpm lint           # ESLint
pnpm tsc --noEmit   # Проверка TypeScript
pnpm build          # Полная производственная сборка
```

### Тестирование

Template использует **Playwright** для end-to-end тестирования:

```bash
pnpm test:e2e
```

Если ваши изменения затрагивают существующую функциональность, убедитесь, что все связанные тесты проходят. Если добавляете новую функциональность — включите тесты для неё.

## Лицензия

Directory Web Template лицензирован под **GNU Affero General Public License v3.0 (AGPL-3.0)**. Отправляя вклад, вы соглашаетесь, что ваша работа будет лицензирована под той же лицензией.

## Кодекс поведения

Все участники обязаны соблюдать Кодекс поведения проекта. Будьте уважительны, конструктивны и готовы к сотрудничеству.

## Получение помощи

Если у вас есть вопросы об участии:

- Откройте [GitHub Discussion](https://github.com/ever-works/directory-web-template/discussions)
- Присоединяйтесь к [сообществу Discord](https://discord.gg/ever) для помощи в реальном времени
- Напишите на [ever@ever.co](mailto:ever@ever.co) для приватных запросов
