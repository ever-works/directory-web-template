---
id: data-versioning
title: Система Версионирования Данных
sidebar_label: Версионирование
sidebar_position: 6
---

# Система Отображения Версии Данных

Ever Works включает систему версионирования данных, которая показывает пользователям текущую версию просматриваемых данных, обеспечивая прозрачность относительно актуальности контента.

## Обзор

Система предоставляет:
- 📊 **Отображение версии в реальном времени** - Показывает текущую версию репозитория данных
- 🔄 **Автообновление** - Периодически обновляет информацию о версии
- 🎨 **Несколько вариантов** - Отображения badge, inline и подробное
- 💡 **Детали в подсказке** - Наведите курсор для полной информации
- ⚡ **Поддержка ISR** - Работает с инкрементальной статической регенерацией
- 🛡️ **Обработка ошибок** - Плавный fallback при недоступности

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

## Компоненты

### VersionDisplay

Основной компонент для отображения информации о версии.

```tsx
import { VersionDisplay } from "@/components/version";

// Базовое inline-отображение
<VersionDisplay variant="inline" />

// Вариант badge
<VersionDisplay variant="badge" />

// Подробный вид с дополнительной информацией
<VersionDisplay variant="detailed" showDetails={true} />
```

**Свойства**:
- `variant`: `"inline" | "badge" | "detailed"` - Стиль отображения
- `showDetails`: `boolean` - Показывать расширенную информацию (только подробный вариант)
- `className`: `string` - Дополнительные CSS-классы
- `refreshInterval`: `number` - Интервал автообновления в мс (по умолчанию: 5 минут)

### VersionTooltip

Компонент-обёртка, добавляющий подсказку с подробной информацией о версии.

```tsx
import { VersionTooltip } from "@/components/version";

<VersionTooltip>
  <VersionDisplay variant="badge" />
</VersionTooltip>
```

**Возможности**:
- Показывает хеш и дату коммита
- Отображает сообщение коммита
- Показывает информацию об авторе
- Ссылки на репозиторий

### Хук useVersionInfo

Пользовательский хук для управления информацией о версии с кэшированием и автообновлением.

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

const { versionInfo, loading, error, refetch } = useVersionInfo({
  refreshInterval: 5 * 60 * 1000, // 5 минут
  retryOnError: true,
  retryDelay: 10000
});
```

**Возвращает**:
- `versionInfo`: Объект данных версии
- `loading`: Состояние загрузки
- `error`: Состояние ошибки
- `refetch`: Функция ручного обновления

## Эндпоинт API

### GET /api/version

Возвращает текущую информацию о версии репозитория данных.

**Ответ**:
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

**Возможности**:
- Автоматическая синхронизация репозитория перед получением
- Правильные заголовки кэша для оптимальной производительности
- Поддержка ETag для эффективного кэширования
- Обработка ошибок с соответствующими HTTP-кодами статуса

**Заголовки Кэша**:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: "abc1234"
```

## Конфигурация

### Переменные Окружения

```env
# URL репозитория данных
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Токен GitHub для приватных репозиториев (необязательно)
GH_TOKEN=ghp_your_github_token_here

# Интервал синхронизации репозитория (необязательно, по умолчанию: 5 минут)
REPO_SYNC_INTERVAL=300000
```

### Стратегия Кэширования

#### Клиентский Кэш
- **Продолжительность**: 1 минута
- **Стратегия**: stale-while-revalidate
- **Обновление**: Автоматические фоновые обновления

#### Серверный Кэш
- **Продолжительность**: 60 секунд
- **Стратегия**: s-maxage с ревалидацией
- **ETag**: На основе хеша коммита

## Примеры Использования

### Badge Версии в Подвале

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

### Административная Панель

```tsx
// app/admin/dashboard/page.tsx
import { VersionDisplay } from "@/components/version";

export default function AdminDashboard() {
  return (
    <div>
      <h1>Административная панель</h1>
      <VersionDisplay 
        variant="detailed" 
        showDetails={true}
        refreshInterval={60000} // 1 минута
      />
    </div>
  );
}
```

### Пользовательская Реализация

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

export function CustomVersionDisplay() {
  const { versionInfo, loading, error, refetch } = useVersionInfo();

  if (loading) return <div>Загрузка версии...</div>;
  if (error) return <div>Версия недоступна</div>;

  return (
    <div>
      <p>Версия данных: {versionInfo.commit.substring(0, 7)}</p>
      <p>Обновлено: {new Date(versionInfo.date).toLocaleDateString()}</p>
      <button onClick={refetch}>Обновить</button>
    </div>
  );
}
```

## Варианты Отображения

### Вариант Inline

Компактное текстовое отображение, подходящее для подвалов или боковых панелей.

```tsx
<VersionDisplay variant="inline" />
// Вывод: "Data v.abc1234 • Обновлено 2 часа назад"
```

### Вариант Badge

Пилюлеобразный badge с иконкой, подходящий для заголовков или навигации.

```tsx
<VersionDisplay variant="badge" />
// Вывод: [🔄 v.abc1234]
```

### Подробный Вариант

Исчерпывающий вид со всей информацией о версии.

```tsx
<VersionDisplay variant="detailed" showDetails={true} />
// Вывод: Карточка с коммитом, датой, сообщением, автором, ссылкой на репозиторий
```

## Лучшие Практики

### 1. Расположение
- **Подвал**: Используйте вариант inline или badge
- **Административные панели**: Используйте подробный вариант
- **Заголовки**: Используйте вариант badge
- **Подсказки**: Оберните любой вариант в VersionTooltip

### 2. Интервалы Обновления
- **Публичные страницы**: 5-10 минут
- **Административные страницы**: 1-2 минуты
- **Дашборды реального времени**: 30 секунд

### 3. Обработка Ошибок
- Всегда предоставляйте fallback UI
- Логируйте ошибки для мониторинга
- Показывайте понятные пользователю сообщения

### 4. Производительность
- Используйте подходящие продолжительности кэша
- Реализуйте stale-while-revalidate
- Избегайте избыточных вызовов API

## Устранение Неполадок

### Версия Не Обновляется

**Проблема**: Информация о версии не обновляется

**Решение**: Проверьте интервал обновления и настройки кэша

```tsx
// Принудительное немедленное обновление
const { refetch } = useVersionInfo();
refetch();
```

### Ошибки API

**Проблема**: `/api/version` возвращает ошибки

**Решение**: Проверьте переменные окружения и доступ к репозиторию

```bash
# Check environment variables
echo $DATA_REPOSITORY
echo $GH_TOKEN

# Test repository access
git ls-remote $DATA_REPOSITORY
```

### Медленная Загрузка

**Проблема**: Компонент версии загружается медленно

**Решение**: Оптимизируйте кэш и уменьшите частоту обновлений
