---
id: seo
title: Configuração SEO
sidebar_label: SEO
sidebar_position: 8
---

#Configuração SEO

O modelo Ever Works fornece suporte SEO abrangente, incluindo dados estruturados JSON-LD, tags hreflang para conteúdo multilíngue, metadados OpenGraph, mapas de sites automatizados e configuração robots.txt.

## Dados estruturados JSON-LD

Localizados em `lib/seo/schema.ts` , os utilitários de esquema geram dados estruturados do Schema.org para vários tipos de conteúdo.

### Esquema do Produto

Usado nas páginas de detalhes do item:

```typescript
import { generateProductSchema } from '@/lib/seo/schema';

const schema = generateProductSchema({
  name: 'Product Name',
  description: 'Product description',
  image: 'https://example.com/image.jpg',
  url: 'https://example.com/product',
  category: 'Software',
  sourceUrl: 'https://product-website.com',
  brandName: 'Brand Name',
});
```

Gera:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": "https://example.com/image.jpg",
  "url": "https://example.com/product",
  "category": "Software",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://product-website.com",
    "availability": "https://schema.org/InStock"
  }
}
```

### Esquema da Organização

Usado para identidade de marca em todo o site na página inicial e nas páginas sobre.

### Outros tipos de esquema

O módulo fornece geradores para:
- **WebSite** -- Metadados em nível de site com ação de pesquisa
- **BreadcrumbList** -- BreadcrumbList de navegação
- **FAQPage** -- Seções de FAQ com pares de perguntas/respostas
- **ItemList** -- Páginas de listagem de categorias e coleções

## Etiquetas Hreflang

Localizado em `lib/seo/hreflang.ts` , o utilitário hreflang gera links alternativos de idiomas para mecanismos de busca.

### Locais suportados

O modelo suporta mais de 20 localidades:

```
en | fr | es | de | zh | ar | he | ru | uk | pt
it | ja | ko | nl | pl | tr | vi | th | hi | id | bg
```

### Geração de URL

O utilitário hreflang segue o padrão de prefixo de localidade "conforme necessário":
- A localidade padrão ( `en` ) usa o caminho raiz: `https://example.com/page` - Outras localidades usam caminhos prefixados: `https://example.com/fr/page`

```typescript
import { generateHreflangTags } from '@/lib/seo/hreflang';

const alternates = generateHreflangTags('/items/product-slug');
// Returns language alternate links for all configured locales
```

### Mapeamento de localidade para Hreflang

Cada localidade é mapeada para seu valor hreflang ISO 639-1. A maioria usa o mesmo código, mas alguns exigem tratamento especial para variantes regionais.

## Listagem de metadados

Localizado em `lib/seo/listing-metadata.ts` , este módulo gera metadados para listar páginas, incluindo páginas de categorias, resultados de pesquisa e visualizações filtradas com modelos de títulos, descrições e URLs canônicos apropriados.

## Cartões OpenGraph e Twitter

O modelo gera metadados OpenGraph e Twitter Card por meio da API de metadados Next.js nos componentes da página:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: 'Page Title',
    description: 'Page description',
    openGraph: {
      title: 'Page Title',
      description: 'Page description',
      images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Page Title',
      description: 'Page description',
    },
    alternates: {
      languages: generateHreflangTags('/current-path'),
    },
  };
}
```

## Mapa do site

Localizado em `app/sitemap.ts` , o mapa do site é gerado automaticamente usando o suporte integrado ao mapa do site Next.js:

- **Páginas estáticas** -- Página inicial, sobre, preços, contato
- **Páginas dinâmicas** -- Todos os itens, categorias e coleções publicados
- **URLs localizadas** -- Cada página gera entradas para todas as localidades ativas
- **Prioridade e frequência** -- Configurado por tipo de página

## Robôs.txt

Localizada em `app/robots.ts` , a configuração dos robôs:

- Permite todos os rastreadores por padrão
- Aponta para o URL do mapa do site
- Opcionalmente, bloqueia rotas administrativas e de API da indexação
- Configurável via ambiente para diferenças de preparação/produção

## Melhores práticas

1. **Cada página deve ter metadados exclusivos** -- Use `generateMetadata()` nos componentes da página
2. **Incluir JSON-LD nas páginas de detalhes** – Esquema de produto para itens, Organização para página inicial
3. **Definir URLs canônicos** – Evite conteúdo duplicado em versões localizadas
4. **Use o utilitário hreflang** – Garante que os mecanismos de pesquisa forneçam a versão correta do idioma
5. **Mantenha as descrições com menos de 160 caracteres** – Ideal para snippets de resultados de pesquisa
