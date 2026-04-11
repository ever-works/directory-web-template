---
id: vercel
title: Implantação no Vercel
sidebar_label: Vercel
sidebar_position: 3
---

# Implantação no Vercel

Implante seu site de diretório Ever Works no Vercel para distribuição rápida e global.

## Pré-requisitos

- Conta Vercel
- Repositório GitHub com seu projeto Ever Works

## Implantação Rápida

### 1. Conectar Repositório

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Importe seu repositório GitHub
4. Selecione a pasta `website` como diretório raiz

### 2. Configurar Definições de Build

O Vercel detectará automaticamente o Next.js. Verifique estas configurações:

- **Framework Preset**: Next.js
- **Diretório Raiz**: `website`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 3. Variáveis de Ambiente

Adicione suas variáveis de ambiente no painel do Vercel:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=your-database-url

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.vercel.app

# OAuth Providers (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Implantar

Clique em "Deploy" e o Vercel construirá e implantará seu site automaticamente.

## Domínio Personalizado

### 1. Adicionar Domínio

No painel do seu projeto Vercel:
1. Vá para "Configurações" → "Domínios"
2. Adicione seu domínio personalizado
3. Siga as instruções de configuração DNS

### 2. Certificado SSL

O Vercel fornece automaticamente certificados SSL para todos os domínios.

## Configuração Avançada

### Arquivo de Configuração Vercel

Crie `vercel.json` na raiz do seu projeto:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "website/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/website/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Otimização da Build

Otimize sua build para o Vercel:

```javascript
// next.config.js
module.exports = {
  // Enable static optimization
  output: 'standalone',
  
  // Optimize images
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Enable compression
  compress: true,
}
```

## Monitoramento e Analytics

### Vercel Analytics

Habilite o Vercel Analytics no seu projeto:

```javascript
// pages/_app.js
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
```

### Monitoramento de Desempenho

Monitore o desempenho da sua implantação:
- Core Web Vitals
- Tempos de execução de funções
- Desempenho de build

## Solução de Problemas

### Problemas Comuns

1. **Falhas de Build**: Verifique os logs de build no painel do Vercel
2. **Variáveis de Ambiente**: Certifique-se de que todas as variáveis necessárias estejam definidas
3. **Problemas de Domínio**: Verifique a configuração DNS

### Modo Debug

Habilite o modo debug para logs detalhados:

```bash
# In your environment variables
DEBUG=1
```

## Próximos Passos

- [Variáveis de Ambiente](/docs/deployment/environment-variables) - Configure sua implantação
- [Monitoramento](/docs/deployment/monitoring) - Monitore sua aplicação
- [Suporte](/docs/advanced-guide/support) - Obtenha ajuda com a implantação
