---
id: cron-jobs
title: Konfiguracja Zadań Cron
sidebar_label: Zadania Cron
sidebar_position: 8
---

# Przewodnik Konfiguracji Zadań Cron

## Przegląd

Ten szablon obsługuje **trzy mechanizmy planowania** dla zadań w tle:

1. **Lokalny** - `LocalJobManager` używający `setInterval` (rozwój)
2. **Vercel Crons** - Wbudowany system cron Vercela (produkcja na Vercel)
3. **Trigger.dev** - Usługa zewnętrzna (opcjonalna, dla dużych katalogów)

### Kolejność Priorytetów (Automatyczne wykrywanie)

System automatycznie wybiera tryb planowania na podstawie środowiska:

```typescript
// From lib/background-jobs/config.ts
export function getSchedulingMode(): SchedulingMode {
  // 1. Check if disabled
  if (DISABLE_AUTO_SYNC === 'true') return 'disabled';
  
  // 2. Trigger.dev (if fully configured in production)
  if (shouldUseTriggerDev()) return 'trigger-dev';
  
  // 3. Vercel (if VERCEL=1)
  if (isVercelEnvironment()) return 'vercel';
  
  // 4. Local (fallback)
  return 'local';
}
```

---

## 📋 Zarejestrowane Zadania w Tle

### 1. Synchronizacja Repozytorium

**ID Zadania:** `repository-sync`  
**Harmonogram:** Co 5 minut (`*/5 * * * *`)  
**Opis:** Synchronizuje zawartość z repozytorium CMS opartego na Git

- **Endpoint Vercel:** `/api/cron/sync`
- **Lokalny Interwał:** `5 * 60 * 1000` ms (5 minut)
- **Funkcja:** `syncManager.performSync()`

### 2. Przypomnienia o Odnowieniu Subskrypcji

**ID Zadania:** `subscription-renewal-reminder`  
**Harmonogram:** Codziennie o 9:00 (`0 9 * * *`)  
**Opis:** Wysyła przypomnienia e-mail do użytkowników, których subskrypcje wygasają za 7 dni

- **Endpoint Vercel:** `/api/cron/subscription-reminders`
- **Lokalny Cron:** `0 9 * * *`
- **Funkcja:** `subscriptionRenewalReminderJob()`

### 3. Czyszczenie Wygasłych Subskrypcji

**ID Zadania:** `subscription-expired-cleanup`  
**Harmonogram:** Codziennie o północy (`0 0 * * *`)  
**Opis:** Przetwarza wygasłe subskrypcje i wysyła powiadomienia o wygaśnięciu

- **Endpoint Vercel:** `/api/cron/subscription-expiration`
- **Lokalny Cron:** `0 0 * * *`
- **Funkcja:** `subscriptionService.processExpiredSubscriptions()`

---

## 🚀 Konfiguracja Wdrożenia na Vercel

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Zmienne Środowiskowe

**Wymagane dla Vercel Crons:**

```bash
CRON_SECRET=your-secure-random-secret-here
```

Vercel automatycznie wysyła to w nagłówku `Authorization: Bearer <CRON_SECRET>` podczas wywoływania endpointów cron.

**Opcjonalne (aby wyłączyć Trigger.dev):**

```bash
# NIE ustawiaj tych zmiennych, jeśli chcesz używać Vercel Crons:
# TRIGGER_SECRET_KEY=
# TRIGGER_API_KEY=
# TRIGGER_API_URL=
```

---

## ✅ Jak Weryfikować Zadania Cron na Vercel

### 1. Sprawdź Dashboard Vercel

**Przejdź do:**
```
https://vercel.com/<team>/<project>/settings/cron-jobs
```

**Przykład:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**Na co zwrócić uwagę:**
- ✅ Wszystkie 3 zadania cron powinny być wymienione
- ✅ Prawidłowe harmonogramy (co 5 min., codziennie o 9:00, codziennie o północy)
- ✅ Status powinien być „Aktywny"

### 2. Sprawdź Logi

**Przejdź do:**
```
https://vercel.com/<team>/<project>/logs
```

**Filtruj według ścieżki żądania:**
- `/api/cron/sync`
- `/api/cron/subscription-reminders`
- `/api/cron/subscription-expiration`

**Na co zwrócić uwagę:**
- ✅ Regularne znaczniki czasu wykonania
- ✅ Kody statusu 200 (sukces)
- ✅ Brak błędów 401 (błędy uwierzytelniania)
- ✅ Brak błędów 500 (błędy wewnętrzne)

### 3. Sprawdź Logi Aplikacji

**Szukaj tych komunikatów w logach:**

```bash
# Initialization
[BACKGROUND_JOBS] All background jobs registered with BackgroundJobManager

# Sync job
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: ...

# Renewal reminders
[Cron] Subscription reminders job completed

# Expiration cleanup
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: X subscriptions expired
```

### 4. Testuj Ręcznie (Rozwój)

**Testuj endpointy lokalnie za pomocą curl:**

```bash
# Set your CRON_SECRET
export CRON_SECRET="your-secret"

# Test sync endpoint
curl -X GET http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer $CRON_SECRET"

# Test subscription reminders
curl -X GET http://localhost:3000/api/cron/subscription-reminders \
  -H "Authorization: Bearer $CRON_SECRET"

# Test subscription expiration
curl -X GET http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Oczekiwana odpowiedź:**
```json
{
  "success": true,
  "timestamp": "2026-01-06T...",
  "message": "...",
  "duration": 123
}
```

---

## 🔧 Rozwiązywanie Problemów

### Zadania Cron nie są uruchamiane

**Sprawdzenie 1: Zmienne Środowiskowe**
```bash
# Verify CRON_SECRET is set in Vercel
vercel env ls

# Should show:
# CRON_SECRET (Production, Preview, Development)
```

**Sprawdzenie 2: Wdrożenie**
```bash
# Ensure vercel.json is deployed
git status
git log --oneline -1 -- vercel.json
```

**Sprawdzenie 3: Logi**
```bash
# Check for errors in Vercel logs
vercel logs --follow
```

### Błędy 401 Brak Uprawnień

**Problem:** Niezgodność `CRON_SECRET`

**Rozwiązanie:**
1. Sprawdź `CRON_SECRET` w zmiennych środowiskowych Vercel
2. Ponownie wdróż projekt po zaktualizowaniu zmiennych środowiskowych
3. Sprawdź, czy sekret nie ma końcowych spacji

### Zadania uruchamiane zbyt często

**Problem:** Używanie trybu lokalnego zamiast trybu Vercel

**Sprawdzenie:**
```typescript
// Powinno logować "vercel" w produkcji na Vercel
console.log(getSchedulingMode()); 
```

**Rozwiązanie:**
- Upewnij się, że `VERCEL=1` jest ustawione (Vercel robi to automatycznie)
- Upewnij się, że zmienne środowiskowe Trigger.dev NIE są ustawione

---

## 🔄 Przewodnik Migracji

### Z Lokalnego na Vercel

1. **Dodaj zadania cron do `vercel.json`** (już zrobione)
2. **Ustaw `CRON_SECRET` w dashboardzie Vercel**
3. **Wdróż na Vercel**
4. **Zweryfikuj w logach**

### Z Vercel na Trigger.dev

1. **Utwórz konto Trigger.dev** na https://trigger.dev
2. **Ustaw zmienne środowiskowe:**
   ```bash
   TRIGGER_SECRET_KEY=tr_prod_...
   TRIGGER_API_KEY=...
   TRIGGER_API_URL=https://api.trigger.dev
   TRIGGER_ENABLED=true
   ```
3. **Ponownie wdróż**
4. **System automatycznie przełącza się na tryb Trigger.dev**

### Z Trigger.dev z powrotem na Vercel

1. **Usuń zmienne środowiskowe Trigger.dev:**
   ```bash
   vercel env rm TRIGGER_SECRET_KEY production
   vercel env rm TRIGGER_API_KEY production
   vercel env rm TRIGGER_API_URL production
   vercel env rm TRIGGER_ENABLED production
   ```
2. **Ponownie wdróż**
3. **System automatycznie wraca do trybu Vercel**
