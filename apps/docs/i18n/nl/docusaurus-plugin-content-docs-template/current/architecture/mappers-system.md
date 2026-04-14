---
id: mappers-system
title: "Mappers-systeem"
sidebar_label: "Mappers-systeem"
sidebar_position: 48
---

# Mappers-systeem

## Overzicht

Het Mappers-systeem biedt pure transformatiefuncties zonder bijwerkingen die interne applicatiedatamodellen omzetten in externe CRM-payloads (Customer Relationship Management). Momenteel implementeert het mappers voor de Twenty CRM-integratie, waarbij `ClientProfile` en `Company` entiteiten worden geconverteerd naar Twenty-compatibele `Person` en `Company` payloads met nulveilige veldtoewijzing en validatie van vereiste velden.

## Architectuur

De mappers-module bevindt zich in `lib/mappers/` en volgt een strikt scheidingspatroon:

- **Mappers** zijn pure functies: geen I/O, geen databaseoproepen, geen HTTP-verzoeken.
- **Services** (in `lib/services/`) gebruiken mappers om gegevens voor te bereiden voordat deze naar externe API's worden verzonden.
- **Typen** worden geïmporteerd uit het databaseschema (`lib/db/schema`) en CRM-typedefinities (`lib/types/twenty-crm-entities.types`).

```
lib/mappers/
  |-- twenty-crm.mapper.ts
      |-- ensureExternalId()                (ID validation)
      |-- extractCityFromLocation()         (Location parsing)
      |-- mapClientProfileToPerson()        (ClientProfile -> TwentyPerson)
      |-- mapCompanyToTwentyCompany()       (Company -> TwentyCompany)
```

De gegevensstroom is:

```
Database Entity  -->  Mapper Function  -->  CRM Payload  -->  Service  -->  External API
(ClientProfile)     (mapClientProfile     (TwentyPerson)  (CRM Service)  (Twenty CRM)
                     ToPerson)
```

## API-referentie

### Exporteert vanuit `lib/mappers/twenty-crm.mapper.ts`

#### `ensureExternalId(id: string | undefined | null, entityType: string): string`

Valideert dat een entiteits-ID aanwezig en niet leeg is. Dit is een cruciale veiligheidscontrole die ervoor zorgt dat elk CRM-record een geldige `external_id` heeft die teruglinkt naar het lokale systeem.

**Parameters:**
- `id` -- De lokale entiteits-ID (kan ongedefinieerd of nul zijn)
- `entityType` -- Naam van het entiteitstype voor foutmeldingen (bijvoorbeeld `'ClientProfile'`)

**Retourzendingen:** Bijgesneden ID-tekenreeks

**Gooit:** `Error` als de ID ontbreekt, null, ongedefinieerd of een lege tekenreeks is.

#### `extractCityFromLocation(location: string | undefined | null): string | null`

Parseert een locatietekenreeks in vrije vorm om de stadsnaam te extraheren. Verwerkt verschillende formaten door te splitsen op komma's en het eerste deel te nemen.

**Ondersteunde formaten:**
- `"San Francisco"` --> `"San Francisco"`
- `"San Francisco, CA"` --> `"San Francisco"`
- `"San Francisco, CA, USA"` --> `"San Francisco"`

**Retourneert:** De stadsnaam of `null` als de locatie leeg/ongedefinieerd is.

#### `mapClientProfileToPerson(clientProfile: ClientProfile): TwentyPerson`

Wijst een lokale `ClientProfile` database-entiteit toe aan een Twenty CRM `Person` payload.

**Veldtoewijzing:**

|Klantprofielveld|TwentyPerson-veld|Vereist|
|--------------------|--------------------|----------|
|`id`|`external_id`|Ja (gooit indien ontbrekend)|
|`name`|`name`|Ja|
|`email`|`email`|Ja|
|`phone`|`phone`|Optioneel|
|`jobTitle`|`job_title`|Optioneel|
|`company`|`company_name`|Optioneel|
|`website`|`website`|Optioneel|
|`location`|`city` (geëxtraheerd)|Optioneel|
|`accountType`|`account_type`|Optioneel|
|`plan`|`plan`|Optioneel|
|`totalSubmissions`|`total_submissions`|Optioneel|

**Retourneert:** Een `TwentyPerson`-object met alleen ingevulde velden.

**Gooit:** `Error` als `clientProfile.id` ontbreekt.

#### `mapCompanyToTwentyCompany(company: Company): TwentyCompany`

Wijst een lokale `Company` entiteit toe aan een Twenty CRM `Company` payload.

**Veldtoewijzing:**

|Bedrijfsveld|Twintig bedrijvenveld|Vereist|
|--------------|---------------------|----------|
|`id`|`external_id`|Ja (gooit indien ontbrekend)|
|`name`|`name`|Ja|
|`domain`|`domain_name`|Optioneel|
|`website`|`website`|Optioneel|
|`status`|`status`|Optioneel|

**Retourneert:** Een `TwentyCompany`-object met alleen ingevulde velden.

**Gooit:** `Error` als `company.id` ontbreekt.

## Implementatiedetails

**Null-safe mapping**: Optionele velden gebruiken expliciete `if`-controles vóór toewijzing, zodat `null`, `undefined` en lege waarden nooit naar de CRM worden verzonden. Hierdoor blijven de payloads schoon en wordt voorkomen dat bestaande CRM-gegevens met nulwaarden worden overschreven.

**Externe ID-afdwinging**: elke mapper belt `ensureExternalId()` als eerste handeling. Dit genereert onmiddellijk ongeldige ID's, volgens een fail-fast patroon dat verweesde records in de CRM voorkomt.

**Geen mutatie**: Mapper-functies creëren nieuwe objecten in plaats van de invoer te wijzigen. Het invoerobject `ClientProfile` of `Company` wordt nooit gewijzigd.

**Optioneel veldopschonen**: velden worden alleen aan het uitvoerobject toegevoegd als ze waarheidsgetrouwe waarden hebben. Dit levert minimale payloads op die alleen niet-null-velden in de CRM bijwerken.

**Heuristiek voor stadsextractie**: De functie `extractCityFromLocation()` maakt gebruik van een eenvoudige komma-splitsing. Dit verwerkt de meest voorkomende locatieformaten (stad, stad + staat, stad + staat + land), maar er wordt niet geprobeerd complexe adresformaten te ontleden.

## Configuratie

Er is geen configuratie vereist. De mappers zijn pure functies die alleen afhankelijk zijn van hun invoertypes. De Twenty CRM-verbindingsconfiguratie (API-URL, tokens) wordt beheerd door de integratieservicelaag.

## Gebruiksvoorbeelden

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

## Beste praktijken

- Gebruik altijd de mapper-functies in plaats van handmatig CRM-payloads samen te stellen om consistente veldnaamgeving en nulveiligheid te garanderen.
- Behandel de `Error` die door `ensureExternalId()` op de servicelaag wordt gegooid; log het in en sla de CRM-synchronisatie voor dat record over in plaats van de hele batch te laten crashen.
- Wanneer u nieuwe velden aan een mapper toevoegt, volgt u het bestaande patroon: controleer op waarheidsgetrouwheid voordat u deze aan het uitvoerobject toewijst.
- Schrijf unit-tests voor mappers, omdat het pure functies zijn zonder afhankelijkheden, waardoor ze gemakkelijk afzonderlijk kunnen worden getest.
- Als een nieuwe CRM-integratie nodig is, maakt u een nieuw mapper-bestand (bijvoorbeeld `hubspot.mapper.ts`) in dezelfde map, volgens dezelfde patronen.

## Gerelateerde modules

- [Config Manager System](./config-manager-system) -- Integratieconfiguratie via `configService.integrations`
- [API Client Layer](/template/architecture/api-client-layer) -- HTTP-client gebruikt door CRM-services
