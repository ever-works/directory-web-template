---
id: cron-verification
title: Верификация Cron Vercel
sidebar_label: Верификация Cron
sidebar_position: 9
---

# ✅ Vercel Cron Jobs – Контрольный список верификации

## 🎯 Быстрые ответы на ваши вопросы

### Вопрос 1: Работает ли на Vercel без Trigger.dev?
**✅ ДА** – Система правильно настроена для использования Vercel Crons, когда:
- `VERCEL=1` (автоматически устанавливается Vercel)
- Переменные окружения Trigger.dev **НЕ** заданы

### Вопрос 2: Как проверить, что всё работает?
**✅ Следуйте 4 шагам ниже**

---

## 📊 Текущее состояние конфигурации

### ✅ Что было исправлено

| Компонент | Статус | Подробности |
|-----------|--------|------------|
| `vercel.json` | ✅ **ИСПРАВЛЕНО** | Теперь содержит **все 3** задания (ранее только 1) |
| `initialize-jobs.ts` | ✅ **ИСПРАВЛЕНО** | Теперь регистрирует **все 3** задания (ранее только 2) |
| API-эндпоинты | ✅ **ОК** | Все 3 эндпоинта существуют и работают |
| Документация | ✅ **СОЗДАНА** | Новое руководство `CRON_JOBS.md` |

### 📋 Полный список Cron Jobs

| # | Название задания | Endpoint | Расписание | Назначение |
|---|-----------------|----------|-----------|-----------|
| 1 | Синхронизация репозитория | `/api/cron/sync` | `*/5 * * * *` | Синхронизирует контент каждые 5 минут |
| 2 | Напоминания о продлении | `/api/cron/subscription-reminders` | `0 9 * * *` | Отправляет email-напоминания в 9:00 ежедневно |
| 3 | Очистка истёкших подписок | `/api/cron/subscription-expiration` | `0 0 * * *` | Обрабатывает истёкшие подписки в полночь |

---

## 🔍 Процесс верификации в 4 шага

### Шаг 1: Проверить панель управления Vercel – Cron Jobs

**Шаблон URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

**Для awesome-time-tracking-website:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**На что обратить внимание:**
- [ ] Отображается **3 задания cron** (не только 1)
- [ ] У каждого корректное расписание
- [ ] Все показывают статус «Активно»

**Ожидаемый результат:**

| Путь | Расписание | Статус |
|------|-----------|--------|
| `/api/cron/sync` | Каждые 5 минут | ✅ Активно |
| `/api/cron/subscription-reminders` | 0 9 * * * | ✅ Активно |
| `/api/cron/subscription-expiration` | 0 0 * * * | ✅ Активно |

---

### Шаг 2: Проверить логи Vercel

**Шаблон URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths={PATH}
```

**Проверить каждый эндпоинт:**

#### A. Логи синхронизации
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```
- [ ] Логи появляются каждые 5 минут
- [ ] Коды статуса — 200 (успех)
- [ ] Нет ошибок 401 (аутентификация)
- [ ] Нет ошибок 500 (сбои)

#### B. Логи напоминаний
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-reminders
```
- [ ] Логи появляются один раз в день в 9:00
- [ ] Коды статуса — 200 или 207 (успех/частичный успех)

#### C. Логи истечения подписок
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-expiration
```
- [ ] Логи появляются один раз в день в полночь
- [ ] Коды статуса — 200 (успех)

---

### Шаг 3: Проверить логи приложения

#### При запуске приложения
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

**✅ Это подтверждает:** Система обнаружила среду Vercel

#### При каждой синхронизации (каждые 5 мин.)
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

#### При напоминаниях о продлении (ежедневно в 9:00)
```
[Cron] Subscription reminders job completed
```

#### При очистке истёкших подписок (ежедневно в полночь)
```
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: N subscriptions expired
```

---

### Шаг 4: Проверить переменные окружения

**Обязательная:**
```bash
CRON_SECRET=<задано-в-vercel>
```

**НЕ заданы (чтобы использовать Vercel, а не Trigger.dev):**
```bash
TRIGGER_SECRET_KEY=<должно-быть-пустым>
TRIGGER_API_KEY=<должно-быть-пустым>
TRIGGER_API_URL=<должно-быть-пустым>
```

**Проверить через Vercel CLI:**
```bash
vercel env ls
```

---

## 🚨 Частые проблемы и решения

### Проблема 1: В Vercel видно только 1 задание cron

**Причина:** Задеплоен старый `vercel.json`  
**Решение:**
1. ✅ `vercel.json` теперь исправлен (3 задания)
2. Повторно задеплоить на Vercel: `git push` или `vercel --prod`
3. Подождать 1-2 минуты для регистрации новых cron-заданий

---

### Проблема 2: Ошибки 401 Unauthorized

**Причина:** `CRON_SECRET` не задан или не совпадает  
**Решение:**
```bash
# Generate a new secret
openssl rand -base64 32

# Add to Vercel
vercel env add CRON_SECRET

# Redeploy
vercel --prod
```

---

### Проблема 3: Задания вообще не запускаются

**Причина:** Используется режим Trigger.dev вместо режима Vercel

**Проверка:**
```bash
# Should NOT be set
vercel env ls | grep TRIGGER
```
