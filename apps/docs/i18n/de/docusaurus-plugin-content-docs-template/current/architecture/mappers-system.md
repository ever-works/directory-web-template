---
id: mappers-system
title: "Mappers-System"
sidebar_label: "Mappers-System"
sidebar_position: 48
---

# Mappers-System

## Übersicht

Das Mappers-System bietet reine, nebenwirkungsfreie Transformationsfunktionen, die interne Anwendungsdatenmodelle in externe CRM-Nutzlasten (Customer Relationship Management) umwandeln. Derzeit implementiert es Mapper für die Twenty CRM-Integration und konvertiert `ClientProfile`- und `Company`-Entitäten in Twenty-kompatible `Person`- und `Company`-Nutzlasten mit nullsicherer Feldzuordnung und erforderlicher Feldvalidierung.

## Architektur

Das Mapper-Modul befindet sich in `lib/mappers/` und folgt einem strikten Trennungsmuster:

- **Mapper** sind reine Funktionen: keine E/A, keine Datenbankaufrufe, keine HTTP-Anfragen.
- **Dienste** (in `lib/services/`) nutzen Mapper, um Daten vorzubereiten, bevor sie an externe APIs gesendet werden.
- **Typen** werden aus dem Datenbankschema (`lib/db/schema`) und CRM-Typdefinitionen (`lib/types/twenty-crm-entities.types`) importiert.

```
lib/mappers/
  |-- twenty-crm.mapper.ts
      |-- ensureExternalId()                (ID validation)
      |-- extractCityFromLocation()         (Location parsing)
      |-- mapClientProfileToPerson()        (ClientProfile -> TwentyPerson)
      |-- mapCompanyToTwentyCompany()       (Company -> TwentyCompany)
```

Der Datenfluss ist:

```
Database Entity  -->  Mapper Function  -->  CRM Payload  -->  Service  -->  External API
(ClientProfile)     (mapClientProfile     (TwentyPerson)  (CRM Service)  (Twenty CRM)
                     ToPerson)
```

## API-Referenz

### Exporte von `lib/mappers/twenty-crm.mapper.ts`

#### `ensureExternalId(id: string | undefined | null, entityType: string): string`

Überprüft, ob eine Entitäts-ID vorhanden und nicht leer ist. Dies ist eine wichtige Sicherheitsprüfung, die sicherstellt, dass jeder CRM-Datensatz über eine gültige `external_id`-Verknüpfung mit dem lokalen System verfügt.

**Parameter:**
- `id` – Die lokale Entitäts-ID (kann undefiniert oder null sein)
- `entityType` – Entitätstypname für Fehlermeldungen (z. B. `'ClientProfile'`)

**Rückgabe:** Gekürzte ID-Zeichenfolge

**Wirft aus:** `Error`, wenn die ID fehlt, null, undefiniert oder eine leere Zeichenfolge ist.

#### `extractCityFromLocation(location: string | undefined | null): string | null`

Analysiert eine Freiform-Standortzeichenfolge, um den Stadtnamen zu extrahieren. Behandelt verschiedene Formate durch Aufteilung nach Kommas und Übernahme des ersten Teils.

**Unterstützte Formate:**
- `"San Francisco"` --> `"San Francisco"`
- `"San Francisco, CA"` --> `"San Francisco"`
- `"San Francisco, CA, USA"` --> `"San Francisco"`

**Zurückgegeben:** Der Stadtname oder `null`, wenn der Standort leer/undefiniert ist.

#### `mapClientProfileToPerson(clientProfile: ClientProfile): TwentyPerson`

Ordnet eine lokale `ClientProfile` Datenbankentität einer Twenty CRM `Person` Nutzlast zu.

**Feldzuordnung:**

|ClientProfile-Feld|TwentyPerson-Feld|Erforderlich|
|--------------------|--------------------|----------|
|`id`|`external_id`|Ja (wird bei Fehlen ausgelöst)|
|`name`|`name`|Ja|
|`email`|`email`|Ja|
|`phone`|`phone`|Optional|
|`jobTitle`|`job_title`|Optional|
|`company`|`company_name`|Optional|
|`website`|`website`|Optional|
|`location`|`city` (extrahiert)|Optional|
|`accountType`|`account_type`|Optional|
|`plan`|`plan`|Optional|
|`totalSubmissions`|`total_submissions`|Optional|

**Rückgabe:** Ein `TwentyPerson`-Objekt mit nur ausgefüllten Feldern.

**Wirft:** `Error` wenn `clientProfile.id` fehlt.

#### `mapCompanyToTwentyCompany(company: Company): TwentyCompany`

Ordnet eine lokale `Company` Entität einer Twenty CRM `Company` Nutzlast zu.

**Feldzuordnung:**

|Firmenfeld|TwentyCompany-Feld|Erforderlich|
|--------------|---------------------|----------|
|`id`|`external_id`|Ja (wird bei Fehlen ausgelöst)|
|`name`|`name`|Ja|
|`domain`|`domain_name`|Optional|
|`website`|`website`|Optional|
|`status`|`status`|Optional|

**Rückgabe:** Ein `TwentyCompany`-Objekt mit nur ausgefüllten Feldern.

**Wirft:** `Error` wenn `company.id` fehlt.

## Implementierungsdetails

**Nullsichere Zuordnung**: Optionale Felder verwenden vor der Zuweisung explizite `if`-Prüfungen, um sicherzustellen, dass `null`, `undefined` und leere Werte niemals an das CRM gesendet werden. Dadurch bleiben die Nutzlasten sauber und es wird vermieden, dass vorhandene CRM-Daten mit Nullwerten überschrieben werden.

**Externe ID-Erzwingung**: Jeder Mapper ruft als ersten Vorgang `ensureExternalId()` auf. Dies löst sofort ungültige IDs aus und folgt einem Fail-Fast-Muster, das verwaiste Datensätze im CRM verhindert.

**Keine Mutation**: Mapper-Funktionen erstellen neue Objekte, anstatt die Eingabe zu ändern. Das Eingabeobjekt `ClientProfile` oder `Company` wird niemals geändert.

**Optionale Feldbereinigung**: Felder werden nur dann zum Ausgabeobjekt hinzugefügt, wenn sie wahrheitsgemäße Werte haben. Dadurch entstehen minimale Nutzlasten, die nur Nicht-Null-Felder im CRM aktualisieren.

**Heuristik zur Stadtextraktion**: Die Funktion `extractCityFromLocation()` verwendet einen einfachen Komma-Split-Ansatz. Dies verarbeitet die gängigsten Standortformate (Stadt, Stadt + Bundesland, Stadt + Bundesland + Land), versucht jedoch nicht, komplexe Adressformate zu analysieren.

## Konfiguration

Es ist keine Konfiguration erforderlich. Die Mapper sind reine Funktionen, die nur von ihren Eingabetypen abhängen. Die Twenty CRM-Verbindungskonfiguration (API-URL, Token) wird von der Integrationsdienstschicht verwaltet.

## Anwendungsbeispiele

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

## Best Practices

- Verwenden Sie immer die Mapper-Funktionen, anstatt CRM-Nutzlasten manuell zu erstellen, um eine konsistente Feldbenennung und Nullsicherheit sicherzustellen.
- Behandeln Sie das von `ensureExternalId()` ausgelöste `Error` auf der Serviceebene. Protokollieren Sie ihn und überspringen Sie die CRM-Synchronisierung für diesen Datensatz, anstatt den gesamten Stapel zum Absturz zu bringen.
- Befolgen Sie beim Hinzufügen neuer Felder zu einem Mapper das bestehende Muster: Überprüfen Sie die Felder auf Richtigkeit, bevor Sie sie dem Ausgabeobjekt zuweisen.
- Schreiben Sie Unit-Tests für Mapper, da es sich um reine Funktionen ohne Abhängigkeiten handelt, sodass sie leicht isoliert getestet werden können.
- Wenn eine neue CRM-Integration erforderlich ist, erstellen Sie nach denselben Mustern eine neue Mapper-Datei (z. B. `hubspot.mapper.ts`) im selben Verzeichnis.

## Verwandte Module

- [Config Manager System](./config-manager-system) – Integrationskonfiguration über `configService.integrations`
- [API-Client-Schicht](/template/architecture/api-client-layer) – HTTP-Client, der von CRM-Diensten verwendet wird
