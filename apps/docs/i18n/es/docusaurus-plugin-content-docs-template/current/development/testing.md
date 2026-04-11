---
id: testing
title: Guía de Pruebas Responsivas
sidebar_label: Pruebas
sidebar_position: 4
---

# Guía de Pruebas Responsivas

Esta guía cubre las mejores prácticas para probar el diseño responsivo en diferentes dispositivos y tamaños de pantalla.

## Dispositivos de Prueba

### Móvil (320px - 768px)

| Dispositivo          | Resolución | Notas                          |
|----------------------|------------|--------------------------------|
| iPhone SE            | 375x667    | iPhone moderno más pequeño     |
| iPhone 12/13/14      | 390x844    | Tamaño estándar de iPhone      |
| Samsung Galaxy S20   | 360x800    | Dispositivo Android popular    |
| iPad Mini Vertical   | 768x1024   | Tablet pequeño                 |

### Tablet (768px - 1024px)

| Dispositivo          | Resolución | Notas                     |
|----------------------|------------|---------------------------|
| iPad Air             | 820x1180   | iPad estándar             |
| iPad Pro 11"         | 834x1194   | Tablet profesional        |
| Surface Pro 7        | 912x1368   | Tablet Windows            |

### Escritorio (1024px+)

| Dispositivo          | Resolución  | Notas                          |
|----------------------|-------------|--------------------------------|
| Laptop               | 1366x768    | Resolución común de laptop     |
| Desktop HD           | 1920x1080   | Escritorio estándar            |
| Monitor 4K           | 3840x2160   | Pantalla de alta resolución    |

## Lista de Verificación de Pruebas

### 1. Navegación

- [ ] **Móvil**: Menú hamburguesa visible y funcional
- [ ] **Escritorio**: Barra de navegación horizontal se muestra correctamente
- [ ] **Todos los dispositivos**: Todos los enlaces de navegación son accesibles
- [ ] **Objetivos táctiles**: Mínimo 44x44px en móvil
- [ ] **Navegación por teclado**: El orden de tabulación es lógico

### 2. Contenido

- [ ] **Legibilidad del texto**: Sin necesidad de zoom para leer el contenido
- [ ] **Imágenes**: Responsivas y correctamente dimensionadas para cada breakpoint
- [ ] **Sin scroll horizontal**: El contenido cabe dentro del viewport
- [ ] **Longitud de línea**: Ancho de lectura óptimo (45-75 caracteres)
- [ ] **Tamaños de fuente**: Apropiados para cada tamaño de dispositivo

### 3. Interacciones

- [ ] **Objetivos táctiles**: Mínimo 44x44px para móvil
- [ ] **Espaciado**: Espacio suficiente entre elementos clicables
- [ ] **Estados hover**: Solo en dispositivos con capacidad hover
- [ ] **Estados de foco**: Indicadores de foco de teclado visibles
- [ ] **Formularios**: Fáciles de completar en dispositivos móviles

### 4. Rendimiento

- [ ] **Tiempo de carga**: < 3 segundos en conexión 3G
- [ ] **Imágenes**: Optimizadas para cada tamaño de pantalla
- [ ] **Animaciones**: Rendimiento suave de 60 FPS
- [ ] **Core Web Vitals**: Cumplen los umbrales de Google
- [ ] **Tamaño del bundle**: JavaScript y CSS optimizados

### 5. Diseño

- [ ] **Sistema de cuadrícula**: Se adapta correctamente en los breakpoints
- [ ] **Flexbox/Grid**: Sin roturas de diseño
- [ ] **Espaciado**: Relleno y márgenes consistentes
- [ ] **Alineación**: Alineación correcta en todos los tamaños
- [ ] **Desbordamiento**: Sin problemas de overflow de contenido

## Herramientas de Prueba

### DevTools del Navegador

#### Chrome DevTools
1. Abre DevTools (F12 o Cmd+Option+I)
2. Haz clic en el ícono de la barra de herramientas de dispositivos (Cmd+Shift+M)
3. Selecciona el dispositivo o introduce dimensiones personalizadas
4. Prueba diferentes velocidades de red

#### Firefox Developer Tools
1. Abre DevTools (F12)
2. Haz clic en Modo de Diseño Responsivo (Cmd+Option+M)
3. Selecciona presets de dispositivos
4. Prueba eventos táctiles

### Servicios de Prueba Online

- **[BrowserStack](https://www.browserstack.com/)** - Prueba en dispositivos reales
- **[LambdaTest](https://www.lambdatest.com/)** - Pruebas entre navegadores
- **[Sauce Labs](https://saucelabs.com/)** - Plataforma de pruebas automatizadas

### Pruebas de Rendimiento

- **[Lighthouse](https://developers.google.com/web/tools/lighthouse)** - Auditoría de rendimiento
- **[WebPageTest](https://www.webpagetest.org/)** - Análisis detallado de rendimiento
- **[PageSpeed Insights](https://pagespeed.web.dev/)** - Herramienta de rendimiento de Google

## Métricas Objetivo

### Puntuaciones de Lighthouse

| Métrica          | Objetivo | Crítico |
|------------------|----------|---------|
| Rendimiento      | > 90     | > 50    |
| Accesibilidad    | > 95     | > 80    |
| Mejores Prácticas| > 95     | > 80    |
| SEO              | > 95     | > 80    |

### Core Web Vitals

| Métrica | Bueno | Necesita Mejora | Malo |
|---------|-------|-----------------|------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5s - 4.0s | > 4.0s |
| **FID** (First Input Delay) | < 100ms | 100ms - 300ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1 - 0.25 | > 0.25 |

### Métricas Específicas para Móvil

- **First Contentful Paint**: < 1.8s
- **Time to Interactive**: < 3.8s
- **Tamaño de Objetivo Táctil**: >= 48x48px
- **Retraso de Toque**: < 300ms

## Flujo de Trabajo de Pruebas

### 1. Pruebas Locales

```bash
# Iniciar servidor de desarrollo
npm run dev

# Abrir en el navegador
http://localhost:3000
```

### 2. Pruebas en Dispositivos

1. **Usar modo responsivo de DevTools**
2. **Probar en dispositivos físicos** cuando sea posible
3. **Usar depuración remota** para dispositivos móviles
4. **Probar diferentes orientaciones** (vertical/horizontal)

### 3. Pruebas Automatizadas

```bash
# Ejecutar auditoría Lighthouse
npm run lighthouse

# Ejecutar pruebas de accesibilidad
npm run test:a11y

# Ejecutar pruebas de regresión visual
npm run test:visual
```

## Problemas Comunes y Soluciones

### Problema: Scroll Horizontal en Móvil

**Solución**: Verificar elementos con anchura fija

```css
/* ❌ Malo */
.container {
  width: 1200px;
}

/* ✅ Bueno */
.container {
  max-width: 1200px;
  width: 100%;
  padding: 0 1rem;
}
```

### Problema: Texto Demasiado Pequeño en Móvil

**Solución**: Usar tamaños de fuente responsivos

```css
/* ❌ Malo */
body {
  font-size: 12px;
}

/* ✅ Bueno */
body {
  font-size: 16px; /* Tamaño base para móvil */
}

@media (min-width: 768px) {
  body {
    font-size: 18px;
  }
}
```

### Problema: Objetivos Táctiles Demasiado Pequeños

**Solución**: Asegurar tamaño mínimo de 44x44px

```css
/* ✅ Bueno */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
}
```

### Problema: Imágenes No Responsivas

**Solución**: Usar técnicas de imágenes responsivas

```jsx
// ✅ Bueno - componente Image de Next.js
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority
/>
```

## Mejores Prácticas

### 1. Enfoque Mobile-First
- Diseña para móvil primero, luego mejora para pantallas más grandes
- Usa media queries `min-width` en lugar de `max-width`

### 2. Mejora Progresiva
- Asegura que la funcionalidad básica funcione sin JavaScript
- Añade mejoras para navegadores capaces

### 3. Diseño Amigable al Tacto
- Objetivos táctiles mínimos de 44x44px
- Espaciado adecuado entre elementos interactivos
- Evita interacciones solo mediante hover

### 4. Optimización de Rendimiento
- Carga lazy de imágenes y componentes
- Minimiza el tamaño del bundle de JavaScript
- Usa división de código
- Optimiza fuentes y assets

### 5. Accesibilidad
- Prueba con lectores de pantalla
- Asegura que la navegación por teclado funcione
- Mantén suficiente contraste de color
- Proporciona alternativas de texto para las imágenes

## Próximos Pasos

- [Configuración Local](./local-setup) - Configura tu entorno de desarrollo
- [Documentación de API](./api-documentation) - Aprende sobre documentación de API
- [Despliegue](/docs/deployment) - Despliega tu aplicación

## Recursos

- [Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)
- [Mobile-First CSS](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Responsive/Mobile_first)
- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Web.dev Performance](https://web.dev/performance/)
