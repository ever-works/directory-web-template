---
id: architecture
title: Visão geral da arquitetura
sidebar_label: Visão geral
sidebar_position: 0
---

# Visão geral da arquitetura

Esta página fornece um mapa de alto nível da arquitetura do modelo Ever Works. Use-o como ponto de partida antes de mergulhar nas páginas detalhadas a seguir.

## Fundação Tecnológica

O modelo é um aplicativo **Next.js 16** usando o **App Router** com **React 19**. Ele produz uma saída `standalone` para implantações em contêineres e aplica diversas otimizações em nível de estrutura em `next.config.ts`:

|Camada|Tecnologia|Objetivo|
|---|---|---|
|**Estrutura**|Next.js 16 (Roteador de aplicativo)|Renderização de servidor e cliente, roteamento, rotas de API|
|**IU**|React 19, HeroUI, Radix UI, Tailwind CSS 4|Biblioteca de componentes, primitivos, estilo|
|**Banco de dados**|Regue ORM + PostgreSQL (ou SQLite localmente)|Gerenciamento de esquema, migrações, consultas|
|**Autenticação**|PróximoAuth.js v5 (beta)|Autenticação de vários provedores com cache de sessão|
|**Internacionalização**|próximo-intl|Roteamento com reconhecimento de localidade e pacotes de mensagens|
|**Pagamentos**|Listra, Polar, LemonSqueezy, Solidgate|Fluxos de assinatura e pagamento único|
|**Conteúdo**|CMS baseado em Git (`.content/` diretório)|Conteúdo Markdown/YAML clonado de um repositório de dados|
|**Monitoramento**|Sentinela, PostHog, Vercel Analytics|Rastreamento de erros, análise de produtos, desempenho|
|**E-mail**|Reenviar|Entrega de email transacional|
|**Rich Text**|Toque rápido|Editor WYSIWYG para conteúdo administrativo|

## Estrutura do Projeto

O modelo segue uma organização em camadas baseada em recursos. Aqui estão os diretórios de nível superior e suas responsabilidades:

```text
template/
  app/              # Next.js App Router -- routes and layouts
    [locale]/       # Locale-prefixed pages (i18n)
      admin/        # Admin dashboard pages
      auth/         # Authentication flows
      dashboard/    # Client dashboard
      items/        # Item detail pages
      categories/   # Category browsing
      ...
    api/            # API route handlers
  components/       # Shared React components (UI, layout, features)
  lib/              # Core logic -- the heart of the application
    auth/           # Authentication providers, guards, session caching
    db/             # Drizzle schema, migrations, seed, queries
    middleware/     # Permission checks and middleware utilities
    repositories/  # Data-access layer (database queries)
    services/      # Business logic services
    payment/       # Payment provider integrations
    mail/           # Email templates and sending
    analytics/     # Analytics tracking layer
    config/        # Centralized configuration service
    validations/   # Zod schemas for input validation
    utils/         # General utility functions
    ...
  hooks/            # Custom React hooks (React Query wrappers, UI logic)
  constants/        # Application-wide constants
  types/            # Shared TypeScript type definitions
  i18n/             # Internationalization setup and locale request config
  messages/         # Translation message files (JSON per locale)
  e2e/              # Playwright end-to-end tests
  scripts/          # Build, seed, migration, and utility scripts
  public/           # Static assets
```

Para obter um passo a passo completo do diretório, consulte a página [Estrutura do projeto](/architecture/project-structure).

## Arquitetura em camadas

A base de código impõe uma separação clara de preocupações em três camadas:

### Camada de apresentação

Componentes React em `components/` e arquivos de página em `app/[locale]/` lidam com renderização e interação do usuário. Os componentes do servidor buscam dados diretamente; Os componentes do cliente usam ganchos React Query de `hooks/` para o estado do lado do cliente.

### Camada de lógica de negócios

Os serviços em `lib/services/` contêm as principais regras de negócios. O modelo vem com mais de 30 arquivos de serviço que abrangem análises, assinaturas, moderação, sincronização de CRM, geocodificação, notificações e muito mais. Os serviços são chamados por manipuladores de rotas de API e componentes de servidor, mas nunca diretamente pelo código da UI no navegador.

### Camada de acesso a dados

Os repositórios em `lib/repositories/` encapsulam todas as consultas de banco de dados usando Drizzle ORM. Cada entidade de domínio (itens, categorias, coleções, usuários, funções, tags, anúncios patrocinadores) possui seu próprio arquivo de repositório. Isso mantém os detalhes no nível SQL fora da camada de serviço.

Para uma visão mais aprofundada do fluxo de dados entre essas camadas, consulte [Fluxo de dados](/architecture/data-flow).

## Roteador e roteamento do aplicativo Next.js

Todas as rotas voltadas para o usuário residem em `app/[locale]/`, o que permite URLs com prefixo de localidade prontos para uso via `next-intl`. O aplicativo usa vários recursos do App Router:

- **Layouts** -- arquivos `layout.tsx` aninhados para administração, painel do cliente e áreas públicas.
- **Grupos de rotas** -- o grupo `(listing)` lida com a listagem do diretório principal e a navegação por tags sem afetar a estrutura da URL.
- **Rotas dinâmicas** -- `[page]`, `[...tag]` e segmentos nomeados para itens, categorias e coleções.
- **Reescritas** - definidas em `next.config.ts` para redirecionar caminhos de categoria simples para sua visualização de descoberta paginada.

Consulte [Roteamento](/architecture/routing) para obter o mapa completo da rota.

## Sistema de autenticação

A autenticação é baseada em **NextAuth.js v5** com um sistema de configuração de provedor em `lib/auth/`. O arquivo `auth.config.ts` na raiz do projeto orquestra:

- **Provedores OAuth**: Google e GitHub, configurados por meio de variáveis de ambiente e ativados/desativados dinamicamente.
- **Provedor de credenciais** – autenticação de e-mail/senha com hashing bcrypt.
- **Adaptador Supabase** – armazenamento de sessão opcional com suporte do Supabase.
- **Cache de sessão** -- `lib/auth/cached-session.ts` reduz pesquisas de sessão redundantes.
- **Sistema de proteção** -- `lib/auth/guards.ts` e `lib/guards/` impõem acesso baseado em função no nível da rota.

Para obter detalhes sobre o sistema de guarda e permissões baseadas em funções, consulte [Sistema de Guardas](/architecture/guards-system) e [Sistema de Permissões](/architecture/permissions-system).

## Regue ORM e banco de dados

A camada de banco de dados usa **Drizzle ORM** com o esquema definido em `lib/db/schema.ts`. Aspectos principais:

- **Migrações** são geradas com `drizzle-kit generate` e aplicadas com `drizzle-kit migrate`.
- **Seeding** scripts em `lib/db/seed.ts` e `scripts/cli-seed.ts` preenchem os dados iniciais, incluindo funções.
- **Configuração** reside em `drizzle.config.ts` na raiz do projeto.
- PostgreSQL é necessário para produção; SQLite é compatível com desenvolvimento local.

Consulte [Padrões de repositório](/architecture/repository-patterns) para saber como a camada de acesso a dados está estruturada.

## Cadeia de Middleware

O modelo usa middleware Next.js (por meio do plugin `next-intl` aplicado em `next.config.ts`) combinado com verificações de permissão personalizadas em `lib/middleware/permission-check.ts`. O pipeline de middleware lida com:

- Detecção e roteamento de localidade
- Verificação do estado de autenticação
- Proteção de rota baseada em função
- Cabeçalhos de segurança (HSTS, CSP, X-Frame-Options e mais - configurados em `next.config.ts`)

Para obter uma análise detalhada, consulte [Middleware](/architecture/middleware) e [Middleware Deep Dive](/architecture/middleware-deep-dive).

## Configuração e segurança

O arquivo `next.config.ts` define vários padrões de segurança e desempenho:

- **Saída independente** para implantações compatíveis com Docker.
- **Cabeçalhos de segurança** incluindo Content-Security-Policy, HSTS, X-Content-Type-Options e X-Frame-Options.
- **Otimização de imagem** com suporte remoto a padrões e políticas de segurança SVG.
- **Integração do Sentry** aplicada como o wrapper de configuração mais externo para rastreamento de erros.
- **Otimização de pacotes** para HeroUI e Lucide React para reduzir o tamanho do pacote.

## Páginas detalhadas de arquitetura

Explore estas páginas para uma cobertura mais profunda de sistemas individuais:

|Página|O que cobre|
|---|---|
|[Pilha de tecnologia](/arquitetura/pilha de tecnologia)|Inventário completo de dependências e detalhes da versão|
|[Estrutura do Projeto](/arquitetura/estrutura do projeto)|Passo a passo diretório por diretório|
|[Fluxo de dados](/arquitetura/fluxo de dados)|Solicitar ciclo de vida do navegador ao banco de dados|
|[Roteamento](/arquitetura/roteamento)|Estrutura do App Router e padrões de URL|
|[Padrões de componentes](/architecture/component-patterns)|Componentes de servidor versus cliente, padrões de composição|
|[Gestão Estadual](/arquitetura/gestão estatal)|React Query, Zustand e estado do servidor|
|[Camada API](/architecture/api-layer)|Design da API REST e padrões de manipulador de rotas|
|[Middleware](/arquitetura/middleware)|Pipeline de middleware e processamento de solicitações|
|[Sistema de guardas](/arquitetura/sistema de guardas)|Controle de acesso baseado em função no nível da rota|
|[Sistema de permissões](/arquitetura/sistema de permissões)|Definições de permissão refinadas|
|[Padrões de repositório](/architecture/repository-patterns)|Convenções da camada de acesso a dados|
|[Padrões de validação](/architecture/validation-patterns)|Esquemas Zod e validação de entrada|
|[Sistema de Tema](/architecture/theme-system)|Arquitetura de temas e gerenciamento de cores|
|[Sistema de cores](/arquitetura/sistema de cores)|Pipeline de geração de cores dinâmicas|
|[Sistema SEO](/arquitetura/seo-sistema)|Metadados, mapas de sites e dados estruturados|
|[Biblioteca de Pagamento](/arquitetura/biblioteca de pagamento)|Integração de pagamento multiprovedor|
|[Biblioteca de conteúdo](/architecture/content-library)|Pipeline de conteúdo CMS baseado em Git|
|[Sistema Editor](/arquitetura/sistema editor)|Integração do editor de rich text Tiptap|
|[Padrões do mapeador](/architecture/mapper-patterns)|Transformação de dados entre camadas|
|[Limites de erro](/arquitetura/limites de erro)|Tratamento e recuperação de erros|
|[Camada analítica](/arquitetura/camada analítica)|Pipeline de rastreamento e análise de eventos|
|[Sistema Swagger](/arquitetura/sistema swagger)|Geração de documentação OpenAPI|

## Para onde ir em seguida

- **Novo no projeto?** Comece com [Introdução](/getting-started) para instalar e executar o modelo.
- **Pronto para personalizar?** Acesse a seção [Guias](/guides) para ver tutoriais passo a passo.
- **Quer o inventário completo de tecnologia?** Consulte [Tech Stack](/architecture/tech-stack).

---

Understanding the architecture will help you make informed decisions when extending the template. Start with the areas most relevant to your use case and explore outward from there.
