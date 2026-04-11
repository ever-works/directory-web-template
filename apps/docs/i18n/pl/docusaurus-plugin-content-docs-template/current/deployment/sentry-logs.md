---
id: sentry-logs
title: Konfiguracja Logów Sentry
sidebar_label: Logi Sentry
sidebar_position: 7
---

# Konfiguracja Logów Sentry

Ten dokument wyjaśnia, jak konfigurować i używać Sentry Logs w repozytorium Template i repozytorium Ever Works.

## Przegląd

Sentry Logs zapewnia centralne zarządzanie logami, umożliwiając przechwytywanie, przekazywanie i analizowanie logów aplikacji w eksploratorze logów Sentry. Wszystkie logi są automatycznie przekazywane do Sentry po włączeniu, zapewniając ujednolicony widok zachowania aplikacji w różnych środowiskach.

## Funkcjonalności

- ✅ Automatyczne przekazywanie logów do Sentry
- ✅ Obsługa wszystkich poziomów logowania (debug, info, warn, error)
- ✅ Logowanie kontekstowe z automatycznym tagowaniem
- ✅ Konfiguracja specyficzna dla środowiska
- ✅ Logowanie strukturalne z obsługą metadanych
- ✅ Integracja z istniejącym narzędziem loggera

## Konfiguracja

### Zmienne Środowiskowe

Dodaj te zmienne do pliku `.env.local` dla lokalnego środowiska:

```env
# Konfiguracja Sentry (wymagana dla logów)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token

# Włącz Sentry w trybie deweloperskim (opcjonalne, domyślnie tylko w produkcji)
SENTRY_ENABLE_DEV=true

# Tryb debugowania Sentry (opcjonalne)
SENTRY_DEBUG=false

# Konfiguracja logów Sentry
SENTRY_LOGS_ENABLED=true  # Włącz/wyłącz Sentry Logs (domyślnie: true)
SENTRY_LOGS_LEVEL=info    # Minimalny poziom logowania do przechwycenia (domyślnie: info)
```

### Konfiguracja Specyficzna dla Środowiska

#### Lokalne Środowisko Deweloperskie

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=debug  # Przechwytuj wszystkie logi w trybie deweloperskim
```

#### Środowisko Deweloperskie/Staging

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=info  # Przechwytuj logi info, warn i error
```

#### Środowisko Produkcyjne

```env
SENTRY_ENABLE_DEV=false  # Niepotrzebne w produkcji
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=warn  # Przechwytuj tylko ostrzeżenia i błędy w produkcji
```

## Użycie

### Podstawowe Logowanie

Logger automatycznie przekazuje logi do Sentry po włączeniu:

```typescript
import { logger } from '@/lib/logger';

// Log info
logger.info('User logged in', { userId: '12345' });

// Log ostrzeżenia
logger.warn('Rate limit approaching', { current: 90, limit: 100 });

// Log błędu
logger.error('Payment failed', { orderId: '67890', error: errorObject });

// Log debug (tylko w trybie deweloperskim)
logger.debug('API request', { method: 'GET', url: '/api/users' });
```

### Logowanie Kontekstowe

Utwórz logger z konkretnym kontekstem dla lepszej organizacji:

```typescript
import { Logger } from '@/lib/logger';

const paymentLogger = Logger.create('PaymentService');

paymentLogger.info('Processing payment', { amount: 100, currency: 'USD' });
paymentLogger.error('Payment failed', error);
```

### Poziomy Logowania

Logger obsługuje cztery poziomy logowania, automatycznie mapowane do poziomów ważności Sentry:

| Poziom Logger | Poziom Sentry | Opis |
|-------------|-------------|-------------|
| `DEBUG` | `debug` | Szczegółowe informacje debugowania (tylko w trybie deweloperskim) |
| `INFO` | `info` | Ogólne wiadomości informacyjne |
| `WARN` | `warning` | Wiadomości ostrzegawcze dla potencjalnych problemów |
| `ERROR` | `error` | Wiadomości o błędach dla awarii |

## Jak Działa

### Inicjalizacja

Sentry Logs jest włączany zarówno podczas instrumentacji klienta, jak i serwera:

1. **Po stronie serwera** (`instrumentation.ts`): Inicjalizuje Sentry dla środowiska uruchomieniowego Node.js
2. **Po stronie klienta** (`instrumentation-client.ts`): Inicjalizuje Sentry dla środowiska uruchomieniowego przeglądarki

Obie konfiguracje zawierają:
```typescript
_experiments: {
  enableLogs: SENTRY_LOGS_ENABLED,
}
```

### Przekazywanie Logów

Narzędzie loggera (`lib/logger.ts`) automatycznie:
1. Sprawdza czy Sentry Logs jest włączony
2. Formatuje wpisy logów z kontekstem i metadanymi
3. Przekazuje logi do Sentry używając `Sentry.captureMessage()` z odpowiednimi tagami i poziomami
4. Bezpiecznie wraca do trybu fallback jeśli Sentry jest niedostępny

### Struktura Logów

Każdy wpis logu wysłany do Sentry zawiera:
- **Wiadomość**: Wiadomość logu z opcjonalnym prefiksem kontekstu
- **Poziom**: Poziom ważności (debug, info, warning, error)
- **Tagi**:
  - `logLevel`: Oryginalny poziom logu
  - `logType`: Zawsze `application_log`
  - `context`: Opcjonalny identyfikator kontekstu
- **Dane Dodatkowe**:
  - `data`: Wszelkie dodatkowe dostarczone dane
  - `timestamp`: Timestamp ISO

## Przeglądanie Logów w Sentry

### Eksplorator Logów

1. Przejdź do swojego projektu Sentry
2. Przejdź do **Logs** → **Logs Explorer**
3. Użyj filtrów, aby znaleźć konkretne logi:
   - Filtruj po tagu `logLevel` (debug, info, warn, error)
   - Filtruj po tagu `context`, aby zobaczyć logi z konkretnych modułów
   - Filtruj po `logType:application_log`, aby zobaczyć tylko logi aplikacji

### Kwerendy Logów

Przykładowe kwerendy w eksploratorze logów Sentry:

```
# Wszystkie logi błędów
logLevel:error

# Logi z konkretnego kontekstu
context:PaymentService

# Wszystkie logi aplikacji
logType:application_log

# Błędy z konkretnego zakresu czasowego
logLevel:error timestamp:>2024-01-01
```

## Integracja z Pakietem Monitorującym

Jeśli używasz pakietu `@ever-works/monitoring`, upewnij się, że jest skonfigurowany do pracy z Sentry Logs:

1. Pakiet monitorujący powinien inicjalizować Sentry z włączonymi logami
2. Narzędzie loggera w tym szablonie automatycznie przekaże logi do Sentry
3. Oba systemy współpracują ze sobą, zapewniając kompleksowe monitorowanie

## Rozwiązywanie Problemów

### Logi Nie Pojawiają Się w Sentry

1. **Sprawdź konfigurację DSN**
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
   Upewnij się, że DSN jest poprawnie ustawiony i dostępny.

2. **Sprawdź czy logi są włączone**
   ```bash
   echo $SENTRY_LOGS_ENABLED
   ```
   Musi być `true`, aby logi były przekazywane.

3. **Sprawdź inicjalizację Sentry**
   - Sprawdź czy `SENTRY_ENABLED` jest true
   - Sprawdź konsolę przeglądarki pod kątem błędów inicjalizacji Sentry
   - Sprawdź czy `_experiments.enableLogs` jest ustawione na `true`

4. **Sprawdź filtrowanie poziomów logowania**
   - Upewnij się, że poziom logowania spełnia próg `SENTRY_LOGS_LEVEL`
   - Logi debug są przechwytywane tylko jeśli poziom jest ustawiony na `debug`

### Rozważania Dotyczące Wydajności

- Logi są wysyłane asynchronicznie i nie blokują aplikacji
- W produkcji rozważ ustawienie `SENTRY_LOGS_LEVEL=warn`, aby zmniejszyć wolumen logów
- Sentry automatycznie obsługuje ograniczanie szybkości i grupowanie

### Wyłączanie Logów

Aby wyłączyć Sentry Logs bez wyłączania Sentry całkowicie:

```env
SENTRY_LOGS_ENABLED=false
```

Logger będzie nadal działać normalnie, ale logi nie będą przekazywane do Sentry.

## Najlepsze Praktyki

1. **Używaj Odpowiednich Poziomów Logowania**
   - Używaj `debug` do szczegółowych informacji deweloperskich
   - Używaj `info` dla ogólnego przepływu aplikacji
   - Używaj `warn` dla potencjalnych problemów, które nie naruszają funkcjonalności
   - Używaj `error` dla rzeczywistych błędów i wyjątków

2. **Zawieraj Kontekst**
   - Używaj kontekstowych loggerów dla lepszej organizacji
   - Dołącz odpowiednie metadane do danych logów

3. **Unikaj Wrażliwych Danych**
   - Nigdy nie loguj haseł, tokenów ani danych osobowych
   - Sanitizuj dane przed zalogowaniem

4. **Konfiguracja Produkcji**
   - Ustaw `SENTRY_LOGS_LEVEL=warn` w produkcji
   - Monitoruj wykorzystanie limitu Sentry
   - Regularnie przeglądaj logi pod kątem wzorców

## Lista Kontrolna Walidacji

- [ ] DSN Sentry jest poprawnie skonfigurowany
- [ ] Ustawiono `SENTRY_LOGS_ENABLED=true`
- [ ] Logi pojawiają się w eksploratorze logów Sentry
- [ ] Poziomy logów są poprawnie mapowane (info, warn, error, debug)
- [ ] Tagi kontekstu są widoczne w Sentry
- [ ] Logi działają zarówno lokalnie, jak i w środowiskach wdrożenia
- [ ] Dział QA może widzieć i filtrować logi w eksploratorze Sentry

## Dodatkowe Zasoby

- [Dokumentacja Sentry Logs](https://docs.sentry.io/product/logs/)
- [Integracja Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Przewodnik Sentry Logs Explorer](https://docs.sentry.io/product/logs/explorer/)
