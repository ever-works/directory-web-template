---
id: notification-system
title: Aprofundamento do sistema de notificação
sidebar_label: Sistema de Notificação
sidebar_position: 34
---

# Aprofundamento do sistema de notificação

O modelo fornece um sistema de notificação no aplicativo apoiado pelo PostgreSQL. As notificações são criadas por serviços do lado do servidor e consumidas por meio de uma API REST, principalmente pelo painel de administração. O sistema oferece suporte a vários tipos de notificação, operações em lote e definições de tipo extensíveis.

## Visão geral da arquitetura

```
lib/db/schema.ts                    # notifications table definition
lib/services/notification.service.ts # NotificationService with convenience methods

app/api/admin/notifications/
  route.ts                           # GET (list) and POST (create) endpoints
  mark-all-read/route.ts             # POST mark all as read
  [id]/read/route.ts                 # PATCH mark single as read

components/admin/
  admin-notifications.tsx            # Notification dropdown UI
  admin-notification-stats.tsx       # Notification count badges
```

## Esquema de banco de dados

As notificações são armazenadas na tabela `notifications` :

```ts
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data'),              // JSON string for extra payload
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIndex: index('notifications_user_idx').on(table.userId),
  typeIndex: index('notifications_type_idx').on(table.type),
  isReadIndex: index('notifications_is_read_idx').on(table.isRead),
  createdAtIndex: index('notifications_created_at_idx').on(table.createdAt),
}));
```

### Projeto de esquema

- ** `type` coluna** -- string de formato livre categorizando a notificação. Não imposto por um enum, permitindo novos tipos sem migrações.
- ** `data` coluna** – armazena contexto adicional como uma string JSON. Analisado na leitura para acessar IDs de itens, conteúdo de comentários ou informações específicas de eventos.
- ** `isRead` / `readAt` ** -- sinalizador booleano para contagens rápidas de não lidos mais um carimbo de data/hora para auditoria.
- **Quatro índices** -- abrangem pesquisa de usuário, filtragem de tipo, filtragem de não lidos e listagem cronológica.

## Tipos de notificação

O sistema usa identificadores de tipo baseados em string. Os tipos integrados incluem:

| Tipo | Gatilho | Destinatário típico |
|------|---------|-------------------|
| `item_approved` | Admin aprova um item enviado | Remetente de item |
| `item_rejected` | Admin rejeita um item enviado | Remetente de item |
| `comment_received` | Alguém comenta o item de um usuário | Proprietário do item |
| `comment_reported` | Um comentário é sinalizado para revisão | Administrador |
| `item_reported` | Um item é sinalizado para revisão | Administrador |
| `user_registered` | Um novo usuário se inscreve | Administrador |
| `payment_failed` | Uma tentativa de pagamento falha | Usuário afetado |
| `system_alert` | Aviso ou notificação a nível do sistema | Administrador |

### Adicionando tipos personalizados

1. Escolha uma string de tipo descritivo (por exemplo, `survey_response_received` ).
2. Adicione um método de conveniência a `NotificationService` que construa a carga útil correta.
3. Chame o método da rota ou serviço da API relevante.
4. Opcionalmente, atualize o menu suspenso de notificação do administrador para renderizar um ícone personalizado.

Nenhuma migração de banco de dados é necessária já que `type` é uma coluna de texto de formato livre.

## Serviço de Notificação

Localizado em `lib/services/notification.service.ts` , o serviço fornece métodos convenientes para criar notificações a partir de código do lado do servidor:

```ts
class NotificationService {
  static async create(data: CreateNotificationData);
  static async createItemSubmissionNotification(adminUserId, itemId, itemName, submittedBy);
  static async createCommentReportedNotification(adminUserId, commentId, content, reportedBy);
  static async createItemReportedNotification(adminUserId, itemId, itemName, reportedBy);
  static async createUserRegisteredNotification(adminUserId, userName, userEmail);
  static async createPaymentFailedNotification(userId, subscriptionId, errorMessage);
  static async createSystemAlertNotification(adminUserId, title, message);
}
```

Cada método de conveniência constrói a carga útil `type` , `title` , `message` e `data` correta antes de delegar ao método `create` genérico.

### Uso

```ts
import { NotificationService } from '@/lib/services/notification.service';

// After approving an item
await NotificationService.createItemSubmissionNotification(
  adminUserId, item.id, item.name, item.submittedBy
);

// System-level alert
await NotificationService.createSystemAlertNotification(
  adminUserId, 'Database Warning', 'Connection pool reaching capacity'
);
```

## Terminais de API

Todos os endpoints de notificação exigem autenticação de administrador.

### GET /api/admin/notificações

Recupera as 50 notificações mais recentes do administrador autenticado, classificadas como as mais recentes primeiro. Retorna notificações e contagem de não lidas em uma única resposta.

```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 3
  }
}
```

A contagem de não lidos usa um `SELECT count(*)` separado com `isRead = false` para maior eficiência.

### POST /api/admin/notificações

Cria uma nova notificação para um usuário específico.

| Campo | Obrigatório | Descrição |
|-------|----------|------------|
| `type` | Sim | Identificador da categoria de notificação |
| `title` | Sim | Texto de título curto |
| `message` | Sim | Corpo do texto |
| `userId` | Sim | ID do usuário destinatário |
| `data` | Não | Carga extra (autostringificada) |

### POST /api/admin/notificações/mark-all-read

Marca todas as notificações não lidas do administrador atual como lidas. Define `isRead = true` e `readAt` para o carimbo de data/hora atual em uma única atualização em lote.

### PATCH /api/admin/notifications/[id]/read

Marca uma única notificação como lida por ID.

## Integração com painel de administração

O cabeçalho do administrador exibe um ícone de sino com um selo de contagem de não lidos. O componente suspenso:

1. Busca notificações do endpoint GET.
2. Renderiza cada notificação com ícones específicos do tipo e codificação de cores.
3. Marca notificações individuais como lidas ao clicar.
4. Fornece uma ação em massa "Marcar tudo como lido".
5. Enquetes em um cronômetro ou atualizações na navegação do administrador.

## Considerações em tempo real

A implementação atual usa atualização baseada em sondagem. Para atualizações em tempo real, a arquitetura suporta pontos de extensão:

- **Eventos enviados pelo servidor** – adicione um endpoint SSE que transmite novas notificações.
- **WebSocket** – integração com um provedor WebSocket para comunicação bidirecional.
- **Intervalo de pesquisa** - ajustável por meio do cronômetro de atualização do componente de notificação do administrador.

## Integração de e-mail

O sistema de notificação concentra-se em notificações no aplicativo. As notificações de e-mail de saída são tratadas separadamente por meio do serviço de e-mail (Reenviar/Novu), mas compartilham os mesmos pontos de gatilho. Quando uma notificação é criada via `NotificationService` , o código de chamada pode opcionalmente acionar um e-mail na mesma operação.

## Estrutura de carga útil de dados

A coluna `data` armazena strings JSON com contexto específico do evento:

```ts
// Item-related notification
{ "itemId": "item_789", "itemName": "Awesome Tool", "itemSlug": "awesome-tool" }

// Comment-related notification
{ "commentId": "comment_123", "content": "Great tool!", "itemId": "item_789" }

// Payment-related notification
{ "subscriptionId": "sub_456", "errorMessage": "Card declined" }
```

Esse esquema flexível permite que os renderizadores de notificação façam links diretos para páginas relevantes e exibam informações contextuais.

## Acessibilidade

- O ícone do sino usa `aria-label` para anunciar a contagem de mensagens não lidas aos leitores de tela.
- Os itens de notificação no menu suspenso são focáveis ​​e navegáveis ​​pelo teclado.
- Os ícones específicos do tipo são decorativos ( `aria-hidden="true"` ) com rótulos de texto que fornecem contexto.
- O botão "Marcar tudo como lido" fornece feedback claro por meio de notificação do sistema.
- Timestamps usam formatação relativa ("2 horas atrás") com data completa nos atributos `title` .

## Documentação Relacionada

- [Componentes administrativos](/docs/template/components/admin-components) -- UI de notificação do administrador
- [Componentes do painel](/docs/template/components/dashboard-components) -- Estatísticas de notificação
- [Relatórios e Moderação](/docs/template/features/reports-moderation) -- Notificações acionadas por relatórios
- [Votação e comentários](/docs/template/features/voting-comments) -- Notificações acionadas por comentários
