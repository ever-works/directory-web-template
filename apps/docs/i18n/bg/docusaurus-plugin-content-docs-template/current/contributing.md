---
id: contributing
title: Ръководство за Принос
sidebar_label: Принос
---

# Ръководство за Принос

Благодарим ви за интереса към принос в Directory Web Template. Това ръководство обхваща всичко необходимо за правенето на значими приноси.

## Хранилище

Изходният код на Template е хостван на [github.com/ever-works/directory-web-template](https://github.com/ever-works/directory-web-template).

За приноси към Платформата Ever Works вижте [хранилището на Платформата](https://github.com/ever-works/ever-works) и ръководството му за принос на [docs.ever.works](https://docs.ever.works).

## Предварителни изисквания

Преди да започнете, уверете се, че имате инсталирано следното:

- **Node.js** >= 20.19.0 (препоръчва се LTS)
- **pnpm** >= 10.x (строго изисквано; не използвайте npm или yarn)
- **Git** >= 2.30
- **PostgreSQL** (за база данни; Supabase предоставя хостнат вариант)

### Инсталиране на pnpm

```bash
# Чрез corepack (препоръчва се, включен с Node.js 20+)
corepack enable
corepack prepare pnpm@latest --activate

# Или чрез npm (еднократен bootstrap)
npm install -g pnpm
```

**Важно:** Хранилището използва полета `packageManager` и lock файлове специфични за pnpm. Изпълнението на `npm install` или `yarn install` ще се провали или ще генерира неправилни дървета на зависимостите.

## Настройка на Разработката

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install

# Копирайте файла за среда и конфигурирайте
cp .env.example .env.local
# Редактирайте .env.local с вашите стойности (вижте README за детайли)

pnpm dev        # Dev сървър Next.js на порт 3000
```

## Стандарти за Код

### TypeScript

Template използва TypeScript навсякъде. Не въвеждайте обикновени `.js` файлове. Следвайте строги TypeScript практики:

- Активирайте и спазвайте настройките на режима `strict` в `tsconfig.json`
- Предпочитайте явни типове за връщане при експортирани функции
- Използвайте `unknown` вместо `any` където е възможно
- Валидирайте входа с **Zod** схеми

### Форматиране (Prettier)

Форматирането се прилага чрез Prettier. Конфигурацията се намира в основния `package.json`:

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

Изпълнете форматера преди commit:

```bash
pnpm format          # Форматирайте всички файлове
pnpm format:check    # Проверете без промяна (CI-приятелски)
```

### Линтинг (ESLint)

Template използва плоската ESLint конфигурация (`eslint.config.mjs`) с React, React Hooks и TypeScript плъгини:

```bash
pnpm lint
```

### Конвенции за Именуване

| Елемент                      | Конвенция        | Пример                                |
| ---------------------------- | ---------------- | ------------------------------------- |
| Файлове                      | kebab-case       | `auth.service.ts`, `user-profile.tsx` |
| Класове, Интерфейси, Типове  | PascalCase       | `DirectoryService`, `UserProfile`     |
| Функции, Променливи          | camelCase        | `getDirectoryById`, `itemCount`       |
| Константи                    | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_LOCALE`   |

## Конвенции за Commit

Хранилището прилага [Conventional Commits](https://www.conventionalcommits.org/) чрез **commitlint** и **husky** pre-commit hooks.

| Префикс     | Употреба                                            |
| ----------- | --------------------------------------------------- |
| `feat:`     | Нови функционалности                                |
| `fix:`      | Поправки на грешки                                  |
| `docs:`     | Промени в документацията                            |
| `refactor:` | Преструктуриране на код без промяна в поведението   |
| `test:`     | Добавяне или актуализиране на тестове               |
| `chore:`    | Задачи по поддръжка, актуализации на зависимости    |
| `style:`    | Промени в форматирането (без промяна на логиката)   |
| `perf:`     | Подобрения на производителността                    |
| `ci:`       | Промени в конфигурацията CI/CD                      |

Пример:

```bash
git commit -m "feat: add search filtering by category in directory listing"
git commit -m "fix: resolve authentication redirect loop on expired sessions"
```

## Именуване на Клонове

Използвайте описателни имена на клонове с префикс:

```
feat/add-category-filter
fix/auth-redirect-loop
docs/update-deployment-guide
refactor/simplify-auth-middleware
```

## Процес на Pull Request

1. **Форкнете** хранилището (или създайте клон, ако имате достъп за запис).
2. **Създайте feature клон** от `main`.
3. **Направете промените си** следвайки горните стандарти за код.
4. **Изпълнете проверки за качество** преди push (вижте по-долу).
5. **Пуснете** клона си и отворете Pull Request към `main`.
6. **Попълнете шаблона на PR** с описание, свързани проблеми и бележки за тестване.
7. **Изчакайте преглед.** Поддържащ ще прегледа вашия PR и може да поиска промени.
8. След одобрение поддържащ ще слее вашия PR.

### Проверки за Качество Преди Изпращане на PR

```bash
pnpm lint           # ESLint
pnpm tsc --noEmit   # Проверка на TypeScript
pnpm build          # Пълна продукционна сборка
```

### Тестване

Template използва **Playwright** за end-to-end тестове:

```bash
pnpm test:e2e
```

Ако промените ви засягат съществуваща функционалност, уверете се, че всички свързани тестове преминават. Ако добавяте нова функционалност, включете тестове за нея.

## Лиценз

Directory Web Template е лицензиран под **GNU Affero General Public License v3.0 (AGPL-3.0)**. Като изпращате принос, вие се съгласявате, че вашата работа ще бъде лицензирана под същия лиценз.

## Кодекс на Поведение

Всички сътрудници трябва да спазват Кодекса за поведение на проекта. Бъдете уважителни, конструктивни и съвместни.

## Получаване на Помощ

Ако имате въпроси относно приноса:

- Отворете [GitHub Discussion](https://github.com/ever-works/directory-web-template/discussions)
- Присъединете се към [Discord общността](https://discord.gg/ever) за помощ в реално време
- Имейл на [ever@ever.co](mailto:ever@ever.co) за лични запитвания
