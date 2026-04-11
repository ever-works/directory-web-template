---
id: troubleshooting
title: Przewodnik rozwiązywania problemów
sidebar_label: Rozwiązywanie problemów
sidebar_position: 7
---

# Przewodnik rozwiązywania problemów

W tym przewodniku opisano typowe błędy, techniki debugowania, interpretację dzienników i problemy związane ze środowiskiem szablonu Ever Works. Problemy są uporządkowane według kategorii z objawami, przyczynami i rozwiązaniami.

## Problemy z kompilacją

### Nie znaleziono modułu podczas kompilacji

**Symptomy**: Kompilacja kończy się niepowodzeniem z powodu `Module not found: Can't resolve 'postgres'` lub podobnych błędów modułu natywnego Node.js.

**Przyczyna**: Webpack próbuje powiązać moduły tylko serwerowe z pakietem klienta.

**Rozwiązanie**: Sprawdź, czy moduł jest wymieniony w `serverExternalPackages` w `next.config.ts` :

```typescript
const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']
};
```

Jeśli dodałeś nową zależność tylko serwerową, dodaj ją do tej tablicy.

### Przekroczono limit czasu generowania strony statycznej

**Symptomy**: Kompilacja kończy się niepowodzeniem przy wartości `Error: Timeout of 180000ms exceeded` podczas generowania statycznego.

**Przyczyna**: Strony pobierające dane zewnętrzne w czasie kompilacji przekraczają limit czasu.

**Rozwiązanie**: Szablon ustawia 3-minutowy limit czasu:

```typescript
staticPageGenerationTimeout: 180,
```

W przypadku stron wymagających więcej czasu zwiększ tę wartość. Alternatywnie przełącz powolne strony na renderowanie dynamiczne:

```typescript
export const dynamic = 'force-dynamic';
```

### Brak katalogu zawartości podczas kompilacji

**Symptomy**: Kompilacja kończy się niepowodzeniem, ponieważ `.content/data` nie istnieje.

**Przyczyna**: Treść CMS oparta na Git nie została sklonowana. Skrypt `scripts/clone.cjs` działa podczas `predev` i `prebuild` haków.

**Rozwiązanie**:

```bash
# Ensure DATA_REPOSITORY is set in .env.local
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Run the clone script manually
node scripts/clone.cjs

# Or create the directory for CI builds without content
mkdir -p .content/data
```

### Ostrzeżenia pakietu internetowego z Supabase, bcryptjs, postgres, stripe

**Symptomy**: Kompilacja generuje ostrzeżenia dotyczące tych pakietów, ale kończy się pomyślnie.

**Przyczyna**: Znane ostrzeżenia z pakietów odwołujących się do interfejsów API Node.js, które nie są dostępne w przeglądarce.

**Rozwiązanie**: Są one już wyłączone w `next.config.ts` :

```typescript
config.ignoreWarnings = [
	{ module: /@supabase\/realtime-js/ },
	{ module: /@supabase\/supabase-js/ },
	{ module: /bcryptjs/ },
	{ message: /bcryptjs/ },
	{ module: /postgres/ },
	{ module: /stripe/ }
];
```

Żadne działanie nie jest potrzebne — ostrzeżenia nie mają wpływu na wynik kompilacji.

### Sterta JavaScriptu zapełniona pamięcią

**Symptomy**: Kompilacja zawiesza się przy `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory` .

**Rozwiązanie**: Skrypty kompilacji przydzielają już 8 GB:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

Jeśli w kompilacji nadal brakuje pamięci, sprawdź:

- Nadmierne generowanie stron statycznych (zmniejsz liczbę stron tworzonych w czasie kompilacji)
- Duże zależności nie są prawidłowo wstrząsane drzewami
- Wycieki pamięci w skryptach czasu kompilacji

## Problemy z bazą danych

### Połączenie odrzucone z PostgreSQL

**Objawy**: Aplikacja nie działa przy `connection refused` , `ECONNREFUSED` lub `connect ETIMEDOUT` .

**Etapy diagnostyczne**:

1. Sprawdź `DATABASE_URL` w `.env.local` :
    ,,bicie
    węzeł -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.DATABASE_URL ? 'Set': 'Brak')"
    ```
2. Przetestuj połączenie bezpośrednio: `psql $DATABASE_URL -c "SELECT 1"` 3. Sprawdź, czy PostgreSQL jest uruchomiony: `pg_isready` **Częste przyczyny i rozwiązania**:

| Przyczyna | Napraw |
| -------------------------------- | --------------------------------------------------------- |
| PostgreSQL nie działa | Uruchom usługę |
| Zły port | Sprawdź port w parametrach połączenia |
| Brakująca baza danych | `createdb your_database_name` |
| Błąd uwierzytelnienia | Sprawdź nazwę użytkownika/hasło w `DATABASE_URL` |
| Wymagany SSL | Dodaj `?sslmode=require` do ciągu połączenia |

### Migracja nie powiodła się

**Objawy**: `pnpm db:migrate` kończy się niepowodzeniem z powodu błędów schematu lub SQL.

**Rozwiązanie**: Do debugowania użyj szczegółowego narzędzia do migracji CLI:

```bash
pnpm db:migrate:cli
```

To pokazuje:

1. Aktualny stan migracji (lista zastosowanych migracji)
2. Szczegółowe dane wyjściowe wykonania migracji
3. Weryfikacja schematu po migracji

Jeśli migracje są uszkodzone, sprawdź tabelę śledzenia Drizzle:

```sql
SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

### Inicjalizacja bazy danych w oprzyrządowaniu nie powiodła się

**Objawy**: Konsola przy uruchomieniu pokazuje `[Instrumentation] Database initialization failed` .

**Przyczyna**: Hak `instrumentation.ts` uruchamia migrację i inicjowanie przy uruchomieniu. Błąd wskazuje na problem z łącznością z bazą danych lub schematem.

**Zachowanie według środowiska**:

| Środowisko | W przypadku niepowodzenia |
| ----------- | -------------------------------------- |
| Produkcja | Zgłasza błąd, wdrożenie obsługuje 503 |
| Rozwój | Ostrzeżenie dotyczące dzienników, aplikacja uruchamia się w celu debugowania |
| Podgląd | Ostrzeżenie dotyczące dzienników, aplikacja uruchamia się w celu debugowania |

Od `instrumentation.ts` :

```typescript
if (isProduction) {
	throw error; // Fail fast in production
}
// In development/preview, allow app to start for debugging
console.warn('[Instrumentation] Non-production: Allowing app to start despite DB init failure');
```

### Nasiona utknęły w stanie „wysiewu”.

**Objawy**: Dzienniki aplikacji `[DB Init] Another instance is seeding` wielokrotnie.

**Przyczyna**: Poprzednia operacja inicjowania uległa awarii bez aktualizacji statusu.

**Rozwiązanie**: Kod inicjujący automatycznie obsługuje nieaktualne nasiona po 5 minutach:

```typescript
const STALE_SEEDING_THRESHOLD = 300000; // 5 minutes
```

Aby natychmiast rozwiązać problem, ręcznie zaktualizuj stan początkowy:

```sql
DELETE FROM seed_status WHERE id = 'singleton';
```

Następnie uruchom ponownie aplikację.

## Problemy z uwierzytelnianiem

### AUTH_SECRET nie ustawiono

**Objawy**: Aplikacja ulega awarii z powodu błędu `AUTH_SECRET is not set` lub sesji.

**Rozwiązanie**:

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
AUTH_SECRET=your_generated_secret_here
```

### Niezgodność adresu URL wywołania zwrotnego OAuth

**Objawy**: Logowanie OAuth przekierowuje na stronę błędu z `redirect_uri_mismatch` .

**Rozwiązanie**: Adres URL wywołania zwrotnego w konsoli dostawcy OAuth musi dokładnie odpowiadać:

| Dostawca | Adres URL wywołania zwrotnego |
| -------- | --------------------------------------------------- |
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHuba | `https://yourdomain.com/api/auth/callback/github` |
| Facebooka | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitterze | `https://yourdomain.com/api/auth/callback/twitter` |

Dla rozwoju lokalnego użyj `http://localhost:3000/api/auth/callback/<provider>` .

### Dostawcy OAuth nie są wyświetlani

**Symptomy**: Wyświetlane są tylko dane logowania, brakuje przycisków OAuth.

**Przyczyna**: dostawcy OAuth zostają wyłączeni, jeśli konfiguracja się nie powiedzie. Od `auth.config.ts` :

```typescript
} catch (error) {
  // Fallback to credentials only
  return createNextAuthProviders({
    credentials: { enabled: true },
    google: { enabled: false },
    github: { enabled: false },
    facebook: { enabled: false },
    twitter: { enabled: false },
  });
}
```

**Rozwiązanie**: Sprawdź, czy dla każdego dostawcy ustawiono zarówno `CLIENT_ID` , jak i `CLIENT_SECRET` . Skrypt sprawdzający środowisko sprawdza pary OAuth:

```
GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
FB_CLIENT_ID + FB_CLIENT_SECRET
```

### Sesje nieoczekiwanie wygasają

**Częste przyczyny**:

| Przyczyna | Rozwiązanie |
| -------------------------------- | ---------------------------------------------------- |
| `AUTH_SECRET` zmieniony | Zmiana sekretu unieważnia wszystkie sesje |
| Niezgodność domeny cookie | Ustaw `COOKIE_DOMAIN` zgodnie z domeną wdrożenia |
| Niedopasowanie HTTPS | Ustaw `COOKIE_SECURE=false` dla lokalnego programowania HTTP |

## Problemy z wdrażaniem

### Kompilacja Vercel nie powiodła się, ale kompilacja lokalna zakończyła się sukcesem

**Lista kontrolna**:

1. Wszystkie wymagane zmienne środowiskowe ustawione w dashboardzie Vercel
2. `DATABASE_URL` dostępne z sieci Vercel
3. Kompatybilny z wersją Node.js (wymaga wersji 20.19.0 lub nowszej)
4. Katalog zawartości istnieje (CI tworzy `.content/data` automatycznie)
5. Wystarczający przydział pamięci

### Zadania cron Vercel nie są wykonywane

**Symptomy**: Zaplanowane punkty końcowe w `vercel.json` nie działają.

**Etapy diagnostyczne**:

1. Sprawdź, czy `vercel.json` znajduje się w katalogu głównym projektu z poprawnymi ścieżkami:
    ```json
    { "ścieżka": "/api/cron/sync", "harmonogram": "0 3 * * *" }
    ```
2. Potwierdź, że plan Vercel obsługuje cron (Pro lub Enterprise)
3. Sprawdź panel kontrolny Vercel w zakładce Zadania Cron, aby zobaczyć dzienniki wykonania
4. Przetestuj punkt końcowy ręcznie: `curl https://yourdomain.com/api/cron/sync` ### Migracja w czasie kompilacji na platformie Vercel nie powiodła się

**Objawy**: Dziennik budowy pokazuje `[Build Migration] Migration error` .

**Zachowanie**: Skrypt `scripts/build-migrate.ts` obsługuje różne scenariusze:

- **Produkcja**: Wszystkie awarie powodują niepowodzenie kompilacji
- **Podgląd z błędem połączenia**: Kompilacja jest kontynuowana z ostrzeżeniem
- **Podgląd z błędem uwierzytelnienia**: Kompilacja nie powiodła się (błędna konfiguracja)

```typescript
if (isProduction) {
	process.exit(1); // Fail production builds
}
if (isConnectionError && !isAuthError) {
	process.exit(0); // Allow preview deployments to continue
}
```

Aby całkowicie pominąć migracje w czasie kompilacji:

```bash
SKIP_BUILD_MIGRATIONS=true
```

## Problemy z internacjonalizacją

### Klucze tłumaczeń pokazane zamiast tekstu

**Objawy**: Na stronach wyświetla się `common.WELCOME` zamiast „Witamy”.

**Rozwiązanie**:

1. Sprawdź, czy plik tłumaczenia istnieje: `messages/<locale>.json` 2. Sprawdź, czy ścieżka klucza odpowiada przestrzeni nazw używanej w `useTranslations` 3. System awaryjny używa `deepmerge` do łączenia komunikatów regionalnych z domyślnymi angielskimi:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Jeśli w pliku ustawień regionalnych brakuje klucza, powinna go dostarczyć angielska wersja zastępcza.

### Routing regionalny zwraca 404

**Symptomy**: Adresy URL takie jak `/fr/discover` zwracają stronę 404.

**Rozwiązanie**: Sprawdź, czy ustawienia regionalne znajdują się w tablicy `LOCALES` w `lib/constants.ts` :

```typescript
export const LOCALES = [
	'en',
	'fr',
	'es',
	'de',
	'zh',
	'ar',
	'he',
	'ru',
	'uk',
	'pt',
	'it',
	'ja',
	'ko',
	'nl',
	'pl',
	'tr',
	'vi',
	'th',
	'hi',
	'id',
	'bg'
] as const;
```

I sprawdź konfigurację routingu w `i18n/routing.ts` :

```typescript
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localeDetection: true,
	localePrefix: 'as-needed'
});
```

## Interpretacja dziennika

### Prefiksy dziennika

| Przedrostek | Źródło | Lokalizacja |
| ------------------- | ----------------------------------- | ------------------------------------ |
| `[Instrumentation]` | Uruchamianie aplikacji (init DB, Sentry) | `instrumentation.ts` |
| `[Migration]` | Wykonanie migracji bazy danych | `lib/db/migrate.ts` |
| `[DB Init]` | Inicjalizacja i zapełnianie bazy danych | `lib/db/initialize.ts` |
| `[Build Migration]` | Skrypt migracji w czasie kompilacji | `scripts/build-migrate.ts` |
| `[Layout]` | Błędy pobierania danych układu głównego | `app/[locale]/layout.tsx` |

### Tagi błędów Sentry

Błędy Sentry z oprzyrządowania obejmują następujące znaczniki do filtrowania:

| Oznacz | Wartości |
| --------- | ----------------------------------------- |
| `component` | `instrumentation` |
| `phase` | `database_init` |
| `environment` | `production` , `preview` lub `development` |

## Polecenia diagnostyczne

| Zadanie | Polecenie |
| ------------------------ | ----------------------------------- |
| Sprawdź błędy TypeScriptu | `pnpm tsc --noEmit` |
| Uruchom linter | `pnpm lint` |
| Sprawdź środowisko | `node scripts/check-env.js` |
| Szybka kontrola środowiska | `node scripts/check-env.js --quick` |
| Testuj połączenie z bazą danych | `pnpm db:studio` |
| Wyświetl stan migracji | `pnpm db:migrate:cli` |
| Generuj nowe migracje | `pnpm db:generate` |
| Zastosuj oczekujące migracje | `pnpm db:migrate` |
| Baza nasion | `pnpm db:seed` |
| Wyczyść pamięć podręczną kompilacji | `rm -rf .next` |
| Pełna przebudowa | `rm -rf .next && pnpm build` |
| Zresetuj bazę danych | `node scripts/clean-database.js` |

## Uzyskiwanie pomocy

1. Wyszukaj [Problemy z GitHubem](https://github.com/ever-works/directory-web-template/issues)
2. Przejrzyj plik `CLAUDE.md` , aby zapoznać się z wytycznymi dotyczącymi programowania wspomaganego sztuczną inteligencją
3. Sprawdź panel Sentry pod kątem szczegółów błędu (jeśli skonfigurowano)
4. Ze względów bezpieczeństwa wyślij prywatny e-mail na adres security@ever.co
