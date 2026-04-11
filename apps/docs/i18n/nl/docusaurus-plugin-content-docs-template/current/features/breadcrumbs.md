---
id: breadcrumbs
title: Breadcrumb-navigatie
sidebar_label: Paneermeel
sidebar_position: 26
---

# Breadcrumb-navigatie

De sjabloon biedt een broodkruimelnavigatiesysteem met herbruikbare UI-componenten, paginaspecifieke broodkruimels en ondersteuning voor internationalisering. Broodkruimels verbeteren zowel de gebruikersnavigatie als de SEO door de huidige paginahiërarchie weer te geven.

## Architectuuroverzicht

Broodkruimels worden op drie niveaus geïmplementeerd:

| Laag | Bestand | Doel |
|-------|------|---------|
| **Herbruikbare gebruikersinterface** | `components/ui/breadcrumb.tsx` | Generieke broodkruimelcomponent die een reeks items accepteert |
| **Artikeldetail** | `components/item-detail/breadcrumb.tsx` | Artikelspecifieke broodkruimel met categoriebewustzijn |
| **Collecties** | `app/[locale]/collections/components/collections-breadcrumb.tsx` | Collectiepagina broodkruimel met i18n |

## Herbruikbare broodkruimelcomponent

De basisbroodkruimelcomponent bevindt zich op `components/ui/breadcrumb.tsx` en accepteert een getypte reeks broodkruimelitems.

### BreadcrumbItem-interface

```ts
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

Elk item heeft een `label` om weer te geven en een optionele `href` om te koppelen. Het laatste item in de array wordt automatisch weergegeven als platte tekst (de huidige pagina) in plaats van als een link.

### Broodkruimel rekwisieten

```ts
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
}
```

- **items** -- Array van broodkruimelsegmenten die moeten worden weergegeven na de Home-link
- **homeLabel** -- Label voor de thuislink (standaard ingesteld op `'Home'` )
- **className** -- Extra CSS-klassen die op het nav-element moeten worden toegepast

### Basisgebruik

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

### Weergavegedrag

De component geeft een toegankelijk `nav` -element weer met een geordende lijst:

1. **Home-link** -- Altijd eerst weergegeven met een huispictogram SVG en de `homeLabel` -tekst
2. **Tussenliggende items** -- Weergegeven als klikbare `Link` -elementen (van `next/link` ) met chevron-scheidingstekens
3. **Laatste item** -- Weergegeven als een gewone `span` met `aria-current="page"` voor toegankelijkheid

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

## Itemdetail Broodkruimel

De component `ItemBreadcrumb` bij `components/item-detail/breadcrumb.tsx` is speciaal ontworpen voor artikeldetailpagina's. Het integreert automatisch met het categoriesysteem.

### Rekwisieten

```ts
interface BreadcrumbProps {
  name: string;
  category: string | { id?: string } | null | undefined;
  categoryName: string | null | undefined;
}
```

### Categoriebewuste navigatie

De item-broodkruimel gebruikt de haak `useCategoriesEnabled` om het categoriesegment voorwaardelijk weer te geven. Wanneer categorieën zijn ingeschakeld, wordt in de broodkruimel het volgende weergegeven:

**Home** > **Categorienaam** > **Artikelnaam**

Wanneer categorieën zijn uitgeschakeld, wordt het volgende eenvoudiger:

**Home** > **Artikelnaam**

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

### Generatie van naaktslakken

De component verwerkt categorie-ID's via het hulpprogramma `slugify` om URL-veilige paden te genereren:

```ts
const rawCategoryId =
  typeof firstCategory === 'string'
    ? firstCategory
    : (firstCategory as { id?: string })?.id || String(firstCategory);
const encodedCategory = encodeURIComponent(slugify(rawCategoryId));
```

Categorielinks volgen het patroon `/categories/{encoded-slug}` .

### Tekstafkapping

De itemnaam wordt afgekapt tot een maximale breedte van 200px met behulp van de `truncate max-w-[200px]` Tailwind-klassen, waardoor wordt voorkomen dat lange itemnamen de lay-out verstoren.

## Verzamelingen Broodkruimel

De `CollectionsBreadcrumb` -component bij `app/[locale]/collections/components/collections-breadcrumb.tsx` demonstreert het i18n-bewuste patroon.

### Internationalisering

Deze component gebruikt `next-intl` voor het vertalen van de broodkruimellabels:

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

Vertaalsleutels worden gedefinieerd in de map `messages/` voor elke ondersteunde landinstelling.

## Styling en donkere modus

Alle broodkruimelcomponenten ondersteunen de donkere modus via de `dark:` prefixklassen van Tailwind:

| Element | Lichtmodus | Donkere modus |
|---------|-----------|----------|
| Tekst | `text-black` | `dark:text-white` |
| Koppelingen | `text-gray-800` | `dark:text-white/50` |
| Chevron-pictogrammen | `text-dark--theme-800` | `dark:text-white/50` |
| Beweeg status | `hover:text-gray-900` | `dark:hover:text-white` |

Overgangen worden toegepast met `transition-colors duration-300` voor vloeiende zweefeffecten.

## Toegankelijkheid

De broodkruimelcomponenten volgen de best practices voor broodkruimelnavigatie van WAI-ARIA:

- ** `aria-label="Breadcrumb"` ** op het `nav` element identificeert het oriëntatiepunt
- ** `aria-current="page"` ** bij het laatste broodkruimelitem markeert de huidige pagina
- ** `aria-hidden="true"` ** op decoratieve SVG-pictogrammen (home en chevron) verbergt ze voor schermlezers
- **Semantische HTML** gebruikt de `nav > ol > li` -structuur voor een correct documentoverzicht

## Aangepaste broodkruimels toevoegen

Om een nieuwe broodkruimel voor een specifieke pagina te maken, gebruikt u de herbruikbare component `Breadcrumb` :

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

Voor pagina's waarvoor vertaalde labels nodig zijn, wikkelt u de component en geeft u vertaalde tekenreeksen door:

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

## Gerelateerde bestanden

| Bestand | Beschrijving |
|------|-------------|
| `components/ui/breadcrumb.tsx` | Herbruikbare generieke broodkruimelcomponent |
| `components/item-detail/breadcrumb.tsx` | Artikeldetailpagina broodkruimel |
| `app/[locale]/collections/components/collections-breadcrumb.tsx` | Collectiepagina broodkruimel |
| `hooks/use-categories-enabled.ts` | Hook om te controleren of de categoriefunctie actief is |
| `lib/utils/slug.ts` | Nutsbedrijven voor het genereren van naaktslakken ( `slugify` , `deslugify` ) |
