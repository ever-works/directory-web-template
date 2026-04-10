---
id: cron-verification
title: Верификация на Cron
sidebar_label: Верификация Cron
sidebar_position: 9
---

# ✅ Vercel Cron Jobs – Контролен списък за верификация

## 🎯 Бързи отговори на вашите въпроси

### Въпрос 1: Работи ли на Vercel без Trigger.dev?
**✅ ДА** – Системата е правилно конфигурирана да използва Vercel Crons, когато:
- `VERCEL=1` (задава се автоматично от Vercel)
- Променливите на средата на Trigger.dev **НЕ** са зададени

### Въпрос 2: Как да проверите дали работи?
**✅ Следвайте 4-те стъпки по-долу**

---

## 📊 Текущо състояние на конфигурацията

### ✅ Какво е коригирано

| Компонент | Статус | Подробности |
|-----------|--------|------------|
| `vercel.json` | ✅ **КОРИГИРАНО** | Сега включва **всичките 3** cron задачи (преди само 1) |
| `initialize-jobs.ts` | ✅ **КОРИГИРАНО** | Сега регистрира **всичките 3** задачи (преди само 2) |
| API endpoints | ✅ **ОК** | Всичките 3 endpoint-а съществуват и работят |
| Документация | ✅ **СЪЗДАДЕНА** | Ново ръководство `CRON_JOBS.md` |

### 📋 Пълен списък на Cron Jobs

| # | Наименование | Endpoint | График | Предназначение |
|---|-------------|----------|--------|---------------|
| 1 | Синхронизация на хранилище | `/api/cron/sync` | `*/5 * * * *` | Синхронизира съдържание на всеки 5 минути |
| 2 | Напомняния за подновяване | `/api/cron/subscription-reminders` | `0 9 * * *` | Изпраща имейл напомняния в 9:00 ежедневно |
| 3 | Почистване на изтекли | `/api/cron/subscription-expiration` | `0 0 * * *` | Обработва изтеклите абонаменти в полунощ |

---

## 🔍 Процес на верификация в 4 стъпки

### Стъпка 1: Проверете таблото на Vercel – Cron Jobs

**Шаблон на URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

**За awesome-time-tracking-website:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**Какво да търсите:**
- [ ] Показва **3 cron задачи** (не само 1)
- [ ] Всяка има правилния график
- [ ] Всички показват статус „Активно"

**Очакван резултат:**

| Път | График | Статус |
|-----|--------|--------|
| `/api/cron/sync` | На всеки 5 минути | ✅ Активно |
| `/api/cron/subscription-reminders` | 0 9 * * * | ✅ Активно |
| `/api/cron/subscription-expiration` | 0 0 * * * | ✅ Активно |

---

### Стъпка 2: Проверете логовете на Vercel

**Шаблон на URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths={PATH}
```

**Проверете всеки endpoint:**

#### A. Логове за синхронизация
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```
- [ ] Логовете се появяват на всеки 5 минути
- [ ] Статус кодовете са 200 (успех)
- [ ] Без грешки 401 (удостоверяване)
- [ ] Без грешки 500 (отказ)

#### B. Логове за напомняния
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-reminders
```
- [ ] Логовете се появяват веднъж дневно в 9:00
- [ ] Статус кодовете са 200 или 207 (успех/частичен успех)

#### C. Логове за изтичане
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-expiration
```
- [ ] Логовете се появяват веднъж дневно в полунощ
- [ ] Статус кодовете са 200 (успех)

---

### Стъпка 3: Проверете логовете на приложението

#### При стартиране на приложението
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

**✅ Това потвърждава:** Системата е открила средата на Vercel

#### При всяка синхронизация (на всеки 5 мин.)
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

#### При напомняния за подновяване (ежедневно в 9:00)
```
[Cron] Subscription reminders job completed
```

#### При почистване на изтекли абонаменти (ежедневно в полунощ)
```
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: N subscriptions expired
```

---

### Стъпка 4: Проверете променливите на средата

**Задължително:**
```bash
CRON_SECRET=<зададено-в-vercel>
```

**НЕ зададени (за да се използва Vercel, а не Trigger.dev):**
```bash
TRIGGER_SECRET_KEY=<трябва-да-е-празно>
TRIGGER_API_KEY=<трябва-да-е-празно>
TRIGGER_API_URL=<трябва-да-е-празно>
```

**Проверете чрез Vercel CLI:**
```bash
vercel env ls
```

---

## 🚨 Чести проблеми и решения

### Проблем 1: Вижда се само 1 cron задача в Vercel

**Причина:** Стар `vercel.json` е бил разпределен  
**Решение:**
1. ✅ `vercel.json` е вече коригиран (3 cron задачи)
2. Преразпределете в Vercel: `git push` или `vercel --prod`
3. Изчакайте 1-2 минути за регистриране на новите cron задачи

---

### Проблем 2: Грешки 401 Unauthorized

**Причина:** `CRON_SECRET` не е зададен или не съвпада  
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

### Проблем 3: Задачите изобщо не се изпълняват

**Причина:** Използва се режим Trigger.dev вместо режим Vercel

**Проверка:**
```bash
# Should NOT be set
vercel env ls | grep TRIGGER
```
