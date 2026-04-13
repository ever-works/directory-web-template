---
id: recaptcha-endpoints
title: "Referência da API reCAPTCHA"
sidebar_label: "reCAPTCHA"
sidebar_position: 57
---

# Referência da API reCAPTCHA

## Visão geral

O endpoint reCAPTCHA realiza a verificação server-side de tokens do Google reCAPTCHA v3. Ele atua como um proxy seguro entre o cliente e a API de verificação do Google, mantendo a chave secreta no servidor. Em modo de desenvolvimento, a verificação pode ser ignorada quando a chave secreta não está configurada.

## Endpoints

### POST /api/verify-recaptcha

Verifica um token do Google reCAPTCHA v3 comunicando-se com o endpoint `siteverify` do Google. Retorna o resultado da verificação, incluindo a pontuação bot/humano.

**Requisição**
```typescript
{
  token: string;   // Token reCAPTCHA obtido pelo grecaptcha.execute() no cliente
}
```

**Resposta**
```typescript
{
  success: boolean;           // Se a verificação foi aprovada
  score?: number;             // 0.0 (bot) a 1.0 (humano)
  action?: string;            // Nome da ação do desafio reCAPTCHA
  hostname?: string;          // Hostname onde a verificação ocorreu
  challenge_ts?: string;      // Timestamp ISO 8601 do desafio
  error_codes?: string[];     // Códigos de erro da API do Google (se houver)
}
```

**Exemplo**
```typescript
// No cliente: obter token
const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' });

// Verificação no servidor
const response = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});

const result = await response.json();

if (result.success && result.score > 0.5) {
  // Prosseguir com o envio do formulário
} else {
  // Bloquear atividade suspeita de bot
}
```

### Comportamento em Modo de Desenvolvimento

Quando `RECAPTCHA_SECRET_KEY` não está configurado e `NODE_ENV` é `"development"`, o endpoint ignora a verificação do Google e retorna:

```typescript
{
  success: true,
  score: 1.0,
  action: "bypass"
}
```

Um aviso é registrado no console indicando que a verificação está sendo ignorada.

## Autenticação

Este endpoint é **público** — nenhuma autenticação é necessária. Ele é projetado para ser chamado a partir de fluxos de envio de formulários no cliente, antes ou durante o processamento do formulário.

## Respostas de Erro

| Status | Descrição |
|--------|-----------|
| 400 | `token` ausente ou vazio no corpo da requisição |
| 500 | `RECAPTCHA_SECRET_KEY` não configurado (somente em produção), falha na requisição à API do Google ou erro inesperado em tempo de execução |

## Limitação de Taxa

Nenhuma limitação de taxa é aplicada no nível da aplicação. A API reCAPTCHA do Google possui seus próprios limites de taxa. O endpoint utiliza o formato `application/x-www-form-urlencoded` ao se comunicar com a API do Google.

## Endpoints Relacionados

Este é um endpoint de segurança independente. Ele é normalmente invocado antes de envios de formulários ou ações sensíveis em toda a aplicação.
