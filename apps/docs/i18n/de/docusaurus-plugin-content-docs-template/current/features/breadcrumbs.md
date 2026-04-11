---
id: breadcrumbs
title: Breadcrumb-Navigation
sidebar_label: Paniermehl
sidebar_position: 26
---

# Breadcrumb-Navigation

Die Vorlage bietet ein Breadcrumb-Navigationssystem mit wiederverwendbaren UI-Komponenten, seitenspezifischen Breadcrumbs und Internationalisierungsunterstützung. Breadcrumbs verbessern sowohl die Benutzernavigation als auch die Suchmaschinenoptimierung, indem sie die aktuelle Seitenhierarchie anzeigen.

## Architekturübersicht

Breadcrumbs werden auf drei Ebenen implementiert:

| Schicht | Datei | Zweck |
|-------|------|---------|
| **Wiederverwendbare Benutzeroberfläche** | `components/ui/breadcrumb.tsx` | Generische Breadcrumb-Komponente, die ein Array von Elementen akzeptiert |
| **Artikeldetails** | `components/item-detail/breadcrumb.tsx` | Artikelspezifischer Breadcrumb mit Kategoriebewusstsein |
| **Sammlungen** | `app/[locale]/collections/components/collections-breadcrumb.tsx` | Sammlungsseiten-Breadcrumb mit i18n |

## Wiederverwendbare Breadcrumb-Komponente

Die Basis-Breadcrumb-Komponente liegt bei `components/ui/breadcrumb.tsx` und akzeptiert eine typisierte Reihe von Breadcrumb-Elementen.

### BreadcrumbItem-Schnittstelle

```ts
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

Für jedes Element gibt es ein `label` zum Anzeigen und ein optionales `href` zum Verknüpfen. Das letzte Element im Array wird automatisch als einfacher Text (die aktuelle Seite) und nicht als Link gerendert.

### Breadcrumb-Requisiten

```ts
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
}
```

- **Elemente** – Array von Breadcrumb-Segmenten, die nach dem Home-Link angezeigt werden sollen
- **homeLabel** – Beschriftung für den Home-Link (standardmäßig `'Home'` )
- **className** – Zusätzliche CSS-Klassen, die auf das Navigationselement angewendet werden sollen

### Grundlegende Verwendung

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

### Rendering-Verhalten

Die Komponente rendert ein zugängliches `nav` -Element mit einer geordneten Liste:

1. **Home-Link** – Wird immer zuerst mit einem Haussymbol SVG und dem Text `homeLabel` angezeigt
2. **Zwischenelemente** – Gerendert als anklickbare `Link` -Elemente (von `next/link` ) mit Chevron-Trennzeichen
3. **Letztes Element** – Aus Gründen der Barrierefreiheit als einfaches `span` mit `aria-current="page"` dargestellt

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

## Elementdetails Breadcrumb

Die `ItemBreadcrumb` -Komponente bei `components/item-detail/breadcrumb.tsx` ist speziell für Artikeldetailseiten konzipiert. Es integriert sich automatisch in das Kategoriensystem.

### Requisiten

```ts
interface BreadcrumbProps {
  name: string;
  category: string | { id?: string } | null | undefined;
  categoryName: string | null | undefined;
}
```

### Kategoriebezogene Navigation

Der Element-Breadcrumb verwendet den `useCategoriesEnabled` -Hook, um das Kategoriesegment bedingt zu rendern. Wenn Kategorien aktiviert sind, wird im Breadcrumb Folgendes angezeigt:

**Startseite** > **Kategoriename** > **Artikelname**

Wenn Kategorien deaktiviert sind, wird Folgendes vereinfacht:

**Startseite** > **Artikelname**

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

### Slug-Generierung

Die Komponente verarbeitet Kategorie-IDs über das Dienstprogramm `slugify` , um URL-sichere Pfade zu generieren:

```ts
const rawCategoryId =
  typeof firstCategory === 'string'
    ? firstCategory
    : (firstCategory as { id?: string })?.id || String(firstCategory);
const encodedCategory = encodeURIComponent(slugify(rawCategoryId));
```

Kategorielinks folgen dem Muster `/categories/{encoded-slug}` .

### Textkürzung

Der Elementname wird mithilfe der `truncate max-w-[200px]` Tailwind-Klassen auf eine maximale Breite von 200 Pixel gekürzt, um zu verhindern, dass lange Elementnamen das Layout beschädigen.

## Sammlungen Breadcrumb

Die `CollectionsBreadcrumb` -Komponente bei `app/[locale]/collections/components/collections-breadcrumb.tsx` demonstriert das i18n-bewusste Muster.

### Internationalisierung

Diese Komponente verwendet `next-intl` zum Übersetzen der Breadcrumb-Beschriftungen:

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

Übersetzungsschlüssel werden im Verzeichnis `messages/` für jedes unterstützte Gebietsschema definiert.

## Styling und Dunkelmodus

Alle Breadcrumb-Komponenten unterstützen den Dunkelmodus über die `dark:` -Präfixklassen von Tailwind:

| Element | Lichtmodus | Dunkler Modus |
|---------|-----------|-----------|
| Text | `text-black` | `dark:text-white` |
| Links | `text-gray-800` | `dark:text-white/50` |
| Chevron-Symbole | `text-dark--theme-800` | `dark:text-white/50` |
| Schwebezustand | `hover:text-gray-900` | `dark:hover:text-white` |

Übergänge werden mit `transition-colors duration-300` angewendet, um sanfte Hover-Effekte zu erzielen.

## Barrierefreiheit

Die Breadcrumb-Komponenten folgen den Best Practices für die WAI-ARIA-Breadcrumb-Navigation:

- ** `aria-label="Breadcrumb"` ** auf dem `nav` -Element identifiziert den Orientierungspunkt
- ** `aria-current="page"` ** im letzten Breadcrumb-Element markiert die aktuelle Seite
- ** `aria-hidden="true"` ** auf dekorativen SVG-Symbolen (Home und Chevron) verbirgt sie vor Bildschirmleseprogrammen
- **Semantisches HTML** verwendet die `nav > ol > li` -Struktur für eine ordnungsgemäße Dokumentgliederung

## Benutzerdefinierte Breadcrumbs hinzufügen

Um einen neuen Breadcrumb für eine bestimmte Seite zu erstellen, verwenden Sie die wiederverwendbare `Breadcrumb` -Komponente:

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

Für Seiten, die übersetzte Beschriftungen benötigen, umschließen Sie die Komponente und übergeben Sie übersetzte Zeichenfolgen:

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

## Verwandte Dateien

| Datei | Beschreibung |
|------|-------------|
| `components/ui/breadcrumb.tsx` | Wiederverwendbare generische Breadcrumb-Komponente |
| `components/item-detail/breadcrumb.tsx` | Artikeldetailseite Breadcrumb |
| `app/[locale]/collections/components/collections-breadcrumb.tsx` | Sammlungsseite Breadcrumb |
| `hooks/use-categories-enabled.ts` | Haken, um zu überprüfen, ob die Kategorienfunktion aktiv ist |
| `lib/utils/slug.ts` | Dienstprogramme zur Schneckenerzeugung ( `slugify` , `deslugify` ) |
