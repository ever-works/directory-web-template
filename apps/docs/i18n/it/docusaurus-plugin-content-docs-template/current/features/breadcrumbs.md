---
id: breadcrumbs
title: Navigazione breadcrumb
sidebar_label: Pangrattato
sidebar_position: 26
---

# Navigazione breadcrumb

Il modello fornisce un sistema di navigazione breadcrumb con componenti dell'interfaccia utente riutilizzabili, breadcrumb specifici della pagina e supporto per l'internazionalizzazione. I breadcrumb migliorano sia la navigazione dell'utente che il SEO visualizzando la gerarchia della pagina corrente.

## Panoramica dell'architettura

I breadcrumb sono implementati a tre livelli:

| Strato | File | Scopo |
|-------|------|---------|
| **Interfaccia utente riutilizzabile** | `components/ui/breadcrumb.tsx` | Componente breadcrumb generico che accetta una serie di elementi |
| **Dettaglio articolo** | `components/item-detail/breadcrumb.tsx` | breadcrumb specifico per articolo con consapevolezza della categoria |
| **Collezioni** | `app/[locale]/collections/components/collections-breadcrumb.tsx` | Breadcrumb della pagina delle raccolte con i18n |

## Componente breadcrumb riutilizzabile

Il componente breadcrumb di base vive a `components/ui/breadcrumb.tsx` e accetta una serie digitata di elementi breadcrumb.

### Interfaccia elemento breadcrumb

```ts
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

Ogni elemento ha un `label` da visualizzare e un `href` opzionale per il collegamento. L'ultimo elemento dell'array viene automaticamente visualizzato come testo semplice (la pagina corrente) anziché come collegamento.

### Oggetti di scena di pangrattato

```ts
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
}
```

- **elementi** -- Matrice di segmenti breadcrumb da visualizzare dopo il collegamento Home
- **homeLabel** -- Etichetta per il collegamento home (predefinito su `'Home'` )
- **className** -- Classi CSS aggiuntive da applicare all'elemento nav

### Utilizzo di base

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

### Comportamento nel rendering

Il componente rende un elemento `nav` accessibile con un elenco ordinato:

1. **Link Home** -- Visualizzato sempre per primo con l'icona di una casa SVG e il testo `homeLabel` 2. **Elementi intermedi** -- Resi come elementi cliccabili `Link` (da `next/link` ) con separatori chevron
3. **Ultimo elemento** -- Reso come un semplice `span` con `aria-current="page"` per l'accessibilità

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

## Dettaglio articolo Pangrattato

Il componente `ItemBreadcrumb` in `components/item-detail/breadcrumb.tsx` è progettato specificamente per le pagine dei dettagli degli articoli. Si integra automaticamente con il sistema di categorie.

### Oggetti di scena

```ts
interface BreadcrumbProps {
  name: string;
  category: string | { id?: string } | null | undefined;
  categoryName: string | null | undefined;
}
```

### Navigazione consapevole delle categorie

Il breadcrumb dell'elemento utilizza l'hook `useCategoriesEnabled` per rappresentare in modo condizionale il segmento della categoria. Quando le categorie sono abilitate, il breadcrumb mostra:

**Home** > **Nome categoria** > **Nome articolo**

Quando le categorie sono disabilitate, si semplifica in:

**Home** > **Nome articolo**

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

### Generazione di lumache

Il componente elabora gli identificatori di categoria tramite l'utilità `slugify` per generare percorsi URL-safe:

```ts
const rawCategoryId =
  typeof firstCategory === 'string'
    ? firstCategory
    : (firstCategory as { id?: string })?.id || String(firstCategory);
const encodedCategory = encodeURIComponent(slugify(rawCategoryId));
```

I collegamenti alle categorie seguono lo schema `/categories/{encoded-slug}` .

### Troncamento del testo

Il nome dell'elemento viene troncato alla larghezza massima di 200 px utilizzando le classi `truncate max-w-[200px]` Tailwind, evitando che i nomi degli elementi lunghi rompano il layout.

## Collezioni Pangrattato

La componente `CollectionsBreadcrumb` in `app/[locale]/collections/components/collections-breadcrumb.tsx` dimostra il modello i18n-aware.

### Internazionalizzazione

Questo componente utilizza `next-intl` per tradurre le etichette breadcrumb:

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

Le chiavi di traduzione sono definite nella directory `messages/` per ciascuna locale supportata.

## Stile e modalità oscura

Tutti i componenti breadcrumb supportano la modalità oscura tramite le classi di prefisso `dark:` di Tailwind:

| Elemento | Modalità luce | Modalità oscura |
|---------|-----------|-----------|
| Testo | `text-black` | `dark:text-white` |
| Collegamenti | `text-gray-800` | `dark:text-white/50` |
| Icone Chevron | `text-dark--theme-800` | `dark:text-white/50` |
| Stato al passaggio del mouse | `hover:text-gray-900` | `dark:hover:text-white` |

Le transizioni vengono applicate con `transition-colors duration-300` per effetti fluidi al passaggio del mouse.

## Accessibilità

I componenti breadcrumb seguono le migliori pratiche di navigazione breadcrumb WAI-ARIA:

- ** `aria-label="Breadcrumb"` ** sull'elemento `nav` identifica il punto di riferimento
- ** `aria-current="page"` ** sull'ultimo elemento breadcrumb contrassegna la pagina corrente
- ** `aria-hidden="true"` ** sulle icone SVG decorative (casa e chevron) le nasconde agli screen reader
- **HTML semantico** utilizza la struttura `nav > ol > li` per una corretta struttura del documento

## Aggiunta di breadcrumb personalizzati

Per creare un nuovo breadcrumb per una pagina specifica, utilizza il componente riutilizzabile `Breadcrumb` :

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

Per le pagine che necessitano di etichette tradotte, avvolgi il componente e passa le stringhe tradotte:

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

## File correlati

| File | Descrizione |
|------|-------------|
| `components/ui/breadcrumb.tsx` | Componente breadcrumb generico riutilizzabile |
| `components/item-detail/breadcrumb.tsx` | Pangrattato della pagina dei dettagli dell'articolo |
| `app/[locale]/collections/components/collections-breadcrumb.tsx` | Pangrattato della pagina delle raccolte |
| `hooks/use-categories-enabled.ts` | Aggancio per verificare se la funzionalità delle categorie è attiva |
| `lib/utils/slug.ts` | Utilità di generazione slug ( `slugify` , `deslugify` ) |
