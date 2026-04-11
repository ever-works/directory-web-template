---
id: exercises
title: Практические Упражнения
sidebar_label: Упражнения
sidebar_position: 5
---

# Практические Упражнения

Применяйте полученные знания на практике с реальными задачами и вызовами.

## 🎯 Цели

- ✅ Практиковаться в создании API-эндпоинтов
- ✅ Применять стандарты документации Swagger
- ✅ Реализовывать валидацию и обработку ошибок
- ✅ Создавать полноценный функционал с нуля
- ✅ Обрести уверенность в рабочем процессе разработки

**Ориентировочное время**: 3–5 дней

---

## Упражнение 1: Простой GET-маршрут

**Сложность**: ⭐ Начальный  
**Продолжительность**: 15–30 минут  
**Цель**: Изучить базовую структуру аннотаций и рабочий процесс

### Задание

Создайте простой GET-эндпоинт, возвращающий информацию о сервере.

### Шаги

1. **Создать файл**: `app/api/training/server-info/route.ts`

2. **Реализовать маршрут**:

```typescript
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/training/server-info:
 *   get:
 *     tags: ["System"]
 *     summary: "Get server information"
 *     description: "Returns basic server information including version, current timestamp, and uptime."
 *     responses:
 *       200:
 *         description: "Server information retrieved successfully"
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      server: "Ever Works API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
}
```

3. **Тестировать рабочий процесс**:

```bash
yarn generate-docs
open http://localhost:3000/api/reference
curl http://localhost:3000/api/training/server-info
```

### Критерии успеха

- [ ] Эндпоинт появляется в Scalar UI под тегом "System"
- [ ] Все поля ответа задокументированы с примерами
- [ ] Эндпоинт работает при тестировании в Scalar UI
- [ ] Нет ошибок генерации

---

## Упражнение 2: POST-маршрут с валидацией

**Сложность**: ⭐⭐ Средний  
**Продолжительность**: 30–45 минут  
**Цель**: Изучить документацию тела запроса и обработку ошибок

### Задание

Создайте POST-эндпоинт для отзывов пользователей с валидацией.

### Шаги

1. **Создать файл**: `app/api/training/feedback/route.ts`

2. **Реализовать с валидацией**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const feedbackSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  category: z.enum(['bug', 'feature', 'general']),
  message: z.string().min(10).max(1000),
  rating: z.number().min(1).max(5).optional()
});
```

3. **Тестировать с корректными и некорректными данными**:

```bash
curl -X POST http://localhost:3000/api/training/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Иван Иванов",
    "email": "ivan@example.ru",
    "category": "feature",
    "message": "Отличная платформа!",
    "rating": 5
  }'
```

---

## Упражнение 3: Полная реализация функционала

**Сложность**: ⭐⭐⭐ Продвинутый  
**Продолжительность**: 1–2 дня  
**Цель**: Создать полный функционал с CRUD-операциями и документацией

### Задание

Реализуйте простой API управления заметками с полным CRUD-функционалом.

### Требования

- `GET /api/training/notes` – Список всех заметок
- `POST /api/training/notes` – Создать новую заметку
- `GET /api/training/notes/[id]` – Получить одну заметку
- `PUT /api/training/notes/[id]` – Обновить заметку
- `DELETE /api/training/notes/[id]` – Удалить заметку
