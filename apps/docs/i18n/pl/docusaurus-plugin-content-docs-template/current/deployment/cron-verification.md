---
id: cron-verification
title: Weryfikacja Cron Vercel
sidebar_label: Weryfikacja Cron
sidebar_position: 9
---

# ✅ Vercel Cron Jobs – Lista Kontrolna Weryfikacji

## 🎯 Szybka Odpowiedź na Twoje Pytania

### Pytanie 1: Czy działa na Vercel bez Trigger.dev?
**✅ TAK** – System jest prawidłowo skonfigurowany do używania Vercel Crons gdy:
- `VERCEL=1` (automatycznie ustawiane przez Vercel)
- Zmienne środowiskowe Trigger.dev **NIE** są ustawione

### Pytanie 2: Jak zweryfikować, czy działa?
**✅ Postępuj zgodnie z 4 krokami poniżej**

---

## 📊 Aktualny Status Konfiguracji

### ✅ Co zostało naprawione

| Komponent | Status | Szczegóły |
|-----------|--------|-----------|
| `vercel.json` | ✅ **NAPRAWIONO** | Teraz zawiera **wszystkie 3** zadania cron (wcześniej tylko 1) |
| `initialize-jobs.ts` | ✅ **NAPRAWIONO** | Teraz rejestruje **wszystkie 3** zadania (wcześniej tylko 2) |
| Endpointy API | ✅ **OK** | Wszystkie 3 endpointy istnieją i działają |
| Dokumentacja | ✅ **UTWORZONA** | Nowy przewodnik `CRON_JOBS.md` |

### 📋 Pełna Lista Zadań Cron

| # | Nazwa Zadania | Endpoint | Harmonogram | Cel |
|---|--------------|----------|-------------|-----|
| 1 | Sync Repozytorium | `/api/cron/sync` | `*/5 * * * *` | Synchronizuje zawartość co 5 minut |
| 2 | Przypomnienia o Odnowieniu | `/api/cron/subscription-reminders` | `0 9 * * *` | Wysyła e-maile przypominające o 9:00 codziennie |
| 3 | Czyszczenie Wygaśnięć | `/api/cron/subscription-expiration` | `0 0 * * *` | Przetwarza wygasłe subskrypcje o północy |

---

## 🔍 4-Etapowy Proces Weryfikacji

### Etap 1: Sprawdź Dashboard Vercel – Zadania Cron

**Szablon URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

**Dla awesome-time-tracking-website:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**Na co zwrócić uwagę:**
- [ ] Wyświetla **3 zadania cron** (nie tylko 1)
- [ ] Każde ma prawidłowy harmonogram
- [ ] Wszystkie pokazują status „Aktywny"

**Oczekiwany wynik:**

| Ścieżka | Harmonogram | Status |
|---------|-------------|--------|
| `/api/cron/sync` | Co 5 minut | ✅ Aktywny |
| `/api/cron/subscription-reminders` | 0 9 * * * | ✅ Aktywny |
| `/api/cron/subscription-expiration` | 0 0 * * * | ✅ Aktywny |

---

### Etap 2: Sprawdź Logi Vercel

**Szablon URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths={PATH}
```

**Sprawdź każdy endpoint:**

#### A. Logi Synchronizacji
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```
- [ ] Logi pojawiają się co 5 minut
- [ ] Kody statusu to 200 (sukces)
- [ ] Brak błędów 401 (uwierzytelnianie)
- [ ] Brak błędów 500 (awarie)

#### B. Logi Przypomnień
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-reminders
```
- [ ] Logi pojawiają się raz dziennie o 9:00
- [ ] Kody statusu to 200 lub 207 (sukces/częściowy sukces)

#### C. Logi Wygaśnięcia
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-expiration
```
- [ ] Logi pojawiają się raz dziennie o północy
- [ ] Kody statusu to 200 (sukces)

---

### Etap 3: Sprawdź Logi Aplikacji

#### Przy Starcie Aplikacji
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

**✅ To potwierdza:** System wykrył środowisko Vercel

#### Przy Każdej Synchronizacji (co 5 min.)
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

#### Przy Przypomnieniach o Odnowieniu (codziennie o 9:00)
```
[Cron] Subscription reminders job completed
```

#### Przy Czyszczeniu Wygaśnięć (codziennie o północy)
```
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: N subscriptions expired
```

---

### Etap 4: Sprawdź Zmienne Środowiskowe

**Wymagane:**
```bash
CRON_SECRET=<ustawione-w-vercel>
```

**NIE ustawione (aby używać Vercel, nie Trigger.dev):**
```bash
TRIGGER_SECRET_KEY=<powinno-być-puste>
TRIGGER_API_KEY=<powinno-być-puste>
TRIGGER_API_URL=<powinno-być-puste>
```

**Sprawdź przez Vercel CLI:**
```bash
vercel env ls
```

---

## 🚨 Częste Problemy & Rozwiązania

### Problem 1: Widoczne tylko 1 zadanie cron w Vercel

**Przyczyna:** Wdrożono stary `vercel.json`  
**Rozwiązanie:**
1. ✅ `vercel.json` jest teraz naprawiony (3 crony)
2. Ponownie wdróż na Vercel: `git push` lub `vercel --prod`
3. Poczekaj 1-2 minuty na rejestrację nowych cronów przez Vercel

---

### Problem 2: Błędy 401 Brak Uprawnień

**Przyczyna:** `CRON_SECRET` nie jest ustawiony lub niezgodność  
**Rozwiązanie:**
```bash
# Generate a new secret
openssl rand -base64 32

# Add to Vercel
vercel env add CRON_SECRET

# Redeploy
vercel --prod
```

---

### Problem 3: Zadania w ogóle nie są uruchamiane

**Przyczyna:** Używany jest tryb Trigger.dev zamiast trybu Vercel

**Sprawdzenie:**
```bash
# Should NOT be set
vercel env ls | grep TRIGGER
```
