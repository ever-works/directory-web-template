---
id: recaptcha
title: Integração reCAPTCHA
sidebar_label: reCAPTCHA
sidebar_position: 24
---

# Integração reCAPTCHA

O modelo integra o Google reCAPTCHA v3 para proteção de bot em fluxos de autenticação e envio de formulários. Inclui um endpoint de verificação do lado do servidor, ganchos do lado do cliente para gerenciamento de tokens e um modo de desenvolvimento que ignora a verificação quando as credenciais não estão configuradas.

## Visão geral da arquitetura

```
app/api/verify-recaptcha/
  route.ts                          -- Server-side token verification endpoint

app/[locale]/auth/hooks/
  useRecaptchaVerification.ts       -- React Query mutation for verification
  useAutoRecaptchaVerification.ts   -- Auto-trigger on mount or condition

lib/api/
  server-api-client.ts              -- externalClient used for Google API calls

lib/config/
  config-service.ts                 -- analyticsConfig.recaptcha.secretKey
```

## Endpoint de verificação do lado do servidor

A rota `POST /api/verify-recaptcha` em `app/api/verify-recaptcha/route.ts` lida com a verificação de token na API Google reCAPTCHA:

```tsx
// app/api/verify-recaptcha/route.ts
import { NextRequest, NextResponse } from "next/server";
import { externalClient, apiUtils } from "@/lib/api/server-api-client";
import { coreConfig, analyticsConfig } from "@/lib/config/config-service";

interface RecaptchaApiResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA token is required" },
        { status: 400 }
      );
    }

    const secretKey = analyticsConfig.recaptcha.secretKey;
    if (!secretKey) {
      if (coreConfig.NODE_ENV === "development") {
        console.warn(
          "[ReCAPTCHA] WARNING: Secret key not configured -- bypassing verification in development mode."
        );
        return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
      }
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA not configured" },
        { status: 500 }
      );
    }

    const response = await externalClient.postForm<RecaptchaApiResponse>(
      "https://www.google.com/recaptcha/api/siteverify",
      { secret: secretKey, response: token }
    );

    if (!apiUtils.isSuccess(response)) {
      console.error("ReCAPTCHA API request failed:", apiUtils.getErrorMessage(response));
      return NextResponse.json(
        { success: false, error: "Failed to verify ReCAPTCHA" },
        { status: 500 }
      );
    }

    const data = response.data;

    return NextResponse.json({
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      challenge_ts: data.challenge_ts,
      error_codes: data['error-codes'],
    });
  } catch (error) {
    console.error("ReCAPTCHA verification error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
```

### Principais detalhes de implementação

- **Validação de token**: Retorna 400 se nenhum token for fornecido no corpo da solicitação.
- **Desvio de desenvolvimento**: quando a chave secreta não está configurada e `NODE_ENV` é `development` , o endpoint retorna uma resposta bem-sucedida com `score: 1.0` e `action: "bypass"` sem entrar em contato com o Google.
- **Cliente externo**: Usa o `externalClient` pré-configurado de `lib/api/server-api-client.ts` com seu método `postForm` , que envia dados de `application/x-www-form-urlencoded` para a API de verificação do Google.
- **Utilitários de API**: Usa `apiUtils.isSuccess()` e `apiUtils.getErrorMessage()` para tratamento de respostas consistente.
- **Encaminhamento de resposta completa**: Retorna o resultado completo da verificação, incluindo pontuação, ação, nome do host, carimbo de data/hora do desafio e códigos de erro.

### Ignorar modo de desenvolvimento

Quando `RECAPTCHA_SECRET_KEY` não está definido e a aplicação é executada em modo de desenvolvimento, o endpoint ignora automaticamente a verificação:

```tsx
if (!secretKey) {
  if (coreConfig.NODE_ENV === "development") {
    return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
  }
  return NextResponse.json(
    { success: false, error: "ReCAPTCHA not configured" },
    { status: 500 }
  );
}
```

Na produção, uma chave secreta ausente retorna um erro 500 em vez de ignorar silenciosamente.

## Gancho de verificação do lado do cliente

O gancho `useRecaptchaVerification` em `app/[locale]/auth/hooks/useRecaptchaVerification.ts` envolve a chamada de verificação em uma mutação React Query:

```tsx
// app/[locale]/auth/hooks/useRecaptchaVerification.ts
import { useMutation } from '@tanstack/react-query';

function useRecaptchaVerification() {
  const mutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('reCAPTCHA verification failed');
      }

      return response.json();
    },
  });

  return {
    verifyRecaptcha: mutation.mutateAsync,
    isVerifying: mutation.isPending,
    isVerified: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
  };
}
```

### Valores de Retorno

| Propriedade | Tipo | Descrição |
|----------|------|------------|
| `verifyRecaptcha` | `(token: string) => Promise` | Função de mutação para verificar um token |
| `isVerifying` | `boolean` | Se a verificação está em andamento |
| `isVerified` | `boolean` | Se a verificação foi bem-sucedida |
| `error` | `Error or null` | Erro da última tentativa de verificação |
| `reset` | `() => void` | Redefinir estado de verificação |

## Gancho de verificação automática

O gancho `useAutoRecaptchaVerification` aciona a verificação reCAPTCHA automaticamente quando um componente é montado ou quando uma condição se torna verdadeira:

```tsx
function useAutoRecaptchaVerification(options?: {
  action?: string;       // reCAPTCHA action name (default: 'submit')
  enabled?: boolean;     // Whether to auto-verify (default: true)
}): {
  isVerified: boolean;
  isVerifying: boolean;
  error: Error | null;
  token: string | null;
}
```

### Exemplo de uso

```tsx
function ProtectedForm() {
  const { isVerified, isVerifying } = useAutoRecaptchaVerification({
    action: 'login',
    enabled: true,
  });

  return (
    <form>
      {/* Form fields */}
      <button disabled={!isVerified || isVerifying}>
        {isVerifying ? 'Verifying...' : 'Submit'}
      </button>
    </form>
  );
}
```

## Integração com API do Google

O endpoint se comunica com a API reCAPTCHA do Google usando o método `externalClient.postForm` de `lib/api/server-api-client.ts` . Este método envia dados de formulário codificados em URL:

```tsx
const response = await externalClient.postForm<RecaptchaApiResponse>(
  "https://www.google.com/recaptcha/api/siteverify",
  { secret: secretKey, response: token }
);
```

O `externalClient` é uma instância `ServerClient` pré-configurada projetada para chamadas de API externas. O método `postForm` lida com o tipo de conteúdo `application/x-www-form-urlencoded` automaticamente.

### Interpretação da pontuação

reCAPTCHA v3 retorna uma pontuação entre 0,0 e 1,0:

| Faixa de pontuação | Interpretação | Ação Típica |
|------------|---------------|----------------|
| 0,7 - 1,0 | Provavelmente humano | Permitir envio |
| 0,3 - 0,7 | Incerto | Pode exigir verificação adicional |
| 0,0 - 0,3 | Provavelmente bot | Bloquear envio |

## Integração com autenticação

O componente `CredentialsForm` usa verificação reCAPTCHA antes de enviar credenciais:

```tsx
function CredentialsForm({ type, onSuccess }) {
  const { verifyRecaptcha, isVerifying } = useRecaptchaVerification();

  const handleSubmit = async (formData: FormData) => {
    const token = await grecaptcha.execute(siteKey, { action: type });
    const result = await verifyRecaptcha(token);

    if (!result.verified) {
      toast.error('Verification failed. Please try again.');
      return;
    }

    await signIn(formData);
  };
}
```

## Variáveis ​​de ambiente

```bash
# Client-side site key (public, exposed to browser)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le...

# Server-side secret key (private, never exposed to client)
RECAPTCHA_SECRET_KEY=6Le...
```

A chave secreta é acessada através de `analyticsConfig.recaptcha.secretKey` do serviço de configuração centralizado, não diretamente de `process.env` .

## Documentação do Swagger

O endpoint de verificação inclui anotações Swagger/JSDoc abrangentes que documentam todos os esquemas de solicitação e resposta, códigos de status e exemplos. Isso é servido por meio do sistema de documentação da API integrado ao modelo.

## Ativação Condicional

| Condição | Comportamento |
|-----------|----------|
| Conjunto de chave secreta | Verificação completa contra API do Google |
| Chave secreta ausente, modo de desenvolvimento | Bypass automático com `success: true` |
| Chave secreta ausente, modo de produção | Retorna erro 500 |
| Chave do site não definida no cliente | Script não carregado, formulários enviados sem verificação |

## Tratamento de erros

O endpoint lida com três categorias de erros:

1. **Erros do cliente (400)**: Token ausente ou inválido no corpo da solicitação
2. **Erros de configuração (500)**: Chave secreta ausente na produção
3. **Erros upstream (500)**: falhas na solicitação da API do Google ou exceções inesperadas

Todos os erros são registrados no console do servidor e retornam uma estrutura JSON consistente com `success: false` e uma mensagem `error` .

## Referência de arquivo

| Arquivo | Finalidade |
|------|---------|
| `app/api/verify-recaptcha/route.ts` | Endpoint de verificação do lado do servidor |
| `app/[locale]/auth/hooks/useRecaptchaVerification.ts` | Mutação de verificação de consulta React |
| `app/[locale]/auth/hooks/useAutoRecaptchaVerification.ts` | Gancho de verificação de disparo automático |
| `lib/api/server-api-client.ts` | Método `externalClient` e `postForm` |
| `lib/config/config-service.ts` | `analyticsConfig.recaptcha.secretKey` |
