---
id: tech-stack
title: Pilha de tecnologia
sidebar_label: Pilha de tecnologia
sidebar_position: 2
---

# Pilha de tecnologia

Este documento fornece uma visão abrangente de todas as tecnologias utilizadas no Ever Works.

## Requisitos do sistema

- **Node.js**: 20.19.0 ou superior
- **PostgreSQL**: 14.0 ou superior
- **Gerenciador de Pacotes**: npm, pnpm, fio ou coque

## Tecnologias de front-end {#frontend}

### Estrutura Básica

- **[Next.js 15.4.7](https://nextjs.org/)** - Estrutura React com App Router
  - Renderização do lado do servidor (SSR)
  - Geração de site estático (SSG)
  - Regeneração estática incremental (ISR)
  - Ações do servidor para mutações
  - Otimização integrada
  - Roteamento baseado em arquivo com segmentos dinâmicos `[locale]`

- **[React 19.1.0](https://react.dev/)** - Biblioteca de IU
  - Recursos e melhorias mais recentes
  - Renderização simultânea
  - Lote automático
  - Suspense para busca de dados
  - Componentes do servidor por padrão

### Segurança de idioma e tipo

- **[TypeScript 5.x](https://www.typescriptlang.org/)** - Verificação de tipo estático
  - Modo estrito ativado
  - Mapeamento de caminho configurado (`@/` alias)
  - Definições de tipo personalizado
  - Inferência de tipo completa

### Estilo e IU

- **[Tailwind CSS 3.4](https://tailwindcss.com/)** - Estrutura CSS utilitária
  - Sistema de design personalizado
  - Suporte ao modo escuro
  - Utilitários de design responsivo
  - Compilação JIT
  - Sistema de cores dinâmico (50-950 tons)

- **[HeroUI React 2.6](https://www.heroui.com/)** - Componentes Modern React
  - Componentes acessíveis
  - Temas personalizáveis
  - Suporte TypeScript
  - Abalável em árvore

- **[Radix UI](https://www.radix-ui.com/)** - Componentes acessíveis sem estilo
  - Primitivos de UI sem cabeça
  - Navegação completa pelo teclado
  - Compatível com ARIA
  - Combinável

- **[Framer Motion 12.x](https://www.framer.com/motion/)** - Biblioteca de animação
  - Animações declarativas
  - Suporte a gestos
  - Animações de layout
  - Animações SVG

### Edição de Rich Text

- **[TipTap](https://tiptap.dev/)** - Editor de rich text sem cabeça
  - Arquitetura extensível
  - Suporte de redução
  - Edição colaborativa pronta
  - Extensões personalizadas

### Gestão Estadual

- **[Zustand 5](https://zustand-demo.pmnd.rs/)** - Gerenciamento de estado leve
  - API simples
  - Suporte TypeScript
  - Padrão mínimo
  - Integração com DevTools
  - Suporte de middleware

- **[TanStack React Query 5](https://tanstack.com/query/)** - Gerenciamento de estado do servidor
  - Cache e sincronização
  - Atualizações em segundo plano
  - Atualizações otimistas
  - Tratamento de erros
  - Consultas infinitas

### Visualização de dados

- **[TanStack Table](https://tanstack.com/table/)** - Biblioteca de tabelas sem cabeça
  - Classificação, filtragem, paginação
  - Redimensionamento de coluna
  - Seleção de linha
  - Suporte TypeScript

- **[TanStack Virtual](https://tanstack.com/virtual/)** - Biblioteca de virtualização
  - Rolagem virtual
  - Otimização de desempenho
  - Alturas de linha dinâmicas

### Tratamento de formulários

- **[React Hook Form 7](https://react-hook-form.com/)** - Formulários de desempenho
  - Re-renderizações mínimas
  - Validação integrada
  - Suporte TypeScript
  - Fácil integração
  - Suporte a matrizes de campo

- **[Zod 4](https://zod.dev/)** - Validação de esquema
  - TypeScript primeiro
  - Validação de tempo de execução
  - Inferência de tipo
  - Tratamento de erros
  - Validadores personalizados

## Tecnologias de back-end

### Banco de dados e ORM

- **[PostgreSQL 14+](https://www.postgresql.org/)** - Banco de dados relacional
  - Conformidade com ÁCIDO
  - Recursos avançados (JSONB, pesquisa de texto completo)
  - Excelente desempenho
  - Suporte JSON
  - Gatilhos e procedimentos armazenados

- **[Drizzle ORM 0.40.0](https://orm.drizzle.team/)** - TypeScript ORM
  - Consultas com segurança de digitação
  - Sobrecarga mínima
  - Sintaxe semelhante a SQL
  - Sistema de migração
  - Consultas de relação
  - Declarações preparadas

- **[Supabase](https://supabase.com/)** - Backend como serviço (opcional)
  - PostgreSQL hospedado
  - Assinaturas em tempo real
  - Segurança em nível de linha
  - Autenticação integrada
  - Baldes de armazenamento
  - Funções de borda

### Autenticação

- **[NextAuth.js 5.0 (beta)](https://authjs.dev/)** - Biblioteca de autenticação
  - Vários provedores OAuth (Google, GitHub, Facebook, Twitter)
  - JWT e sessões de banco de dados
  - Suporte TypeScript
  - Melhores práticas de segurança
  - Autenticação baseada em credenciais
  - Gerenciamento de sessão

- **[Supabase Auth](https://supabase.com/auth)** - Solução de autenticação alternativa
  - Gerenciamento de usuários integrado
  - Provedores sociais
  - Verificação de e-mail
  - Redefinição de senha
  - Links mágicos
  - Autenticação de telefone

### Arquitetura de autenticação dupla

Ever Works suporta **NextAuth.js e Supabase Auth** simultaneamente:

- NextAuth para fluxos OAuth tradicionais
- Supabase Auth para recursos em tempo real
- Gerenciamento de sessão unificado
- Troca perfeita de provedor

## Gerenciamento de conteúdo

### CMS baseado em Git

- **[isomorphic-git](https://isomorphic-git.org/)** - Operações Git em JavaScript
  - Clonar repositórios
  - Extrair alterações
  - Confirmar arquivos
  - Gestão de filiais

- **[js-yaml](https://github.com/nodeca/js-yaml)** - analisador YAML
  - Analisar arquivos YAML
  - Gerar YAML
  - Validação de esquema
  - Tratamento de erros

### Processamento de arquivos

- **[matéria cinzenta](https://github.com/jonschlinkert/gray-matter)** - analisador Frontmatter
  - Analisar arquivos de redução
  - Extrair metadados
  - Suporta vários formatos

## Internacionalização

- **[next-intl 3.26](https://next-intl-docs.vercel.app/)** - i18n para Next.js
  - Suporte para roteador de aplicativos
  - Traduções com segurança de tipo
  - Pluralização
  - Formatação de data/número

### Idiomas Suportados

Ever Works oferece suporte a **mais de 13 idiomas** prontos para uso:

- 🇬🇧 Inglês (pt)
- 🇫🇷 Francês (fr)
- 🇪🇸 Espanhol (es)
- 🇨🇳 Chinês (zh)
- 🇩🇪 Alemão (de)
- 🇸🇦 Árabe (ar) - com suporte RTL
- 🇮🇹 Italiano (it)
- 🇵🇹 Português (pt)
- 🇯🇵 Japonês (ja)
- 🇰🇷 Coreano (ko)
- 🇷🇺 Russo (ru)
- 🇳🇱 Holandês (nl)
- 🇵🇱 Polonês (pl)

[Saiba mais sobre internacionalização →](/internacionalização)

## Análise e monitoramento

### Análise

- **[PostHog](https://posthog.com/)** - Análise do produto
  - Acompanhamento de eventos
  - Identificação do usuário
  - Sinalizadores de recursos
  - Gravação de sessão

### Rastreamento de erros

- **[Sentry 9.38](https://sentry.io/)** - Monitoramento de erros
  - Rastreamento de erros
  - Monitoramento de desempenho
  - Acompanhamento de lançamento
  - Feedback do usuário

### Desempenho

- **[Vercel Analytics](https://vercel.com/analytics)** - Sinais vitais da Web
  - Principais sinais vitais da Web
  - Monitoramento real do usuário
  - Informações de desempenho

## Processamento de Pagamento

### Provedores de pagamento

- **[Stripe](https://stripe.com/)** - Plataforma de pagamento abrangente
  - Pagamentos únicos
  - Assinaturas recorrentes
  - Vários métodos de pagamento (cartões, Apple Pay, Google Pay)
  - Várias moedas
  - Análise e relatórios avançados
  - Portal do cliente
  - Faturamento
  - Webhooks

- **[LemonSqueezy](https://lemonsqueezy.com/)** - Comerciante da plataforma de registros
  - Conformidade fiscal automática
  - Pagamentos globais (mais de 135 países)
  - Assinaturas
  - Prevenção de fraude
  - Configuração simplificada
  - Suporte ao programa de afiliados

[Saiba mais sobre integração de pagamento →](/payment)

### SDKs de pagamento

- **[@stripe/stripe-js 7.3.0](https://github.com/stripe/stripe-js)** - SDK do cliente Stripe
- **[stripe 18.1.0](https://github.com/stripe/stripe-node)** - SDK do servidor Stripe
- **[@lemonsqueezy/lemonsqueezy.js 3.0.0](https://github.com/lmsqueezy/lemonsqueezy.js)** - SDK do LemonSqueezy

## Integração CRM

- **[Vinte CRM](https://twenty.com/)** - CRM de código aberto
  - Gestão de relacionamento com o cliente
  - Sincronização de contatos
  - Rastreamento de atividades
  - Campos personalizados
  - Integração de API
  - Auto-hospedado ou na nuvem

### Recursos de CRM

- Criação automática de contatos a partir de cadastros de usuários
- Sincronize atividades e interações do usuário
- Acompanhe assinaturas e pagamentos
- Mapeamento de campo personalizado
- Sincronização baseada em webhook

## Serviços de e-mail

- **[Reenviar 4](https://resend.com/)** - API de e-mail
  - E-mails transacionais
  - Suporte a modelos
  - Acompanhamento de entrega
  - Amigável ao desenvolvedor

- **[Novu 2.6](https://novu.co/)** - Infraestrutura de notificação
  - Notificações multicanal
  - Gerenciamento de modelos
  - Automação de fluxo de trabalho
  - Análise

## Sistema de pesquisa

- **[SurveyJS](https://surveyjs.io/)** - Pesquisa e criador de formulários
  - Vários tipos de perguntas (múltipla escolha, texto, classificação, matriz)
  - Lógica condicional
  - Visualização da pesquisa
  - Análise de resposta
  - Exportar para CSV/Excel
  - Respostas anônimas ou autenticadas
  - Temas personalizados

[Saiba mais sobre pesquisas →](/guides/survey-system)

## Segurança

### Segurança de autenticação

- **[bcryptjs 3](https://github.com/dcodeIO/bcrypt.js)** - Hash de senha
  - Armazenamento seguro de senhas
  - Geração de sal
  - Proteção contra ataques de tempo

- **[jose 6](https://github.com/panva/jose)** - operações JWT
  - Geração de token
  - Verificação de token
  - Suporte de criptografia

### Validação de entrada

- **[React Google reCAPTCHA 3](https://github.com/dozoisch/react-google-recaptcha)** - Proteção contra bots
  - Proteção de formulário
  - ReCAPTCHA invisível
  - Verificação baseada em pontuação

## Ferramentas de desenvolvimento

### Qualidade do código

- **[ESLint 9](https://eslint.org/)** - linter JavaScript
  - Regras de qualidade de código
  - Configurações personalizadas
  - Suporte TypeScript
  - Regras Next.js

- **[Prettier 3.5](https://prettier.io/)** - Formatador de código
  - Formatação consistente
  - Integração do editor
  - Regras personalizadas

### Ferramentas de construção

- **[PostCSS 8](https://postcss.org/)** - Processador CSS
  - Processamento CSS Tailwind
  - Prefixador automático
  - Otimização CSS

- **[Webpack 5](https://webpack.js.org/)** - Empacotador de módulos (via Next.js)
  - Divisão de código
  - Árvore tremendo
  - Otimização de ativos

## Implantação e infraestrutura

### Plataformas de hospedagem

- **[Vercel](https://vercel.com/)** - Plataforma recomendada
  - Otimização Next.js
  - Funções de borda
  - CDN global
  - Implantações automáticas

- **[Netlify](https://netlify.com/)** - Plataforma alternativa
  - Hospedagem de site estático
  - Funções sem servidor
  - Tratamento de formulários

### Hospedagem de banco de dados

- **[Supabase](https://supabase.com/)** - PostgreSQL gerenciado
  - Backups automáticos
  - Pool de conexões
  - Recursos em tempo real

- **[PlanetScale](https://planetscale.com/)** - MySQL sem servidor
  - Fluxo de trabalho de ramificação
  - Dimensionamento automático
  - Gerenciamento de esquema

- **[Neon](https://neon.tech/)** - PostgreSQL sem servidor
  - Ramificação instantânea
  - Escalonamento automático
  - Recuperação pontual

## Gerenciamento de Pacotes

- **[pnpm](https://pnpm.io/)** - Gerenciador de pacotes rápido e eficiente em espaço em disco
  - Instalações mais rápidas
  - Dependências compartilhadas
  - Resolução estrita de dependência

- **[npm](https://npmjs.com/)** - Gerenciador de pacotes Node.js padrão
  - Amplamente suportado
  - Grande ecossistema
  - Auditoria de segurança

## Requisitos de versão

### Node.js

- **Mínimo**: Node.js 20.19.0
- **Recomendado**: versão LTS mais recente
- **Gerenciador de pacotes**: npm 10+, fio 1.13+ ou pnpm 8+

### Suporte ao navegador

- **Navegadores modernos**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Dispositivo móvel**: iOS Safari 14+, Chrome Mobile 90+
- **Sem suporte para IE**: apenas recursos modernos

## Considerações de desempenho

### Tamanho do pacote

- **Pacote principal**: ~200 KB compactados
- **Divisão de código**: baseada em rota e baseada em componente
- **Tremor de árvore**: eliminação de código não utilizado
- **Importações dinâmicas**: carregamento lento para componentes não críticos

### Desempenho em tempo de execução

- **React 19**: recursos simultâneos para uma melhor experiência do usuário
- **Next.js 15**: renderização e cache otimizados
- **Otimização de imagem**: suporte WebP/AVIF com carregamento lento
- **Otimização de fontes**: fontes auto-hospedadas com pré-carregamento

### Desempenho do banco de dados

- **Pooling de conexões**: conexões de banco de dados eficientes
- **Otimização de consultas**: consultas indexadas e junções eficientes
- **Cache**: cache em nível de aplicativo e em nível de banco de dados

## Pilha de segurança

### Segurança de aplicativos

- **HTTPS**: aplicado na produção
- **Proteção CSRF**: Integrado ao NextAuth.js
- **Proteção XSS**: limpeza de conteúdo
- **Injeção de SQL**: consultas parametrizadas via Drizzle

### Segurança de infraestrutura

- **Variáveis de ambiente**: gerenciamento seguro de segredos
- **Limitação de taxa**: proteção de endpoint da API
- **Validação de entrada**: validação do esquema Zod
- **Segurança de upload de arquivos**: restrições de tipo e tamanho

## Pilha de monitoramento

### Monitoramento de aplicativos

- **Rastreamento de erros**: Sentry para monitoramento de erros
- **Desempenho**: monitoramento do Core Web Vitals
- **Analytics**: PostHog para comportamento do usuário
- **Tempo de atividade**: serviços de monitoramento externo

### Monitoramento de Infraestrutura

- **Banco de dados**: monitoramento de conexão e consulta
- **API**: tempo de resposta e rastreamento de taxa de erros
- **CDN**: taxas de acerto e desempenho do cache
- **Implantação**: monitoramento de compilação e implantação

## Considerações Futuras

### Atualizações planejadas

- **React 19**: adoção de versão estável
- **Next.js 16**: Quando disponível
- **TypeScript 5.x**: recursos mais recentes
- **Node.js 22**: atualização LTS

### Potenciais adições

- **GraphQL**: para requisitos de dados complexos
- **WebSockets**: recursos em tempo real
- **PWA**: recursos progressivos de aplicativos da web
- **Computação de borda**: desempenho aprimorado

## Matriz de decisão tecnológica

|Requisito|Escolha de tecnologia|Justificativa|
|-------------|-------------------|-----------|
|**Estrutura**|Próximo.js 15|A melhor estrutura React da categoria com App Router|
|**Banco de dados**|PostgreSQL + Chuvisco|Tipo seguro, desempenho e escalonável|
|**Autorização**|NextAuth.js + Supabase|Flexibilidade de provedor duplo|
|**Estilo**|Tailwind CSS + HeroUI|Desenvolvimento rápido, design consistente|
|**Estado**|Consulta Zustand + React|Estado simples do cliente + estado poderoso do servidor|
|**Formulários**|Formulário de gancho de reação + Zod|Desempenho + tipo de segurança|
|**i18n**|próximo-intl|Melhor suporte para roteador de aplicativos Next.js|
|**Pagamento**|Listra + LemonSqueezy|Flexibilidade + conformidade global|
|**E-mail**|Reenviar + Novu|Amigável ao desenvolvedor + multicanal|
|**Análise**|PostHog + Sentinela|Insights do produto + rastreamento de erros|

## Próximas etapas

- [Visão geral da arquitetura](./overview) - Entenda a arquitetura do sistema
- [Recursos da plataforma](./features) - Explore todos os recursos da plataforma
- [Configuração de desenvolvimento](/development/local-setup) – Configure seu ambiente

## Recursos

### Documentação Oficial

- [Documentação Next.js](https://nextjs.org/docs)
- [Documentação do React](https://react.dev/)
- [Manual TypeScript](https://www.typescriptlang.org/docs/)
- [Documentos CSS do Tailwind](https://tailwindcss.com/docs)
- [Documentos ORM do Drizzle](https://orm.drizzle.team/docs/overview)

### Recursos comunitários

- [Next.js GitHub](https://github.com/vercel/next.js)
- [Reagir GitHub](https://github.com/facebook/react)
- [Tailwind GitHub](https://github.com/tailwindlabs/tailwindcss)
- [Comunidade Ever Works](https://github.com/ever-co/ever-works)
