---
id: security
title: Fortalecimento de segurança
sidebar_label: Segurança
sidebar_position: 6
---

# Fortalecimento de segurança

O modelo Ever Works inclui múltiplas camadas de segurança por padrão. Este guia documenta as proteções integradas e fornece recomendações para fortalecer ainda mais sua implantação de produção.

## Cabeçalhos de segurança

O modelo configura cabeçalhos de segurança globalmente em `next.config.ts` para todas as rotas:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: "..." },
      ],
    },
  ];
},
```

### Detalhamento do cabeçalho

| Cabeçalho | Valor | Finalidade |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Impede ataques de detecção do tipo MIME |
| `X-Frame-Options` | `DENY` | Impede que o site seja incorporado em iframes (proteção contra clickjacking) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita informações de referência enviadas para origens externas |
| `X-DNS-Prefetch-Control` | `on` | Permite a pré-busca de DNS para desempenho |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Aplica HTTPS por aproximadamente 2 anos, cobre todos os subdomínios, elegíveis para lista de pré-carregamento HSTS |
| `Content-Security-Policy` | Veja abaixo | Restringe fontes de carregamento de recursos |

### Política de segurança de conteúdo

O CSP está configurado como:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https:;
frame-ancestors 'none';
```

| Diretiva | Valor | Notas |
|---|---|---|
| `default-src` | `'self'` | Permitir apenas recursos da mesma origem por padrão |
| `script-src` | `'self' 'unsafe-inline'` + Espremedor de Limão | Obrigatório para scripts embutidos e widget de pagamento |
| `style-src` | `'self' 'unsafe-inline'` | Obrigatório para CSS-in-JS e Tailwind |
| `img-src` | `'self' data: https:` | Permite imagens da mesma origem, URIs de dados e qualquer fonte HTTPS |
| `font-src` | `'self'` | Somente fontes auto-hospedadas |
| `connect-src` | `'self' https:` | Chamadas de API para a mesma origem e qualquer endpoint HTTPS |
| `frame-ancestors` | `'none'` | Impede a incorporação em qualquer iframe (equivalente a `X-Frame-Options: DENY` ) |

### Segurança de imagem SVG

Imagens SVG recebem sandbox adicional:

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
},
```

SVGs são servidos como anexos com scripts completamente desabilitados e em sandbox, evitando ataques XSS baseados em SVG.

### Endurecimento Adicional

O `poweredByHeader` está desativado:

```typescript
poweredByHeader: false,
```

Isso remove o cabeçalho `X-Powered-By: Next.js` , evitando impressões digitais tecnológicas.

## Segurança de autenticação

### Integração NextAuth.js

O modelo usa NextAuth.js (Auth.js) para autenticação. Os principais recursos de segurança incluem:

- **Sessões JWT ou de banco de dados** com estratégia de sessão configurável
- **Proteção CSRF** em todos os envios de formulários
- **Configuração segura de cookies** com sinalizadores `httpOnly` , `secure` e `sameSite` - **Validação de entrada** com esquemas Zod em todas as ações do formulário

### Ações validadas

As ações do servidor são protegidas usando wrappers de ação validados definidos em `lib/auth/middleware.ts` :

```typescript
// Validate input with Zod before processing
export function validatedAction<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData);
  };
}

// Validate input AND require authentication
export function validatedActionWithUser<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("User is not authenticated");
    }
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData, session.user);
  };
}
```

**Sempre use `validatedActionWithUser` ** para operações autenticadas. Isso garante que a validação de entrada e a verificação da sessão ocorram antes da execução de qualquer lógica de negócios.

## Aplicação do RBAC

O modelo inclui um sistema completo de controle de acesso baseado em funções em `lib/middleware/permission-check.ts` .

### Formato de permissão

As permissões seguem um padrão `resource:action` :

```
items:read, items:create, items:update, items:delete
users:read, users:create, users:assignRoles
analytics:read, analytics:export
system:settings
```

### Funções de verificação de permissão

| Função | Finalidade | Exemplo |
|---|---|---|
| `hasPermission` | Verifique a permissão única | `hasPermission(user, 'items:create')` |
| `hasAnyPermission` | Verifique se o usuário possui pelo menos um | `hasAnyPermission(user, ['items:review', 'items:approve'])` |
| `hasAllPermissions` | Verifique se o usuário listou todos | `hasAllPermissions(user, ['users:read', 'users:update'])` |
| `hasResourcePermission` | Verificação por recurso + strings de ação | `hasResourcePermission(user, 'items', 'delete')` |
| `canManageResource` | Verifique criar/atualizar/excluir | `canManageResource(user, 'categories')` |
| `canReviewItems` | Verifique as permissões de revisão do item | `canReviewItems(user)` |
| `canManageUsers` | Verifique as permissões de gerenciamento de usuários | `canManageUsers(user)` |
| `canManageRoles` | Verifique as permissões de gerenciamento de funções | `canManageRoles(user)` |
| `canViewAnalytics` | Verifique o acesso analítico | `canViewAnalytics(user)` |
| `isSuperAdmin` | Verifique a função de superadministrador ou todas as permissões | `isSuperAdmin(user)` |

### Usando permissões em rotas de API

```typescript
import { hasPermission, UserPermissions } from '@/lib/middleware/permission-check';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userPerms: UserPermissions = {
    userId: session.user.id,
    roles: session.user.roles,
    permissions: session.user.permissions,
  };

  if (!hasPermission(userPerms, 'items:create')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with authorized logic
}
```

### Detecção de superadministrador

A função `isSuperAdmin` utiliza uma abordagem dupla para máxima segurança:

1. **Verificação de função**: verifica se o usuário possui a função `super-admin` 2. **Permissão substituta**: verifica se o usuário possui todas as permissões definidas do sistema

Isso garante que nenhum conjunto de permissões parcial possa conceder acidentalmente acesso de superadministrador.

## Limitação de taxa

### Proteção de rota de API

Implemente a limitação de taxa para rotas de API públicas para evitar abusos:

```typescript
// Example using a simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record || now > record.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;
  record.count++;
  return true;
}
```

Para implantações de produção, considere usar:
- **Vercel Edge Middleware** com limitação de taxa de `@vercel/edge` - **Upstash Redis** para limitação de taxa distribuída em instâncias sem servidor
- **Limitação de taxa Cloudflare** na camada CDN

### Proteção de endpoint Cron

Os endpoints da API Cron devem verificar um segredo compartilhado para evitar invocação não autorizada:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Execute cron job
}
```

O `CRON_SECRET` é definido por meio de variáveis ​​de ambiente e configurado durante a implantação (consulte o fluxo de trabalho de implantação Vercel do pipeline CI/CD).

## Validação de entrada

### Validação do esquema Zod

Todas as entradas de formulário e cargas de API devem ser validadas com esquemas Zod:

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  url: z.string().url(),
  categoryId: z.string().uuid(),
});
```

### Prevenção de injeção SQL

O modelo usa Drizzle ORM para todas as consultas ao banco de dados, que parametriza todos os valores automaticamente. Nunca construa strings SQL brutas com entrada do usuário.

### Prevenção XSS

- Os componentes do servidor são renderizados no servidor e não expõem o HTML bruto ao cliente.
- Todo o conteúdo gerado pelo usuário deve ser escapado usando o escape integrado do React (JSX escapa automaticamente das strings).
- O cabeçalho CSP bloqueia scripts embutidos de fontes não confiáveis.

## Segurança de variáveis de ambiente

### Segredos Obrigatórios

| Variável | Finalidade | Geração |
|---|---|---|
| `AUTH_SECRET` | Assina tokens JWT e cookies de sessão | `openssl rand -base64 32` |
| `COOKIE_SECRET` | Criptografa valores de cookies | `openssl rand -base64 32` |
| `CRON_SECRET` | Autentica solicitações de endpoint cron | `openssl rand -base64 32` |
| `DATABASE_URL` | Cadeia de conexão do banco de dados | Fornecido pelo host do banco de dados |

### Melhores Práticas

1. **Nunca confirme segredos** para controle de versão. Use `.env.local` para desenvolvimento e segredos em nível de plataforma para produção.
2. **Alterne os segredos regularmente**, especialmente `AUTH_SECRET` e `COOKIE_SECRET` .
3. **Use segredos separados por ambiente** – não compartilhe segredos de produção com preparação ou desenvolvimento.
4. **Limite o acesso** às variáveis ​​de ambiente de produção usando o RBAC da sua plataforma (funções da equipe Vercel, regras de proteção de ambiente do GitHub).

## Lista de verificação de segurança para produção

| Categoria | Artigo | Estado |
|---|---|---|
| **Cabeçalhos** | Todos os cabeçalhos de segurança configurados em `next.config.ts` | Integrado |
| **Cabeçalhos** | `poweredByHeader` desativado | Integrado |
| **Cabeçalhos** | Pré-carga HSTS habilitada com idade máxima de 2 anos | Integrado |
| **Autorização** | `AUTH_SECRET` é um valor aleatório forte | Manual |
| **Autorização** | Os cookies de sessão usam `httpOnly` , `secure` , `sameSite` | Integrado |
| **Autorização** | Todas as ações do servidor usam `validatedActionWithUser` | Revisão |
| **RBAC** | Permissões verificadas em todas as rotas protegidas | Revisão |
| **RBAC** | O acesso de superadministrador requer atribuição explícita de funções | Integrado |
| **Entrada** | Validação Zod em todas as entradas de formulário e cargas de API | Revisão |
| **Entrada** | Nenhuma consulta SQL bruta (somente Drizzle ORM) | Revisão |
| **Cron** | Os endpoints Cron verificam `CRON_SECRET` | Revisão |
| **Segredos** | Todos os segredos alternados e específicos do ambiente | Manual |
| **CSP** | Política de segurança de conteúdo revisada para domínios de produção | Manual |
| **Departamentos** | A análise CodeQL é executada semanalmente na base de código | Integrado |
| **Departamentos** | Dependências auditadas ( `pnpm audit` ) | Manual |

## Relatando problemas de segurança

Se você descobrir uma vulnerabilidade de segurança, relate-a em particular:

- **E-mail**: security@ever.co
- **Não** abra um problema público no GitHub para vulnerabilidades de segurança.
- Incluir etapas de reprodução e avaliação de impacto quando possível.
