---
id: ssl-domains
title: "SSL & Domínios Personalizados"
sidebar_label: "SSL & Domínios"
sidebar_position: 2
---

# SSL & Domínios Personalizados

Este guia aborda a configuração de domínios personalizados, gerenciamento de certificados SSL, configuração de DNS e suporte a múltiplos domínios para o Ever Works Template. O template vem com headers de segurança de nível produção e é otimizado para implantação no Vercel com HTTPS automático, mas também suporta ambientes self-hosted com configuração SSL manual.

## Headers de Segurança Integrados

O template configura um conjunto abrangente de headers de segurança em `next.config.ts` que são aplicados automaticamente a cada rota. Esses headers aplicam HTTPS, previnem ataques web comuns e controlam o carregamento de recursos.

### Configuração Completa de Headers

O bloco completo de headers do `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';",
        },
      ],
    },
  ];
}
```

### Descrição dos Headers

| Header | Valor | Propósito |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Previne ataques de sniffing de tipo MIME |
| `X-Frame-Options` | `DENY` | Bloqueia clickjacking impedindo incorporação em iframe |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controla quanta informação de referência é compartilhada |
| `X-DNS-Prefetch-Control` | `on` | Habilita prefetching de DNS para carregamentos mais rápidos |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Força HTTPS por 2 anos em todos os subdomínios |
| `Content-Security-Policy` | Veja acima | Restringe quais recursos o navegador pode carregar |

### Detalhes do HSTS

O header Strict-Transport-Security usa a configuração máxima recomendada:

- **max-age=63072000** – navegadores lembram de usar HTTPS por 2 anos
- **includeSubDomains** – todos os subdomínios também devem usar HTTPS
- **preload** – elegível para inclusão nas listas de preload HSTS dos navegadores

:::caution
Uma vez que HSTS com preload estiver ativo e seu domínio for enviado à lista de preload, é muito difícil desfazer. Certifique-se de que seu certificado SSL está corretamente configurado e com auto-renovação antes de habilitar o preload.
:::

### Descrição da Content Security Policy

| Diretiva | Valor | Efeito |
|-----------|-------|--------|
| `default-src` | `'self'` | Carregar apenas recursos da mesma origem por padrão |
| `script-src` | `'self' 'unsafe-inline' https://assets.lemonsqueezy.com` | Scripts da mesma origem, scripts inline e SDK de pagamento LemonSqueezy |
| `style-src` | `'self' 'unsafe-inline'` | Estilos da mesma origem mais estilos inline (necessário para CSS-in-JS) |
| `img-src` | `'self' data: https:` | Imagens da mesma origem, data URIs e qualquer fonte HTTPS |
| `font-src` | `'self'` | Fontes apenas da mesma origem |
| `connect-src` | `'self' https:` | Chamadas de API para a mesma origem e qualquer endpoint HTTPS |
| `frame-ancestors` | `'none'` | Impede a página de ser incorporada em frames |

## Configuração de Domínio Personalizado

### Variáveis de Ambiente para Configuração de Domínio

Ao configurar um domínio personalizado, atualize estas variáveis em seu ambiente de implantação:

```bash
# URL da aplicação – usado para callbacks OAuth, URLs canônicas, hreflang, sitemaps
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Domínio de cookie – deve corresponder ao seu domínio para que os cookies de sessão funcionem
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# URL de autenticação – usado pelo NextAuth para callbacks
NEXTAUTH_URL=https://yourdomain.com
```

A variável `NEXT_PUBLIC_APP_URL` é declarada como crítica em `scripts/check-env.js`:

```javascript
const CRITICAL_PATTERNS = [
  /^DATA_REPOSITORY$/,
  /^AUTH_SECRET$/,
  /^NEXT_PUBLIC_APP_URL$/
];
```

### Vercel: SSL Automático

Ao implantar no Vercel, os certificados SSL são provisionados e renovados automaticamente usando Let's Encrypt. O processo não requer configuração manual:

1. **Adicione seu domínio** no painel do projeto Vercel em Configurações → Domínios
2. **Configure o DNS** para apontar para o Vercel (veja Configuração de DNS abaixo)
3. **Verifique** – o Vercel provisiona automaticamente o certificado assim que o DNS é resolvido

O Vercel suporta:

- Provisionamento automático de certificados Let's Encrypt
- Certificados wildcard para subdomínios
- Renovação automática de certificados antes do vencimento
- Redirecionamento HTTP para HTTPS (automático)

### Configuração de DNS

**Para um domínio raiz** (ex.: `example.com`):

```
Tipo:  A
Nome:  @
Valor: 76.76.21.21
```

**Para um subdomínio www** (ex.: `www.example.com`):

```
Tipo:  CNAME
Nome:  www
Valor: cname.vercel-dns.com
```

**Verificação de DNS** após definir os registros:

```bash
# Verificar registro A
dig yourdomain.com A +short

# Verificar registro CNAME
dig www.yourdomain.com CNAME +short

# Verificação de propagação em múltiplos locais
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
```

A propagação de DNS pode levar até 48 horas, embora a maioria das alterações entre em vigor em minutos.

### Self-Hosted: Nginx com Let's Encrypt

Para implantações self-hosted atrás do Nginx, configure a terminação SSL no nível do proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Instale e configure o Certbot para gerenciamento automático de certificados:

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter e instalar certificado
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verificar renovação automática
sudo certbot renew --dry-run
```

## URLs de Callback OAuth

Ao mudar para um domínio personalizado, atualize as URLs de callback no console de cada provedor OAuth:

| Provedor | URL de Callback |
|----------|-------------|
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

O template valida automaticamente a configuração OAuth na inicialização. De `auth.config.ts`:

```typescript
const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === 'google')
        ? { enabled: true, clientId: authConfig.google.clientId || '', ... }
        : { enabled: false },
      // ... other providers
    });
  } catch (error) {
    // Fallback para apenas credenciais
    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      // ...
    });
  }
};
```

Se um provedor estiver mal configurado, o template faz fallback para autenticação somente com credenciais.

## Suporte a Múltiplos Domínios

O template suporta múltiplos domínios através da configuração de otimização de imagens do Next.js:

```typescript
images: {
  remotePatterns: generateImageRemotePatterns(),
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

O utilitário `generateImageRemotePatterns()` gera dinamicamente padrões de imagens remotas, permitindo que imagens de domínios externos configurados sejam otimizadas pelo Next.js.

## Configuração de Cookies

As configurações de cookies devem estar alinhadas com sua configuração de domínio:

```bash
# Desenvolvimento (localhost)
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# Produção (domínio personalizado)
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

Definir `COOKIE_SECURE=true` garante que os cookies sejam transmitidos apenas por conexões HTTPS. Isso é essencial para prevenir o sequestro de sessão. O script de verificação de ambiente valida a configuração de cookies como parte da categoria de segurança.

## Solução de Problemas

### Certificado SSL Não Provisionado

1. Verifique se os registros DNS apontam para o destino correto
2. Desabilite qualquer proxy DNS (ex.: modo proxy do Cloudflare) que possa interceptar o desafio ACME
3. Aguarde a propagação completa do DNS (verifique com os comandos `dig` acima)
4. Revise o painel da plataforma para erros específicos do certificado

### Avisos de Conteúdo Misto

Se o navegador reportar conteúdo misto após habilitar HTTPS:

1. Certifique-se de que `NEXT_PUBLIC_APP_URL` começa com `https://`
2. Verifique se todas as URLs de recursos externos usam HTTPS
3. As diretivas CSP `img-src` e `connect-src` incluem `https:` por padrão

### Incompatibilidade de Redirect OAuth

Se o login OAuth falhar com um erro de incompatibilidade de URI de redirecionamento:

1. Atualize a URL de callback no console de desenvolvedor de cada provedor OAuth
2. Certifique-se de que `NEXTAUTH_URL` corresponde ao domínio exato incluindo o protocolo
3. Limpe os cookies do navegador e o armazenamento de sessão antes de tentar novamente

## Arquivos Relacionados

| Arquivo | Propósito |
|------|---------|
| `next.config.ts` | Headers de segurança, CSP, padrões de imagens remotas |
| `auth.config.ts` | Configuração de provedor OAuth e configuração de callback |
| `scripts/check-env.js` | Validação de variáveis de ambiente para configurações de domínio |
| `lib/seo/hreflang.ts` | Geração de links alternativos hreflang para i18n |
| `lib/utils/url-cleaner.ts` | Utilitário de URL base usando `NEXT_PUBLIC_APP_URL` |
