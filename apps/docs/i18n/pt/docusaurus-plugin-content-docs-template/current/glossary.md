---
id: glossary
title: Glossário de Termos
sidebar_label: Glossário
---

# Glossário de Termos

Termos e conceitos-chave usados em toda a documentação do Directory Web Template.

## Conceitos Core do Domínio

### Diretório

Uma coleção de listagens organizadas (itens) em torno de um tópico ou nicho específico. Um diretório é a entidade de nível superior. Exemplos: um "SaaS Tools Directory," um "Developer Resources Directory," ou um "Local Business Directory."

### Item

Uma única entrada ou listagem dentro de um diretório. Um item representa uma entidade sendo catalogada (uma ferramenta, negócio, recurso ou serviço). Itens têm campos estruturados (nome, descrição, URL, logo), pertencem a categorias e podem ser marcados com tags.

### Categoria

Uma classificação hierárquica usada para organizar itens. As categorias formam uma estrutura de árvore (relacionamentos pai/filho) e fornecem o mecanismo principal de navegação e filtragem.

### Tag

Um rótulo plano, não hierárquico, associado a itens para classificação transversal. Tags são usadas para filtragem secundária e descoberta. Um item pode ter múltiplas tags como "open-source," "freemium," ou "API-available."

### Coleção

Um agrupamento curado de itens, independente de categorias ou tags. Coleções são conjuntos definidos pelo usuário ou curados editorialmente, como "Top 10 Escolhas" ou "Novo Este Mês."

### Taxonomia

O sistema geral de classificação para um diretório, abrangendo categorias, tags e quaisquer outras estruturas organizacionais.

### Slug

Um identificador amigável para URL, legível por humanos, derivado do nome de uma entidade. Slugs são usados em URLs em vez de IDs numéricos. Por exemplo, "Visual Studio Code" se torna `visual-studio-code`.

## Padrões de Arquitetura

### Repository

Uma classe de camada de acesso a dados que encapsula consultas e mutações de banco de dados para uma entidade específica. Repositories abstraem o Drizzle ORM e fornecem uma interface limpa para services. Localizado em `lib/repositories/`.

### Service

Uma classe de camada de lógica de negócios que orquestra operações entre repositories, APIs externas e outros services. Services contêm a lógica central da aplicação e são chamados pelos manipuladores de rotas de API. Localizado em `lib/services/`.

### Webhook

Um callback HTTP acionado por um evento. O Template usa webhooks para notificações de provedores de pagamento (Stripe, LemonSqueezy, Polar) e atualizações de status de implantação. Os endpoints de webhook validam solicitações recebidas usando assinaturas ou segredos compartilhados.

## Gerenciamento de Conteúdo

### CMS Baseado em Git

A abordagem de gerenciamento de conteúdo usada pelo Template. Dados do diretório (itens, categorias, metadados) são armazenados como arquivos estruturados (YAML, Markdown) em um repositório Git. O Template clona esse repositório no momento da build e lê o conteúdo do sistema de arquivos local. As alterações são feitas via commits e pull requests.

### Community PR

Um pull request enviado por um membro da comunidade para adicionar ou atualizar itens no repositório CMS baseado em Git de um diretório. Os Community PRs passam por um processo de revisão antes de serem mesclados.

## Banco de Dados

### Drizzle ORM

O ORM leve e TypeScript-first usado pelo Template. O Drizzle fornece um query builder semelhante a SQL com total segurança de tipos. As definições de schema são escritas como código TypeScript, e as migrações são geradas como arquivos SQL simples via Drizzle Kit.

### Migração

Uma alteração de schema de banco de dados versionada. As migrações são geradas com `pnpm db:generate` e aplicadas com `pnpm db:migrate`. Os arquivos de migração são armazenados em `lib/db/migrations/`.

## Autenticação

### NextAuth.js

A biblioteca de autenticação (v5) usada pelo Template. Ela fornece suporte OAuth para múltiplos provedores (Google, GitHub, Facebook, Twitter, Microsoft) com gerenciamento de sessão e tokens JWT.

### Supabase Auth

Um backend de autenticação alternativo suportado pelo Template. O Supabase Auth fornece autenticação email/senha, magic links e OAuth social através do serviço gerenciado do Supabase.

## Pagamentos

### Assinatura

Um arranjo de pagamento recorrente gerenciado por um dos provedores de pagamento suportados (Stripe, LemonSqueezy ou Polar). O Template lida com a criação, gerenciamento e processamento de webhooks de assinaturas.

## Implantação

### Vercel

A plataforma de implantação principal para o Template. A Vercel fornece implantação sem configuração para aplicações Next.js, incluindo implantações de preview automáticas, edge functions e distribuição CDN.

### Docker

Um método de implantação alternativo. O Template pode ser containerizado e implantado em qualquer ambiente de hospedagem compatível com Docker.
