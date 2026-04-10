---
id: ci-cd
title: Pipeline CI/CD
sidebar_label: CI/CD Pipeline
sidebar_position: 3
---

# Pipeline CI/CD

Szablon Ever Works zawiera kompletny pipeline CI/CD zbudowany z GitHub Actions. Ten przewodnik omawia strukturę przepływu pracy, skanowanie zabezpieczeń, strategię ochrony gałęzi i przepływ promocji wdrożeń.

## Przegląd Przepływu Pracy

Pipeline składa się z sześciu plików przepływu pracy w `.github/workflows/`:

| Przepływ Pracy | Plik | Wyzwalacz | Cel |
|---|---|---|---|
| CI | `ci.yml` | Push/PR do `main`, `develop` | Lint, sprawdzenie typów, build |
| CodeQL | `codeql.yml` | Push/PR do `main`, `develop` + harmonogram tygodniowy | Skanowanie luk bezpieczeństwa |
| Dev Deploy | `deploy_dev.yaml` | Push do `develop` | Wdrożenie w środowisku podglądu |
| Prod Deploy | `deploy_prod.yaml` | Push do `main` | Wdrożenie w środowisku produkcyjnym |
| Vercel Deploy | `deploy_vercel.yaml` | Wywoływany przez dev/prod | Współdzielona logika wdrożenia Vercel |
| Disable CodeQL | `disable-default-codeql.yml` | Tylko ręczny | Narzędzie do rozwiązywania konfliktów CodeQL |

### Przepływ Pipeline

```
Feature Branch --> PR to develop --> CI runs
                                     |
                                     v
                               Merge to develop --> Dev Deploy (preview)
                                     |
                                     v
                               PR to main --> CI runs
                                     |
                                     v
                               Merge to main --> Prod Deploy (production)
```

## Przepływ Pracy CI (ci.yml)

Przepływ CI jest uruchamiany przy każdym push i pull request do `main` i `develop`. Sprawdza jakość kodu i zapewnia pomyślne zbudowanie projektu.

### Zadania

Przepływ pracy zawiera jedno zadanie `lint-and-build` uruchamiane na `ubuntu-latest`:

**Kroki**:

1. **Pobranie kodu** -- Klonuje repozytorium
2. **Wykrycie menedżera pakietów** -- Automatycznie wykrywa pnpm, yarn lub npm z lockfiles
3. **Konfiguracja pnpm** -- Instaluje pnpm v9 jeśli wykryto
4. **Konfiguracja Node.js** -- Instaluje Node 20 z pamięcią podręczną menedżera pakietów
5. **Instalacja zależności** -- Uruchamia `pnpm install`
6. **Uruchomienie lint** -- Uruchamia `pnpm lint` (kontynuuje przy błędach dla PR)
7. **Sprawdzenie typów** -- Uruchamia `pnpm typecheck` lub `pnpm check:types`
8. **Tworzenie katalogów treści** -- Tworzy `.content/data` dla buildu
9. **Budowanie projektu** -- Uruchamia `pnpm build` ze wszystkimi wymaganymi zmiennymi środowiskowymi
10. **Sprawdzenie sukcesu buildu** -- Weryfikuje, że katalog `.next` został utworzony

### Kontrola Współbieżności

```yaml
concurrency:
  group: ${{ github.ref }}-${{ github.workflow }}
  cancel-in-progress: true
```

Jeśli nowy push nastąpi na tej samej gałęzi podczas działania CI, poprzednie uruchomienie jest automatycznie anulowane. Oszczędza to minuty CI i zapewnia walidację tylko najnowszego commita.

### Zmienne Środowiskowe

Przepływ CI używa kombinacji zakodowanych wartości domyślnych i sekretów GitHub:

| Zmienna | Źródło | Cel |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Zakodowana | URL aplikacji dla buildu |
| `DATABASE_URL` | Sekret lub domyślna | Połączenie z bazą danych dla buildu |
| `AUTH_SECRET` | Zakodowana wartość CI | Podpisywanie tokenów auth (nie dla produkcji) |
| `DATA_REPOSITORY` | Sekret lub domyślna | URL repozytorium treści |
| `CONTENT_WARNINGS_SILENT` | Zakodowane `true` | Cichme ostrzeżenia treści w CI |
| `CI` | Zakodowane `true` | Wskazuje środowisko CI |
| Sekrety OAuth | Sekrety GitHub | Dane uwierzytelniające Google, GitHub, Facebook, Twitter |
| `RESEND_API_KEY` | Sekret GitHub | Usługa email dla sprawdzeń podczas buildu |

### Uprawnienia

Przepływ pracy żąda minimalnych uprawnień:

```yaml
permissions:
  contents: read
```

Tylko dostęp do odczytu zawartości repozytorium jest potrzebny dla zadania CI.

## Analiza Bezpieczeństwa CodeQL (codeql.yml)

### Co Robi

CodeQL wykonuje semantyczną analizę kodu w celu wykrycia luk bezpieczeństwa w kodzie JavaScript/TypeScript. Uruchamia się:

- Przy każdym push i PR do `main` i `develop`
- Co tydzień w poniedziałki o 6:00 UTC (zaplanowane skanowanie)
- Przy ręcznym uruchomieniu

### Kroki Analizy

1. **Checkout** i **konfiguracja** Node.js + pnpm
2. **Inicjalizacja CodeQL** z językiem `javascript-typescript`
3. **Konfiguracja środowiska CodeQL** za pomocą `scripts/codeql-setup.js`
4. **Instalacja zależności** dla kontekstu analizy
5. **Autobuild** -- Automatyczne wykrywanie buildu przez CodeQL
6. **Analiza z przesyłaniem** -- Przesyła wyniki do zakładki Security GitHub
7. **Analiza zastępcza** -- Jeśli przesyłanie się nie powiedzie, analiza bez przesyłania

### Uprawnienia

CodeQL wymaga szerszych uprawnień do raportowania zdarzeń bezpieczeństwa:

```yaml
permissions:
  actions: read
  contents: read
  security-events: write
  pull-requests: read
```

### Wyświetlanie Wyników

Po pomyślnym uruchomieniu z przesyłaniem:
1. Przejdź do swojego repozytorium na GitHub
2. Przejdź do **Security** > **Code scanning**
3. Przejrzyj wyniki, filtruj według ważności i zarządzaj alertami

### Rozwiązywanie Konfliktów CodeQL

Jeśli napotkasz konflikty przetwarzania SARIF z domyślną konfiguracją CodeQL GitHub, użyj przepływu pracy `disable-default-codeql.yml`:

```bash
# Trigger manually from GitHub Actions tab
# This disables the default configuration that may conflict with your custom setup
```

## Przepływy Wdrożenia

### Mapowanie Gałąź-Środowisko

| Gałąź | Przepływ Pracy | Środowisko | Domena |
|---|---|---|---|
| `develop` | `deploy_dev.yaml` | `preview` | URL podglądu z Vercel |
| `main` | `deploy_prod.yaml` | `production` | Domena produkcyjna |

### Bramka Dostawcy Wdrożenia

Oba przepływy wdrożenia sprawdzają zmienną repozytorium przed kontynuowaniem:

```yaml
jobs:
  Vercel:
    if: ${{ vars.DEPLOY_PROVIDER == 'vercel' }}
```

Ustaw `DEPLOY_PROVIDER=vercel` w **Ustawieniach > Zmiennych** swojego repozytorium, aby włączyć wdrożenia Vercel. Umożliwia to zmianę dostawców wdrożenia bez modyfikowania plików przepływu pracy.

### Wdrożenie Vercel (deploy_vercel.yaml)

Współdzielony przepływ wdrożenia Vercel obsługuje zarówno wdrożenia podglądu, jak i produkcyjne.

**Strategia Wdrożenia**: Przepływ pracy używa podejścia dwufazowego:

1. **Wdrożenie API** (podstawowe): Wyzwala wdrożenie przez API Vercel dla szybszych buildów
2. **Fallback CLI**: Jeśli wywołanie API się nie powiedzie, powraca do `vercel build` + `vercel deploy --prebuilt`

**Kroki**:

1. **Pobranie** kodu
2. **Wykrycie menedżera pakietów** i konfiguracja pnpm
3. **Globalna instalacja Vercel CLI**
4. **Powiązanie projektu Vercel** za pomocą `VERCEL_TOKEN` i opcjonalnego zakresu zespołu
5. **Ustawienie zmiennych środowiskowych** (DATA_REPOSITORY, GH_TOKEN, CRON_SECRET) przez Vercel CLI
6. **Pobranie ustawień Vercel** dla docelowego środowiska
7. **Wyzwolenie wdrożenia API** lub powrót do CLI build/deploy
8. **Aktualizacja harmonogramu cron** przez `scripts/update-cron.ts`

### Wymagane Sekrety

Skonfiguruj je w sekretach swojego repozytorium GitHub:

| Sekret | Wymagany | Cel |
|---|---|---|
| `VERCEL_TOKEN` | Tak | Uwierzytelnianie API Vercel |
| `VERCEL_TEAM_SCOPE` | Przy używaniu zespołów | Slug zespołu Vercel |
| `DATA_REPOSITORY` | Tak | Nazwa repozytorium treści |
| `GH_TOKEN` | Tak | Token GitHub do klonowania treści |
| `CRON_SECRET` | Zalecane | Uwierzytelnia wywołania endpointu cron |
| `DATABASE_URL` | Dla buildu | Ciąg połączenia z bazą danych |
| Sekrety OAuth | Przy używaniu OAuth | Dane uwierzytelniające dostawcy |

### Aktualizacje Harmonogramu Cron

Po pomyślnym wdrożeniu przepływ pracy uruchamia `scripts/update-cron.ts`, aby zsynchronizować harmonogramy cron:

```yaml
- name: Update cron schedule
  if: success() && steps.trigger_deployment.outputs.deployment_id != ''
  run: npx tsx scripts/update-cron.ts
```

## Reguły Ochrony Gałęzi

### Zalecane Ustawienia dla `main`

| Ustawienie | Wartość | Cel |
|---|---|---|
| Wymagaj pull request | Tak | Bez bezpośrednich push do produkcji |
| Wymagane recenzje | 1+ | Przegląd kodu przed scaleniem |
| Wymagaj sprawdzeń statusu | CI (lint-and-build) | CI musi przejść przed scaleniem |
| Wymagaj CodeQL | Analiza CodeQL | Skanowanie bezpieczeństwa musi przejść |
| Wymagaj aktualnych gałęzi | Tak | PR musi być rebasowany na najnowszym main |
| Uwzględnij administratorów | Tak | Reguły stosują się do wszystkich |

### Zalecane Ustawienia dla `develop`

| Ustawienie | Wartość | Cel |
|---|---|---|
| Wymagaj pull request | Opcjonalne | Bezpośrednie push dozwolone dla szybkiej iteracji |
| Wymagane sprawdzenia statusu | CI (lint-and-build) | Podstawowa bramka jakości |
| Wymagaj aktualnych gałęzi | Nie | Umożliwia szybszą iterację |

### Konfigurowanie Ochrony Gałęzi

1. Przejdź do **Ustawień** > **Gałęzi** repozytorium
2. Kliknij **Dodaj regułę ochrony gałęzi**
3. Wprowadź wzorzec nazwy gałęzi (np. `main`)
4. Skonfiguruj ustawienia z powyższych tabel
5. Zapisz zmiany

## Przepływ Promocji

Szablon stosuje standardowy przepływ promocji:

### Cykl Deweloperski

```
1. Create feature branch from develop
2. Implement changes
3. Open PR to develop
4. CI validates (lint, type check, build)
5. CodeQL scans for vulnerabilities
6. Code review and approval
7. Merge to develop --> automatic preview deployment
```

### Wydanie Produkcyjne

```
1. Open PR from develop to main
2. CI validates against main
3. CodeQL security scan
4. Final code review
5. Merge to main --> automatic production deployment
```

### Proces Hotfix

```
1. Create hotfix branch from main
2. Implement fix
3. Open PR directly to main
4. CI + CodeQL validation
5. Emergency review and merge
6. Backport to develop
```

## Dostosowywanie

### Dodawanie Nowych Kroków CI

Aby dodać testy lub dodatkową walidację, dodaj kroki do zadania `ci.yml`:

```yaml
- name: Run unit tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test

- name: Run E2E tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test:e2e
```

### Dodawanie Powiadomień o Wdrożeniu

Dodaj krok powiadomienia na końcu przepływu wdrożenia:

```yaml
- name: Notify Slack
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    payload: '{"text": "Deployed to ${{ inputs.environment }}"}'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Zmienne Specyficzne dla Środowiska

Użyj **Środowisk** GitHub, aby ograniczyć sekrety do konkretnych celów wdrożenia:

1. Przejdź do **Ustawień** > **Środowisk**
2. Utwórz środowiska `production` i `preview`
3. Dodaj sekrety specyficzne dla środowiska
4. Odwołaj się do nich w przepływach pracy z konfiguracją `environment:`
