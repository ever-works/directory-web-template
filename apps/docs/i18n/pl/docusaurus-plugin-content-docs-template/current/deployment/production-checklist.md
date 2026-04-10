---
id: production-checklist
title: Lista Kontrolna Gotowości Produkcyjnej
sidebar_label: Lista Kontrolna
sidebar_position: 7
---

# Lista Kontrolna Gotowości Produkcyjnej

Kompleksowa lista kontrolna zapewniająca, że wdrożenie Ever Works jest gotowe do środowiska produkcyjnego.

## Lista Kontrolna Przed Wdrożeniem

### 1. Konfiguracja Środowiska

#### Wymagane Zmienne Środowiskowe

- [ ] **Baza Danych**
  - `DATABASE_URL` skonfigurowany z produkcyjnym PostgreSQL
  - Włączone connection pooling bazy danych
  - Włączony tryb SSL dla produkcji

- [ ] **Uwierzytelnianie**
  - `NEXTAUTH_URL` ustawiony na domenę produkcyjną
  - `NEXTAUTH_SECRET` wygenerowany (minimum 32 znaki)
  - Dostawcy OAuth skonfigurowany (Google, GitHub, itp.)
  - Poświadczenia Supabase Auth (jeśli używane)

- [ ] **Dostawcy Płatności**
  - Klucze produkcyjne Stripe (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
  - Klucze produkcyjne LemonSqueezy (jeśli używane)
  - Tajne klucze webhook skonfigurowane
  - Tryb testowy wyłączony

- [ ] **Usługi E-mail**
  - Klucz API Resend skonfigurowany
  - Poświadczenia Novu ustawione (jeśli używane)
  - Szablony e-mail przetestowane
  - Domena nadawcy zweryfikowana

- [ ] **Analityka i Monitorowanie**
  - Klucz produkcyjny PostHog
  - Skonfigurowany DSN Sentry
  - Zdefiniowany dostawca śledzenia wyjątków
  - Włączona Vercel Analytics (jeśli na Vercel)

- [ ] **Integracja CRM**
  - Poświadczenia Twenty CRM (jeśli używane)
  - Skonfigurowane punkty końcowe webhook

- [ ] **Bezpieczeństwo**
  - `NODE_ENV=production`
  - Skonfigurowane ograniczanie szybkości
  - Przejrzane ustawienia CORS
  - Skonfigurowane nagłówki CSP

### 2. Baza Danych

- [ ] **Schemat i Migracje**
  - Wszystkie migracje zastosowane
  - Schemat bazy danych odpowiada kodowi
  - Indeksy utworzone dla wydajności
  - Zweryfikowane ograniczenia klucza obcego

- [ ] **Integralność Danych**
  - Załadowane dane seed (jeśli potrzebne)
  - Usunięte dane testowe
  - Wdrożone reguły walidacji danych

- [ ] **Kopia Zapasowa i Odzyskiwanie**
  - Skonfigurowane automatyczne kopie zapasowe
  - Przetestowane przywracanie kopii zapasowej
  - Włączone odzyskiwanie do punktu w czasie
  - Zdefiniowana polityka przechowywania kopii zapasowych

- [ ] **Wydajność**
  - Skonfigurowane connection pooling
  - Zoptymalizowana wydajność zapytań
  - Włączone logowanie wolnych zapytań
  - Aktywne monitorowanie bazy danych

### 3. Bezpieczeństwo

- [ ] **Uwierzytelnianie i Autoryzacja**
  - Zweryfikowane hashowanie haseł (bcrypt)
  - Bezpieczne zarządzanie sesją
  - Prawidłowo podpisane tokeny JWT
  - Przetestowana kontrola dostępu oparta na rolach

- [ ] **Ochrona Danych**
  - Dane PII zaszyfrowane w spoczynku
  - Skonfigurowane czyszczenie wrażliwych danych
  - Wymuszony HTTPS
  - Włączone bezpieczne ciasteczka

- [ ] **Bezpieczeństwo API**
  - Aktywne ograniczanie szybkości
  - Wymagane uwierzytelnianie API
  - Walidacja danych wejściowych na wszystkich punktach końcowych
  - Zweryfikowana ochrona przed wstrzyknięciem SQL

- [ ] **Zależności**
  - Wszystkie zależności zaktualizowane
  - Sprawdzone luki bezpieczeństwa (`npm audit`)
  - Brak krytycznych luk
  - Plik lock zależności zacommitowany

### 4. Wydajność

- [ ] **Optymalizacja Frontendu**
  - Zoptymalizowane obrazy (komponent Image Next.js)
  - Zaimplementowane code splitting
  - Lazy loading dla ciężkich komponentów
  - Przeanalizowany rozmiar paczki

- [ ] **Buforowanie**
  - Zasoby statyczne w pamięci podręcznej
  - Odpowiedzi API buforowane (gdzie stosowne)
  - Skonfigurowane CDN
  - Wdrożona strategia unieważniania pamięci podręcznej

- [ ] **Core Web Vitals**
  - LCP < 2,5s
  - FID < 100ms
  - CLS < 0,1
  - Aktywne monitorowanie wydajności

- [ ] **Zapytania do Bazy Danych**
  - Wyeliminowane zapytania N+1
  - Utworzone odpowiednie indeksy
  - Włączone buforowanie zapytań
  - Zoptymalizowane connection pooling

### 5. Monitorowanie i Logowanie

- [ ] **Śledzenie Błędów**
  - Skonfigurowany Sentry/PostHog
  - Skonfigurowane alerty o błędach
  - Przesłane source mapy
  - Skonfigurowane grupowanie błędów

- [ ] **Monitorowanie Aplikacji**
  - Punkt końcowy health check (`/api/health`)
  - Skonfigurowane monitorowanie czasu pracy
  - Śledzone metryki wydajności
  - Zdefiniowane niestandardowe metryki

- [ ] **Logowanie**
  - Zaimplementowane logowanie strukturalne
  - Skonfigurowane poziomy logowania
  - Skonfigurowana agregacja logów
  - Zdefiniowana polityka przechowywania logów

- [ ] **Alerty**
  - Alerty o krytycznych błędach
  - Alerty o degradacji wydajności
  - Alerty czasu pracy
  - Alerty o nieudanych płatnościach

### 6. Treść i Dane

- [ ] **CMS Oparty na Git**
  - Skonfigurowane repozytorium `.content`
  - Synchronizacja treści działa
  - Chronione poświadczenia Git
  - Strategia tworzenia kopii zapasowych treści

- [ ] **Zasoby Multimedialne**
  - Zoptymalizowane obrazy
  - Skonfigurowane CDN dla multimediów
  - Skonfigurowane limity przesyłania
  - Monitorowany przydział pamięci

- [ ] **Internacjonalizacja**
  - Wszystkie tłumaczenia kompletne
  - Przetestowana obsługa RTL (arabski)
  - Działające wykrywanie locale
  - Zweryfikowane formatowanie daty/liczb

### 7. Dokumentacja API

- [ ] **System Dokumentacji**
  - Wygenerowana specyfikacja OpenAPI (`yarn generate-docs`)
  - Dostępny Scalar UI pod `/api/reference`
  - Wszystkie punkty końcowe udokumentowane
  - Przetestowane przykłady

- [ ] **Standardy API**
  - Spójne konwencje nazewnictwa
  - Poprawne kody statusu HTTP
  - Znormalizowane odpowiedzi błędów
  - Udokumentowane ograniczanie szybkości

### 8. System Płatności

- [ ] **Konfiguracja Stripe**
  - Włączony tryb produkcyjny
  - Skonfigurowane i przetestowane webhooki
  - Włączony portal klienta
  - Skonfigurowane ustawienia faktur

- [ ] **Konfiguracja LemonSqueezy** (jeśli używane)
  - Ustawione poświadczenia produkcyjne
  - Skonfigurowane webhooki
  - Zweryfikowana zgodność podatkowa

- [ ] **Zarządzanie Subskrypcjami**
  - Przetestowane tworzenie planów
  - Przetestowane przepływy ulepszania/obniżania
  - Przetestowany przepływ anulowania
  - Udokumentowany proces zwrotu środków

### 9. System E-mail

- [ ] **E-maile Transakcyjne**
  - Przetestowany e-mail powitalny
  - Przetestowane resetowanie hasła
  - Przetestowana weryfikacja e-mail
  - Przetestowane e-maile subskrypcji

- [ ] **Szablony E-mail**
  - Przejrzane wszystkie szablony
  - Spójne brandowanie
  - Responsywny na urządzenia mobilne
  - Działające linki rezygnacji z subskrypcji

- [ ] **Dostarczalność**
  - Skonfigurowane rekordy SPF
  - Skonfigurowany DKIM
  - Zdefiniowana polityka DMARC
  - Monitorowana reputacja nadawcy

### 10. Testowanie

- [ ] **Testy Funkcjonalne**
  - Przepływ rejestracji użytkownika
  - Przepływ logowania/wylogowania
  - Przepływ resetowania hasła
  - Przepływ przesyłania elementu
  - Przepływ płatności
  - Funkcje administracyjne

- [ ] **Testy Cross-browser**
  - Przetestowany Chrome
  - Przetestowany Firefox
  - Przetestowany Safari
  - Przetestowany Edge
  - Przetestowane przeglądarki mobilne

- [ ] **Testy Responsywności**
  - Mobile (320px – 480px)
  - Tablet (768px – 1024px)
  - Desktop (1280px+)
  - Duże ekrany (1920px+)

- [ ] **Testy Obciążeniowe**
  - Symulowany oczekiwany ruch
  - Wydajność bazy danych pod obciążeniem
  - Akceptowalne czasy odpowiedzi API
  - Brak wycieków pamięci

### 11. Zgodność i Kwestie Prawne

- [ ] **Prywatność**
  - Opublikowana polityka prywatności
  - Wdrożona zgoda na ciasteczka
  - Zgodność z RODO (jeśli użytkownicy z UE)
  - Funkcjonalność eksportu danych

- [ ] **Warunki Korzystania z Usługi**
  - Opublikowane warunki korzystania z usługi
  - Przepływ akceptacji użytkownika
  - Śledzenie wersji warunków

- [ ] **Dostępność**
  - Zgodność WCAG 2.1 AA
  - Działająca nawigacja klawiaturą
  - Przetestowany czytnik ekranu
  - Tekst alternatywny dla obrazów

### 12. DevOps i Infrastruktura

- [ ] **Wdrożenie**
  - Skonfigurowany potok CI/CD
  - Automatyczne testy w potoku
  - Plan wycofania wdrożenia
  - Wdrożenie bez przestojów

- [ ] **Skalowalność**
  - Skonfigurowane automatyczne skalowanie
  - Skonfigurowany load balancer
  - Repliki do odczytu bazy danych (jeśli potrzebne)
  - CDN dla zasobów statycznych

- [ ] **Odzyskiwanie po Katastrofie**
  - Przetestowane przywracanie kopii zapasowej
  - Udokumentowany plan awaryjny
  - Plan reagowania na incydenty
  - Zdefiniowane dyżury on-call

- [ ] **Dokumentacja**
  - Zaktualizowany przewodnik wdrożenia
  - Przygotowany runbook
  - Zaktualizowane diagramy architektury
  - Ukończone szkolenie zespołu

---

## Polecenia Weryfikacyjne

Uruchom te polecenia, aby zweryfikować gotowość do produkcji:

### Audyt Bezpieczeństwa

```bash
# Sprawdź luki bezpieczeństwa
npm audit --production

# Napraw luki
npm audit fix

# Sprawdź przestarzałe zależności
npm outdated
```

### Weryfikacja Buildu

```bash
# Build produkcyjny
npm run build

# Sprawdź wynik buildu
ls -lh .next/

# Analizuj rozmiar paczki
npm run analyze
```

### Weryfikacja Bazy Danych

```bash
# Sprawdź status migracji
npx drizzle-kit check

# Wygeneruj migrację jeśli potrzebna
npx drizzle-kit generate

# Zastosuj migracje
npx drizzle-kit push
```

### Dokumentacja API

```bash
# Wygeneruj specyfikację OpenAPI
yarn generate-docs

# Waliduj dokumentację
yarn docs:validate

# Sprawdź czy dokumentacja jest aktualna
git diff --exit-code public/openapi.json
```

### Zmienne Środowiskowe

```bash
# Sprawdź czy wszystkie wymagane zmienne są ustawione
node scripts/check-env.js

# Przetestuj konfigurację środowiska
npm run test:env
```

---

## Przepływ Pracy Wdrożenia

### Przed Wdrożeniem

1. **Przegląd Kodu**
   - Wszystkie PR przejrzane i zatwierdzone
   - Brak konfliktów scalania
   - Potok CI/CD przeszedł

2. **Testowanie**
   - Wszystkie testy zakończone sukcesem
   - Ukończone ręczne testy QA
   - Przetestowane środowisko staging

3. **Dokumentacja**
   - Zaktualizowany changelog
   - Zregenerowane dokumenty API
   - Przygotowane notatki zespołu

### Kroki Wdrożenia

1. **Kopia Zapasowa**

   ```bash
   # Utwórz kopię zapasową bazy danych
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

2. **Wdrożenie**

   ```bash
   # Wdrożenie do produkcji
   git push production main

   # Lub z Vercel
   vercel --prod
   ```

3. **Weryfikacja**

   ```bash
   # Sprawdź punkt końcowy health
   curl https://your-domain.com/api/health

   # Sprawdź logi błędów
   tail -f logs/error.log
   ```

4. **Monitorowanie**
   - Monitoruj wskaźniki błędów w Sentry
   - Monitoruj wydajność w PostHog
   - Sprawdź monitorowanie czasu pracy

### Po Wdrożeniu

1. **Testy Dymne**
   - Strona główna się ładuje
   - Użytkownik może się zalogować
   - Przepływ płatności działa
   - Panel administracyjny dostępny

2. **Monitorowanie**
   - Normalne wskaźniki błędów
   - Akceptowalne czasy odpowiedzi
   - Brak wycieków pamięci
   - Stabilna wydajność bazy danych

3. **Komunikacja**
   - Powiadom zespół o wdrożeniu
   - Zaktualizuj stronę statusu
   - Ogłoś nowe funkcje (jeśli dotyczy)

---

## Plan Wycofania

Jeśli po wdrożeniu zostaną wykryte problemy:

### Szybkie Wycofanie

```bash
# Przywróć poprzednie wdrożenie
git revert HEAD
git push production main

# Lub z Vercel
vercel rollback
```

### Wycofanie Bazy Danych

```bash
# Przywróć z kopii zapasowej
psql $DATABASE_URL < backup-YYYYMMDD.sql

# Lub użyj odzyskiwania do punktu w czasie
# (jeśli obsługiwane przez dostawcę hostingu)
```

### Komunikacja

1. Natychmiast powiadom zespół
2. Zaktualizuj stronę statusu
3. Komunikuj się z dotkniętymi użytkownikami
4. Udokumentuj incydent do post-mortem

---

## Metryki Sukcesu

Śledź te metryki, aby zapewnić zdrowie produkcji:

### Wydajność

- **Czas Odpowiedzi**: < 200ms (p95)
- **Czas Pracy**: > 99,9%
- **Wskaźnik Błędów**: < 0,1%
- **Core Web Vitals**: Wszystkie zielone

### Biznes

- **Rejestracje Użytkowników**: Działające śledzenie
- **Wskaźnik Sukcesu Płatności**: > 95%
- **Dostarczalność E-mail**: > 98%
- **Dostępność API**: > 99,9%

### Bezpieczeństwo

- **Nieudane Próby Logowania**: Monitorowane
- **Przekroczenia Limitu Szybkości API**: < 1%
- **Luki Bezpieczeństwa**: 0 krytycznych
- **Certyfikat SSL**: Ważny i z auto-odnowieniem

---

## Następne Kroki

Po pomyślnym wdrożeniu:

- [Monitorowanie i Analityka](./monitoring) – Konfiguracja kompleksowego monitorowania
- [Zmienne Środowiskowe](./environment-variables) – Zarządzanie sekretami produkcji
- [Wdrożenie Docker](./docker) – Konteneryzacja aplikacji
- [Wsparcie](../advanced-guide/support) – Uzyskanie pomocy w razie potrzeby

## Zasoby

### Wewnętrzna Dokumentacja

- [Przegląd Architektury](../architecture/overview)
- [Tech Stack](../architecture/tech-stack)
- [Dokumentacja API](../development/api-documentation)
- [Monitorowanie](./monitoring)

### Zewnętrzne Zasoby

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Production Checklist](https://vercel.com/docs/concepts/deployments/overview)
- [PostgreSQL Best Practices](https://www.postgresql.org/docs/current/runtime-config.html)
- [Stripe Production Checklist](https://stripe.com/docs/keys#test-live-modes)

---

## Podsumowanie Listy Kontrolnej

Użyj tego szybkiego podsumowania, aby śledzić ogólny postęp:

- [ ] **Środowisko**: Wszystkie zmienne skonfigurowane
- [ ] **Baza Danych**: Migracje zastosowane, kopie zapasowe skonfigurowane
- [ ] **Bezpieczeństwo**: Uwierzytelnianie, szyfrowanie, ograniczanie szybkości
- [ ] **Wydajność**: Zoptymalizowane, buforowane, monitorowane
- [ ] **Monitorowanie**: Śledzenie błędów, logowanie, alerty
- [ ] **Treść**: CMS skonfigurowany, multimedia zoptymalizowane, i18n kompletne
- [ ] **API**: Dokumentacja wygenerowana, standardy przestrzegane
- [ ] **Płatności**: Stripe/LS skonfigurowane, webhooki przetestowane
