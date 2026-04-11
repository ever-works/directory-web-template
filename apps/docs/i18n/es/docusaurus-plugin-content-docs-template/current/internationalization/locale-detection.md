---
id: locale-detection
title: Detección de Idioma y Enrutamiento
sidebar_label: Detección de Idioma
sidebar_position: 3
---

# Detección de Idioma y Enrutamiento

La plantilla usa `next-intl` para detección de locale con coincidencia automática del idioma del navegador, enrutamiento basado en URL, persistencia de cookies y sistema de fallback de mensajes.

## Flujo de Detección

Cuando llega una solicitud, el locale se determina a través de esta secuencia:

1. **Prefijo de URL** — Si la URL contiene un prefijo de locale (como `/fr/about`), se usa ese locale directamente
2. **Cookie** — Si no hay prefijo de URL, el sistema verifica una cookie de locale establecida por el LanguageSwitcher
3. **Encabezado Accept-Language** — Si no hay cookie, se lee el encabezado de preferencias de idioma del navegador
4. **Fallback predeterminado** — Si no se encuentra coincidencia, se usa el locale predeterminado (`en`)

## Archivos de Origen

| Archivo | Rol en la detección |
|------|-------------------|
| `i18n/routing.ts` | Define locales soportados, estrategia de prefijo |
| `i18n/request.ts` | Valida locale resuelto, carga mensajes |
| `i18n/navigation.ts` | Proporciona Link, router, redirect compatibles con locale |
| `lib/constants.ts` | Fuente de verdad para el array LOCALES y RTL_LOCALES |
| `components/language-switcher.tsx` | Establece cookie de locale via router.replace |
| `app/[locale]/layout.tsx` | Valida locale, rechaza inválidos con notFound() |

## Configuración de Enrutamiento

```typescript
import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/constants";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localeDetection: true,
  localePrefix: "as-needed",
});
```

### Estrategia de Prefijo

| Solicitud | Locale Resuelto | URL Mostrada |
|---------|-----------------|-----------|
| `/about` | `en` | `/about` (sin prefijo para predeterminado) |
| `/fr/about` | `fr` | `/fr/about` (prefijo para no predeterminado) |
| `/en/about` | `en` | Redirigido a `/about` |

## Lógica de Fallback de Mensajes

- Los mensajes en inglés sirven como capa base con todas las claves presentes
- Los mensajes específicos del locale solo sobreescriben las claves que definen
- Las claves faltantes en el archivo de locale mantienen su valor en inglés
- Los objetos anidados se fusionan recursivamente

## Persistencia de Cookie

Cuando un usuario selecciona un locale mediante el LanguageSwitcher, `next-intl` establece una cookie:

```typescript
const changeLanguage = useCallback(
  (locale: string) => {
    if (locale === currentLocale || isPending) return;

    startTransition(() => {
      router.replace(pathname, { locale });
    });
    setIsOpen(false);
  },
  [currentLocale, isPending, router, pathname]
);
```

## Detección Accept-Language

```
Accept-Language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7
```

El sistema encuentra coincidencia con el array `LOCALES` soportado. El primer locale coincidente gana.

## Validación a Nivel de Layout

```typescript
export default async function RootLayout({ children, params }) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <>
      <NextIntlClientProvider messages={messages}>
        {/* Proveedores de aplicación e hijos */}
      </NextIntlClientProvider>
    </>
  );
}
```

## Solución de Problemas de Locale

| Síntoma | Causa Probable | Solución |
|---------|-------------|----------|
| Claves de traducción en lugar de texto | Clave faltante en archivo de locale | Añadir clave a `messages/en.json` (fallback) |
| Locale incorrecto mostrado | Cookie sobreescribe URL | Limpiar cookies del navegador o usar modo incógnito |
| 404 en URLs de locale | Locale no en array LOCALES | Añadir código a `lib/constants.ts` |
| Layout RTL no aplicado | Locale no en RTL_LOCALES | Añadir a `RTL_LOCALES` en `lib/constants.ts` |

## Mejores Prácticas

1. **Siempre usar `Link` de `@/i18n/navigation`** en lugar de `next/link`
2. **Añadir todas las nuevas claves primero en `en.json`** ya que sirve como fallback
3. **Probar la detección** configurando preferencias de idioma del navegador
4. **Confiar en el fallback `deepmerge`** — los archivos parcialmente traducidos son esperados y manejados
