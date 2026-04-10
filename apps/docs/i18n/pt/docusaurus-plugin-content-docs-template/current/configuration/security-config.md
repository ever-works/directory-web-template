---
id: security-config
title: "Configuração de Segurança"
sidebar_label: "Conf. de Segurança"
sidebar_position: 5
---

# Configuração de Segurança

O template implementa uma estratégia de segurança em profundidade com controle de acesso baseado em permissões, validação de entrada, respostas de erro seguras e sanitização de URL. Este guia documenta cada camada de segurança e como configurá-la.

## Sistema de Permissões

O template usa um modelo de permissões granular de recurso-ação definido em `lib/permissions/definitions.ts` e aplicado por meio de `lib/middleware/permission-check.ts`.

### Formato das Permissões

As permissões seguem o formato `resource:action`:

```
items:read
items:create
items:update
items:delete
items:review
items:approve
items:reject
categories:read
categories:create
users:assignRoles
analytics:read
system:settings
```

### Funções de Verificação de Permissões

O middleware de permissões em `lib/middleware/permission-check.ts` fornece um conjunto abrangente de helpers de autorização:

```ts
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasResourcePermission,
  canManageResource,
  canReviewItems,
  canManageUsers,
  canManageRoles,
  canViewAnalytics,
  isSuperAdmin
} from '@/lib/middleware/permission-check';

// Check a single permission
hasPermission(userPermissions, 'items:create');

// Check if user has ANY of the given permissions
hasAnyPermission(userPermissions, ['items:review', 'items:approve']);

// Check if user has ALL of the given permissions
hasAllPermissions(userPermissions, ['items:read', 'items:update']);

// Check a resource:action pair (with validation)
hasResourcePermission(userPermissions, 'items', 'delete');

// Get all permissions for a resource
const itemPerms = getResourcePermissions(userPermissions, 'items');
// e.g., ['items:read', 'items:create', 'items:update']

// Check if user can manage (create/update/delete) a resource
canManageResource(userPermissions, 'categories');
```

### Interface UserPermissions

```ts
interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Permission[];
}
```

### Verificações Específicas por Função

```ts
// Check if user can review items (review, approve, or reject)
canReviewItems(userPermissions);

// Check if user can manage users
canManageUsers(userPermissions);

// Check if user can manage roles
canManageRoles(userPermissions);

// Check if user can view analytics
canViewAnalytics(userPermissions);
```

### Detecção de Super Admin

A função `isSuperAdmin` verifica duas condições:

1. O usuário tem a função `'super-admin'` (preferencial), OU
2. O usuário possui todas as permissões do sistema (fallback)

```ts
export function isSuperAdmin(userPermissions: UserPermissions): boolean {
  if (userPermissions.roles.includes('super-admin')) {
    return true;
  }
  // Fallback: check if user has ALL system permissions
  const allPermissions: Permission[] = [
    'items:read', 'items:create', 'items:update', 'items:delete',
    'items:review', 'items:approve', 'items:reject',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'tags:read', 'tags:create', 'tags:update', 'tags:delete',
    'roles:read', 'roles:create', 'roles:update', 'roles:delete',
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:assignRoles',
    'analytics:read', 'analytics:export',
    'system:settings'
  ];
  return hasAllPermissions(userPermissions, allPermissions);
}
```

### Validação de Permissões

```ts
// Validate a permission string is recognized
validatePermission('items:read'); // true
validatePermission('invalid:perm'); // false

// Parse a permission into resource and action
parsePermission('items:create');
// Returns: { resource: 'items', action: 'create' }

// Get a summary grouped by resource
getPermissionSummary(userPermissions);
// Returns: { items: ['read', 'create'], categories: ['read'], ... }
```

## Proteção de Rotas de API

As rotas de API usam autenticação baseada em sessão com verificações de função admin:

```ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  // Proceed with authorized logic...
}
```

## Validação de Entrada

O template usa esquemas Zod em toda a aplicação para validação de entrada:

```ts
import { z } from 'zod';

const createNotificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  userId: z.string().min(1),
  data: z.record(z.unknown()).optional(),
});

// In API route
const body = await request.json();
const parsed = createNotificationSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
}
```

## Sanitização de URL

O módulo de editor inclui sanitização de URL em `lib/editor/utils/utils.ts`:

```ts
export function isAllowedUri(uri: string | undefined, protocols?: ProtocolConfig): boolean {
  const allowedProtocols = [
    "http", "https", "ftp", "ftps", "mailto", "tel",
    "callto", "sms", "cid", "xmpp"
  ];
  // Validates URI against whitelist and strips ATTR_WHITESPACE
  // ...
}

export function sanitizeUrl(inputUrl: string, baseUrl: string, protocols?: ProtocolConfig): string {
  try {
    const url = new URL(inputUrl, baseUrl);
    if (isAllowedUri(url.href, protocols)) return url.href;
  } catch { /* invalid URL */ }
  return "#";
}
```

Isso impede que `javascript:` e outros URLs com protocolos perigosos sejam incorporados ao conteúdo do editor.

## Proteção contra Prototype Pollution

O `ConfigManager` protege contra prototype pollution ao atualizar chaves de configuração aninhadas:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

async updateNestedKey(keyPath: string, value: any): Promise<boolean> {
  const keys = keyPath.split('.');
  for (const key of keys) {
    if (this.isPrototypePollutingKey(key)) {
      return false; // Silently reject
    }
  }
  // ...
}
```

## Segurança de Cookies

A configuração de cookies é validada via esquema Zod:

```ts
const cookieConfigSchema = z.object({
  secret: z.string().optional(),
  domain: z.string().default('localhost'),
  secure: z.boolean().default(false),
});
```

Para produção, defina:

```bash
COOKIE_SECRET=<random-32-byte-base64>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

## Cabeçalhos de Segurança Next.js

O arquivo `next.config.ts` configura cabeçalhos de segurança. Cabeçalhos comuns a definir:

| Cabeçalho | Finalidade |
|-----------|-----------|
| `X-Frame-Options` | Prevenir clickjacking |
| `X-Content-Type-Options` | Prevenir MIME type sniffing |
| `Referrer-Policy` | Controlar informações do referrer |
| `X-XSS-Protection` | Habilitar filtragem XSS do navegador |
| `Strict-Transport-Security` | Aplicar HTTPS |
| `Permissions-Policy` | Restringir recursos do navegador |

## Segurança de Variáveis de Ambiente

O sistema de configuração garante que variáveis sensíveis sejam apenas do lado do servidor:

```ts
// lib/config/config-service.ts
import 'server-only';  // Prevents importing in client bundles
```

Variáveis prefixadas com `NEXT_PUBLIC_` são expostas ao cliente. Todas as outras (chaves secretas, URLs de banco de dados, tokens de API) permanecem exclusivamente do lado do servidor:

- `STRIPE_SECRET_KEY` -- apenas do lado do servidor
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -- seguro para o cliente
- `DATABASE_URL` -- apenas do lado do servidor
- `AUTH_SECRET` -- apenas do lado do servidor

## Boas Práticas

1. **Sempre validar a entrada** com esquemas Zod antes do processamento
2. **Verificar a autenticação** no início de cada handler de rota de API
3. **Usar verificações de permissões** para controle de acesso baseado em funções
4. **Sanitizar URLs** antes de incorporá-los no conteúdo
5. **Manter segredos apenas do lado do servidor** usando a proteção de importação `server-only`
6. **Definir `COOKIE_SECURE=true`** em produção
7. **Usar segredos fortes** para `AUTH_SECRET` e `COOKIE_SECRET` (mínimo 32 bytes base64)
8. **Revisar o modelo de permissões** ao adicionar novos recursos ou ações

## Arquivos Relacionados

| Caminho | Descrição |
|---------|-----------|
| `lib/middleware/permission-check.ts` | Funções de aplicação de permissões |
| `lib/permissions/definitions.ts` | Definições de permissões e funções |
| `lib/config/config-service.ts` | Singleton de configuração apenas servidor |
| `lib/config/schemas/auth.schema.ts` | Esquemas de configuração de auth/cookie |
| `lib/editor/utils/utils.ts` | Utilitários de sanitização de URL |
| `lib/config-manager.ts` | Manager YAML de configuração com proteção contra prototype pollution |
| `auth.config.ts` | Configuração do NextAuth |
| `next.config.ts` | Cabeçalhos de segurança e CSP |
