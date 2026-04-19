---
id: features
title: Características de la plataforma
sidebar_label: Características
sidebar_position: 3
---

# Características de la plataforma

Este documento proporciona una descripción general completa de todas las funciones disponibles en la plataforma Ever Works, organizadas por área funcional.

## Autenticación de usuario y gestión de cuentas

### Registro de usuario

**Descripción**: Permite a nuevos usuarios crear cuentas en la plataforma.

**Cómo funciona**:

- Los usuarios pueden registrarse mediante correo electrónico/contraseña o proveedores de OAuth (Google, GitHub, Facebook, Twitter)
- La verificación por correo electrónico se envía al registrarse
- La contraseña se codifica mediante bcrypt antes del almacenamiento
- Tras el registro exitoso, se crea automáticamente un perfil de cliente

**Flujo de usuarios**:

1. El usuario hace clic en "Registrarse" en la página de inicio
2. Elige el método de registro (correo electrónico u OAuth)
3. Completa la información requerida (nombre, correo electrónico, contraseña)
4. Recibe correo electrónico de verificación
5. Hace clic en el enlace de verificación para activar la cuenta.
6. Redirigido al panel del cliente

**Archivos clave**: `/lib/auth/index.ts`, `/app/[locale]/auth/`

[Más información sobre la configuración de autenticación →](/authentication/setup-guide)

---

### User Login

**Description**: Authenticates existing users to access their accounts.

**How it works**:

- Supports credential-based login (email/password)
- Supports OAuth login via multiple providers
- Creates JWT session token valid for 30 days
- Session refreshes automatically after 24 hours of activity
- Admins are redirected to admin portal; clients to client portal

**Security features**:

- Password hashing with bcrypt
- ReCAPTCHA integration for bot prevention
- Session invalidation on logout
- Automatic session expiration

**Key files**: `/lib/auth/index.ts`, `/app/[locale]/auth/signin/`

---

### Gestión de contraseñas

**Descripción**: Permite a los usuarios cambiar o restablecer sus contraseñas.

**Características**:

- **Cambiar contraseña**: los usuarios autenticados pueden actualizar su contraseña desde la configuración
- **Olvidé mi contraseña**: los usuarios reciben un correo electrónico con un enlace para restablecer
- **Restablecer token**: token de tiempo limitado para restablecer la contraseña de forma segura

**Cómo funciona**:

1. El usuario solicita restablecer la contraseña
2. El sistema genera un token seguro almacenado en la tabla `passwordResetTokens`
3. Correo electrónico enviado con un enlace de reinicio que contiene el token
4. El usuario hace clic en el enlace e ingresa una nueva contraseña
5. El token se invalida después de su uso.

**Archivos clave**: `/app/api/auth/change-password/`, `/lib/db/schema.ts`

---

## Item Listing & Discovery

### Item Browsing

**Description**: The core feature allowing users to browse and discover items on the platform.

**How it works**:

- Items are loaded from Git-based CMS (`.content` folder)
- Supports pagination with configurable page sizes
- Two view modes: "classic" grid and "alternative" layout
- Real-time filtering without page reload

**Display options**:

- Grid layout with thumbnails
- List layout with descriptions
- Sorting by popularity, date, or name

**Key files**: `/app/[locale]/(listing)/listing.tsx`, `/components/globals-client.tsx`

---

### Búsqueda y filtrado

**Descripción**: permite a los usuarios encontrar elementos específicos utilizando varios criterios.

**Tipos de filtro**:

- **Búsqueda de texto**: búsqueda de texto completo en nombres y descripciones de elementos
- **Filtro de categorías**: filtrar por categorías únicas o múltiples
- **Filtro de etiquetas**: filtrar por etiquetas asignadas a los artículos
- **Filtros combinados**: aplique varios filtros simultáneamente

**Cómo funciona**:

1. Los filtros se almacenan en parámetros de URL para poder compartirlos.
2. `FilterProvider` el contexto gestiona el estado del filtro
3. `FilterURLParser` sincroniza la URL con el estado del filtro
4. Los elementos se filtran en el servidor y se devuelven al cliente.

**Experiencia de usuario**:

- Los filtros persisten en la URL (se pueden marcar/compartir)
- Actualización de resultados en tiempo real
- Opción Borrar todos los filtros.

**Archivos clave**: `/components/filter-provider.tsx`, `/components/filter-url-parser.tsx`

---

### Category Navigation

**Description**: Hierarchical organization of items into categories.

**Features**:

- Nested category structure (parent/child)
- Category pages with item listings
- Category icons and descriptions
- Breadcrumb navigation

**How it works**:

- Categories stored in `.content/categories/` as markdown files
- Support for multi-level hierarchy
- Can be enabled/disabled via admin settings
- Reorderable via admin panel

**Key files**: `/app/[locale]/categories/`, `/lib/services/category-git.service.ts`

---

### Sistema de etiquetas

**Descripción**: Taxonomía plana para la organización de artículos entre categorías.

**Características**:

- Varias etiquetas por artículo
- Visualización de nube de etiquetas
- Filtrado basado en etiquetas
- Se puede habilitar/deshabilitar a través de la configuración de administrador

**Cómo funciona**:

- Etiquetas almacenadas en `.content/tags/` como archivos de rebajas
- Relación de muchos a muchos con elementos
- Listado de elementos de filtro de etiquetas en las que se puede hacer clic

**Archivos clave**: `/app/[locale]/tags/`, `/lib/services/tag-git.service.ts`

---

## Item Engagement Features

### Voting System

**Description**: Allows users to upvote or downvote items.

**How it works**:

1. User clicks vote button on item
2. System checks if user is authenticated
3. Checks for existing vote and updates or creates new vote
4. Vote count updates in real-time
5. Stores vote in `votes` table with timestamp

**Rules**:

- One vote per user per item
- Users can change vote direction
- Users can remove their vote
- Vote counts displayed on item cards

**Key files**: `/hooks/use-item-vote.ts`, `/app/api/items/[slug]/votes/`

---

### Sistema de calificación

**Descripción**: Los usuarios pueden calificar artículos en una escala de 1 a 5 estrellas.

**Cómo funciona**:

- La calificación es parte del sistema de comentarios.
- Cada comentario puede incluir una calificación.
- Calificación promedio calculada y mostrada
- Se muestra la distribución de calificaciones (cuántas estrellas de 5, 4 estrellas, etc.)

**Pantalla**:

- Iconos de estrellas que muestran la calificación promedio
- Recuento de calificaciones junto a las estrellas
- Desglose de calificaciones en la página de detalles del artículo

**Archivos clave**: `/hooks/use-item-rating.ts`, `/lib/db/schema.ts` (tabla de comentarios)

---

### Comments System

**Description**: Users can leave comments and reviews on items.

**Features**:

- Text comments with optional rating
- Edit own comments
- Delete own comments
- Admin moderation capabilities
- Threaded replies (if enabled)

**How it works**:

1. User writes comment on item detail page
2. Optionally selects star rating (1-5)
3. Comment stored in `comments` table linked to user's client profile
4. Comments displayed in chronological or relevance order
5. Admin can delete inappropriate comments

**Moderation**:

- Admin can view all comments in admin panel
- Delete functionality for inappropriate content
- Report system triggers admin notification

**Key files**: `/hooks/use-comments.ts`, `/app/api/items/[slug]/comments/`

---

### Sistema de favoritos

**Descripción**: Los usuarios pueden guardar elementos en su lista de favoritos para acceder rápidamente.

**Cómo funciona**:

1. El usuario hace clic en el ícono de corazón/favorito en el elemento
2. Elemento agregado a la tabla `favorites`
3. Favoritos accesibles desde el perfil del usuario
4. Alternar acción (haga clic nuevamente para eliminar)

**Características**:

- Lista de favoritos en el portal del cliente
- Acción rápida para desfavorecer
- Los favoritos cuentan con elementos (opcional)
- Exportar lista de favoritos

**Archivos clave**: `/hooks/use-favorites.ts`, `/app/api/favorites/`, `/app/[locale]/favorites/`

---

## Featured Items

**Description**: Admin-curated items displayed prominently on the homepage.

**How it works**:

1. Admin selects items to feature from admin panel
2. Sets display order for featured items
3. Featured items appear in dedicated section on homepage
4. Can set expiration date for featured status

**Features**:

- Manual ordering/ranking
- Separate from algorithmic popularity
- Highlighted display on homepage
- Configurable number of featured items

**Key files**: `/hooks/use-admin-featured-items.ts`, `/app/api/admin/featured-items/`

---

## Envío de artículos

**Descripción**: permite a los usuarios enviar nuevos elementos a la plataforma.

**Cómo funciona**:

1. El usuario navega para enviar la página
2. Completa los detalles del artículo (nombre, descripción, URL, logotipo)
3. Selecciona categoría y etiquetas.
4. Se envía para revisión
5. El administrador recibe una notificación de un nuevo envío
6. El administrador revisa y aprueba/rechaza
7. Los artículos aprobados aparecen en la plataforma

**Campos del formulario**:

- Nombre del artículo (obligatorio)
- Descripción (requerido)
- URL del sitio web
- Carga de logotipo/imagen
- Selección de categoría
- Selección de etiquetas
- Metadatos adicionales

**Estados del flujo de trabajo**:

- Borrador → Pendiente de revisión → Aprobado/Rechazado

**Archivos clave**: `/app/[locale]/submit/`, `/app/api/admin/items/[id]/review/`

---

## Survey System

**Description**: Create and manage surveys for collecting user feedback.

**Types**:

- **Global surveys**: Available to all users
- **Item-specific surveys**: Attached to specific items

**Question types** (via SurveyJS):

- Multiple choice
- Text input
- Rating scales
- Matrix questions
- File upload

**Features**:

- Survey preview before publishing
- Response analytics
- Export to CSV/Excel
- Anonymous or authenticated responses

**Key files**: `/lib/services/survey.service.ts`, `/app/api/surveys/`

[Learn more about surveys →](/guides/survey-system)

---

## Sistema de suscripción y pago

**Descripción**: Monetización a través de acceso basado en suscripción o funciones premium.

**Proveedores admitidos**:

- **Stripe**: Gestión completa de suscripciones, facturación, portal de clientes
- **LemonSqueezy**: Procesador de pagos alternativo con cumplimiento tributario

**Cómo funciona**:

1. Planes definidos en el proveedor de pagos (Stripe/LemonSqueezy)
2. Los usuarios seleccionan el plan en la página de precios
3. Redirigido al proceso de pago del proveedor de pagos
4. Webhook maneja el pago exitoso
5. Registro de suscripción creado en la base de datos.
6. El usuario obtiene acceso a funciones premium

**Archivos clave**: `/app/api/stripe/`, `/app/api/lemonsqueezy/`

[Más información sobre la integración de pagos →](/pago)

---

## User Profile Management

**Description**: Users can manage their personal information and preferences.

**Basic Profile Information**:

- Name, email, avatar
- Bio and social links
- Notification preferences
- Privacy settings

**Features**:

- Profile editing
- Avatar upload
- Email change with verification
- Account deletion

**Key files**: `/app/[locale]/profile/`, `/app/api/profile/`

---

## Sistema de notificación

**Descripción**: Notificaciones generadas por el sistema para eventos importantes.

**Tipos de notificación**:

- Nuevos comentarios sobre los artículos del usuario.
- Actualizaciones de suscripción
- Anuncios de administrador
- Aprobación/rechazo de artículo

**Canales de entrega**:

- Notificaciones dentro de la aplicación
- Notificaciones por correo electrónico (a través de Reenvío/Novu)
- Notificaciones push (opcional)

**Archivos clave**: `/lib/services/notification.service.ts`, `/app/api/notifications/`

---

## Company Profiles

**Description**: Manage company entities associated with items.

**Features**:

- Company name, logo, description
- Link multiple items to a company
- Company detail pages
- Company directory

**Key files**: `/app/[locale]/companies/`, `/lib/services/company.service.ts`

---

## Integración de CRM (Veinte CRM)

**Descripción**: Sincronice los datos de la plataforma con Twenty CRM para la gestión de relaciones con los clientes.

**Características**:

- Creación automática de contactos a partir de registros de usuarios.
- Sincronizar las actividades e interacciones de los usuarios
- Seguimiento de suscripciones y pagos
- Mapeo de campos personalizados
- Sincronización basada en webhook

**Archivos clave**: `/lib/services/crm.service.ts`, `/app/api/webhooks/crm/`

---

## Analytics & Reporting

**Description**: Track platform usage and generate reports.

**Analytics providers**:

- **PostHog**: Product analytics, feature flags, session recording
- **Sentry**: Error tracking, performance monitoring
- **Vercel Analytics**: Core Web Vitals

**Tracked events**:

- Page views
- Item interactions (views, votes, favorites)
- User registrations and logins
- Subscription events
- Error occurrences

**Key files**: `/lib/analytics/`, `/lib/error-tracking/`

---

## Internacionalización (i18n)

**Descripción**: Soporte multilingüe para la plataforma.

**Idiomas admitidos**: más de 13 idiomas, incluidos inglés, francés, español, chino, alemán, árabe (RTL) y más.

**Características**:

- Detección automática de ubicación
- Cambio de configuración regional basado en URL
- Soporte RTL para árabe
- Formato de fecha/número por configuración regional
- Reglas de pluralización

**Archivos clave**: `/messages/`, `/lib/i18n/`, `/middleware.ts`

[Más información sobre internacionalización →](/internacionalización)

---

## Content Management

**Description**: Git-based CMS for managing items, categories, and tags.

**How it works**:

- Content stored in `.content` folder
- Synced from external Git repository
- Markdown files with frontmatter
- Version control via Git
- Collaborative editing

**Content types**:

- Items (`.content/items/`)
- Categories (`.content/categories/`)
- Tags (`.content/tags/`)
- Pages (`.content/pages/`)

**Key files**: `/lib/services/*-git.service.ts`, `/lib/git/`

---

## Panel de administración

**Descripción**: Centro central para que los administradores monitoreen y administren la plataforma.

**Widgets del panel**:

- Total de usuarios, artículos, suscripciones
- Feed de actividad reciente
- Envíos pendientes
- Estado de salud del sistema
- Descripción general de análisis

**Características clave**:

- Estadísticas en tiempo real
- Acciones rápidas
- Notificaciones del sistema
- Métricas de rendimiento

**Archivos clave**: `/app/[locale]/admin/dashboard/`

---

## User & Role Management

**Description**: Admin management of user accounts and permissions.

**User Management**:

- View all users
- Edit user profiles
- Suspend/activate accounts
- Reset passwords
- View user activity

**Role Management**:

- Admin role (full access)
- Client role (standard user)
- Custom roles (extensible)

**Key files**: `/app/[locale]/admin/users/`, `/lib/auth/roles.ts`

---

## Gestión de Clientes

**Descripción**: Gestión administrativa de perfiles de clientes.

**Características**:

- Ver todos los perfiles de clientes
- Editar información del cliente
- Vincular clientes a empresas
- Ver envíos de clientes
- Administrar suscripciones de clientes

**Archivos clave**: `/app/[locale]/admin/clients/`, `/app/api/admin/clients/`

---

## Content Moderation

**Description**: Admin tools for reviewing and moderating user-generated content.

**Item Review**:

- Approve/reject submitted items
- Edit item details
- Feature/unfeature items
- Delete items

**Comment Moderation**:

- View all comments
- Delete inappropriate comments
- Ban users for violations

**Key files**: `/app/[locale]/admin/moderation/`, `/app/api/admin/items/[id]/review/`

---

## Gestión de configuración

**Descripción**: Opciones de configuración para toda la plataforma.

**Categorías de configuración**:

- **General**: nombre del sitio, descripción, logotipo
- **Características**: Activar/desactivar funciones (categorías, etiquetas, votaciones, etc.)
- **Correo electrónico**: configuración SMTP, plantillas de correo electrónico
- **Pago**: claves API Stripe/LemonSqueezy
- **Análisis**: PostHog, configuración de Sentry
- **Seguridad**: ReCAPTCHA, limitación de velocidad

**Archivos clave**: `/app/[locale]/admin/settings/`, `/lib/config/`

---

## Data Export

**Description**: Export platform data for analysis or backup.

**Export formats**:

- CSV
- JSON
- Excel

**Exportable data**:

- Users
- Items
- Comments
- Subscriptions
- Survey responses

**Key files**: `/app/api/admin/export/`

---

## Funciones adicionales

### Plantillas de correo electrónico

Plantillas de correo electrónico personalizables para:

- Correos electrónicos de bienvenida
- Restablecer contraseña
- Verificación de correo electrónico
- Confirmaciones de suscripción
- Boletín

[Más información sobre plantillas de correo electrónico →](/guides/email-templates)

### Sistema temático

Múltiples temas prediseñados:

- EverWorks (predeterminado)
- Corporativo
- Materiales
- divertido

[Más información sobre tematización →](/guides/theming)

### Sistema de color dinámico

Generación automática de paleta de colores (tonos 50-950) a partir de colores base.

[Más información sobre colores dinámicos →](/guides/dynamic-colors)

### Pruebas responsivas

Pautas y mejores prácticas de prueba entre dispositivos.

[Más información sobre pruebas →](/desarrollo/pruebas)

---

## Feature Summary

| Category | Features |
|----------|----------|
| **Authentication** | Registration, Login, OAuth, Password Reset |
| **Discovery** | Browsing, Search, Filtering, Categories, Tags |
| **Engagement** | Voting, Rating, Comments, Favorites |
| **Submission** | User submissions, Admin review, Approval workflow |
| **Monetization** | Stripe, LemonSqueezy, Subscriptions |
| **User Management** | Profiles, Notifications, Preferences |
| **Admin Tools** | Dashboard, Moderation, Settings, Export |
| **Integrations** | CRM, Analytics, Email, Surveys |
| **Customization** | Themes, Colors, i18n, Email templates |

---

## Próximos pasos

- [Tech Stack](./tech-stack): explora la pila de tecnología
- [Descripción general de la arquitectura] (./overview): comprensión de la arquitectura

## Recursos

- [Configuración de desarrollo](/development/local-setup) - Configure su entorno
- [Guía de implementación](/deployment/overview) - Implementación en producción
- [Documentación de API](/development/api-documentation) - Referencia de API
