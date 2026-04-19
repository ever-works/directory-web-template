---
id: extraction-endpoints
title: "Endpoints de Extração e Verificação"
sidebar_label: "Extração e Verificação"
sidebar_position: 19
---

# Endpoints de Extração e Verificação

Esses endpoints fornecem extração de metadados de URL (via API da Plataforma Ever Works) e verificação de token Google reCAPTCHA. Ambos atuam como proxies seguros do lado do servidor para manter as chaves de API e segredos fora do código do lado do cliente.

**Arquivos de origem:**
- `template/app/api/extract/route.ts`
- `template/app/api/verify-recaptcha/route.ts`

## Resumo das rotas

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| POST | `/api/extract` | Nenhuma | Extrair metadados de item de uma URL |
| POST | `/api/verify-recaptcha` | Nenhuma | Verificar um token reCAPTCHA |

---

## POST `/api/extract`

Um proxy seguro que extrai metadados de itens (nome, descrição, sugestões de categoria) de uma URL fornecida usando a API da Plataforma Ever Works. O endpoint mantém as credenciais `PLATFORM_API_URL` e `PLATFORM_API_SECRET_TOKEN` no lado do servidor.

### Disponibilidade da funcionalidade

Este endpoint requer que `PLATFORM_API_URL` esteja configurada. Quando não configurada, retorna uma resposta elegante indicando que a funcionalidade está desativada, em vez de um erro severo:

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

### Corpo da solicitação

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `url` | string (URL) | **Sim** | A URL para extrair metadados |
| `existingCategories` | string[] | Não | Nomes de categorias existentes para auxiliar na categorização |

Validado usando um schema Zod:

```ts
const extractSchema = z.object({
  url: z.string().url('Invalid URL format'),
  existingCategories: z.array(z.string()).optional()
});
```

### Exemplo de solicitação

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

### Como funciona

O handler faz proxy da solicitação para o endpoint `/extract-item-details` da API da Plataforma:

```ts
const extractionEndpoint =
  `${platformApiUrl.replace(/\/+$/, '')}/extract-item-details`;

const response = await fetch(extractionEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(platformApiToken
      ? { Authorization: `Bearer ${platformApiToken}` }
      : {})
  },
  body: JSON.stringify({
    source_url: url,
    existing_data: existingCategories?.length > 0
      ? existingCategories
      : undefined
  })
});
```

### Resposta: 200 (Sucesso)

A resposta é repassada diretamente da API da Plataforma:

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "A great product description",
    "category": "Productivity",
    "tags": ["saas", "tool"],
    "icon_url": "https://example.com/favicon.ico"
  }
}
```

### Resposta: 200 (Funcionalidade desativada)

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

### Respostas de erro

| Status | Descrição |
|--------|-----------|
| 400 | Formato inválido de URL (validação Zod) |
| Variado | Erro da API upstream (código de status repassado da API da Plataforma) |
| 500 | Erro interno do servidor durante a extração |

### Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `PLATFORM_API_URL` | Sim (para a funcionalidade) | URL base da API da Plataforma Ever Works |
| `PLATFORM_API_SECRET_TOKEN` | Não | Token Bearer para chamadas autenticadas à API da Plataforma |

---

## POST `/api/verify-recaptcha`

Verifica um token Google reCAPTCHA comunicando-se com a API `siteverify` do Google. Suporta tokens reCAPTCHA v2 e v3. No modo de desenvolvimento, o endpoint pode ignorar a verificação quando a chave secreta não está configurada.

### Corpo da solicitação

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `token` | string | **Sim** | Token reCAPTCHA da verificação do lado do cliente |

### Exemplo de solicitação

```json
{
  "token": "03AGdBq25SiXT-pmSeBXjzScW..."
}
```

### Como funciona

O handler envia o token para o endpoint de verificação do Google usando dados de formulário codificados em URL:

```ts
const response = await externalClient.postForm(
  "https://www.google.com/recaptcha/api/siteverify",
  {
    secret: secretKey,
    response: token,
  }
);
```

### Resposta: 200 (Verificado)

```json
{
  "success": true,
  "score": 0.9,
  "action": "submit",
  "hostname": "example.com",
  "challenge_ts": "2024-01-15T10:30:00Z",
  "error_codes": []
}
```

### Resposta: 200 (Verificação falhou)

```json
{
  "success": false,
  "score": 0.1,
  "action": "submit",
  "hostname": "example.com",
  "challenge_ts": "2024-01-15T10:30:00Z",
  "error_codes": ["invalid-input-response"]
}
```

### Bypass no modo de desenvolvimento

Quando `RECAPTCHA_SECRET_KEY` não está configurada e `NODE_ENV` é `"development"`, o endpoint ignora a verificação e retorna sucesso:

```ts
if (!secretKey) {
  if (coreConfig.NODE_ENV === "development") {
    return NextResponse.json({
      success: true,
      score: 1.0,
      action: "bypass",
    });
  }
  return NextResponse.json(
    { success: false, error: "ReCAPTCHA not configured" },
    { status: 500 }
  );
}
```

### Respostas de erro

| Status | Descrição |
|--------|-----------|
| 400 | Campo `token` ausente ou vazio |
| 500 | Chave secreta não configurada (somente produção) |
| 500 | Falha na solicitação à API do Google |
| 500 | Erro inesperado durante a verificação |

### Campos da resposta

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `success` | boolean | Se a verificação foi aprovada |
| `score` | number (0.0-1.0) | Pontuação reCAPTCHA v3 (1.0 = provavelmente humano, 0.0 = provavelmente bot) |
| `action` | string | Nome da ação do reCAPTCHA |
| `hostname` | string | Nome do host onde a verificação ocorreu |
| `challenge_ts` | string | Timestamp do desafio |
| `error_codes` | string[] | Códigos de erro da API do Google |

### Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `RECAPTCHA_SECRET_KEY` | Sim (produção) | Chave secreta do Google reCAPTCHA |

---

## Exemplos de uso

### Extração de URL

```ts
// Extrair metadados de uma URL para o formulário de envio de item
const res = await fetch('/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/product',
    existingCategories: ['Productivity', 'Developer Tools']
  })
});

const data = await res.json();

if (data.featureDisabled) {
  // Funcionalidade não disponível, pular preenchimento automático
  console.log('Extração não disponível');
} else if (data.success) {
  // Preencher campos do formulário automaticamente
  setName(data.data.name);
  setDescription(data.data.description);
}
```

### Verificação de reCAPTCHA

```ts
// Verificar token reCAPTCHA antes do envio do formulário
const recaptchaToken = await grecaptcha.execute(siteKey, {
  action: 'submit'
});

const res = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: recaptchaToken })
});

const { success, score } = await res.json();

if (success && score >= 0.5) {
  // Prosseguir com o envio do formulário
  submitForm();
} else {
  // Mostrar desafio de verificação humana
  showCaptchaChallenge();
}
```

---

## Arquivos de origem relacionados

| Arquivo | Finalidade |
|---------|-----------|
| `template/app/api/extract/route.ts` | Proxy de extração de URL |
| `template/app/api/verify-recaptcha/route.ts` | Proxy de verificação reCAPTCHA |
| `template/lib/api/server-api-client.ts` | Cliente de API externo com suporte a `postForm` |
| `template/lib/config/config-service.ts` | Serviço de configuração para variáveis de ambiente |
