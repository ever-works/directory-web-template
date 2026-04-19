---
id: health-endpoints
title: "Referência da API de Saúde do Sistema"
sidebar_label: "Saúde do sistema"
sidebar_position: 52
---

# Referência da API de Saúde do Sistema

## Visão geral

O endpoint de Saúde do Sistema fornece uma verificação simples de conectividade com o banco de dados para fins de monitoramento e infraestrutura. Ele executa uma consulta leve para verificar se a conexão com o banco de dados está ativa e responsiva, retornando informações de status com timestamps.

## Endpoints

### GET /api/health/database

Realiza uma verificação básica de saúde do banco de dados executando uma consulta `SELECT 1` para verificar a conexão.

**Solicitação**

Nenhum parâmetro ou corpo necessário.

**Resposta**
```typescript
// Resposta saudável
{
  status: "healthy";
  database: "connected";
  timestamp: string;        // Formato ISO 8601, ex: "2024-01-15T10:30:00.000Z"
  result: object;           // Resultado bruto da consulta SELECT 1
}

// Resposta não saudável (status 500)
{
  status: "unhealthy";
  database: "disconnected";
  error: "Database connection check failed";
  timestamp: string;
}
```

**Exemplo**
```typescript
const response = await fetch('/api/health/database');
const health = await response.json();

if (health.status === 'healthy') {
  console.log('Banco de dados conectado em', health.timestamp);
} else {
  console.error('Banco de dados desconectado:', health.error);
}
```

## Autenticação

Este endpoint é **público** — não é necessária autenticação. Destina-se ao uso por balanceadores de carga, monitores de disponibilidade e verificações de saúde de implantação.

## Códigos de erro

| Status | Descrição |
|--------|-----------|
| 200 | Conexão com o banco de dados está saudável |
| 500 | Falha na conexão com o banco de dados — retorna status `"unhealthy"` com detalhes do erro |

## Limitação de taxa

Nenhuma limitação de taxa explícita é aplicada. Este endpoint é leve e adequado para polling frequente por sistemas de monitoramento.

## Endpoints relacionados

- [Endpoints de Configuração de Funcionalidades](./config-feature-endpoints) — Flags de disponibilidade de funcionalidades (também depende do banco de dados)
- [Endpoints de Sincronização de Versão](./version-sync-endpoints) — Versão do sistema e status de sincronização
