---
id: collections-api-endpoints
title: Конечные точки API коллекций
sidebar_label: API коллекций
sidebar_position: 57
---

# Конечные точки API коллекций

Публичный API коллекций позволяет проверять наличие активных коллекций в базе данных.

**Источник:** `template/app/api/collections/exists/route.ts`

---

## Проверка наличия коллекций

| Свойство | Значение |
|----------|----------|
| **Метод** | `GET` |
| **Путь** | `/api/collections/exists` |
| **Аутентификация** | Нет (публичный) |

### Параметры запроса

Отсутствуют.

### Ответ

**200 — наличие проверено:**

```json
{ "exists": true, "count": 5 }
```

| Поле | Тип | Описание |
|-------|------|-------------|
| `exists` | boolean | Есть ли активные коллекции |
| `count` | number | Количество активных коллекций |

### Ошибочный ответ

**500 — внутренняя ошибка:**

```json
{ "exists": false, "count": 0, "error": "Failed to check collections existence" }
```

| Поле | Описание |
|-------|-------------|
| `exists` | Всегда `false` при ошибке |
| `count` | Всегда `0` при ошибке |
| `error` | Общее сообщение; подробности логируются на сервере |

### Пример на TypeScript

```typescript
interface CollectionsExistResponse {
  exists: boolean;
  count: number;
  error?: string;
}

async function checkCollectionsExist(): Promise<CollectionsExistResponse> {
  const res = await fetch('/api/collections/exists');
  return res.json();
}

const { exists, count } = await checkCollectionsExist();
if (exists) {
  console.log(`Найдено ${count} активных коллекций`);
}
```

### Примечания

- Учитываются только **активные** коллекции (`includeInactive: false`).
- В отличие от API категорий, ошибка возвращает статус `500`.
- Подробности ошибок логируются только на сервере.
- Требуется рабочее соединение с БД.
