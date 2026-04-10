---
id: data-versioning
title: Sistema de Versionado de Datos
sidebar_label: Versionado Datos
sidebar_position: 6
---

# Sistema de Visualización de Versión de Datos

Ever Works incluye un sistema de versionado de datos que muestra a los usuarios la versión actual de los datos que están viendo, proporcionando transparencia sobre la frescura del contenido.

## Descripción General

El sistema proporciona:
- 📊 **Visualización de versión en tiempo real** - Muestra la versión actual del repositorio de datos
- 🔄 **Actualización automática** - Actualiza periódicamente la información de versión
- 🎨 **Múltiples variantes** - Vistas de badge, inline y detallada
- 💡 **Detalles en tooltip** - Pasa el ratón para obtener información completa
- ⚡ **Soporte ISR** - Funciona con Regeneración Estática Incremental
- 🛡️ **Manejo de errores** - Fallback elegante cuando no está disponible

## Arquitectura

```mermaid
graph TB
    Component[VersionDisplay] --> Hook[useVersionInfo]
    Hook --> API[/api/version]
    API --> Git[Git Repository]
    Git --> Sync[Auto Sync]
    Sync --> Cache[Cache Layer]
    Cache --> Response[Version Info]
```

## Componentes

### VersionDisplay

Componente principal para mostrar información de versión.

```tsx
import { VersionDisplay } from "@/components/version";

// Visualización inline básica
<VersionDisplay variant="inline" />

// Variante badge
<VersionDisplay variant="badge" />

// Vista detallada con información adicional
<VersionDisplay variant="detailed" showDetails={true} />
```

**Props**:
- `variant`: `"inline" | "badge" | "detailed"` - Estilo de visualización
- `showDetails`: `boolean` - Mostrar información extendida (solo variante detallada)
- `className`: `string` - Clases CSS adicionales
- `refreshInterval`: `number` - Intervalo de actualización automática en ms (predeterminado: 5 minutos)

### VersionTooltip

Componente envolvente que añade un tooltip con información detallada de versión.

```tsx
import { VersionTooltip } from "@/components/version";

<VersionTooltip>
  <VersionDisplay variant="badge" />
</VersionTooltip>
```

**Características**:
- Muestra hash y fecha del commit
- Muestra el mensaje del commit
- Muestra información del autor
- Enlaces al repositorio

### Hook useVersionInfo

Hook personalizado para gestionar información de versión con caché y actualización automática.

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

const { versionInfo, loading, error, refetch } = useVersionInfo({
  refreshInterval: 5 * 60 * 1000, // 5 minutos
  retryOnError: true,
  retryDelay: 10000
});
```

**Devuelve**:
- `versionInfo`: Objeto de datos de versión
- `loading`: Estado de carga
- `error`: Estado de error
- `refetch`: Función de actualización manual

## Endpoint de API

### GET /api/version

Devuelve información sobre la versión actual del repositorio de datos.

**Respuesta**:
```json
{
  "commit": "abc1234",
  "date": "2024-01-01T12:00:00.000Z",
  "message": "Update data items",
  "author": "Developer Name",
  "repository": "https://github.com/owner/repo",
  "lastSync": "2024-01-01T12:05:00.000Z"
}
```

**Características**:
- Sincronización automática del repositorio antes de obtener
- Cabeceras de caché adecuadas para un rendimiento óptimo
- Soporte ETag para caché eficiente
- Manejo de errores con códigos de estado HTTP apropiados

**Cabeceras de Caché**:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: "abc1234"
```

## Configuración

### Variables de Entorno

```env
# URL del repositorio de datos
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Token de GitHub para repositorios privados (opcional)
GH_TOKEN=ghp_your_github_token_here

# Intervalo de sincronización del repositorio (opcional, predeterminado: 5 minutos)
REPO_SYNC_INTERVAL=300000
```

### Estrategia de Caché

#### Caché del Lado del Cliente
- **Duración**: 1 minuto
- **Estrategia**: stale-while-revalidate
- **Actualización**: Actualizaciones automáticas en segundo plano

#### Caché del Lado del Servidor
- **Duración**: 60 segundos
- **Estrategia**: s-maxage con revalidación
- **ETag**: Basado en hash del commit

## Ejemplos de Uso

### Badge de Versión en el Pie de Página

```tsx
// components/footer/Footer.tsx
import { VersionDisplay } from "@/components/version";

export function Footer() {
  return (
    <footer>
      <div className="container">
        <p>© 2024 Ever Works</p>
        <VersionDisplay variant="badge" />
      </div>
    </footer>
  );
}
```

### Panel de Administración

```tsx
// app/admin/dashboard/page.tsx
import { VersionDisplay } from "@/components/version";

export default function AdminDashboard() {
  return (
    <div>
      <h1>Panel de Administración</h1>
      <VersionDisplay 
        variant="detailed" 
        showDetails={true}
        refreshInterval={60000} // 1 minuto
      />
    </div>
  );
}
```

### Implementación Personalizada

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

export function CustomVersionDisplay() {
  const { versionInfo, loading, error, refetch } = useVersionInfo();

  if (loading) return <div>Cargando versión...</div>;
  if (error) return <div>Versión no disponible</div>;

  return (
    <div>
      <p>Versión de datos: {versionInfo.commit.substring(0, 7)}</p>
      <p>Actualizado: {new Date(versionInfo.date).toLocaleDateString()}</p>
      <button onClick={refetch}>Actualizar</button>
    </div>
  );
}
```

## Variantes de Visualización

### Variante Inline

Visualización de texto compacta adecuada para pies de página o barras laterales.

```tsx
<VersionDisplay variant="inline" />
// Salida: "Data v.abc1234 • Actualizado hace 2 horas"
```

### Variante Badge

Badge en forma de píldora con icono, perfecto para cabeceras o navegación.

```tsx
<VersionDisplay variant="badge" />
// Salida: [🔄 v.abc1234]
```

### Variante Detallada

Vista completa con toda la información de versión.

```tsx
<VersionDisplay variant="detailed" showDetails={true} />
// Salida: Tarjeta con commit, fecha, mensaje, autor, enlace al repositorio
```

## Mejores Prácticas

### 1. Ubicación
- **Pie de página**: Usa variante inline o badge
- **Paneles de administración**: Usa variante detallada
- **Cabeceras**: Usa variante badge
- **Tooltips**: Envuelve cualquier variante con VersionTooltip

### 2. Intervalos de Actualización
- **Páginas públicas**: 5-10 minutos
- **Páginas de administración**: 1-2 minutos
- **Paneles en tiempo real**: 30 segundos

### 3. Manejo de Errores
- Siempre proporciona UI de fallback
- Registra errores para monitoreo
- Muestra mensajes amigables para el usuario

### 4. Rendimiento
- Usa duraciones de caché apropiadas
- Implementa stale-while-revalidate
- Evita llamadas de API excesivas

## Solución de Problemas

### Versión No Se Actualiza

**Problema**: La información de versión no se actualiza

**Solución**: Verifica el intervalo de actualización y la configuración de caché

```tsx
// Forzar actualización inmediata
const { refetch } = useVersionInfo();
refetch();
```

### Errores de API

**Problema**: `/api/version` devuelve errores

**Solución**: Verifica las variables de entorno y el acceso al repositorio

```bash
# Check environment variables
echo $DATA_REPOSITORY
echo $GH_TOKEN

# Test repository access
git ls-remote $DATA_REPOSITORY
```

### Carga Lenta

**Problema**: El componente de versión carga lentamente

**Solución**: Optimiza el caché y reduce la frecuencia de actualización
