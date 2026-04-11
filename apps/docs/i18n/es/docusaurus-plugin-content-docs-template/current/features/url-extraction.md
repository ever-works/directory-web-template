---
id: url-extraction
title: Sistema de extracción de URL
sidebar_label: Extracción de URL
sidebar_position: 13
---

# Sistema de extracción de URL

La plantilla Ever Works incluye un sistema de extracción de URL impulsado por IA que extrae automáticamente metadatos de las URL, incluidos nombres de productos, descripciones, categorías, etiquetas, información de marca e imágenes. Esta característica agiliza el proceso de envío de artículos al completar automáticamente los campos del formulario desde una URL proporcionada.

## Descripción general de la arquitectura

| Componente | Camino | Propósito |
|---|---|---|
| `useUrlExtraction` gancho | `hooks/use-url-extraction.ts` | Gancho React del lado del cliente para activar la extracción |
| `/api/extract` punto final | `app/api/extract/` | Ruta API del lado del servidor que realiza la extracción real |

## Cómo funciona

1. El usuario proporciona una URL en el formulario de envío.
2. El gancho `useUrlExtraction` envía la URL al punto final `/api/extract` .
3. El servidor extrae metadatos (nombre, descripción, categoría, etiquetas, marca, imágenes)
4. Los datos extraídos se devuelven y se pueden utilizar para completar automáticamente los campos del formulario.

## El gancho `useUrlExtraction` ### Interfaz

```tsx
interface ExtractionResult {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  brand?: string;
  brand_logo_url?: string;
  images?: string[];
}

interface UseUrlExtractionReturn {
  isLoading: boolean;
  extractFromUrl: (url: string, existingCategories?: string[]) => Promise<ExtractionResult | null>;
}
```

### Uso

```tsx
import { useUrlExtraction } from '@/hooks/use-url-extraction';

function SubmitForm() {
  const { isLoading, extractFromUrl } = useUrlExtraction();

  const handleUrlSubmit = async (url: string) => {
    const existingCategories = ['Project Management', 'Time Tracking', 'CRM'];
    const result = await extractFromUrl(url, existingCategories);

    if (result) {
      // Auto-fill form fields with extracted data
      setFormData({
        name: result.name,
        description: result.description,
        category: result.category || '',
        tags: result.tags || [],
      });
    }
  };

  return (
    <div>
      <input
        type="url"
        placeholder="Enter product URL..."
        onBlur={(e) => handleUrlSubmit(e.target.value)}
      />
      {isLoading && <span>Extracting data...</span>}
    </div>
  );
}
```

## Campos de datos extraídos

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | `string` | Nombre del producto o servicio extraído de la página |
| `description` | `string` | Descripción del producto o meta descripción |
| `category` | `string?` | Categoría sugerida, comparada con categorías existentes cuando se proporcionen |
| `tags` | `string[]?` | Etiquetas relevantes extraídas del contenido de la página |
| `brand` | `string?` | Marca o nombre de la empresa |
| `brand_logo_url` | `string?` | URL a la imagen del logotipo de la marca |
| `images` | `string[]?` | Conjunto de URL de imágenes relevantes encontradas en la página |

## Coincidencia de categorías

La función `extractFromUrl` acepta un parámetro `existingCategories` opcional. Cuando se proporciona, la API de extracción intenta hacer coincidir el contenido extraído con estas categorías, asegurando que la categoría sugerida se alinee con la taxonomía del sitio:

```tsx
const existingCategories = ['Analytics', 'Marketing', 'Development'];
const result = await extractFromUrl('https://example.com/product', existingCategories);
// result.category will be one of the existing categories if a match is found
```

## Manejo de errores

El gancho implementa múltiples capas de manejo de errores:

| Escenario | Comportamiento |
|---|---|
| URL vacía | Genera un error con "No se proporcionó ninguna URL" |
| Error de solicitud HTTP | Error de registro, muestra notificación del sistema |
| Función deshabilitada | Devuelve `null` silenciosamente (degradación elegante) |
| Fallo de API | Error de registro, muestra brindis con mensaje |
| Error inesperado | Detecta todos los errores, muestra el brindis genérico y devuelve `null` |

### Degradación elegante

El sistema admite una degradación gradual cuando la función de extracción no está configurada:

```tsx
// Server response when feature is disabled
if (response.data.featureDisabled) {
  // Returns null without showing an error
  return null;
}
```

Esto permite que el formulario de envío funcione normalmente incluso si el servicio de extracción de IA no está configurado, simplemente omitiendo el paso de autocompletar.

## Integración de consultas de reacción

El gancho utiliza `useMutation` de TanStack Query para gestionar la solicitud de extracción:

```tsx
const mutation = useMutation({
  mutationFn: async ({ url, existingCategories }) => {
    const response = await serverClient.post('/api/extract', {
      url,
      existingCategories
    });
    // ... validation and error handling
    return response.data.data;
  },
  onError: (error) => {
    toast.error(error.message || 'Failed to extract data from URL');
  }
});
```

Beneficios de usar `useMutation` :
- Gestión automática del estado de carga a través de `isPending` - Manejo de errores incorporado con devolución de llamada `onError` - API basada en promesas a través de `mutateAsync` ## Integración con el formulario de envío

La extracción de URL normalmente se integra en el flujo de envío de elementos:

```tsx
function ItemSubmitForm() {
  const { isLoading, extractFromUrl } = useUrlExtraction();
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', tags: []
  });

  const handleUrlChange = async (url: string) => {
    if (!url) return;

    const result = await extractFromUrl(url, availableCategories);
    if (result) {
      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        description: result.description || prev.description,
        category: result.category || prev.category,
        tags: result.tags?.length ? result.tags : prev.tags,
      }));
    }
  };

  return (
    <form>
      <input
        name="url"
        placeholder="Product URL"
        onBlur={(e) => handleUrlChange(e.target.value)}
        disabled={isLoading}
      />
      {/* Form fields auto-populated from extraction */}
    </form>
  );
}
```

## Cliente API

El enlace utiliza el `serverClient` de la plantilla para la comunicación HTTP:

```tsx
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

// POST request to the extraction endpoint
const response = await serverClient.post('/api/extract', { url, existingCategories });

// Response validation
if (!apiUtils.isSuccess(response)) {
  throw new Error(apiUtils.getErrorMessage(response));
}
```

## Archivos clave

| Archivo | Camino |
|---|---|
| Gancho de extracción de URL | `hooks/use-url-extraction.ts` |
| Extraer ruta API | `app/api/extract/route.ts` |
| Cliente API del servidor | `lib/api/server-api-client.ts` |
