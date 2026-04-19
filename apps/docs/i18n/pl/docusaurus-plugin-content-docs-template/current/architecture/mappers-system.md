---
id: mappers-system
title: "System maperów"
sidebar_label: "System maperów"
sidebar_position: 48
---

# System maperów

## Przegląd

System Mappers zapewnia czyste, pozbawione skutków ubocznych funkcje transformacji, które przekształcają wewnętrzne modele danych aplikacji w zewnętrzne ładunki CRM (zarządzanie relacjami z klientami). Obecnie wdraża mappery dla integracji Twenty CRM, konwertując `ClientProfile` i `Company` na kompatybilne z Twenty ładunki `Person` i `Company` z bezpiecznym mapowaniem pól i walidacją wymaganych pól.

## Architektura

Moduł mapujący znajduje się w `lib/mappers/` i przestrzega ścisłego wzorca separacji problemów:

- **Mappery** to czyste funkcje: bez operacji we/wy, bez wywołań do bazy danych, bez żądań HTTP.
- **Usługi** (w `lib/services/`) korzystają z narzędzi mapujących w celu przygotowania danych przed wysłaniem do zewnętrznych interfejsów API.
- **Typy** importowane są ze schematu bazy danych (`lib/db/schema`) i definicji typów CRM (`lib/types/twenty-crm-entities.types`).

```
lib/mappers/
  |-- twenty-crm.mapper.ts
      |-- ensureExternalId()                (ID validation)
      |-- extractCityFromLocation()         (Location parsing)
      |-- mapClientProfileToPerson()        (ClientProfile -> TwentyPerson)
      |-- mapCompanyToTwentyCompany()       (Company -> TwentyCompany)
```

Przepływ danych to:

```
Database Entity  -->  Mapper Function  -->  CRM Payload  -->  Service  -->  External API
(ClientProfile)     (mapClientProfile     (TwentyPerson)  (CRM Service)  (Twenty CRM)
                     ToPerson)
```

## Dokumentacja API

### Eksport z `lib/mappers/twenty-crm.mapper.ts`

#### `ensureExternalId(id: string | undefined | null, entityType: string): string`

Sprawdza, czy identyfikator jednostki jest obecny i nie jest pusty. Jest to krytyczna kontrola bezpieczeństwa zapewniająca, że ​​każdy rekord CRM ma ważne `external_id` prowadzące do systemu lokalnego.

**Parametry:**
- `id` — Identyfikator jednostki lokalnej (może być niezdefiniowany lub mieć wartość null)
- `entityType` -- Nazwa typu jednostki dla komunikatów o błędach (np. `'ClientProfile'`)

**Zwroty:** Obcięty ciąg identyfikacyjny

**Zgłasza:** `Error` jeśli brakuje identyfikatora, ma wartość null, jest niezdefiniowany lub jest pustym ciągiem znaków.

#### `extractCityFromLocation(location: string | undefined | null): string | null`

Analizuje dowolny ciąg lokalizacji, aby wyodrębnić nazwę miasta. Obsługuje różne formaty, dzieląc je przecinkami i biorąc pierwszą część.

**Obsługiwane formaty:**
- `"San Francisco"` --> `"San Francisco"`
- `"San Francisco, CA"` --> `"San Francisco"`
- `"San Francisco, CA, USA"` --> `"San Francisco"`

**Zwraca:** nazwę miasta lub `null` jeśli lokalizacja jest pusta/nieokreślona.

#### `mapClientProfileToPerson(clientProfile: ClientProfile): TwentyPerson`

Mapuje lokalną jednostkę bazy danych `ClientProfile` na ładunek Twenty CRM `Person`.

**Mapowanie pól:**

|Pole ClientProfile|Pole dwudziestoosobowe|Wymagane|
|--------------------|--------------------|----------|
|`id`|`external_id`|Tak (rzuca, jeśli brakuje)|
|`name`|`name`|Tak|
|`email`|`email`|Tak|
|`phone`|`phone`|Opcjonalne|
|`jobTitle`|`job_title`|Opcjonalne|
|`company`|`company_name`|Opcjonalne|
|`website`|`website`|Opcjonalne|
|`location`|`city` (wyodrębniony)|Opcjonalne|
|`accountType`|`account_type`|Opcjonalne|
|`plan`|`plan`|Opcjonalne|
|`totalSubmissions`|`total_submissions`|Opcjonalne|

**Zwroty:** Obiekt `TwentyPerson` z tylko wypełnionymi polami.

**Rzuca:** `Error`, jeśli brakuje `clientProfile.id`.

#### `mapCompanyToTwentyCompany(company: Company): TwentyCompany`

Mapuje lokalną jednostkę `Company` na ładunek Twenty CRM `Company`.

**Mapowanie pól:**

|Pole firmowe|Pole TwentyCompany|Wymagane|
|--------------|---------------------|----------|
|`id`|`external_id`|Tak (rzuca, jeśli brakuje)|
|`name`|`name`|Tak|
|`domain`|`domain_name`|Opcjonalne|
|`website`|`website`|Opcjonalne|
|`status`|`status`|Opcjonalne|

**Zwroty:** Obiekt `TwentyCompany` z tylko wypełnionymi polami.

**Rzuca:** `Error`, jeśli brakuje `company.id`.

## Szczegóły wdrożenia

**Mapowanie zerowe**: Pola opcjonalne wykorzystują jawne kontrole `if` przed przypisaniem, zapewniając, że `null`, `undefined` i puste wartości nigdy nie zostaną wysłane do CRM. Dzięki temu ładunki są czyste i unika się nadpisywania istniejących danych CRM wartościami null.

**Wymuszanie zewnętrznego identyfikatora**: Każdy program mapujący wywołuje `ensureExternalId()` jako swoją pierwszą operację. Powoduje to natychmiastowe wyświetlenie nieprawidłowych identyfikatorów zgodnie z niezawodnym wzorcem, który zapobiega osieroconym rekordom w systemie CRM.

**Brak mutacji**: Funkcje mapujące tworzą nowe obiekty zamiast modyfikować dane wejściowe. Obiekt wejściowy `ClientProfile` lub `Company` nigdy nie jest zmieniany.

**Opcjonalne czyszczenie pól**: Pola są dodawane do obiektu wyjściowego tylko wtedy, gdy mają prawdziwe wartości. Daje to minimalne ładunki, które aktualizują tylko pola inne niż null w CRM.

**Heurystyka wyodrębniania miast**: Funkcja `extractCityFromLocation()` wykorzystuje proste podejście polegające na dzieleniu przecinkami. Obsługuje najpopularniejsze formaty lokalizacji (miasto, miasto + stan, miasto + stan + kraj), ale nie próbuje analizować złożonych formatów adresów.

## Konfiguracja

Nie jest wymagana żadna konfiguracja. Mapery to czyste funkcje, które zależą tylko od typów danych wejściowych. Konfiguracja połączenia Twenty CRM (URL API, tokeny) zarządzana jest poprzez warstwę usług integracyjnych.

## Przykłady użycia

```typescript
import {
  mapClientProfileToPerson,
  mapCompanyToTwentyCompany,
  ensureExternalId,
  extractCityFromLocation,
} from '@/lib/mappers/twenty-crm.mapper';

// Map a client profile to a CRM person
const clientProfile = await db.query.clientProfiles.findFirst({
  where: eq(clientProfiles.id, userId),
});

const personPayload = mapClientProfileToPerson(clientProfile);
// {
//   external_id: "usr_abc123",
//   name: "Jane Doe",
//   email: "jane@example.com",
//   job_title: "CTO",
//   company_name: "Acme Corp",
//   city: "San Francisco",
//   plan: "premium",
// }

// Map a company to a CRM company
const company = await db.query.companies.findFirst({
  where: eq(companies.id, companyId),
});

const companyPayload = mapCompanyToTwentyCompany(company);
// {
//   external_id: "comp_xyz789",
//   name: "Acme Corp",
//   domain_name: "acme.com",
//   website: "https://acme.com",
//   status: "active",
// }

// Use utility functions independently
const city = extractCityFromLocation("Berlin, Germany");
// "Berlin"

const validId = ensureExternalId(user.id, "User");
// "usr_abc123" or throws Error
```

## Najlepsze praktyki

- Zawsze używaj funkcji mapujących zamiast ręcznie konstruować ładunki CRM, aby zapewnić spójne nazewnictwo pól i bezpieczeństwo zerowe.
- Obsługuj `Error` wyrzucone przez `ensureExternalId()` w warstwie usług; zaloguj go i pomiń synchronizację CRM dla tego rekordu, zamiast zawieszać całą partię.
- Dodając nowe pola do mapera, postępuj według istniejącego schematu: przed przypisaniem do obiektu wyjściowego sprawdź poprawność.
- Pisz testy jednostkowe dla osób tworzących mapy, ponieważ są to czyste funkcje bez zależności, dzięki czemu można je łatwo testować w izolacji.
- Jeśli potrzebna jest nowa integracja z CRM, utwórz nowy plik mapowania (np. `hubspot.mapper.ts`) w tym samym katalogu, stosując te same wzorce.

## Powiązane moduły

- [Config Manager System](./config-manager-system) -- Konfiguracja integracji poprzez `configService.integrations`
- [Warstwa klienta API](/template/architecture/api-client-layer) -- Klient HTTP używany przez usługi CRM
