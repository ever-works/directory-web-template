---
id: overview
title: Descripción general de autenticación
sidebar_label: Descripción general
sidebar_position: 1
---

# Descripción general de autenticación

Ever Works ofrece un sistema de autenticación flexible y seguro que admite múltiples proveedores y métodos de autenticación.

## Arquitectura de autenticación

La plantilla utiliza un enfoque de autenticación híbrido, compatible con NextAuth.js y Supabase Auth simultáneamente, permitiéndole elegir la mejor solución para sus necesidades.

```mermaid
graph TB
    User[Usuario] --> Choice{Método de Auth}
    Choice -->|NextAuth.js| NextAuth[NextAuth.js]
    Choice -->|Supabase| Supabase[Supabase Auth]
    
    NextAuth --> OAuth1[Proveedores OAuth]
    NextAuth --> Credentials[Correo/Contraseña]
    NextAuth --> JWT1[Tokens JWT]
    
    Supabase --> OAuth2[Proveedores OAuth]
    Supabase --> Magic[Magic Links]
    Supabase --> JWT2[Tokens JWT]
    
    JWT1 --> Session[Gestión de Sesión]
    JWT2 --> Session
    Session --> Protected[Rutas Protegidas]
```

## Métodos de autenticación admitidos

### 1. Proveedores OAuth

#### NextAuth.js OAuth
- **Google** - Google OAuth 2.0
- **GitHub** - GitHub OAuth
- **Facebook** - Facebook Login
- **Twitter/X** - Twitter OAuth 2.0
- **Microsoft** - Microsoft OAuth 2.0

#### Supabase OAuth
- **Google** - Google OAuth 2.0
- **GitHub** - GitHub OAuth
- **Facebook** - Facebook Login
- **Twitter/X** - Twitter OAuth 2.0
- **Discord** - Discord OAuth
- **Apple** - Iniciar sesión con Apple

### 2. Autenticación con correo electrónico y contraseña

#### NextAuth.js Credentials
- Autenticación personalizada de correo/contraseña
- Hash de contraseña con bcrypt
- Lógica de validación personalizada
- Almacenamiento de sesión en base de datos

#### Supabase Auth
- Autenticación integrada de correo/contraseña
- Verificación de correo electrónico
- Funcionalidad de restablecimiento de contraseña
- Políticas de contraseñas seguras

### 3. Autenticación con enlace mágico

#### Supabase Magic Links
- Autenticación sin contraseña
- Inicio de sesión por correo electrónico
- Generación segura de tokens
- Creación automática de cuenta

### 4. WebAuthn / Passkeys

Compatibilidad con NextAuth.js para autenticación biométrica, llaves de seguridad de hardware y FIDO2.

## Flujo de autenticación

### Flujo OAuth

```mermaid
sequenceDiagram
    participant U as Usuario
    participant A as App
    participant P as Proveedor OAuth
    participant S as Almacén de Sesión

    U->>A: Clic en "Iniciar sesión con proveedor"
    A->>P: Redirigir al proveedor OAuth
    P->>U: Mostrar pantalla de consentimiento
    U->>P: Otorgar permiso
    P->>A: Redirigir con código de autorización
    A->>P: Intercambiar código por tokens
    P->>A: Devolver token de acceso
    A->>S: Crear sesión de usuario
    A->>U: Redirigir a la app
```

## Gestión de sesiones

- Tokens JWT para autenticación sin estado
- Sesiones de base de datos para estado persistente
- Manejo seguro de cookies
- Actualización automática de tokens

## Características de seguridad

- Protección CSRF
- Limitación de velocidad
- Protección contra fuerza bruta
- Hash seguro de contraseñas con bcrypt
