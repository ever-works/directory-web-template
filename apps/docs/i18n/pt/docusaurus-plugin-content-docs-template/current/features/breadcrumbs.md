---
id: breadcrumbs
title: Navegação estrutural
sidebar_label: Pão ralado
sidebar_position: 26
---

# Navegação estrutural

O modelo fornece um sistema de navegação estrutural com componentes de UI reutilizáveis, localização atual específica da página e suporte à internacionalização. A localização atual melhora a navegação do usuário e o SEO, exibindo a hierarquia atual da página.

## Visão geral da arquitetura

Breadcrumbs são implementados em três níveis:

| Camada | Arquivo | Finalidade |
|-------|------|--------|
| **IU reutilizável** | `components/ui/breadcrumb.tsx` | Componente breadcrumb genérico que aceita uma variedade de itens |
| **Detalhe do item** | `components/item-detail/breadcrumb.tsx` | Localização atual específica do item com reconhecimento de categoria |
| **Coleções** | `app/[locale]/collections/components/collections-breadcrumb.tsx` | Breadcrumb da página de coleções com i18n |

## Componente Breadcrumb Reutilizável

O componente de localização atual fica em `components/ui/breadcrumb.tsx` e aceita uma matriz digitada de itens de localização atual.

### Interface de BreadcrumbItem

```ts
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

Cada item tem um `label` para exibir e um `href` opcional para vincular. O último item da matriz é renderizado automaticamente como texto simples (a página atual) em vez de um link.

### Adereços de pão ralado

```ts
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
}
```

- **items** -- Matriz de segmentos de navegação a serem exibidos após o link Home
- **homeLabel** -- Etiqueta para o link inicial (o padrão é `'Home'` )
- **className** -- Classes CSS adicionais para aplicar ao elemento nav

### Uso Básico

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';

function MyPage() {
  return (
    <Breadcrumb
      items={[
        { label: 'Categories', href: '/categories' },
        { label: 'Productivity', href: '/categories/productivity' },
        { label: 'Current Tool' },
      ]}
    />
  );
}
```

### Comportamento de renderização

O componente renderiza um elemento `nav` acessível com uma lista ordenada:

1. **Home link** -- Sempre exibido primeiro com um ícone de casa SVG e o texto `homeLabel` 2. **Itens intermediários** -- Renderizados como elementos `Link` clicáveis (de `next/link` ) com separadores chevron
3. **Último item** -- Renderizado como um `span` simples com `aria-current="page"` para acessibilidade

```tsx
<nav className={cn('flex mb-8', className)} aria-label="Breadcrumb">
  <ol className="inline-flex items-center space-x-1 md:space-x-3">
    {/* Home link with icon */}
    <li className="inline-flex items-center text-black dark:text-white">
      <Link href="/">
        <HomeIcon />
        {homeLabel}
      </Link>
    </li>
    {/* Dynamic breadcrumb items with chevron separators */}
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <li key={index} aria-current={isLast ? 'page' : undefined}>
          <div className="flex items-center">
            <ChevronIcon />
            {item.href && !isLast ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span>{item.label}</span>
            )}
          </div>
        </li>
      );
    })}
  </ol>
</nav>
```

## Detalhes do item Breadcrumb

O componente `ItemBreadcrumb` em `components/item-detail/breadcrumb.tsx` foi projetado especificamente para páginas de detalhes de itens. Ele se integra automaticamente ao sistema de categorias.

### Adereços

```ts
interface BreadcrumbProps {
  name: string;
  category: string | { id?: string } | null | undefined;
  categoryName: string | null | undefined;
}
```

### Navegação com reconhecimento de categoria

O item breadcrumb usa o gancho `useCategoriesEnabled` para renderizar condicionalmente o segmento da categoria. Quando as categorias estão habilitadas, a localização atual mostra:

**Página inicial** > **Nome da categoria** > **Nome do item**

Quando as categorias estão desativadas, é simplificado para:

**Página inicial** > **Nome do item**

```tsx
import { ItemBreadcrumb } from '@/components/item-detail/breadcrumb';

function ItemDetailPage({ item }) {
  return (
    <ItemBreadcrumb
      name={item.name}
      category={item.category}
      categoryName={item.categoryName}
    />
  );
}
```

### Geração de Lesmas

O componente processa identificadores de categoria por meio do utilitário `slugify` para gerar caminhos seguros para URL:

```ts
const rawCategoryId =
  typeof firstCategory === 'string'
    ? firstCategory
    : (firstCategory as { id?: string })?.id || String(firstCategory);
const encodedCategory = encodeURIComponent(slugify(rawCategoryId));
```

Os links das categorias seguem o padrão `/categories/{encoded-slug}` .

### Truncamento de texto

O nome do item é truncado para largura máxima de 200px usando as classes `truncate max-w-[200px]` Tailwind, evitando que nomes longos de itens quebrem o layout.

## Breadcrumb de coleções

O componente `CollectionsBreadcrumb` em `app/[locale]/collections/components/collections-breadcrumb.tsx` demonstra o padrão compatível com i18n.

### Internacionalização

Este componente usa `next-intl` para traduzir os rótulos de localização atual:

```tsx
import { useTranslations } from 'next-intl';

export function CollectionsBreadcrumb() {
  const t = useTranslations('common');

  return (
    <nav className="flex mb-8 justify-center" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li>
          <Link href="/">{t('HOME')}</Link>
        </li>
        <li>
          <span>{t('COLLECTION')}</span>
        </li>
      </ol>
    </nav>
  );
}
```

As chaves de tradução são definidas no diretório `messages/` para cada localidade suportada.

## Estilo e modo escuro

Todos os componentes de localização atual suportam o modo escuro por meio das classes de prefixo `dark:` do Tailwind:

| Elemento | Modo Luz | Modo escuro |
|--------|-----------|-----------|
| Texto | `text-black` | `dark:text-white` |
| Ligações | `text-gray-800` | `dark:text-white/50` |
| Ícones da divisa | `text-dark--theme-800` | `dark:text-white/50` |
| Estado de foco | `hover:text-gray-900` | `dark:hover:text-white` |

As transições são aplicadas com `transition-colors duration-300` para efeitos suaves de foco.

## Acessibilidade

Os componentes da localização atual seguem as práticas recomendadas de navegação estrutural WAI-ARIA:

- ** `aria-label="Breadcrumb"` ** no elemento `nav` identifica o ponto de referência
- ** `aria-current="page"` ** no último item da trilha marca a página atual
- ** `aria-hidden="true"` ** em ícones SVG decorativos (home e chevron) os oculta dos leitores de tela
- **HTML semântico** usa a estrutura `nav > ol > li` para um contorno adequado do documento

## Adicionando breadcrumbs personalizados

Para criar uma nova localização atual para uma página específica, use o componente reutilizável `Breadcrumb` :

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';

export function SettingsBreadcrumb() {
  return (
    <Breadcrumb
      items={[
        { label: 'Dashboard', href: '/client/dashboard' },
        { label: 'Settings' },
      ]}
      homeLabel="Home"
      className="mb-6"
    />
  );
}
```

Para páginas que precisam de rótulos traduzidos, envolva o componente e passe as strings traduzidas:

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useTranslations } from 'next-intl';

export function LocalizedBreadcrumb() {
  const t = useTranslations('common');
  return (
    <Breadcrumb
      items={[
        { label: t('DASHBOARD'), href: '/client/dashboard' },
        { label: t('SETTINGS') },
      ]}
      homeLabel={t('HOME')}
    />
  );
}
```

## Arquivos Relacionados

| Arquivo | Descrição |
|------|-------------|
| `components/ui/breadcrumb.tsx` | Componente de localização atual genérico reutilizável |
| `components/item-detail/breadcrumb.tsx` | Página de detalhes do item localização atual |
| `app/[locale]/collections/components/collections-breadcrumb.tsx` | Breadcrumb da página de coleções |
| `hooks/use-categories-enabled.ts` | Gancho para verificar se o recurso de categorias está ativo |
| `lib/utils/slug.ts` | Utilitários de geração de slug ( `slugify` , `deslugify` ) |
