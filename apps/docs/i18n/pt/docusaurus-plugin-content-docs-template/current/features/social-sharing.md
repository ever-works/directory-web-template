---
id: social-sharing
title: Compartilhamento social
sidebar_label: Compartilhamento social
sidebar_position: 22
---

# Compartilhamento social

O modelo fornece recursos de compartilhamento social por meio de um componente de botão de compartilhamento dedicado, geração de imagens Open Graph, marcação de dados estruturados e utilitários de metadados SEO. Juntos, esses recursos garantem que os links compartilhados gerem visualizações avançadas em plataformas sociais.

## Visão geral da arquitetura

```
components/item-detail/
  share-button.tsx              -- Share dropdown component

app/
  opengraph-image.tsx           -- Dynamic OG image generation

lib/seo/
  schema.ts                     -- JSON-LD structured data
  listing-metadata.ts           -- Next.js Metadata generation
  hreflang.ts                   -- Hreflang alternate links
```

## Componente do botão Compartilhar

O `ShareButton` em `components/item-detail/share-button.tsx` fornece um menu suspenso com opções de compartilhamento para X (Twitter), Facebook, LinkedIn e cópia da área de transferência:

```tsx
// components/item-detail/share-button.tsx
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";

export const ShareButton = ({ url, title }: { url: string; title: string }) => {
  const [isCopying, setIsCopying] = useState(false);
  const t = useTranslations("common");

  const handleShare = async (type: string) => {
    try {
      switch (type) {
        case "copy":
          setIsCopying(true);
          await navigator.clipboard.writeText(url);
          await new Promise(resolve => setTimeout(resolve, 500));
          toast.success(t("LINK_COPIED"));
          setIsCopying(false);
          break;
        case "twitter":
          window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
            "_blank"
          );
          break;
        case "facebook":
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            "_blank"
          );
          break;
        case "linkedin":
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            "_blank"
          );
          break;
      }
    } catch (error) {
      toast.error(t("SHARE_ERROR"));
      setIsCopying(false);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="...">
          {/* Share icon */}
          <span>{t("SHARE")}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => handleShare("copy")}>
            Copy Link
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => handleShare("twitter")}>
            X
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => handleShare("facebook")}>
            Facebook
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => handleShare("linkedin")}>
            LinkedIn
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
```

### Compartilhar formatos de URL

| Plataforma | Padrão de URL |
|----------|------------|
| X (Twitter) | `https://twitter.com/intent/tweet?url=...&text=...` |
| Facebook | `https://www.facebook.com/sharer/sharer.php?u=...` |
| LinkedIn | `https://www.linkedin.com/sharing/share-offsite/?url=...` |
| Copiar Link | Usa `navigator.clipboard.writeText()` |

### Recursos da interface do usuário
- Construído em **Radix UI DropdownMenu** para navegação acessível pelo teclado
- **Copiar estado de carregamento**: mostra um botão giratório durante o atraso de gravação da área de transferência
- **Notificações do sistema**: feedback de sucesso/erro via `sonner` - **Suporte ao modo escuro**: todos os estilos incluem variantes escuras
- **i18n**: todos os rótulos usam traduções `next-intl` ## Geração de imagem de gráfico aberto

O arquivo `app/opengraph-image.tsx` gera imagens OG dinâmicas usando Next.js `ImageResponse` :

```tsx
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const alt = `${siteConfig.name} - ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const gradient = `linear-gradient(135deg, ${siteConfig.ogImage.gradientStart} 0%, ${siteConfig.ogImage.gradientEnd} 100%)`;

  return new ImageResponse(
    (
      <div style={{ background: gradient, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '80px' }}>
        <div style={{ fontSize: 96, fontWeight: 'bold', color: 'white' }}>
          {siteConfig.name}
        </div>
        <div style={{ fontSize: 36, color: '#e0e0e0', textAlign: 'center' }}>
          {siteConfig.tagline}
        </div>
      </div>
    ),
    { ...size }
  );
}
```

A imagem OG é veiculada automaticamente em `/opengraph-image.png` e referenciada pelos metadados Next.js.

## Geração de metadados SEO

O utilitário `lib/seo/listing-metadata.ts` gera objetos `Metadata` completos do Next.js, incluindo Open Graph e tags de cartão do Twitter:

```tsx
// lib/seo/listing-metadata.ts
export function generateListingMetadata({
  title,
  description,
  path,
  locale,
  itemCount,
  keywords,
  imageUrl,
}: ListingMetadataOptions): Metadata {
  const fullTitle = `${title} | ${siteConfig.name}`;
  const canonicalUrl = `${appUrl}${localePath}${path}`;

  return {
    title: fullTitle,
    description: metaDescription,
    keywords: keywords?.join(', '),
    openGraph: {
      title: fullTitle,
      description: metaDescription,
      type: 'website',
      siteName: siteConfig.name,
      url: canonicalUrl,
      ...(imageUrl && { images: [{ url: imageUrl }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: metaDescription,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: generateHreflangAlternates(path),
    },
  };
}
```

## Dados Estruturados (JSON-LD)

O módulo `lib/seo/schema.ts` gera dados estruturados do Schema.org para resultados de pesquisa avançados:

### Esquema da Organização

```tsx
export function generateOrganizationSchema() {
  const sameAs = [
    siteConfig.social.github,
    siteConfig.social.x,
    siteConfig.social.linkedin,
    siteConfig.social.facebook,
  ].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.brandName,
    url: siteConfig.url,
    logo: `${siteConfig.url}${siteConfig.logo}`,
    sameAs,
  };
}
```

### Esquema do Produto

```tsx
export function generateProductSchema(input: ProductSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image,
    category: input.category,
    brand: input.brandName
      ? { '@type': 'Brand', name: input.brandName }
      : undefined,
  };
}
```

### Esquema de site com ação de pesquisa

```tsx
export function generateWebSiteSchema(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: `${siteConfig.url}${localePrefix}`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.url}${localePrefix}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
```

### Esquema de localização atual

```tsx
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
```

## Alternativas Hreflang

O módulo `lib/seo/hreflang.ts` gera links de idiomas alternativos para SEO internacional:

```tsx
import { generateHreflangAlternates } from './hreflang';

// Returns: { 'en': '/path', 'fr': '/fr/path', 'es': '/es/path', ... }
const languages = generateHreflangAlternates('/categories/design');
```

## Uso nas páginas de detalhes do item

O botão de compartilhamento é usado nas páginas de detalhes do item junto com os metadados gerados:

```tsx
// In an item detail page component
<ShareButton
  url={`${siteConfig.url}/items/${item.slug}`}
  title={item.name}
/>
```

## Referência de arquivo

| Arquivo | Finalidade |
|------|---------|
| `components/item-detail/share-button.tsx` | Componente suspenso de compartilhamento social |
| `app/opengraph-image.tsx` | Geração dinâmica de imagens OG |
| `lib/seo/schema.ts` | Geradores de dados estruturados JSON-LD |
| `lib/seo/listing-metadata.ts` | Geração de metadados Next.js |
| `lib/seo/hreflang.ts` | Links alternativos do Hreflang |
| `lib/config/client.ts` | Configuração do site (URLs sociais, branding) |
