---
id: exercises
title: Практически Упражнения
sidebar_label: Упражнения
sidebar_position: 5
---

# Практически Упражнения

Прилагайте наученото на практика с реални задачи и предизвикателства.

## 🎯 Цели

- ✅ Практикувайте създаването на API крайни точки
- ✅ Прилагайте стандарти за документация на Swagger
- ✅ Реализирайте валидиране и обработка на грешки
- ✅ Изграждайте пълен функционал от нулата
- ✅ Придобийте увереност в работния процес за разработка

**Приблизително време**: 3–5 дни

---

## Упражнение 1: Прост GET маршрут

**Сложност**: ⭐ Начинаещ  
**Продължителност**: 15–30 минути  
**Цел**: Да се научи основната структура на анотациите и работния процес

### Задача

Създайте прост GET крайна точка, която връща информация за сървъра.

### Стъпки

1. **Създайте файл**: `app/api/training/server-info/route.ts`

2. **Реализирайте маршрута**:

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

3. **Тествайте работния процес**:

```bash
yarn generate-docs
open http://localhost:3000/api/reference
curl http://localhost:3000/api/training/server-info
```

### Критерии за успех

- [ ] Крайната точка се появява в Scalar UI под таг "System"
- [ ] Всички полета на отговора са документирани с примери
- [ ] Крайната точка работи при тестване в Scalar UI
- [ ] Няма грешки при генерирането

---

## Упражнение 2: POST маршрут с валидиране

**Сложност**: ⭐⭐ Среден  
**Продължителност**: 30–45 минути  
**Цел**: Да се научи документирането на тялото на заявката и обработката на грешки

### Задача

Създайте POST крайна точка за потребителски отзиви с валидиране.

### Стъпки

1. **Създайте файл**: `app/api/training/feedback/route.ts`

2. **Реализирайте с валидиране**:

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

3. **Тествайте с валидни и невалидни данни**:

```bash
curl -X POST http://localhost:3000/api/training/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Иван Иванов",
    "email": "ivan@example.bg",
    "category": "feature",
    "message": "Страхотна платформа!",
    "rating": 5
  }'
```

---

## Упражнение 3: Пълна реализация на функционал

**Сложност**: ⭐⭐⭐ Напреднал  
**Продължителност**: 1–2 дни  
**Цел**: Да се изгради пълен функционал с CRUD операции и документация

### Задача

Реализирайте прост API за управление на бележки с пълен CRUD функционал.

### Изисквания

- `GET /api/training/notes` – Списък с всички бележки
- `POST /api/training/notes` – Създаване на нова бележка
- `GET /api/training/notes/[id]` – Вземане на единична бележка
- `PUT /api/training/notes/[id]` – Обновяване на бележка
- `DELETE /api/training/notes/[id]` – Изтриване на бележка
