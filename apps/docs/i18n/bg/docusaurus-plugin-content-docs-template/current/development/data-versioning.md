---
id: data-versioning
title: Система за Версиониране на Данни
sidebar_label: Версиониране
sidebar_position: 6
---

# Система за Показване на Версията на Данните

Ever Works включва система за версиониране на данни, която показва на потребителите текущата версия на данните, които разглеждат, осигурявайки прозрачност относно актуалността на съдържанието.

## Преглед

Системата предоставя:
- 📊 **Показване на версията в реално време** - Показва текущата версия на хранилището с данни
- 🔄 **Автоматично обновяване** - Периодично актуализира информацията за версията
- 🎨 **Множество варианти** - Изгледи badge, inline и подробен
- 💡 **Подробности в подсказка** - Задръжте курсора за изчерпателна информация
- ⚡ **Поддръжка на ISR** - Работи с Инкрементална Статична Регенерация
- 🛡️ **Обработка на грешки** - Изящен fallback при недостъпност

## Архитектура

```mermaid
graph TB
    Component[VersionDisplay] --> Hook[useVersionInfo]
    Hook --> API[/api/version]
    API --> Git[Git Repository]
    Git --> Sync[Auto Sync]
    Sync --> Cache[Cache Layer]
    Cache --> Response[Version Info]
```

## Компоненти

### VersionDisplay

Основен компонент за показване на информация за версията.

```tsx
import { VersionDisplay } from "@/components/version";

// Основно inline показване
<VersionDisplay variant="inline" />

// Вариант badge
<VersionDisplay variant="badge" />

// Подробен изглед с допълнителна информация
<VersionDisplay variant="detailed" showDetails={true} />
```

**Свойства**:
- `variant`: `"inline" | "badge" | "detailed"` - Стил на показване
- `showDetails`: `boolean` - Показване на разширена информация (само подробен вариант)
- `className`: `string` - Допълнителни CSS класове
- `refreshInterval`: `number` - Интервал за автоматично обновяване в мс (по подразбиране: 5 минути)

### VersionTooltip

Обвиващ компонент, добавящ подсказка с подробна информация за версията.

```tsx
import { VersionTooltip } from "@/components/version";

<VersionTooltip>
  <VersionDisplay variant="badge" />
</VersionTooltip>
```

**Функции**:
- Показва хеша и датата на commit
- Показва съобщението на commit
- Показва информация за автора
- Връзки към хранилището

### Хук useVersionInfo

Персонализиран хук за управление на информацията за версията с кеширане и автоматично обновяване.

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

const { versionInfo, loading, error, refetch } = useVersionInfo({
  refreshInterval: 5 * 60 * 1000, // 5 минути
  retryOnError: true,
  retryDelay: 10000
});
```

**Връща**:
- `versionInfo`: Обект с данни за версията
- `loading`: Състояние на зареждане
- `error`: Състояние на грешка
- `refetch`: Функция за ръчно обновяване

## API Крайна Точка

### GET /api/version

Връща текущата информация за версията на хранилището с данни.

**Отговор**:
```json
{
  "commit": "abc1234",
  "date": "2024-01-01T12:00:00.000Z",
  "message": "Update data items",
  "author": "Developer Name",
  "repository": "https://github.com/owner/repo",
  "lastSync": "2024-01-01T12:05:00.000Z"
}
```

**Функции**:
- Автоматична синхронизация на хранилището преди извличане
- Подходящи заглавки на кеша за оптимална производителност
- Поддръжка на ETag за ефективно кеширане
- Обработка на грешки с подходящи HTTP статус кодове

**Заглавки на Кеша**:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: "abc1234"
```

## Конфигурация

### Променливи на Средата

```env
# URL на хранилището с данни
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# GitHub токен за частни хранилища (незадължително)
GH_TOKEN=ghp_your_github_token_here

# Интервал за синхронизация на хранилището (незадължително, по подразбиране: 5 минути)
REPO_SYNC_INTERVAL=300000
```

### Стратегия за Кеширане

#### Кеш от Страна на Клиента
- **Продължителност**: 1 минута
- **Стратегия**: stale-while-revalidate
- **Обновяване**: Автоматични фонови актуализации

#### Кеш от Страна на Сървъра
- **Продължителност**: 60 секунди
- **Стратегия**: s-maxage с ревалидация
- **ETag**: Базиран на хеша на commit

## Примери за Употреба

### Badge за Версия в Долния Колонтитул

```tsx
// components/footer/Footer.tsx
import { VersionDisplay } from "@/components/version";

export function Footer() {
  return (
    <footer>
      <div className="container">
        <p>© 2024 Ever Works</p>
        <VersionDisplay variant="badge" />
      </div>
    </footer>
  );
}
```

### Административно Табло

```tsx
// app/admin/dashboard/page.tsx
import { VersionDisplay } from "@/components/version";

export default function AdminDashboard() {
  return (
    <div>
      <h1>Административно табло</h1>
      <VersionDisplay 
        variant="detailed" 
        showDetails={true}
        refreshInterval={60000} // 1 минута
      />
    </div>
  );
}
```

### Персонализирана Реализация

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

export function CustomVersionDisplay() {
  const { versionInfo, loading, error, refetch } = useVersionInfo();

  if (loading) return <div>Зареждане на версията...</div>;
  if (error) return <div>Версията е недостъпна</div>;

  return (
    <div>
      <p>Версия на данните: {versionInfo.commit.substring(0, 7)}</p>
      <p>Актуализирано: {new Date(versionInfo.date).toLocaleDateString()}</p>
      <button onClick={refetch}>Обнови</button>
    </div>
  );
}
```

## Варианти на Показване

### Вариант Inline

Компактно текстово показване, подходящо за долни колонтитули или странични ленти.

```tsx
<VersionDisplay variant="inline" />
// Изход: "Data v.abc1234 • Актуализирано преди 2 часа"
```

### Вариант Badge

Badge с форма на хапче с икона, перфектен за заглавия или навигация.

```tsx
<VersionDisplay variant="badge" />
// Изход: [🔄 v.abc1234]
```

### Подробен Вариант

Изчерпателен изглед с цялата информация за версията.

```tsx
<VersionDisplay variant="detailed" showDetails={true} />
// Изход: Карта с commit, дата, съобщение, автор, връзка към хранилището
```

## Най-добри Практики

### 1. Позициониране
- **Долен колонтитул**: Използвайте вариант inline или badge
- **Административни панели**: Използвайте подробен вариант
- **Заглавия**: Използвайте вариант badge
- **Подсказки**: Обвийте всеки вариант с VersionTooltip

### 2. Интервали на Обновяване
- **Публични страници**: 5-10 минути
- **Административни страници**: 1-2 минути
- **Табла в реално време**: 30 секунди

### 3. Обработка на Грешки
- Винаги предоставяйте fallback интерфейс
- Регистрирайте грешките за наблюдение
- Показвайте приятни за потребителя съобщения

### 4. Производителност
- Използвайте подходящи продължителности на кеша
- Реализирайте stale-while-revalidate
- Избягвайте прекомерни API извиквания

## Отстраняване на Проблеми

### Версията Не Се Актуализира

**Проблем**: Информацията за версията не се обновява

**Решение**: Проверете интервала на обновяване и настройките на кеша

```tsx
// Принудително незабавно обновяване
const { refetch } = useVersionInfo();
refetch();
```

### Грешки в API

**Проблем**: `/api/version` връща грешки

**Решение**: Проверете променливите на средата и достъпа до хранилището

```bash
# Check environment variables
echo $DATA_REPOSITORY
echo $GH_TOKEN

# Test repository access
git ls-remote $DATA_REPOSITORY
```

### Бавно Зареждане

**Проблем**: Компонентът за версия се зарежда бавно

**Решение**: Оптимизирайте кеша и намалете честотата на обновяване
