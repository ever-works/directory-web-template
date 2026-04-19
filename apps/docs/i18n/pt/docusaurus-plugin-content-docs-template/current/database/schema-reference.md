---
id: schema-reference
title: Referência de esquema
sidebar_label: Referência de esquema
sidebar_position: 1
---

# Referência de esquema

Todas as tabelas do banco de dados são definidas em `lib/db/schema.ts`. Este documento cataloga cada tabela, suas principais colunas, relacionamentos e finalidade.

## Usuários e autenticação

### usuários

Tabela de usuário principal, usada por NextAuth.js para autenticação.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID, gerado automaticamente|
|`email`|texto|Único|
|`image`|texto|URL da imagem do perfil|
|`emailVerified`|carimbo de data/hora|Data de verificação de e-mail|
|`passwordHash`|texto|Hash Bcrypt para autenticação de credenciais|
|`createdAt`|carimbo de data/hora|Configuração automática|
|`updatedAt`|carimbo de data/hora|Configuração automática|
|`deletedAt`|carimbo de data/hora|Exclusão suave|

**Índices**: `users_created_at_idx`

### contas

Links de conta OAuth e credenciais, seguindo o esquema do adaptador NextAuth.js.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`userId`|texto (FC)|Referências `users.id` (exclusão em cascata)|
|`type`|texto|Tipo de conta (oauth, credenciais, etc.)|
|`provider`|texto|Nome do provedor (google, github, credenciais)|
|`providerAccountId`|texto|ID da conta específica do provedor|
|`email`|texto|E-mail da conta|
|`passwordHash`|texto|Para autenticação de credenciais do cliente|
|`refresh_token`|texto|Token de atualização OAuth|
|`access_token`|texto|Token de acesso OAuth|
|`expires_at`|inteiro|Expiração do token|

**Chave primária**: Composto em (`provider`, `providerAccountId`)
**Índices**: `accounts_email_idx`, `accounts_provider_idx`

### sessões

Sessões de usuário ativas.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`sessionToken`|texto (PK)|Identificador de sessão|
|`userId`|texto (FC)|Referências `users.id`|
|`expires`|carimbo de data/hora|Expiração da sessão|

### verificaçãoTokens

Tokens de verificação de e-mail.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`identifier`|texto|Identificador do usuário|
|`email`|texto|Endereço de e-mail|
|`token`|texto|Token de verificação|
|`expires`|carimbo de data/hora|Expiração do token|

**Chave primária**: Composto em (`identifier`, `token`)

### autenticadores

Armazenamento de credenciais WebAuthn/FIDO2.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`credentialID`|texto|Identificador de credencial exclusivo|
|`userId`|texto (FC)|Referências `users.id`|
|`providerAccountId`|texto|Referência da conta do provedor|
|`credentialPublicKey`|texto|Chave pública para verificação|
|`counter`|inteiro|Contador de autenticação|

### senhaResetTokens

Tokens de redefinição de senha para fluxo de senha esquecida.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`email`|texto|E-mail alvo|
|`token`|texto|Token de redefinição exclusivo|
|`expires`|carimbo de data/hora|Expiração do token|

### registros de atividades

Rastreia as atividades de usuários e clientes para fins de auditoria.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|serial (PK)|Incremento automático|
|`userId`|texto (FC)|Referências `users.id` (anulável)|
|`clientId`|texto (FC)|Referências `clientProfiles.id` (anulável)|
|`action`|texto|Tipo de atividade (SIGN_UP, SIGN_IN, etc.)|
|`timestamp`|carimbo de data/hora|Quando a atividade ocorreu|
|`ipAddress`|varchar(45)|Endereço IP do cliente|

**Índices**: `activity_logs_user_idx`, `activity_logs_timestamp_idx`, `activity_logs_action_idx`

## Funções e permissões

### papéis

Definições de funções para RBAC.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|Identificador de função (por exemplo, "admin", "cliente")|
|`name`|texto|Nome de função exclusivo|
|`description`|texto|Descrição legível por humanos|
|`isAdmin`|booleano|Se esta é uma função de administrador|
|`status`|texto|"ativo" ou "inativo"|
|`created_by`|texto|Quem criou a função|

### permissões

Definições de permissão granulares.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`key`|texto|Chave de permissão exclusiva (por exemplo, "items:create")|
|`description`|texto|Descrição legível por humanos|

### rolePermissions

Tabela de junção muitos para muitos vinculando funções a permissões.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`roleId`|texto (FC)|Referências `roles.id` (cascata)|
|`permissionId`|texto (FC)|Referências `permissions.id` (cascata)|

**Chave primária**: Composto em (`roleId`, `permissionId`)

### funções do usuário

Tabela de junção muitos-para-muitos vinculando usuários a funções.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`userId`|texto (FC)|Referências `users.id` (cascata)|
|`roleId`|texto (FC)|Referências `roles.id` (cascata)|

**Chave primária**: Composto em (`userId`, `roleId`)

## Perfis de clientes

### perfis de cliente

Informações de perfil estendidas para usuários clientes registrados.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`userId`|texto (FC)|Referências `users.id` (único, cascata)|
|`email`|texto|E-mail do cliente|
|`name`|texto|Nome completo|
|`displayName`|texto|Nome de exibição|
|`username`|texto|Nome de usuário exclusivo|
|`bio`|texto|Biografia do usuário|
|`jobTitle`|texto|Título profissional|
|`company`|texto|Nome da empresa|
|`industry`|texto|Setor industrial|
|`phone`|texto|Número de telefone|
|`website`|texto|Site pessoal|
|`location`|texto|Sequência de localização|
|`avatar`|texto|URL do avatar|
|`accountType`|texto|"indivíduo", "negócio" ou "empresa"|
|`status`|texto|"ativo", "inativo", "suspenso", "banido", "teste"|
|`plan`|texto|"gratuito", "padrão" ou "premium"|
|`timezone`|texto|Fuso horário (padrão "UTC")|
|`language`|texto|Idioma preferido (padrão "en")|
|`country`|texto|Código do país|
|`currency`|texto|Moeda preferida (padrão "USD")|
|`defaultLatitude`|duplo|Latitude de localização padrão|
|`defaultLongitude`|duplo|Longitude do local padrão|
|`twoFactorEnabled`|booleano|Status 2FA|
|`totalSubmissions`|inteiro|Contagem de envios|
|`warningCount`|inteiro|Contagem de avisos de moderação|
|`suspendedAt`|carimbo de data/hora|Quando suspenso|
|`bannedAt`|carimbo de data/hora|Quando banido|

**Índices**: Vários índices em `userId`, `email`, `status`, `plan`, `accountType`, `username`, `createdAt`

## Conteúdo e envolvimento

### comentários

Comentários do usuário sobre os itens.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`content`|texto|Texto do comentário|
|`userId`|texto (FC)|Referências `clientProfiles.id`|
|`itemId`|texto|Lesma de item|
|`rating`|inteiro|Classificação (0-5)|
|`editedAt`|carimbo de data/hora|Hora da última edição|
|`deletedAt`|carimbo de data/hora|Exclusão suave|

### votos

Voto positivo/negativo em itens.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`userId`|texto (FC)|Referências `clientProfiles.id`|
|`itemId`|texto|Lesma de item|
|`voteType`|texto|"voto positivo" ou "voto negativo"|

**Índice exclusivo**: (`userId`, `itemId`) -- um voto por usuário por item

### favoritos

Favoritos do usuário (marcadores).

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`userId`|texto (FC)|Referências `users.id`|
|`itemSlug`|texto|Lesma de item|
|`itemName`|texto|Nome do item desnormalizado|
|`itemIconUrl`|texto|Ícone de item desnormalizado|
|`itemCategory`|texto|Categoria desnormalizada|

**Índice exclusivo**: (`userId`, `itemSlug`)

### itemViews

Rastreia visualizações diárias exclusivas de itens para análise.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`itemId`|texto|Lesma de item|
|`viewerId`|texto|ID de visualizador anônimo baseado em cookie|
|`viewedDateUtc`|texto|Data no formato AAAA-MM-DD|
|`viewedAt`|carimbo de data/hora|Tempo exato de visualização|

**Índice exclusivo**: (`itemId`, `viewerId`, `viewedDateUtc`) -- uma visualização por visualizador por dia

## Assinaturas e Pagamentos

### assinaturas

Registros de assinatura de usuários que oferecem suporte a vários provedores de pagamento.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`userId`|texto (FC)|Referências `users.id`|
|`planId`|texto|Identificador do plano (gratuito, padrão, premium)|
|`status`|texto|ativo, cancelado, expirado, pendente, pausado|
|`paymentProvider`|texto|listrado, espremedor de limão, polar, solidgate|
|`subscriptionId`|texto|ID de assinatura do provedor|
|`customerId`|texto|ID do cliente do provedor|
|`autoRenewal`|booleano|Renovação automática ativada|
|`cancelAtPeriodEnd`|booleano|Cancelar no final do período|
|`amount`|inteiro|Valor da assinatura (centavos)|
|`currency`|texto|Código da moeda|
|`interval`|texto|Intervalo de faturamento (mês, ano)|

**Índices**: `user_subscription_idx`, `subscription_status_idx`, `provider_subscription_idx` (único)

### histórico de assinatura

Trilha de auditoria para alterações de assinatura.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`subscriptionId`|texto (FC)|Referências `subscriptions.id`|
|`action`|texto|Alterar ação|
|`previousStatus`|texto|Status antes da mudança|
|`newStatus`|texto|Status após mudança|

### provedores de pagamento

Registro de provedores de pagamento disponíveis.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`name`|texto|Nome do provedor (exclusivo)|
|`isActive`|booleano|Se o provedor está ativado|

### contas de pagamento

Vincula os usuários às suas contas de provedores de pagamento.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`userId`|texto (FC)|Referências `users.id`|
|`providerId`|texto (FC)|Referências `paymentProviders.id`|
|`customerId`|texto|ID do cliente do provedor|

**Índices exclusivos**: (`userId`, `providerId`), (`customerId`, `providerId`)

## Administração e Moderação

### notificações

Notificações de administração no aplicativo.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`userId`|texto (FC)|Referências `users.id`|
|`type`|texto|item_submission, comment_reported, etc.|
|`title`|texto|Título da notificação|
|`message`|texto|Corpo de notificação|
|`isRead`|booleano|Ler status|

### relatórios

Sistema de relatório de conteúdo para itens e comentários.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`contentType`|texto|"item" ou "comentário"|
|`contentId`|texto|ID do conteúdo denunciado|
|`reason`|texto|spam, assédio, inapropriado, outros|
|`status`|texto|pendente, revisado, resolvido, demitido|
|`resolution`|texto|content_removed, user_warned, etc.|
|`reportedBy`|texto (FC)|Referências `clientProfiles.id`|
|`reviewedBy`|texto (FC)|Referências `users.id`|

### moderaçãoHistória

Histórico completo de ações de moderação.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`userId`|texto (FC)|Referências `clientProfiles.id`|
|`action`|texto|avisar, suspender, banir, cancelar a suspensão, cancelar o banimento, content_removed|
|`reportId`|texto (FC)|Referências `reports.id`|
|`performedBy`|texto (FC)|Referências `users.id`|
|`details`|JSON|Contexto adicional|

### itemAuditLogs

Rastreia alterações em itens no painel de administração.

|Coluna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`itemId`|texto|Slug de item (não FK; os itens estão no Git)|
|`itemName`|texto|Nome do item desnormalizado|
|`action`|texto|criado, atualizado, status_changed, revisado, excluído, restaurado|
|`changes`|JSON|Detalhes da alteração no nível do campo|
|`performedBy`|texto (FC)|Referências `users.id`|

## Outras tabelas

### patrocinadorAnúncios

Anúncios de itens patrocinados com ciclo de vida de pagamento completo.

Colunas-chave: `userId`, `itemSlug`, `status` (pagamento_pendente, pendente, rejeitado, ativo, expirado, cancelado), `interval` (semanalmente, mensalmente), `amount`, `paymentProvider`, `subscriptionId`.

### empresas / itensEmpresas

Registros de empresas e associações item-empresa para listagens de diretórios.

### pesquisas / pesquisasRespostas

Construtor de pesquisas com definições de perguntas baseadas em JSON e armazenamento de respostas.

### twentyCrmConfig/integrationMappings

Tabelas de integração de CRM para funcionalidade de sincronização do Twenty CRM. A tabela de configuração impõe um padrão singleton (apenas uma linha permitida).

### newsletterAssinaturas

Acompanhamento de assinatura de boletim informativo por e-mail com carimbos de data e hora de assinatura/cancelamento de assinatura.

### sementeStatus

Status de propagação do banco de dados de rastreamento de tabela singleton (propagação, concluída, falha) para evitar operações de propagação simultâneas.

## Digite Exportações

O arquivo de esquema exporta tipos TypeScript para cada tabela usando a inferência do Drizzle:

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
// ... and so on for all tables
```

Esses tipos são usados em todo o aplicativo para operações de banco de dados com segurança de tipo.
