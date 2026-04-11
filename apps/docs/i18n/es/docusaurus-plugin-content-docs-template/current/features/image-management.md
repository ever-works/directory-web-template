---
id: image-management
title: Gestión de imágenes
sidebar_label: Gestión de imágenes
sidebar_position: 21
---

# Gestión de imágenes

La plantilla Ever Works incluye un sistema de administración de dominios de imágenes que controla qué hosts de imágenes externos están permitidos para la optimización de imágenes Next.js. El sistema mantiene listas de dominios seleccionadas para proveedores de imágenes y servicios de íconos comunes, proporciona administración de dominios en tiempo de ejecución, validación de URL y genera configuración `remotePatterns` para `next.config.js` .

## Descripción general de la arquitectura

| Componente | Camino | Propósito |
|---|---|---|
| `image-domains.ts` | `lib/utils/image-domains.ts` | Listas de dominios principales, generación de patrones y utilidades de validación |
| `useImageDomains` | `hooks/use-image-domains.ts` | Gancho de reacción para gestionar dominios en tiempo de ejecución |
| `useImageValidation` | `hooks/use-image-domains.ts` | Gancho de reacción para validar las URL de imágenes con dominios permitidos |

## Dominios preconfigurados

El sistema viene con dos listas de dominios seleccionados:

### Dominios de imágenes comunes

Estos son servicios de alojamiento de imágenes estándar que se utilizan para avatares de usuarios e imágenes de contenido:

| Dominio | Propósito |
|---|---|
| `lh3.googleusercontent.com` | Imágenes de perfil de usuario de Google |
| `avatars.githubusercontent.com` | Avatares de usuarios de GitHub |
| `platform-lookaside.fbsbx.com` | Imágenes de perfil de Facebook |
| `pbs.twimg.com` | Imágenes de perfil de Twitter/X |
| `images.unsplash.com` | Fotografía de stock sin salpicar |

### Dominios de iconos

Servicios dedicados de iconos y activos de diseño:

| Dominio | Propósito |
|---|---|
| `flaticon.com` | Iconos Flaticon |
| `iconify.design` | Biblioteca de iconos Iconify |
| `icons8.com` | Activos de Icons8 |
| `feathericons.com` | Conjunto de iconos de plumas |
| `heroicons.com` | Biblioteca Heroiconos |
| `tabler-icons.io` | Iconos de mesa |

## Patrones remotos de Next.js

La función `generateImageRemotePatterns` crea la matriz `remotePatterns` para la configuración de la imagen Next.js:

```tsx
import { generateImageRemotePatterns } from '@/lib/utils/image-domains';

// next.config.js
module.exports = {
  images: {
    remotePatterns: generateImageRemotePatterns()
  }
};
```

### Patrones generados

La función produce dos tipos de patrones:

1. **Patrones específicos** con nombres de ruta restringidos para servicios conocidos:

```tsx
{
  protocol: 'https',
  hostname: 'lh3.googleusercontent.com',
  pathname: '/a/**'
}
```

2. **Patrones comodín** para subdominios de todos los dominios registrados:

```tsx
{
  protocol: 'https',
  hostname: '*.flaticon.com',
  pathname: '/**'
}
```

## Validación de dominio

### `isAllowedImageDomain` Comprueba si el nombre de host de una URL está en la lista de dominios permitidos:

```tsx
import { isAllowedImageDomain } from '@/lib/utils/image-domains';

isAllowedImageDomain('https://images.unsplash.com/photo-123')  // true
isAllowedImageDomain('https://cdn.flaticon.com/icons/svg/123')  // true (subdomain match)
isAllowedImageDomain('https://evil-site.com/image.jpg')         // false
isAllowedImageDomain('/local/image.png')                        // true (non-HTTP URLs pass)
```

La función realiza tres niveles de coincidencia:

| Consultar | Descripción |
|---|---|
| Coincidencia exacta | El nombre de host coincide exactamente con un dominio en cualquiera de las listas |
| Coincidencia de subdominio | El nombre de host termina en `.{domain}` para cualquier dominio registrado |
| Pase no HTTP | Las URL sin prefijo `http://` o `https://` siempre pasan |

### `isValidImageUrl` Valida si una cadena es una URL de imagen estructuralmente válida:

```tsx
import { isValidImageUrl } from '@/lib/utils/image-domains';

isValidImageUrl('https://example.com/image.png')  // true
isValidImageUrl('/local/image.png')                // true (relative URLs allowed)
isValidImageUrl('')                                // false
isValidImageUrl('not-a-url')                       // false
```

### `isProblematicUrl` Detecta URL que probablemente no sean enlaces de imágenes directos:

```tsx
import { isProblematicUrl } from '@/lib/utils/image-domains';

isProblematicUrl('https://flaticon.com/icone-gratuite/some-page')  // true (page, not image)
isProblematicUrl('https://example.com?related_id=123')              // true (redirect URL)
isProblematicUrl('https://example.com/photo.jpg')                   // false (valid image extension)
```

| Regla de detección | Descripción |
|---|---|
| URL de páginas de Flaticon | URL con ruta `/icone-gratuite/` en flaticon.com |
| Parámetros de redireccionamiento | URL que contienen `related_id=` o `origin=` parámetros de consulta |
| Falta extensión de imagen | URL sin `.jpg` , `.jpeg` , `.png` , `.gif` , `.webp` , `.svg` o `.ico` |

### `shouldShowFallback` Determina si se mostrará un icono alternativo en lugar de una imagen:

```tsx
import { shouldShowFallback } from '@/lib/utils/image-domains';

shouldShowFallback('')                                    // true (empty URL)
shouldShowFallback('https://flaticon.com/page/123')       // true (problematic)
shouldShowFallback('https://example.com/icon.png')        // false (valid image)
```

## Gestión de dominios en tiempo de ejecución

### Agregar dominios

```tsx
import { addImageDomain } from '@/lib/utils/image-domains';

// Add as a common image domain
addImageDomain('cdn.example.com');

// Add as an icon domain
addImageDomain('my-icons.example.com', true);
```

La función es idempotente: agregar un dominio ya registrado no tiene ningún efecto.

### Eliminación de dominios

```tsx
import { removeImageDomain } from '@/lib/utils/image-domains';

removeImageDomain('cdn.example.com');
// Removes from both COMMON_IMAGE_DOMAINS and ICON_DOMAINS
```

### Obteniendo todos los dominios

```tsx
import { getAllowedDomains } from '@/lib/utils/image-domains';

const { common, icons } = getAllowedDomains();
// common: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', ...]
// icons: ['flaticon.com', 'iconify.design', ...]
```

Devuelve copias de las matrices de dominio, evitando mutaciones externas.

## El gancho `useImageDomains` Un gancho de React para administrar dominios de imágenes con sincronización de estado:

```tsx
import { useImageDomains } from '@/hooks/use-image-domains';

function ImageDomainManager() {
  const { domains, addDomain, removeDomain, checkDomain } = useImageDomains();

  return (
    <div>
      <h3>Common Domains ({domains.common.length})</h3>
      <ul>
        {domains.common.map(domain => (
          <li key={domain}>
            {domain}
            <button onClick={() => removeDomain(domain)}>Remove</button>
          </li>
        ))}
      </ul>

      <h3>Icon Domains ({domains.icons.length})</h3>
      <ul>
        {domains.icons.map(domain => (
          <li key={domain}>{domain}</li>
        ))}
      </ul>

      <button onClick={() => addDomain('cdn.new-service.com')}>
        Add Domain
      </button>
    </div>
  );
}
```

### API de enlace

| Método | Parámetros | Descripción |
|---|---|---|
| `domains` | -- | Estado actual: `{ common: string[], icons: string[] }` |
| `addDomain` | `(domain: string, isIconDomain?: boolean)` | Agregar un dominio y actualizar el estado |
| `removeDomain` | `(domain: string)` | Eliminar un dominio (normaliza la entrada) y actualizar el estado |
| `checkDomain` | `(url: string)` | Comprobar si el dominio de una URL está permitido |

El método `removeDomain` normaliza la entrada recortando espacios en blanco, minúsculas y eliminando prefijos comodín ( `*.` ).

## El gancho `useImageValidation` Un gancho ligero para validar las URL de imágenes con la lista de dominios permitidos:

```tsx
import { useImageValidation } from '@/hooks/use-image-domains';

function ImageUrlInput({ value, onChange }) {
  const { checkImageUrl } = useImageValidation();

  const handleChange = (url: string) => {
    const { isValid, error } = checkImageUrl(url);
    if (!isValid) {
      console.warn(error);
      // e.g., "Domain not allowed. Add cdn.example.com to image domains configuration."
    }
    onChange(url);
  };

  return <input value={value} onChange={(e) => handleChange(e.target.value)} />;
}
```

### Resultados de la validación

| Escenario | `isValid` | `error` |
|---|---|---|
| URL no HTTP (ruta relativa) | `true` | -- |
| Dominio permitido | `true` | -- |
| Dominio no permitido | `false` | "Dominio no permitido. Agregue `hostname` a la configuración de dominios de imagen". |
| Formato de URL no válido | `false` | "Formato de URL no válido" |

## Archivos clave

| Archivo | Camino |
|---|---|
| Utilidad de dominios de imágenes | `lib/utils/image-domains.ts` |
| Gancho de dominios de imagen | `hooks/use-image-domains.ts` |
| Gancho de validación de imágenes | `hooks/use-image-domains.ts` |
