---
id: component-patterns
title: Arquitetura e padrões de componentes
sidebar_label: Padrões de componentes
sidebar_position: 7
---

# Arquitetura e padrões de componentes

O modelo Ever Works organiza seus componentes React usando uma estrutura de diretório baseada em recursos, com separação clara entre componentes de recursos, componentes compartilhados e primitivos de UI base.

## Organização do diretório

O diretório `components/` segue uma organização que prioriza os recursos, onde cada domínio principal tem seu próprio subdiretório, juntamente com componentes compartilhados e no nível da interface do usuário.

```
components/
├── admin/              # Admin panel feature components
├── auth/               # Authentication feature components
├── billing/            # Billing and payment components
├── collections/        # Collection display components
├── context/            # React context providers
├── dashboard/          # Dashboard feature components
├── directory/          # Directory listing components
├── favorites/          # Favorites feature components
├── featured-items/     # Featured items display
├── filters/            # Search and filter components
├── footer/             # Footer components
├── header/             # Header and navigation
├── home-two/           # Alternate homepage layout
├── icons/              # Custom icon components
├── item-detail/        # Item detail page components
├── layout/             # Layout wrapper components
├── layouts/            # Layout variant components
├── maps/               # Map integration components
├── newsletter/         # Newsletter components
├── payment/            # Payment flow components
├── pricing/            # Pricing display components
├── profile/            # User profile components
├── profile-button/     # Profile button dropdown
├── providers/          # Provider wrapper components
├── settings/           # Settings panel components
├── shared/             # Shared reusable components
├── shared-card/        # Shared card components
├── sponsor-ads/        # Sponsor ad components
├── sponsorships/       # Sponsorship management components
├── submissions/        # Submission form components
├── submit/             # Item submit components
├── surveys/            # Survey components
├── tracking/           # Analytics tracking components
├── ui/                 # Base UI primitives
└── version/            # Version display components
```

## Componentes baseados em recursos

Cada diretório de recursos contém todos os componentes relacionados a esse domínio. Isso mantém o código relacionado co-localizado e facilita a localização de componentes para um determinado recurso.

### administrador/

Contém todos os componentes do painel de administração, incluindo tabelas de dados, formulários, modais e interfaces de gerenciamento. Esses são componentes do cliente que usam ganchos específicos do administrador de `hooks/use-admin-*.ts`.

### autorização/

Componentes de autenticação, incluindo formulários de login, formulários de inscrição, fluxos de redefinição de senha, botões OAuth e telas de verificação de e-mail.

### faturamento/

Componentes de faturamento e gerenciamento de assinaturas, incluindo seleção de planos, formulários de métodos de pagamento, exibição de faturas e indicadores de status de assinatura.

### filtros/

Componentes de pesquisa e filtragem usados nas páginas de listagem. Eles interagem com os parâmetros de pesquisa de URL e o estado do filtro Zustand para fornecer filtragem em tempo real.

### preços/

Componentes da página de preços, incluindo cartões de comparação de planos, matrizes de recursos e integração de checkout.

## Componentes Compartilhados

### compartilhado/

O diretório `shared/` contém componentes reutilizáveis usados em vários recursos. Esses são blocos de construção independentes de domínio que combinam primitivos de UI em padrões funcionais.

### cartão compartilhado/

Componentes de cartão compartilhados usados para exibir itens, coleções e outros conteúdos em layouts de cartão no aplicativo.

## Componentes de nível raiz

Existem vários arquivos de componentes independentes na raiz de `components/`:

|Componente|Objetivo|
|-----------|---------|
|`categories-grid.tsx`|Exibição de grade para categorias|
|`custom-hero.tsx`|Seção de herói personalizável|
|`error-boundary.tsx`|Limite de erro com UI substituta|
|`error-provider.tsx`|Provedor de contexto de erro|
|`favorite-button.tsx`|Botão de alternância favorito|
|`hero.tsx`|Seção de herói padrão|
|`item.tsx`|Componente do cartão de item|
|`items-categories.tsx`|Itens organizados por categorias|
|`item-skeleton.tsx`|Carregando esqueleto para itens|
|`item-tags.tsx`|Exibição de tags para itens|
|`language-switcher.tsx`|Componente de troca de localidade|
|`layout-switcher.tsx`|Alternar layout de grade/lista|
|`report-button.tsx`|Botão de relatório de conteúdo|
|`sort-menu.tsx`|Lista suspensa de opções de classificação|
|`tags-cards.tsx`|Exibição de cartão de etiqueta|
|`tags-items.tsx`|Exibição de itens por tag|
|`theme-toggler.tsx`|Alternar tema claro/escuro|
|`universal-pagination.tsx`|Componente de paginação reutilizável|
|`view-toggle.tsx`|Alternar modo de visualização|

## Primitivos de UI (componentes/ui/)

O diretório `ui/` contém componentes de UI de nível básico que fornecem a base do sistema de design. Eles são construídos sobre HeroUI (anteriormente NextUI) e Tailwind CSS.

As principais primitivas da UI incluem:

|Componente|Descrição|
|-----------|-------------|
|`button.tsx`|Botão com variantes (primário, secundário, fantasma, etc.)|
|`card.tsx`|Recipiente de cartão com seções de cabeçalho, corpo e rodapé|
|`input.tsx`|Entrada de texto com suporte de validação|
|`label.tsx`|Componente de rótulo de formulário|
|`modal.tsx`|Diálogo modal com sobreposição|
|`select.tsx`|Selecione o menu suspenso com capacidade de pesquisa|
|`pagination.tsx`|Componente de navegação de página|
|`badge.tsx`|Componente de selo de status|
|`accordion.tsx`|Seções de conteúdo expansíveis|
|`alert.tsx`|Banner de alerta/notificação|
|`breadcrumb.tsx`|Navegação estrutural|
|`loading-spinner.tsx`|Indicador de carregamento|
|`password-strength.tsx`|Medidor de força da senha|
|`rating.tsx`|Exibição/entrada de classificação por estrelas|
|`infinity-scroll.tsx`|Wrapper de rolagem infinita|
|`searchable-select.tsx`|Selecione com filtragem de pesquisa|
|`animations.tsx`|Componentes utilitários de animação|
|`auth-illustrations.tsx`|Ilustrações da página de autenticação|

## Componentes de servidor versus cliente

O modelo segue as convenções Next.js para separação de componentes de servidor e cliente:

### Componentes do servidor

Os componentes do servidor são o padrão no App Router. Eles são usados para:
- Layouts de página e wrappers
- Busca de dados no nível da página
- Renderização de conteúdo estático
- Conteúdo crítico para SEO

Os componentes do servidor residem principalmente em arquivos de página e layout `app/[locale]/`. Eles podem importar diretamente funções de consulta de banco de dados e métodos de repositório.

### Componentes do cliente

Os componentes do cliente são marcados com `'use client'` e são usados para:
- Elementos de UI interativos (formulários, botões, alternadores)
- Componentes que usam ganchos React (useState, useEffect, ganchos personalizados)
- Componentes que usam APIs do navegador
- Componentes que dependem de React Query ou Zustand

A maioria dos componentes no diretório `components/` são componentes clientes porque lidam com a interação e o estado do usuário.

## Provedores de Contexto

### componentes/contexto/

Provedores de contexto React para compartilhar estado entre árvores de componentes:
- Contexto de erro para estado limite de erro
- Contexto do sinalizador de recursos para controle de recursos em tempo de execução

### componentes/provedores/

Componentes wrapper do provedor que compõem vários provedores:
- Consultar provedor de cliente (Consulta TanStack)
- Provedor de tema
- Provedor de sessão (NextAuth)
- Fornecedor de torradas

O wrapper de provedores raiz em `app/[locale]/providers.tsx` compõe todos os provedores necessários para o aplicativo.

## Convenções de componentes

1. **Nomeação de arquivos**: os componentes usam nomes de arquivos kebab-case (por exemplo, `favorite-button.tsx`)
2. **Padrão de exportação**: os componentes usam exportações nomeadas, arquivos barril (`index.ts`) em diretórios de recursos
3. **Co-localização de ganchos**: ganchos específicos de recursos ficam no diretório de nível superior `hooks/`, e não dentro de diretórios de componentes
4. **Estilo**: os componentes usam classes utilitárias CSS do Tailwind; alguns usam módulos SCSS para estilos complexos
5. **Tipos**: os tipos de componentes são definidos in-line ou em arquivos de tipo adjacentes no diretório `types/`
6. **Ícones**: Os ícones personalizados são centralizados em `components/icons/`; ícones padrão usam `lucide-react`
