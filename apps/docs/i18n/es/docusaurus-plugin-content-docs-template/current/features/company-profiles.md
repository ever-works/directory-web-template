---
id: company-profiles
title: Perfiles de empresa
sidebar_label: Perfiles de empresa
sidebar_position: 16
---

# Perfiles de empresa

La plantilla Ever Works incluye un sistema completo de gestión de empresas que permite a los administradores crear, gestionar y asociar empresas con elementos enumerados. El sistema admite la deduplicación inteligente mediante la coincidencia de nombres y dominios, listados paginados con búsqueda y una relación uno a uno entre artículos y empresas.

## Descripción general de la arquitectura

| Componente | Camino | Propósito |
|---|---|---|
| `useItemCompany` | `hooks/use-item-company.ts` | Gancho de cliente para asociaciones de empresas y artículos |
| `company.service.ts` | `lib/services/company.service.ts` | Lógica empresarial para la creación y deduplicación de empresas |
| `company.queries.ts` | `lib/db/queries/company.queries.ts` | Consultas a bases de datos para empresas CRUD y asociaciones |
| `company.ts` | `types/company.ts` | Definiciones de tipos de TypeScript |
| `company.ts` | `lib/validations/company.ts` | Esquemas de validación de Zod |
| `CompanySelector` | `components/admin/companies/company-selector.tsx` | Menú desplegable del selector de empresas |
| `CompanyModal` | `components/admin/companies/company-modal.tsx` | Crear/editar modal de empresa |
| `CompanyStats` | `components/admin/companies/company-stats.tsx` | Visualización de estadísticas de la empresa |
| `ItemCompanyManager` | `components/admin/items/item-company-manager.tsx` | Gestionar asociaciones artículo-empresa |

## Modelo de datos de la empresa

```tsx
// types/company.ts
type Company = {
  id: string;
  name: string;
  website: string | null;
  domain: string | null;
  slug: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};
```

| Campo | Descripción |
|---|---|
| `id` | Identificador único (UUID) |
| `name` | Nombre para mostrar de la empresa |
| `website` | URL completa del sitio web |
| `domain` | Dominio normalizado (por ejemplo, `example.com` ) para deduplicación |
| `slug` | Slug seguro para URL generado a partir del nombre |
| `status` | Estado activo o inactivo |

## Servicio de empresa

El `company.service.ts` proporciona lógica empresarial para la creación de empresas con deduplicación integrada.

### Estrategia de deduplicación

El servicio utiliza una estrategia de búsqueda de tres pasos antes de crear una nueva empresa:

1. **Búsqueda de dominio** (principal): más confiable para identificar la misma empresa
2. **Búsqueda de nombre** (alternativa): coincidencia exacta con el nombre de la empresa
3. **Crear nuevo**: solo si ambas búsquedas fallan

```tsx
import { getOrCreateCompanyFromBrand } from '@/lib/services/company.service';

// Automatically deduplicates: finds existing or creates new
const company = await getOrCreateCompanyFromBrand('Acme Corp', 'https://acme.com/product');
```

### Creación a partir de datos del cliente

```tsx
import { getOrCreateCompanyFromClient } from '@/lib/services/company.service';

const company = await getOrCreateCompanyFromClient({
  name: 'Acme Corp',
  website: 'https://www.acme.com'
});
// Returns existing company if domain "acme.com" or name "Acme Corp" already exists
```

### Extracción de dominio

El servicio normaliza las URL para extraer dominios limpios:

```tsx
// Internal function behavior:
extractDomain('https://www.Example.COM/path')  // 'example.com'
extractDomain('Example.com')                    // 'example.com'
extractDomain('http://sub.example.com/page')    // 'sub.example.com'
```

### Generación de babosas

Los slugs se generan automáticamente a partir de nombres de empresas:

```tsx
generateSlug('Acme Corp!')     // 'acme-corp'
generateSlug('example.com')    // 'example-com'
// Max length: 50 characters
```

## Consultas de bases de datos

El módulo `company.queries.ts` proporciona operaciones CRUD integrales:

### Empresa CRUD

| Función | Descripción |
|---|---|
| `createCompany(data)` | Crear una nueva empresa |
| `getCompanyById(id)` | Obtener compañía por UUID |
| `getCompanyBySlug(slug)` | Obtener compañía por slug (no distingue entre mayúsculas y minúsculas) |
| `getCompanyByDomain(domain)` | Obtener empresa por dominio (no distingue entre mayúsculas y minúsculas) |
| `getCompanyByName(name)` | Obtener empresa por nombre exacto (no distingue entre mayúsculas y minúsculas) |
| `updateCompany(id, data)` | Actualizar campos de empresa |
| `deleteCompany(id)` | Eliminar una empresa |

### Listado de empresas

```tsx
import { listCompanies } from '@/lib/db/queries/company.queries';

const result = await listCompanies({
  page: 1,
  limit: 10,
  search: 'acme',           // Searches name and domain
  status: 'active',
  sortBy: 'createdAt',      // 'name' | 'createdAt' | 'updatedAt'
  sortOrder: 'desc'
});

// Returns: { companies, total, page, totalPages, limit, activeCount, inactiveCount }
```

### Asociaciones de artículos y empresas

Cada elemento se puede vincular a exactamente una empresa. La asociación se gestiona a través de la tabla de unión `itemsCompanies` :

| Función | Descripción |
|---|---|
| `linkItemToCompany(itemSlug, companyId)` | Enlace idempotente (crea o actualiza) |
| `unlinkItemFromCompany(itemSlug)` | Desvinculación idempotente |
| `getCompanyByItemSlug(itemSlug)` | Conseguir empresa para un artículo |
| `listItemsByCompany(companyId, params)` | Listar artículos pertenecientes a una empresa |
| `itemHasCompany(itemSlug)` | Compruebe si el artículo tiene una empresa |
| `getCompaniesWithItemCount(params)` | Listar empresas con sus recuentos de artículos |

La función `linkItemToCompany` es idempotente:
- Si no existe asociación, se crea una.
- Si la misma empresa ya está vinculada, devuelve la asociación existente.
- Si se vincula una empresa diferente, actualiza la asociación.

## El gancho `useItemCompany` El enlace del lado del cliente proporciona gestión empresarial basada en React Query para elementos:

```tsx
import { useItemCompany } from '@/hooks/use-item-company';

function ItemCompanyManager({ itemSlug }) {
  const {
    company,       // Current company or null
    isLoading,     // Loading state
    isAssigning,   // Assignment in progress
    isRemoving,    // Removal in progress
    assignCompany, // Assign company by ID
    removeCompany, // Remove company association
    refetch        // Refresh data
  } = useItemCompany({ itemSlug, enabled: true });

  const handleAssign = async (companyId: string) => {
    const success = await assignCompany(companyId);
    if (success) console.log('Company assigned!');
  };

  return (
    <div>
      {company ? (
        <div>
          <span>Company: {company.name}</span>
          <button onClick={removeCompany}>Remove</button>
        </div>
      ) : (
        <CompanySelector onSelect={(id) => handleAssign(id)} />
      )}
    </div>
  );
}
```

### Configuración de almacenamiento en caché

| Configuración | Valor |
|---|---|
| `staleTime` | 5 minutos |
| `gcTime` | 10 minutos |
| `retry` | 2 intentos |

### Puntos finales API

El gancho se comunica con los siguientes puntos finales REST:

| Método | Punto final | Descripción |
|---|---|---|
| `GET` | `/api/items/{slug}/company` | Obtener la empresa actual de un artículo |
| `POST` | `/api/items/{slug}/company` | Asignar una empresa a un artículo |
| `DELETE` | `/api/items/{slug}/company` | Eliminar empresa de un artículo |

## Componentes de administración

### Selector de empresas

Un componente desplegable para seleccionar empresas existentes:

```tsx
<CompanySelector onSelect={(companyId) => handleSelect(companyId)} />
```

### Modalidad de empresa

Un modal para crear o editar empresas:

```tsx
<CompanyModal
  isOpen={isOpen}
  onClose={onClose}
  company={existingCompany}  // null for create mode
  onSave={(data) => handleSave(data)}
/>
```

### Estadísticas de la empresa

Muestra estadísticas agregadas:

```tsx
<CompanyStats />
// Shows: total companies, active count, inactive count
```

## Archivos clave

| Archivo | Camino |
|---|---|
| Gancho de la empresa del artículo | `hooks/use-item-company.ts` |
| Servicio de empresa | `lib/services/company.service.ts` |
| Consultas sobre la empresa | `lib/db/queries/company.queries.ts` |
| Tipos de empresas | `types/company.ts` |
| Validaciones de Empresa | `lib/validations/company.ts` |
| Selector de empresas | `components/admin/companies/company-selector.tsx` |
| Modalidad de empresa | `components/admin/companies/company-modal.tsx` |
| Gerente de la empresa de artículos | `components/admin/items/item-company-manager.tsx` |
