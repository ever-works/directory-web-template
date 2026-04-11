---
id: breadcrumbs
title: Nawigacja nawigacyjna
sidebar_label: Bułka tarta
sidebar_position: 26
---

# Nawigacja po bułce tartej

Szablon zapewnia system nawigacji oparty na okładce z komponentami interfejsu użytkownika wielokrotnego użytku, okruchami nawigacyjnymi specyficznymi dla strony i obsługą internacjonalizacji. Bułka tarta poprawia zarówno nawigację użytkownika, jak i SEO, wyświetlając bieżącą hierarchię stron.

## Przegląd architektury

Breadcrumbs są wdrażane na trzech poziomach:

| Warstwa | Plik | Cel |
|-------|------|--------|
| **Interfejs wielokrotnego użytku** | `components/ui/breadcrumb.tsx` | Ogólny komponent nawigacyjny akceptujący tablicę elementów |
| **Szczegóły przedmiotu** | `components/item-detail/breadcrumb.tsx` | Okruszek specyficzny dla przedmiotu ze świadomością kategorii |
| **Kolekcje** | `app/[locale]/collections/components/collections-breadcrumb.tsx` | Okruszek strony kolekcji z i18n |

## Komponent bułki tartej wielokrotnego użytku

Podstawowy komponent nawigacyjny ma wartość `components/ui/breadcrumb.tsx` i akceptuje wpisaną tablicę elementów nawigacyjnych.

### Interfejs BreadcrumbItem

```ts
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

Każdy element ma `label` do wyświetlenia i opcjonalnie `href` do łączenia. Ostatni element tablicy jest automatycznie renderowany jako zwykły tekst (bieżąca strona), a nie łącze.

### Rekwizyty z bułki tartej

```ts
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
}
```

- **elementy** -- Tablica segmentów nawigacyjnych wyświetlanych po łączu głównym
- **homeLabel** -- Etykieta łącza głównego (domyślnie `'Home'` )
- **className** -- Dodatkowe klasy CSS, które można zastosować do elementu nawigacyjnego

### Podstawowe użycie

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

### Zachowanie podczas renderowania

Komponent renderuje dostępny element `nav` z uporządkowaną listą:

1. **Link do domu** — Zawsze wyświetlany jako pierwszy z ikoną domu SVG i tekstem `homeLabel` 2. **Elementy pośrednie** -- Renderowane jako klikalne `Link` elementy (od `next/link` ) z separatorami w kształcie jodełki
3. **Ostatni element** -- Renderowany jako zwykły `span` z `aria-current="page"` dla ułatwienia dostępu

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

## Okruszek szczegółów przedmiotu

Komponent `ItemBreadcrumb` w `components/item-detail/breadcrumb.tsx` jest specjalnie zaprojektowany dla stron ze szczegółami pozycji. Automatycznie integruje się z systemem kategorii.

### Rekwizyty

```ts
interface BreadcrumbProps {
  name: string;
  category: string | { id?: string } | null | undefined;
  categoryName: string | null | undefined;
}
```

### Nawigacja uwzględniająca kategorie

Okruszek elementu wykorzystuje hak `useCategoriesEnabled` do warunkowego renderowania segmentu kategorii. Gdy kategorie są włączone, menu nawigacyjne pokazuje:

**Strona główna** > **Nazwa kategorii** > **Nazwa przedmiotu**

Gdy kategorie są wyłączone, upraszcza to:

**Strona główna** > **Nazwa przedmiotu**

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

### Generowanie ślimaków

Komponent przetwarza identyfikatory kategorii za pomocą narzędzia `slugify` w celu wygenerowania ścieżek bezpiecznych dla adresów URL:

```ts
const rawCategoryId =
  typeof firstCategory === 'string'
    ? firstCategory
    : (firstCategory as { id?: string })?.id || String(firstCategory);
const encodedCategory = encodeURIComponent(slugify(rawCategoryId));
```

Linki kategorii mają wzór `/categories/{encoded-slug}` .

### Obcięcie tekstu

Nazwa elementu jest obcinana do maksymalnej szerokości 200 pikseli przy użyciu klas `truncate max-w-[200px]` Tailwind, co zapobiega zakłócaniu układu przez długie nazwy elementów.

## Bułka tarta kolekcji

Komponent `CollectionsBreadcrumb` w `app/[locale]/collections/components/collections-breadcrumb.tsx` demonstruje wzorzec świadomy i18n.

### Internacjonalizacja

Ten komponent używa `next-intl` do tłumaczenia etykiet nawigacyjnych:

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

Klucze tłumaczące są zdefiniowane w katalogu `messages/` dla każdego obsługiwanego języka.

## Stylizacja i tryb ciemny

Wszystkie komponenty nawigacyjne obsługują tryb ciemny poprzez klasy prefiksów `dark:` Tailwinda:

| Element | Tryb światła | Tryb ciemny |
|--------|-----------|----------|
| Tekst | `text-black` | `dark:text-white` |
| Linki | `text-gray-800` | `dark:text-white/50` |
| Ikony jodełkowe | `text-dark--theme-800` | `dark:text-white/50` |
| Stan zawisu | `hover:text-gray-900` | `dark:hover:text-white` |

Przejścia są stosowane z wartością `transition-colors duration-300` , aby uzyskać płynne efekty najechania.

## Dostępność

Komponenty nawigacyjne są zgodne z najlepszymi praktykami nawigacji nawigacyjnej WAI-ARIA:

- ** `aria-label="Breadcrumb"` ** na elemencie `nav` oznacza punkt orientacyjny
- ** `aria-current="page"` ** na ostatniej pozycji nawigacyjnej oznacza bieżącą stronę
- ** `aria-hidden="true"` ** na ozdobnych ikonach SVG (home i szewron) ukrywa je przed czytnikami ekranu
- **Semantyczny HTML** wykorzystuje `nav > ol > li` strukturę dla prawidłowego zarysu dokumentu

## Dodawanie niestandardowej bułki tartej

Aby utworzyć nową nawigację dla konkretnej strony, użyj komponentu `Breadcrumb` wielokrotnego użytku:

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

W przypadku stron wymagających przetłumaczonych etykiet zawiń komponent i przekaż przetłumaczone ciągi znaków:

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

## Powiązane pliki

| Plik | Opis |
|------|------------|
| `components/ui/breadcrumb.tsx` | Ogólny komponent bułki tartej wielokrotnego użytku |
| `components/item-detail/breadcrumb.tsx` | Okruszek strony ze szczegółami przedmiotu |
| `app/[locale]/collections/components/collections-breadcrumb.tsx` | Okruszek strony kolekcji |
| `hooks/use-categories-enabled.ts` | Hook, aby sprawdzić, czy funkcja kategorii jest aktywna |
| `lib/utils/slug.ts` | Narzędzia do wytwarzania ślimaków ( `slugify` , `deslugify` ) |
