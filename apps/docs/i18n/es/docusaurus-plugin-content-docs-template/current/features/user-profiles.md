---
id: user-profiles
title: Perfiles y configuraciones de usuario
sidebar_label: Perfiles de usuario
sidebar_position: 18
---

# Perfiles de usuario y configuraciones

La plantilla Ever Works incluye un sistema de perfil de usuario con páginas de perfil público, navegación con pestañas, administración de avatar, enlaces sociales y componentes de visualización de perfil. Los usuarios pueden mostrar su información, portafolio, habilidades y elementos enviados a través de una interfaz de perfil estructurada.

## Descripción general de la arquitectura

| Componente | Camino | Propósito |
|---|---|---|
| `ProfileContent` | `components/profile/profile-content.tsx` | Contenido de la página de perfil principal con enrutamiento de pestañas |
| `ProfileNavigation` | `components/profile/profile-navigation.tsx` | Barra de navegación con pestañas adhesivas |
| `ProfileHeader` | `components/profile/profile-header.tsx` | Portada del perfil, avatar, biografía y enlaces sociales |
| `ProfileTag` | `components/profile/profile-tag.tsx` | Componente de etiqueta de habilidad/interés |
| `ProfileButton` | `components/header/profile-button.tsx` | Activador del menú de perfil de encabezado |
| `ProfileMenu` | `components/profile-button/profile-menu.tsx` | Menú desplegable de perfil |

## Estructura de datos del perfil

```tsx
// lib/types/profile.ts
interface Profile {
  displayName: string;
  jobTitle: string;
  bio: string;
  avatar: string | null;
  location: string | null;
  company: string | null;
  website: string | null;
  socialLinks: SocialLink[];
}

interface SocialLink {
  platform: string;    // 'github', 'linkedin', 'twitter', etc.
  url: string;
  displayName: string;
}
```

## Encabezado de perfil

El componente `ProfileHeader` representa la sección superior de un perfil de usuario con un banner de portada degradado, un avatar con un botón de edición e información biográfica:

```tsx
import { ProfileHeader } from '@/components/profile/profile-header';

<ProfileHeader profile={userProfile} isOwnProfile={true} />
```

### Características

| Característica | Descripción |
|---|---|
| Pancarta de portada | Fondo degradado con colores temáticos primarios y secundarios |
| Avatar | Imagen circular con borde anular, tamaño adaptable (24x24 a 28x28) |
| Botón Editar | Se muestra sólo cuando `isOwnProfile` es verdadero |
| Reserva de imagen | Muestra el marcador de posición del icono de usuario en caso de error de carga de imagen |
| Enlaces sociales | Representa íconos específicos de la plataforma (GitHub, LinkedIn, Twitter) |
| Ubicación y empresa | Pantallas con iconos de mapa y maletín |
| Enlace al sitio web | Enlace externo con icono de globo terráqueo |

### Manejo de errores de avatar

El componente incluye un manejo sólido de errores de imagen:

```tsx
const [imageError, setImageError] = useState(false);

// Reset error when avatar URL changes
useEffect(() => {
  setImageError(false);
}, [profile.avatar]);

// Render fallback on error
{!imageError && profile.avatar ? (
  <Image src={profile.avatar} onError={() => setImageError(true)} />
) : (
  <FiUser className="w-8 h-8 text-gray-400" />
)}
```

### Iconos de plataformas sociales

| Plataforma | Icono |
|---|---|
| `github` | `FiGithub` |
| `linkedin` | `FiLinkedin` |
| `twitter` | `FiTwitter` |
| Otro | `FiGlobe` (genérico) |

## Navegación de perfil

El componente `ProfileNavigation` proporciona una navegación con pestañas fijas:

```tsx
import { ProfileNavigation } from '@/components/profile/profile-navigation';

<ProfileNavigation
  activeTab="about"
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

### Pestañas disponibles

| ID de pestaña | Etiqueta | Icono |
|---|---|---|
| `about` | Acerca de | `FiUser` |
| `portfolio` | Portafolio | `FiBriefcase` |
| `skills` | Habilidades | `FiAward` |
| `submissions` | Envíos | `FiFileText` |

### Funciones de navegación

- **Posicionamiento fijo**: permanece en la parte superior cuando se desplaza con un fondo borroso
- **Apto para dispositivos móviles** -- Desplazamiento horizontal en pantallas pequeñas
- **Enfoque visible** -- Indicador de timbre para navegación con teclado
- **Según el tema**: la pestaña activa utiliza los colores primarios del tema.

## Contenido del perfil

El componente `ProfileContent` organiza la página de perfil combinando navegación y contenido de pestañas:

```tsx
import { ProfileContent } from '@/components/profile/profile-content';

function ProfilePage({ profile }) {
  return <ProfileContent profile={profile} />;
}
```

### Secciones de pestañas

| Sección | Componente | Contenido |
|---|---|---|
| Acerca de | `AboutSection` | Información personal, biografía, detalles |
| Portafolio | `PortfolioSection` | Muestras de trabajos y proyectos |
| Habilidades | `SkillsSection` | Etiquetas de habilidades y experiencia |
| Envíos | `SubmissionsSection` | Artículos enviados por el usuario |

Cada sección se representa con un encabezado consistente:

```tsx
function ProfileSectionHeader({ title }) {
  return (
    <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-800 pb-2">
      {title}
    </h2>
  );
}
```

## Componentes del botón de perfil

### Botón de perfil de encabezado

Un botón en el encabezado del sitio que abre el menú de perfil:

```tsx
import { ProfileButton } from '@/components/header/profile-button';

<ProfileButton />
```

### Visualización del encabezado del perfil

Muestra el nombre y avatar del usuario en forma compacta:

```tsx
import { ProfileHeaderButton } from '@/components/profile-button/profile-header';

<ProfileHeaderButton user={currentUser} />
```

### Menú de perfil

Un menú desplegable con acciones de perfil:

```tsx
import { ProfileMenu } from '@/components/profile-button/profile-menu';

<ProfileMenu
  user={currentUser}
  onSignOut={handleSignOut}
/>
```

## Diseño Responsivo

Los componentes del perfil se crean con un enfoque centrado en los dispositivos móviles:

| Punto de interrupción | Comportamiento |
|---|---|
| Móvil | Avatar centrado, diseño apilado, desplazamiento de pestañas horizontal |
| Tableta+ | Avatar alineado a la izquierda, diseño de lado a lado |
| Escritorio | Tarjeta de ancho completo con restricciones de ancho máximo |

### Tamaño del avatar

| Pantalla | Tamaño |
|---|---|
| Móvil | 24x24 (96px) |
| Escritorio | 28x28 (112px) |

## Integración del tema

El sistema de perfiles utiliza el sistema temático de la plantilla:

- El degradado del banner de portada utiliza variables CSS `--theme-primary` y `--theme-secondary` - Los estados de pestañas activas usan colores primarios del tema.
- El modo oscuro es totalmente compatible con relaciones de contraste adecuadas
- Los estados de desplazamiento utilizan transiciones de color basadas en temas

## Estructura de diseño

```
ProfileHeader (cover + avatar + info card)
  |
  +-- Cover Banner (gradient)
  +-- Avatar (overlapping cover)
  +-- Info Card
      +-- Name & Title
      +-- Bio
      +-- Location / Company / Website
      +-- Social Links

ProfileContent
  |
  +-- ProfileNavigation (sticky tabs)
  +-- Active Section
      +-- AboutSection
      +-- PortfolioSection
      +-- SkillsSection
      +-- SubmissionsSection
```

## Archivos clave

| Archivo | Camino |
|---|---|
| Contenido del perfil | `components/profile/profile-content.tsx` |
| Navegación de perfil | `components/profile/profile-navigation.tsx` |
| Encabezado de perfil | `components/profile/profile-header.tsx` |
| Etiqueta de perfil | `components/profile/profile-tag.tsx` |
| Botón de perfil de encabezado | `components/header/profile-button.tsx` |
| Menú de perfil | `components/profile-button/profile-menu.tsx` |
| Tipos de perfil | `lib/types/profile.ts` |
