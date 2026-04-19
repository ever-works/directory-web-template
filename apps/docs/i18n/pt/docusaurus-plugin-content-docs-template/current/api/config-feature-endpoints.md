---
id: config-feature-endpoints
title: "Referência de API de Configuração e Flags de Funcionalidade"
sidebar_label: "Config & Funcionalidades"
sidebar_position: 53
---

# Referência de API de Configuração e Flags de Funcionalidade

## Visão geral

O endpoint de Flags de Funcionalidade expõe as flags de disponibilidade de funcionalidades atuais da aplicação. Essas flags indicam quais funcionalidades dependentes do banco de dados estão ativas, permitindo que o frontend se degrade graciosamente quando funcionalidades estiverem indisponíveis. Este é um endpoint público e com cache, projetado para consumo de alta frequência.

## Endpoints

### GET /api/config/features

Retorna a disponibilidade atual das funcionalidades com base na configuração do sistema e na disponibilidade do banco de dados.

**Solicitação**

Nenhum parâmetro ou corpo é necessário.

**Resposta**
```typescript
{
  ratings: boolean;         // Se a funcionalidade de avaliações está disponível
  comments: boolean;        // Se a funcionalidade de comentários está disponível
  favorites: boolean;       // Se a funcionalidade de favoritos está disponível
  featuredItems: boolean;   // Se a funcionalidade de itens em destaque está disponível
  surveys: boolean;         // Se a funcionalidade de pesquisas está disponível
}
```

**Exemplo**
```typescript
const response = await fetch('/api/config/features');
const features = await response.json();

if (features.ratings) {
  // Renderizar componente de avaliação
}

if (!features.surveys) {
  // Ocultar seção de pesquisa
}
```

## Autenticação

Este endpoint é **público** -- nenhuma autenticação é necessária. Ele é projetado para ser consumido pelo frontend no carregamento inicial da página para determinar quais funcionalidades de interface devem ser renderizadas.

## Respostas de erro

| Status | Descrição |
|--------|-----------|
| 200 | Flags de funcionalidade recuperadas com sucesso |
| 500 | Erro interno -- retorna todas as flags como `false` por segurança com cabeçalho `no-cache` |

Em caso de erro, o endpoint retorna todas as funcionalidades como `false` para garantir que a aplicação falhe com segurança, em vez de expor funcionalidades quebradas.

## Limitação de taxa

As respostas são armazenadas em cache com os seguintes cabeçalhos:
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- Efetivamente armazenado em cache por 5 minutos no nível do CDN com uma janela de stale-while-revalidate de 10 minutos.

As respostas de erro usam `Cache-Control: no-cache` para evitar o cache do estado degradado.

## Endpoints relacionados

- [Endpoints de Saúde](./health-endpoints) -- Verificação de conectividade do banco de dados
