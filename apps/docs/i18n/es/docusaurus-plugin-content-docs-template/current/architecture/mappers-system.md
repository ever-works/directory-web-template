---
id: mappers-system
title: "Sistema de mapeadores"
sidebar_label: "Sistema de mapeadores"
sidebar_position: 48
---

# Sistema de mapeadores

## Descripción general

Mappers System proporciona funciones de transformación puras y sin efectos secundarios que convierten los modelos de datos de aplicaciones internas en cargas útiles externas de CRM (Customer Relationship Management). Actualmente, implementa mapeadores para la integración de Twenty CRM, convirtiendo entidades `ClientProfile` y `Company` en cargas útiles `Person` y `Company` compatibles con Twenty con mapeo de campos seguros para nulos y validación de campos obligatorios.

## Arquitectura

El módulo de mapeadores vive en `lib/mappers/` y sigue un estricto patrón de separación de preocupaciones:

- Los **Mapeadores** son funciones puras: sin E/S, sin llamadas a bases de datos, sin solicitudes HTTP.
- **Los servicios** (en `lib/services/`) consumen mapeadores para preparar los datos antes de enviarlos a API externas.
- Los **tipos** se importan desde el esquema de la base de datos (`lib/db/schema`) y las definiciones de tipos de CRM (`lib/types/twenty-crm-entities.types`).

```
lib/mappers/
  |-- twenty-crm.mapper.ts
      |-- ensureExternalId()                (ID validation)
      |-- extractCityFromLocation()         (Location parsing)
      |-- mapClientProfileToPerson()        (ClientProfile -> TwentyPerson)
      |-- mapCompanyToTwentyCompany()       (Company -> TwentyCompany)
```

El flujo de datos es:

```
Database Entity  -->  Mapper Function  -->  CRM Payload  -->  Service  -->  External API
(ClientProfile)     (mapClientProfile     (TwentyPerson)  (CRM Service)  (Twenty CRM)
                     ToPerson)
```

## Referencia de API

### Exportaciones desde `lib/mappers/twenty-crm.mapper.ts`

#### `ensureExternalId(id: string | undefined | null, entityType: string): string`

Valida que un ID de entidad esté presente y no esté vacío. Esta es una verificación de seguridad crítica que garantiza que cada registro de CRM tenga un vínculo `external_id` válido con el sistema local.

**Parámetros:**
- `id` -- El ID de la entidad local (puede no estar definido o ser nulo)
- `entityType` -- Nombre del tipo de entidad para mensajes de error (por ejemplo, `'ClientProfile'`)

**Devoluciones:** Cadena de identificación recortada

**Lanza:** `Error` si falta el ID, es nulo, no está definido o es una cadena vacía.

#### `extractCityFromLocation(location: string | undefined | null): string | null`

Analiza una cadena de ubicación de formato libre para extraer el nombre de la ciudad. Maneja varios formatos dividiéndolos por comas y tomando la primera parte.

**Formatos admitidos:**
- `"San Francisco"` --> `"San Francisco"`
- `"San Francisco, CA"` --> `"San Francisco"`
- `"San Francisco, CA, USA"` --> `"San Francisco"`

**Devuelve:** El nombre de la ciudad o `null` si la ubicación está vacía/indefinida.

#### `mapClientProfileToPerson(clientProfile: ClientProfile): TwentyPerson`

Asigna una entidad de base de datos `ClientProfile` local a una carga útil de Twenty CRM `Person`.

**Mapeo de campo:**

|Campo de perfil de cliente|Campo de veinte personas|Requerido|
|--------------------|--------------------|----------|
|`id`|`external_id`|Sí (tira si falta)|
|`name`|`name`|si|
|`email`|`email`|si|
|`phone`|`phone`|Opcional|
|`jobTitle`|`job_title`|Opcional|
|`company`|`company_name`|Opcional|
|`website`|`website`|Opcional|
|`location`|`city` (extraído)|Opcional|
|`accountType`|`account_type`|Opcional|
|`plan`|`plan`|Opcional|
|`totalSubmissions`|`total_submissions`|Opcional|

**Devuelve:** Un objeto `TwentyPerson` con solo campos completos.

**Lanza:** `Error` si falta `clientProfile.id`.

#### `mapCompanyToTwentyCompany(company: Company): TwentyCompany`

Asigna una entidad `Company` local a una carga útil de Twenty CRM `Company`.

**Mapeo de campo:**

|Campo de la empresa|Campo TwentyCompany|Requerido|
|--------------|---------------------|----------|
|`id`|`external_id`|Sí (tira si falta)|
|`name`|`name`|si|
|`domain`|`domain_name`|Opcional|
|`website`|`website`|Opcional|
|`status`|`status`|Opcional|

**Devuelve:** Un objeto `TwentyCompany` con solo campos completos.

**Lanza:** `Error` si falta `company.id`.

## Detalles de implementación

**Asignación segura para nulos**: los campos opcionales utilizan comprobaciones `if` explícitas antes de la asignación, lo que garantiza que `null`, `undefined` y los valores vacíos nunca se envíen al CRM. Esto mantiene limpias las cargas útiles y evita sobrescribir datos de CRM existentes con valores nulos.

**Aplicación de identificación externa**: cada asignador llama a `ensureExternalId()` como su primera operación. Esto genera inmediatamente ID no válidas, siguiendo un patrón rápido que evita registros huérfanos en CRM.

**Sin mutación**: las funciones del asignador crean nuevos objetos en lugar de modificar la entrada. El objeto de entrada `ClientProfile` o `Company` nunca se modifica.

**Poda de campos opcional**: los campos solo se agregan al objeto de salida cuando tienen valores verdaderos. Esto produce cargas útiles mínimas que solo actualizan campos no nulos en CRM.

**Heurística de extracción de ciudades**: la función `extractCityFromLocation()` utiliza un enfoque simple de división por comas. Esto maneja los formatos de ubicación más comunes (Ciudad, Ciudad + Estado, Ciudad + Estado + País) pero no intenta analizar formatos de direcciones complejos.

## Configuración

No se requiere configuración. Los mapeadores son funciones puras que dependen únicamente de sus tipos de entrada. La configuración de conexión de Twenty CRM (URL de API, tokens) es administrada por la capa de servicio de integración.

## Ejemplos de uso

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

## Mejores prácticas

- Utilice siempre las funciones del asignador en lugar de construir manualmente cargas útiles de CRM para garantizar una denominación de campos coherente y seguridad nula.
- Manejar el `Error` lanzado por `ensureExternalId()` en la capa de servicio; regístrelo y omita la sincronización de CRM para ese registro en lugar de bloquear todo el lote.
- Al agregar nuevos campos a un asignador, siga el patrón existente: verifique la veracidad antes de asignarlos al objeto de salida.
- Escriba pruebas unitarias para mapeadores, ya que son funciones puras sin dependencias, lo que las hace fáciles de probar de forma aislada.
- Si se necesita una nueva integración de CRM, cree un nuevo archivo asignador (por ejemplo, `hubspot.mapper.ts`) en el mismo directorio siguiendo los mismos patrones.

## Módulos relacionados

- [Sistema de administrador de configuración] (./config-manager-system) - Configuración de integración a través de `configService.integrations`
- [Capa de cliente API](/template/architecture/api-client-layer) -- Cliente HTTP utilizado por los servicios CRM
