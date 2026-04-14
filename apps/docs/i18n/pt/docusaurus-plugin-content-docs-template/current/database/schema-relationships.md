---
id: schema-relationships
title: Relacionamentos de esquema
sidebar_label: Relacionamentos de esquema
sidebar_position: 15
---

# Relacionamentos de esquema

Esta página documenta todos os relacionamentos de tabelas, chaves estrangeiras e tabelas de junção no esquema do banco de dados modelo. O esquema é definido em `lib/db/schema.ts` usando Drizzle ORM com PostgreSQL.

## Visão geral do relacionamento entre entidades

O banco de dados gira em torno de três entidades principais: **usuários** (admin), **client_profiles** (usuários finais) e **itens** (armazenados no Git, referenciados pelo slug). A maioria das tabelas de engajamento e comércio estão relacionadas a esses três.

## Tabelas principais de autenticação

### usuários

A tabela de identidade de nível superior para todas as contas autenticadas.

**Referenciado por:**
- `accounts.userId` (exclusão em cascata)
- `sessions.userId` (exclusão em cascata)
- `authenticators.userId` (exclusão em cascata)
- `activityLogs.userId` (exclusão em cascata)
- `client_profiles.userId` (exclusão em cascata)
- `subscriptions.userId` (exclusão em cascata)
- `payment_accounts.userId` (exclusão em cascata)
- `notifications.user_id` (exclusão em cascata)
- `favorites.userId` (exclusão em cascata)
- `user_roles.user_id` (exclusão em cascata)
- `reports.reviewed_by` (definir nulo)
- `sponsor_ads.user_id` (exclusão em cascata)
- `moderation_history.performed_by` (definir nulo)

### contas

Contas OAuth e credenciais vinculadas a usuários.

|Relacionamento|Alvo|Ao excluir|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCATA|

Chave primária composta em `(provider, providerAccountId)`.

### sessões

Sessões de login ativas.

|Relacionamento|Alvo|Ao excluir|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCATA|

### autenticadores

Credenciais WebAuthn/chave de acesso.

|Relacionamento|Alvo|Ao excluir|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCATA|

Chave primária composta em `(userId, credentialID)`.

## Sistema de perfil de cliente

### perfis_cliente

Perfis de usuário final com dados de plano, status e localização.

|Relacionamento|Alvo|Ao excluir|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCATA|

O índice exclusivo em `userId` garante um perfil por usuário.

**Referenciado por:**
- `comments.userId` (exclusão em cascata)
- `votes.userid` (exclusão em cascata)
- `reports.reported_by` (exclusão em cascata)
- `moderation_history.user_id` (exclusão em cascata)
- `activityLogs.clientId` (exclusão em cascata)

## Controle de acesso baseado em função

O sistema RBAC usa três tabelas em um padrão muitos para muitos.

### papéis

Funções nomeadas com sinalizador de administrador.

### permissões

Chaves de permissão individuais (por exemplo, `items:create`).

### role_permissions (tabela de junção)

Vincula funções a permissões.

|Coluna|Alvo|Ao excluir|
|--------|--------|-----------|
|`role_id`|`roles.id`|CASCATA|
|`permission_id`|`permissions.id`|CASCATA|

Chave primária composta em `(role_id, permission_id)`.

### user_roles (tabela de junção)

Atribui funções aos usuários.

|Coluna|Alvo|Ao excluir|
|--------|--------|-----------|
|`user_id`|`users.id`|CASCATA|
|`role_id`|`roles.id`|CASCATA|

Chave primária composta em `(user_id, role_id)`.

### Diagrama de entidade RBAC

```
users ---< user_roles >--- roles ---< role_permissions >--- permissions
```

Um usuário pode ter muitas funções, cada função pode ter muitas permissões e vários usuários podem compartilhar a mesma função.

## Tabelas de engajamento

### comentários

|Relacionamento|Alvo|Ao excluir|
|-------------|--------|-----------|
|`userId`|`client_profiles.id`|CASCATA|

A coluna `itemId` armazena o slug do item (não uma chave estrangeira, já que os itens residem no Git).

### votos

|Relacionamento|Alvo|Ao excluir|
|-------------|--------|-----------|
|`userid`|`client_profiles.id`|CASCATA|

O índice exclusivo em `(userid, item_id)` garante um voto por usuário por item. A coluna `item_id` armazena o slug do item.

### favoritos

|Relacionamento|Alvo|Ao excluir|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCATA|

O índice exclusivo em `(userId, item_slug)` garante um favorito por usuário por item. A coluna `item_slug` armazena o slug do item.

### item_views

Sem chaves estrangeiras. Usa um índice exclusivo em `(item_id, viewer_id, viewed_date_utc)` para desduplicação diária.

## Tabelas de moderação de conteúdo

### relatórios

|Coluna|Alvo|Ao excluir|
|--------|--------|-----------|
|`reported_by`|`client_profiles.id`|CASCATA|
|`reviewed_by`|`users.id`|DEFINIR NULO|

Índices em `content_type`, `content_id`, `status`, `reported_by` e um composto `(content_type, content_id)`.

### moderation_history

|Coluna|Alvo|Ao excluir|
|--------|--------|-----------|
|`user_id`|`client_profiles.id`|CASCATA|
|`performed_by`|`users.id`|DEFINIR NULO|
|`report_id`|`reports.id`|DEFINIR NULO|

## Tabelas de pagamento e assinatura

### assinaturas

|Relacionamento|Alvo|Ao excluir|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCATA|

Índice exclusivo em `(payment_provider, subscription_id)`.

### histórico de assinatura

|Relacionamento|Alvo|Ao excluir|
|-------------|--------|-----------|
|`subscription_id`|`subscriptions.id`|CASCATA|

### provedores de pagamento

Sem chaves estrangeiras. Armazena provedores de pagamento disponíveis.

### contas de pagamento

|Coluna|Alvo|Ao excluir|
|--------|--------|-----------|
|`userId`|`users.id`|CASCATA|
|`providerId`|`paymentProviders.id`|CASCATA|

Índices exclusivos em `(userId, providerId)` e `(customerId, providerId)`.

## Anúncios de patrocinadores

### patrocinador_anúncios

|Coluna|Alvo|Ao excluir|
|--------|--------|-----------|
|`user_id`|`users.id`|CASCATA|
|`reviewed_by`|`users.id`|DEFINIR NULO|

## Sistema de Notificação

### notificações

|Relacionamento|Alvo|Ao excluir|
|-------------|--------|-----------|
|`user_id`|`users.id`|CASCATA|

Índices em `user_id`, `type`, `is_read` e `created_at`.

## Registro de atividades

### registros de atividades

|Coluna|Alvo|Ao excluir|
|--------|--------|-----------|
|`userId`|`users.id`|CASCATA|
|`clientId`|`client_profiles.id`|CASCATA|

Ambas as colunas são anuláveis; cada entrada de log está relacionada a um usuário administrador ou cliente.

## Outras tabelas

### newsletterAssinaturas

Sem chaves estrangeiras. A coluna `email` possui um índice exclusivo.

### senhaResetTokens

Sem chaves estrangeiras. Chave primária composta em `(identifier, token)`.

### verificaçãoTokens

Sem chaves estrangeiras. Chave primária composta em `(identifier, token)`.

### itens_em destaque

Sem chaves estrangeiras. Usa `item_slug` para fazer referência a itens baseados em Git e `featured_by` como um campo de texto simples (não uma chave estrangeira).

### pesquisas

Sem chaves estrangeiras. A coluna `slug` possui um índice exclusivo.

### vinte_crm_config

Sem chaves estrangeiras. Padrão singleton imposto por um índice de expressão exclusivo.

### mapeamentos de integração

Sem chaves estrangeiras. Índice exclusivo em `(ever_id, object_type)`.

### empresas

Sem chaves estrangeiras.

### status_semente

Tabela singleton com um índice exclusivo em `id`.

## Resumo de exclusão em cascata

Quando um **usuário** é excluído, os itens a seguir são excluídos em cascata:

- Contas, sessões, autenticadores
- Perfis de clientes (e transitivamente: comentários, votos, relatórios desse cliente, histórico de moderação)
- Assinaturas
- Contas de pagamento
- Notificações
- Favoritos
- Atribuições de função de usuário
- Registros de atividades
- Anúncios patrocinadores

Quando um **perfil de cliente** é excluído:

- Comentários desse usuário
- Votos desse usuário
- Relatórios arquivados por esse usuário
- Histórico de moderação desse usuário
- Logs de atividades desse cliente

Quando uma **função** é excluída:

- Todas as atribuições de permissão de função para essa função
- Todas as atribuições de função de usuário para essa função

## Referências de itens

Os itens são armazenados no CMS baseado em Git, não no banco de dados. Várias tabelas fazem referência a itens por slug:

- `comments.itemId` -- slug do item
- `votes.item_id` -- slug do item
- `favorites.item_slug` -- slug do item
- `item_views.item_id` -- slug do item
- `featured_items.item_slug` -- slug do item
- `sponsor_ads.item_slug` -- slug do item

Estas são colunas de texto simples sem restrições de chave estrangeira.

## Documentação Relacionada

- [Referência de esquema](/template/database/schema-reference) -- Documentos de esquema em nível de coluna
- [Padrões de chuvisco](/template/database/drizzle-patterns) – Padrões de uso de ORM
- [Guia de migrações](/template/database/migrations-guide) -- Migrações de banco de dados
