---
id: test-data
title: Dane Testowe i Fixtures
sidebar_label: Dane Testowe
sidebar_position: 6
---

# Dane Testowe i Fixtures

Szablon Ever Works zapewnia kilka mechanizmów do generowania i zarządzania danymi testowymi w kontekstach deweloperskich, seedowania i testów E2E. Ta strona obejmuje dane fikcyjne, seedy bazy danych, fixtures E2E i strategie utrzymania spójności danych.

## Dane Testowe E2E (`e2e/helpers/test-data.ts`)

Zestaw testów E2E definiuje swoje dane testowe przez scentralizowany moduł pomocniczy:

```typescript
export const TEST_DATA = {
  get ADMIN_EMAIL()    { return requireEnv('SEED_ADMIN_EMAIL'); },
  get ADMIN_PASSWORD() { return requireEnv('SEED_ADMIN_PASSWORD'); },
  CLIENT_PASSWORD: 'TestClient123!',
  generateClientEmail: () =>
    `e2e-client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
  generateItemName: () =>
    `E2E Test Item ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  generateItemUrl: () =>
    `https://e2e-test-${Date.now()}.example.com`,
};
```

### Kluczowe Decyzje Projektowe

- **Dane uwierzytelniające admina z env** -- E-mail i hasło admina są odczytywane ze zmiennych środowiskowych `SEED_ADMIN_EMAIL` i `SEED_ADMIN_PASSWORD`, zapewniając, że testy używają tych samych danych co zasew użytkownik admin.
- **Unikalne dane klienta** -- E-maile klientów i nazwy elementów zawierają znaczniki czasu i losowe sufiksy, aby uniknąć kolizji w równoległych przebiegach testów.
- **Leniwa ewaluacja** -- Dane uwierzytelniające admina używają funkcji getterów, które natychmiast rzucają wyjątek, jeśli zmienne środowiskowe brakuje, wychwytując błędy konfiguracji wcześnie.

### Rejestr Tras Publicznych

Moduł danych testowych definiuje również wszystkie trasy publiczne do testowania nawigacji:

```typescript
export const PUBLIC_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/discover/1', name: 'Discover Page 1' },
  { path: '/categories', name: 'Categories' },
  { path: '/tags', name: 'Tags' },
  { path: '/collections', name: 'Collections' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/about', name: 'About' },
  { path: '/help', name: 'Help' },
  { path: '/privacy-policy', name: 'Privacy Policy' },
  { path: '/terms-of-service', name: 'Terms of Service' },
  { path: '/cookies', name: 'Cookies' },
  { path: '/auth/signin', name: 'Sign In' },
  { path: '/auth/register', name: 'Register' },
];
```

## Fixtures Stanu Uwierzytelniania E2E

Stan uwierzytelniania jest zarządzany przez pliki stanu przechowywania Playwright:

```
e2e/auth-states/
  admin.json    # Zserializowana sesja admina (ciasteczka, localStorage)
  client.json   # Zserializowana sesja klienta
```

Pliki te są generowane podczas `global-setup.ts` przez programowe logowanie z danymi uwierzytelniającymi admina i klienta. Fixture uwierzytelniania (`e2e/fixtures/auth.fixture.ts`) zapewnia wstępnie uwierzytelnione konteksty przeglądarki:

- `adminContext` / `adminPage` -- Kontekst przeglądarki z załadowaną sesją admina
- `clientContext` / `clientPage` -- Kontekst przeglądarki z załadowaną sesją klienta

Pliki testowe importują niestandardowy obiekt `test` zamiast domyślnego Playwright:

```typescript
import { test, expect } from '@/e2e/fixtures';

test('admin can view dashboard', async ({ adminPage }) => {
  await adminPage.goto('/admin');
  await expect(adminPage.getByRole('heading')).toContainText('Dashboard');
});
```

## Seedowanie Bazy Danych

### Skrypt Seed (`lib/db/seed.ts`)

Skrypt seedowania bazy danych jest wykonywany przez `pnpm db:seed` i wypełnia bazę danych danymi początkowymi wymaganymi do działania aplikacji:

- **Użytkownik admin** -- Tworzony ze zmiennych środowiskowych `SEED_ADMIN_EMAIL` i `SEED_ADMIN_PASSWORD`
- **Fikcyjni użytkownicy** -- Generowani na podstawie `SEED_FAKE_USER_COUNT` (domyślnie: 10)
- **Dane demonstracyjne** -- Gdy `NEXT_PUBLIC_DEMO=true`, kompleksowe dane demonstracyjne są seedowane dla wszystkich funkcji

Skrypt seed jest idempotentny -- sprawdza istniejące dane przed wstawieniem, aby uniknąć duplikatów przy ponownym uruchomieniu.

### Tryb Demo

Gdy `NEXT_PUBLIC_DEMO=true`, skrypt seed generuje:

- Wielu użytkowników z różnymi rolami i profilami
- Przykładowe elementy w różnych kategoriach i stanach
- Komentarze, głosy i dane zaangażowania
- Zgłoszenia reklam sponsorowanych w różnych stanach
- Definicje ankiet z przykładowymi odpowiedziami

## Strategie Spójności Danych

### Izolacja Między Przebiegami Testów

Testy E2E używają kilku strategii, aby uniknąć interferencji danych:

1. **Unikalne identyfikatory** -- Wszystkie wygenerowane dane testowe zawierają znaczniki czasu, aby zapobiec kolizjom nazw
2. **Czyszczenie per-test** -- Testy, które tworzą dane, powinny po sobie posprzątać
3. **Oddzielne konteksty uwierzytelniania** -- Testy admina i klienta działają w izolowanych kontekstach przeglądarki
4. **Globalna konfiguracja/sprzątanie** -- `global-setup.ts` przygotowuje stan uwierzytelniania, `global-teardown.ts` obsługuje czyszczenie

### Środowisko Deweloperskie vs Testowe vs Produkcyjne

| Kwestia | Deweloperskie | Testowe (E2E) | Produckcyjne |
|---------|--------------|---------------|--------------|
| Baza danych | SQLite (`file:./dev.db`) lub Postgres | Tak samo jak dev (ponownie używany serwer) | Postgres |
| Treść | Sklonowana z `DATA_REPOSITORY` | Istniejąca treść z dev | CMS oparty na Git |
| Użytkownicy | Zasew admin + fikcyjni użytkownicy | Tak samo jak dev + użytkownicy generowani przez E2E | Prawdziwi użytkownicy |
| Dane demo | Gdy `NEXT_PUBLIC_DEMO=true` | Opiera się na zasew danych demo | `NEXT_PUBLIC_DEMO=false` |

### Najlepsze Praktyki

1. **Zawsze seeduj przed testowaniem** -- Uruchom `pnpm db:seed` przed testami E2E, aby upewnić się, że użytkownik admin istnieje
2. **Używaj generatorów unikalnych danych** -- Nigdy nie koduj na sztywno nazw elementów ani e-maili w testach
3. **Sprawdzaj zmienne środowiskowe** -- Helper `requireEnv()` dostarcza jasnych komunikatów błędów, gdy brakuje wymaganych zmiennych
4. **Utrzymuj fixtures minimalne** -- Pliki stanu uwierzytelniania zawierają tylko niezbędne ciasteczka i wpisy przechowywania
5. **Unikaj zależności między testami** -- Każdy plik spec powinien być niezależnie uruchamialny

## Zmienne Środowiskowe dla Testów

```bash
# Wymagane dla testów E2E
SEED_ADMIN_EMAIL=admin@changeme.com
SEED_ADMIN_PASSWORD=changeme_password

# Opcjonalne
BASE_URL=http://localhost:3000
SEED_FAKE_USER_COUNT=10
NEXT_PUBLIC_DEMO=true
```

## Powiązane Pliki

- `e2e/helpers/test-data.ts` -- Generatory danych testowych i stałe
- `e2e/fixtures/auth.fixture.ts` -- Fixtures uwierzytelniania dla Playwright
- `e2e/global-setup.ts` -- Konfiguracja uwierzytelniania przed testami
- `e2e/global-teardown.ts` -- Czyszczenie po testach
- `lib/db/seed.ts` -- Skrypt seedowania bazy danych
- `.env.example` -- Pełna referencja zmiennych środowiskowych
