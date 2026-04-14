---
id: features
title: Recursos da plataforma
sidebar_label: Recursos
sidebar_position: 3
---

# Recursos da plataforma

Este documento fornece uma visão abrangente de todos os recursos disponíveis na plataforma Ever Works, organizados por área funcional.

## Autenticação de usuário e gerenciamento de conta

### Cadastro de usuário

**Descrição**: Permite que novos usuários criem contas na plataforma.

**Como funciona**:

- Os usuários podem se registrar via e-mail/senha ou provedores OAuth (Google, GitHub, Facebook, Twitter)
- A verificação por e-mail é enviada no momento do registro
- A senha é hash usando bcrypt antes do armazenamento
- Após o registro bem-sucedido, um perfil de cliente é criado automaticamente

**Fluxo de usuários**:

1. O usuário clica em "Cadastre-se" na página inicial
2. Escolhe o método de registro (e-mail ou OAuth)
3. Preenche as informações necessárias (nome, e-mail, senha)
4. Recebe e-mail de verificação
5. Clica no link de verificação para ativar a conta
6. Redirecionado para o painel do cliente

**Arquivos principais**: `/lib/auth/index.ts`, `/app/[locale]/auth/`

[Saiba mais sobre a configuração de autenticação →](/authentication/setup-guide)

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

### Gerenciamento de senhas

**Descrição**: permite que os usuários alterem ou redefinam suas senhas.

**Recursos**:

- **Alterar senha**: usuários autenticados podem atualizar sua senha nas configurações
- **Esqueci a senha**: os usuários recebem e-mail com link de redefinição
- **Token de redefinição**: token com tempo limitado para redefinição segura de senha

**Como funciona**:

1. Usuário solicita redefinição de senha
2. Sistema gera token seguro armazenado na tabela `passwordResetTokens`
3. Email enviado com link de redefinição contendo token
4. O usuário clica no link e digita uma nova senha
5. O token é invalidado após o uso

**Arquivos principais**: `/app/api/auth/change-password/`, `/lib/db/schema.ts`

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

### Pesquisa e filtragem

**Descrição**: permite que os usuários encontrem itens específicos usando vários critérios.

**Tipos de filtros**:

- **Pesquisa de texto**: pesquisa de texto completo em nomes e descrições de itens
- **Filtro de categoria**: filtre por categorias únicas ou múltiplas
- **Filtro de tags**: filtre por tags atribuídas aos itens
- **Filtros Combinados**: aplique vários filtros simultaneamente

**Como funciona**:

1. Os filtros são armazenados em parâmetros de URL para facilitar o compartilhamento
2. O contexto `FilterProvider` gerencia o estado do filtro
3. `FilterURLParser` sincroniza URL com estado de filtro
4. Os itens são filtrados no servidor e retornados ao cliente

**Experiência do usuário**:

- Os filtros persistem no URL (marcador/compartilhável)
- Atualização de resultados em tempo real
- Limpar todas as opções de filtros

**Arquivos principais**: `/components/filter-provider.tsx`, `/components/filter-url-parser.tsx`

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

### Sistema de tags

**Descrição**: taxonomia simples para organização de itens entre categorias.

**Recursos**:

- Várias tags por item
- Exibição de nuvem de tags
- Filtragem baseada em tags
- Pode ser ativado/desativado através das configurações de administrador

**Como funciona**:

- Tags armazenadas em `.content/tags/` como arquivos markdown
- Relacionamento muitos-para-muitos com itens
- Tags clicáveis filtram a listagem de itens

**Arquivos principais**: `/app/[locale]/tags/`, `/lib/services/tag-git.service.ts`

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

### Sistema de classificação

**Descrição**: os usuários podem avaliar os itens em uma escala de 1 a 5 estrelas.

**Como funciona**:

- A classificação faz parte do sistema de comentários
- Cada comentário pode incluir uma classificação
- Classificação média calculada e exibida
- Distribuição de classificação mostrada (quantas estrelas de 5, 4 estrelas, etc.)

**Exibição**:

- Ícones de estrela mostrando classificação média
- Contagem de avaliações ao lado das estrelas
- Detalhamento da classificação na página de detalhes do item

**Arquivos principais**: `/hooks/use-item-rating.ts`, `/lib/db/schema.ts` (tabela de comentários)

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

### Sistema de Favoritos

**Descrição**: Os usuários podem salvar itens em sua lista de favoritos para acesso rápido.

**Como funciona**:

1. O usuário clica no ícone de coração/favorito no item
2. Item adicionado à tabela `favorites`
3. Favoritos acessíveis a partir do perfil do usuário
4. Alternar ação (clique novamente para remover)

**Recursos**:

- Lista de favoritos no portal do cliente
- Ação rápida não favorita
- Os favoritos contam com itens (opcional)
- Exportar lista de favoritos

**Arquivos principais**: `/hooks/use-favorites.ts`, `/app/api/favorites/`, `/app/[locale]/favorites/`

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

## Envio de itens

**Descrição**: Permite que os usuários enviem novos itens para a plataforma.

**Como funciona**:

1. O usuário navega para enviar a página
2. Preenche os detalhes do item (nome, descrição, URL, logotipo)
3. Seleciona categoria e tags
4. Envia para revisão
5. O administrador recebe notificação de novo envio
6. O administrador analisa e aprova/rejeita
7. Itens aprovados aparecem na plataforma

**Campos do formulário**:

- Nome do item (obrigatório)
- Descrição (obrigatório)
- URL do site
- Upload de logotipo/imagem
- Seleção de categoria
- Seleção de tags
- Metadados adicionais

**Estados do fluxo de trabalho**:

- Rascunho → Revisão Pendente → Aprovado/Rejeitado

**Arquivos principais**: `/app/[locale]/submit/`, `/app/api/admin/items/[id]/review/`

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

## Sistema de assinatura e pagamento

**Descrição**: Monetização por meio de acesso baseado em assinatura ou recursos premium.

**Provedores suportados**:

- **Stripe**: gerenciamento completo de assinaturas, faturamento, portal do cliente
- **LemonSqueezy**: Processador de pagamentos alternativo com conformidade fiscal

**Como funciona**:

1. Planos definidos no provedor de pagamento (Stripe/LemonSqueezy)
2. Os usuários selecionam o plano na página de preços
3. Redirecionado para checkout do provedor de pagamento
4. Webhook lida com pagamento bem-sucedido
5. Registro de assinatura criado no banco de dados
6. O usuário ganha acesso a recursos premium

**Arquivos principais**: `/app/api/stripe/`, `/app/api/lemonsqueezy/`

[Saiba mais sobre integração de pagamento →](/payment)

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

## Sistema de Notificação

**Descrição**: Notificações geradas pelo sistema para eventos importantes.

**Tipos de notificação**:

- Novos comentários nos itens do usuário
- Atualizações de assinatura
- Anúncios do administrador
- Aprovação/rejeição de item

**Canais de entrega**:

- Notificações no aplicativo
- Notificações por e-mail (via Reenviar/Novu)
- Notificações push (opcional)

**Arquivos principais**: `/lib/services/notification.service.ts`, `/app/api/notifications/`

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

## Integração CRM (vinte CRM)

**Descrição**: Sincronize dados da plataforma com Twenty CRM para gerenciamento de relacionamento com o cliente.

**Recursos**:

- Criação automática de contatos a partir de cadastros de usuários
- Sincronize atividades e interações do usuário
- Acompanhe assinaturas e pagamentos
- Mapeamento de campo personalizado
- Sincronização baseada em webhook

**Arquivos principais**: `/lib/services/crm.service.ts`, `/app/api/webhooks/crm/`

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

## Internacionalização (i18n)

**Descrição**: Suporte multilíngue para a plataforma.

**Idiomas suportados**: mais de 13 idiomas, incluindo inglês, francês, espanhol, chinês, alemão, árabe (RTL) e muito mais.

**Recursos**:

- Detecção automática de localidade
- Troca de localidade baseada em URL
- Suporte RTL para árabe
- Formatação de data/número por localidade
- Regras de pluralização

**Arquivos principais**: `/messages/`, `/lib/i18n/`, `/middleware.ts`

[Saiba mais sobre internacionalização →](/internacionalização)

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

## Painel de administração

**Descrição**: Hub central para administradores monitorarem e gerenciarem a plataforma.

**Widgets do painel**:

- Total de usuários, itens, assinaturas
- Feed de atividades recentes
- Envios pendentes
- Estado de saúde do sistema
- Visão geral da análise

**Principais recursos**:

- Estatísticas em tempo real
- Ações rápidas
- Notificações do sistema
- Métricas de desempenho

**Arquivos principais**: `/app/[locale]/admin/dashboard/`

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

## Gestão de clientes

**Descrição**: Gerenciamento administrativo de perfis de clientes.

**Recursos**:

- Ver todos os perfis de clientes
- Editar informações do cliente
- Vincular clientes a empresas
- Ver envios de clientes
- Gerenciar assinaturas de clientes

**Arquivos principais**: `/app/[locale]/admin/clients/`, `/app/api/admin/clients/`

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

## Gerenciamento de configurações

**Descrição**: Opções de configuração em toda a plataforma.

**Categorias de configurações**:

- **Geral**: nome do site, descrição, logotipo
- **Recursos**: ativar/desativar recursos (categorias, tags, votação, etc.)
- **E-mail**: configuração SMTP, modelos de e-mail
- **Pagamento**: chaves de API Stripe/LemonSqueezy
- **Analytics**: PostHog, configuração do Sentry
- **Segurança**: ReCAPTCHA, limitação de taxa

**Arquivos principais**: `/app/[locale]/admin/settings/`, `/lib/config/`

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

## Recursos adicionais

### Modelos de e-mail

Modelos de e-mail personalizáveis para:

- E-mails de boas-vindas
- Redefinição de senha
- Verificação de e-mail
- Confirmações de assinatura
- Boletim informativo

[Saiba mais sobre modelos de e-mail →](/guides/email-templates)

### Sistema Temático

Vários temas pré-construídos:

- EverWorks (padrão)
- Corporativo
- Materiais
- Engraçado

[Saiba mais sobre temas →](/guides/theming)

### Sistema Dinâmico de Cores

Geração automática de paleta de cores (tons 50-950) a partir de cores base.

[Saiba mais sobre cores dinâmicas →](/guides/dynamic-colors)

### Teste responsivo

Diretrizes e práticas recomendadas para testes entre dispositivos.

[Saiba mais sobre testes →](/development/testing)

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

## Próximas etapas

- [Tech Stack](./tech-stack) – Explore a pilha de tecnologia
- [Visão geral da arquitetura](./overview) - Entenda a arquitetura

## Recursos

- [Configuração de desenvolvimento](/development/local-setup) – Configure seu ambiente
- [Guia de implantação](/deployment/overview) – Implantar em produção
- [Documentação da API](/development/api-documentation) – referência da API
