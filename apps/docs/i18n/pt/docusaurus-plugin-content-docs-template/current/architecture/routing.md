---
id: routing
title: Arquitetura de roteamento
sidebar_label: Roteamento
sidebar_position: 6
---

# Arquitetura de roteamento

O modelo Ever Works usa o Next.js App Router com internacionalização via `next-intl`, fornecendo rotas com prefixo de localidade, grupos de rotas para organização lógica e uma camada de API abrangente.

## Roteador de aplicativos com segmento local

Todas as páginas voltadas para o usuário são aninhadas em um segmento dinâmico `[locale]`, permitindo suporte multilíngue para 6 localidades: `en`, `fr`, `es`, `de`, `ar` e `zh`.

```
app/
├── [locale]/           # Dynamic locale segment
│   ├── layout.tsx      # Locale layout (wraps all localized pages)
│   ├── providers.tsx   # Client providers for the locale subtree
│   ├── globals.css     # Global styles
│   └── ...pages        # All localized pages
├── api/                # API routes (not locale-prefixed)
├── layout.tsx          # Root layout (HTML, fonts, metadata)
└── not-found.tsx       # 404 page
```

URLs seguem o padrão `/{locale}/path`, por exemplo:
- `/en/pricing` -- Página de preços em inglês
- `/fr/admin/items` -- Página de itens de administração francesa
- `/de/categories` -- Página de categorias alemãs

## Configuração Next.js

O `next.config.ts` configura vários comportamentos de roteamento:

### Reescreve

```typescript
async rewrites() {
  return [
    {
      source: "/:path",
      destination: "/:path/discover/1",
    },
    {
      source: "/:path/discover",
      destination: "/:path/discover/1",
    },
  ];
}
```

Essas reescritas redirecionam o caminho de localidade raiz e `/discover` para a primeira página da listagem de descoberta (`/discover/1`), fornecendo um URL padrão limpo.

### Cabeçalhos de segurança

Todas as rotas recebem cabeçalhos de segurança, incluindo:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` com idade máxima de 2 anos
- `Content-Security-Policy` com padrões restritivos
- `Referrer-Policy: strict-origin-when-cross-origin`

### Plug-in next-intl

O plugin `next-intl` é aplicado à configuração do Next.js, apontando para `./i18n/request.ts` para resolução de localidade:

```typescript
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const configWithIntl = withNextIntl(nextConfig);
```

## Grupos de rotas

O diretório `[locale]` usa vários agrupamentos lógicos para organizar páginas:

### (listagem) - Páginas principais da listagem

O grupo de rotas `(listing)` é um grupo entre parênteses (sem segmento de URL) que envolve as páginas de listagem do diretório principal com um layout compartilhado.

### admin/ -- Painel de administração

A seção de administração fornece uma interface de back-office completa:

```
[locale]/admin/
├── auth/               # Admin sign-in
├── categories/         # Category CRUD
├── clients/            # Client management
├── collections/        # Collection CRUD
├── comments/           # Comment moderation
├── companies/          # Company management
├── featured-items/     # Featured item management
├── items/              # Item review and management
├── reports/            # Report review
├── roles/              # Role and permission management
├── settings/           # Site settings
├── sponsorships/       # Sponsorship management
├── surveys/            # Survey builder
├── tags/               # Tag management
├── users/              # User management
├── layout.tsx          # Admin layout (sidebar, navigation)
├── layout-client.tsx   # Client-side admin layout logic
└── page.tsx            # Admin dashboard
```

### auth/ -- Páginas de autenticação

```
[locale]/auth/
├── signin/             # Sign in page
├── signup/             # Sign up page
├── forgot-password/    # Password reset request
├── reset-password/     # Password reset form
├── verify-email/       # Email verification
└── error/              # Authentication error page
```

### cliente/ -- Painel do cliente

A seção do cliente fornece recursos de usuário autenticado para gerenciar seus próprios envios e contas.

### painel/ -- Painel do usuário

Painel geral do usuário com visão geral da conta, atividades e configurações.

## Rotas API (29 grupos)

As rotas de API residem fora do segmento `[locale]` em `app/api/` e não têm prefixo de localidade. Eles servem como back-end para busca de dados do lado do cliente.

|Grupo de rotas|Objetivo|Principais pontos finais|
|-------------|---------|---------------|
|`admin/`|Operações administrativas|Itens, usuários, categorias, configurações|
|`auth/`|Autenticação|Sessão, retornos de chamada OAuth|
|`categories/`|Dados de categoria|Lista, pesquisa|
|`client/`|Operações do cliente|Perfil, envios, painel|
|`collections/`|Dados de coleta|Lista, detalhe|
|`config/`|Configuração do site|Sinalizadores de recursos, configurações|
|`cron/`|Tarefas agendadas|Verificações de assinatura, limpeza|
|`current-user/`|Informações do usuário atual|Perfil, dados da sessão|
|`extract/`|Extração de URL|Extração de metadados de URLs|
|`favorites/`|Favoritos|Adicionar, remover, listar|
|`featured-items/`|Itens em destaque|Listar itens em destaque ativos|
|`geocode/`|Geocodificação|Pesquisa de endereço, geocodificação reversa|
|`health/`|Verificação de saúde|Banco de dados e status do serviço|
|`internal/`|Operações internas|Pontos de extremidade no nível do sistema|
|`items/`|Dados do item|Lista, detalhe, pesquisa|
|`lemonsqueezy/`|Espremedor de Limão|Manipulador de webhook|
|`location/`|Dados de localização|Itens próximos, pesquisa de localização|
|`payment/`|Operações de pagamento|Finalização da compra, formas de pagamento|
|`polar/`|Polar|Manipulador de webhook|
|`reference/`|Dados de referência|Enums, valores de pesquisa|
|`reports/`|Relatórios de conteúdo|Enviar e revisar relatórios|
|`solidgate/`|Solidgate|Manipulador de webhook|
|`sponsor-ads/`|Anúncios patrocinadores|CRUD, ativação|
|`stripe/`|Listra|Manipulador de webhook, checkout|
|`surveys/`|Pesquisas|Listar, responder, resultados|
|`user/`|Operações do usuário|Perfil, configurações|
|`verify-recaptcha/`|reCAPTCHA|Verificação de token|
|`version/`|Informações da versão|Versão do aplicativo e informações de compilação|

## Middleware

O aplicativo usa middleware `next-intl` para detecção e roteamento de localidade. O middleware lida com:

1. **Detecção de localidade**: determina a localidade do usuário a partir do caminho da URL, cookies ou cabeçalho `Accept-Language`
2. **Redirecionamentos de localidade**: redireciona solicitações sem um prefixo de localidade para a localidade apropriada
3. **Localidade padrão**: volta para inglês (`en`) quando nenhuma preferência de localidade é detectada

O middleware é configurado no diretório `i18n/` com regras de roteamento de localidade definidas em `i18n/routing.ts` e tratamento de solicitação em `i18n/request.ts`.

## Geração Estática e Rotas Dinâmicas

O modelo usa várias estratégias de busca de dados:

- **Geração estática**: páginas como política de privacidade, termos de serviço e informações sobre são geradas estaticamente
- **Renderização dinâmica**: páginas de administração, painéis e páginas autenticadas são renderizadas dinamicamente
- **ISR (regeneração estática incremental)**: páginas de listagem de categorias e tags usam ISR com revalidação
- **Geração de mapa de site**: `app/sitemap.ts` gera dinamicamente o mapa de site a partir de dados de conteúdo

O `staticPageGenerationTimeout` é definido para 180 segundos em `next.config.ts` para acomodar grandes repositórios de conteúdo durante compilações.
