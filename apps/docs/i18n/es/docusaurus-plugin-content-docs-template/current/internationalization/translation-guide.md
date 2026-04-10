---
id: translation-guide
title: Guía de Traducción
sidebar_label: Guía de Traducción
sidebar_position: 2
---

# Guía de Traducción

Esta guía explica cómo usar y extender el sistema de traducción multilingüe de Ever Works basado en next-intl.

## Idiomas Soportados

Ever Works soporta más de 13 idiomas:

| Idioma | Código | Bandera |
|----------|------|------|
| 🇬🇧 Inglés | `en` | Predeterminado |
| 🇫🇷 Francés | `fr` | |
| 🇪🇸 Español | `es` | |
| 🇩🇪 Alemán | `de` | |
| 🇨🇳 Chino | `zh` | |
| 🇸🇦 Árabe | `ar` | Soporte RTL |
| 🇮🇹 Italiano | `it` | |
| 🇵🇹 Portugués | `pt` | |
| 🇷🇺 Ruso | `ru` | |
| 🇳🇱 Neerlandés | `nl` | |
| 🇵🇱 Polaco | `pl` | |

## Uso

### En Componentes React

```typescript
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('help');

  return (
    <div>
      <h1>{t('PAGE_TITLE')}</h1>
      <p>{t('PAGE_SUBTITLE')}</p>
    </div>
  );
}
```

## Añadir Nuevas Traducciones

### Paso 1: Añadir claves en inglés

```json
{
  "help": {
    "NEW_SECTION_TITLE": "New Section",
    "NEW_SECTION_DESC": "Description of the new section"
  }
}
```

### Paso 2: Traducir a otros idiomas

```json
{
  "help": {
    "NEW_SECTION_TITLE": "Nueva Sección",
    "NEW_SECTION_DESC": "Descripción de la nueva sección"
  }
}
```

## Espacios de Nombres de Traducción

### Común (`common`)
- Elementos de navegación
- Acciones comunes (guardar, cancelar, eliminar)

### Autenticación (`auth`)
- Inicio de sesión y registro
- Gestión de contraseñas

### Ayuda (`help`)
- Contenido del centro de ayuda
- Secciones de FAQ

## Mejores Prácticas

### 1. Convenciones de Nomenclatura

```json
{
  // ✅ Bueno
  "FAQ_SETUP_TIME": "How long does setup take?",
  
  // ❌ Malo
  "FAQ_1": "How long does setup take?"
}
```

### 2. Variables y Marcadores de Posición

```json
{
  "WELCOME_MESSAGE": "Welcome {name}!",
  "ITEMS_COUNT": "You have {count} items"
}
```

### 3. Pluralización

```json
{
  "ITEMS": {
    "zero": "No items",
    "one": "1 item",
    "other": "{count} items"
  }
}
```

## Agregar un Nuevo Idioma

### Paso 1: Crear el archivo de mensajes

```bash
cp messages/en.json messages/es.json
```

### Paso 2: Actualizar la configuración

```typescript
export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'zh', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
```

### Paso 3: Añadir el ícono de bandera

Colocar archivo SVG en `/public/flags/es.svg`

### Paso 4: Traducir el contenido

Traducir todas las claves en `messages/es.json` al español

## Herramientas Recomendadas

- **[i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)** - Extensión VS Code para gestión de traducciones
- **[BabelEdit](https://www.codeandweb.com/babeledit)** - Editor visual de traducciones
- **[Crowdin](https://crowdin.com/)** - Plataforma de traducción colaborativa

## Lista de Verificación de Traducciones

Al añadir nuevas funcionalidades con texto:

- [ ] Añadir claves en inglés (`en.json`)
- [ ] Traducir al francés (`fr.json`)
- [ ] Traducir al español (`es.json`)
- [ ] Traducir al alemán (`de.json`)
