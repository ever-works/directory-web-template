---
id: locale-detection
title: Wykrywanie Lokalizacji i Routing
sidebar_label: Wykrywanie Lokalizacji
sidebar_position: 3
---

# Wykrywanie Lokalizacji i Routing

Szablon używa `next-intl` do wykrywania regionu z automatycznym dopasowywaniem języka przeglądarki, routingiem opartym na URL, persystencją cookies i systemem fallback wiadomości.

## Przepływ Wykrywania

Gdy nadchodzi żądanie, region jest określany przez następującą sekwencję:

1. **Prefiks URL** — Jeśli URL zawiera prefiks regionu (np. `/fr/about`), ten region jest używany bezpośrednio
2. **Cookie** — Jeśli nie ma prefiksu URL, system sprawdza cookie regionu ustawione przez LanguageSwitcher
3. **Nagłówek Accept-Language** — Jeśli nie ma cookie, odczytywany jest nagłówek preferencji językowych przeglądarki
4. **Domyślny fallback** — Jeśli nie znaleziono dopasowania, używany jest domyślny region (`en`)

## Pliki Źródłowe

| Plik | Rola w wykrywaniu |
|------|-------------------|
| `i18n/routing.ts` | Definiuje obsługiwane regiony, strategię prefiksu |
| `i18n/request.ts` | Waliduje rozwiązany region, ładuje wiadomości |
| `i18n/navigation.ts` | Dostarcza Link, router, redirect zgodne z regionem |
| `lib/constants.ts` | Źródło prawdy dla tablicy LOCALES i RTL_LOCALES |
| `components/language-switcher.tsx` | Ustawia cookie regionu przez router.replace |
| `app/[locale]/layout.tsx` | Waliduje region, odrzuca nieprawidłowe przez notFound() |

## Konfiguracja Routingu

```typescript
import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/constants";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localeDetection: true,
  localePrefix: "as-needed",
});
```

### Strategia Prefiksu

| Żądanie | Rozwiązany Region | Wyświetlany URL |
|---------|-----------------|-----------|
| `/about` | `en` | `/about` (brak prefiksu dla domyślnego) |
| `/fr/about` | `fr` | `/fr/about` (prefiks dla niedomyślnego) |
| `/en/about` | `en` | Przekierowany do `/about` |

## Logika Fallback Wiadomości

- Angielskie wiadomości służą jako warstwa bazowa ze wszystkimi kluczami
- Wiadomości specyficzne dla regionu nadpisują tylko te klucze które definiują
- Brakujące klucze w pliku regionu zachowują angielską wartość
- Zagnieżdżone obiekty są rekurencyjnie scalane

## Persystencja Cookie

Gdy użytkownik wybiera region przez LanguageSwitcher, `next-intl` ustawia cookie przechowujące preferencję:

```typescript
const changeLanguage = useCallback(
  (locale: string) => {
    if (locale === currentLocale || isPending) return;

    startTransition(() => {
      router.replace(pathname, { locale });
    });
    setIsOpen(false);
  },
  [currentLocale, isPending, router, pathname]
);
```

## Wykrywanie Accept-Language

```
Accept-Language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7
```

System szuka dopasowania z obsługiwaną tablicą `LOCALES`. Pierwszy pasujący region wygrywa.

## Walidacja na Poziomie Layoutu

```typescript
export default async function RootLayout({ children, params }) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <>
      <NextIntlClientProvider messages={messages}>
        {/* Dostawcy aplikacji i dzieci */}
      </NextIntlClientProvider>
    </>
  );
}
```

## Rozwiązywanie Problemów z Regionem

| Objaw | Prawdopodobna Przyczyna | Rozwiązanie |
|---------|-------------|----------|
| Klucze tłumaczeń zamiast tekstu | Brakujący klucz w pliku regionu | Dodać klucz do `messages/en.json` (fallback) |
| Wyświetlany zły region | Cookie nadpisuje URL | Wyczyścić cookies lub użyć trybu prywatnego |
| 404 na URL-ach regionu | Region nie w tablicy LOCALES | Dodać kod do `lib/constants.ts` |
| Układ RTL nie zastosowany | Region nie w RTL_LOCALES | Dodać do `RTL_LOCALES` w `lib/constants.ts` |

## Najlepsze Praktyki

1. **Zawsze używać `Link` z `@/i18n/navigation`** zamiast `next/link`
2. **Dodawać wszystkie nowe klucze najpierw do `en.json`** gdyż pełni rolę fallbacku
3. **Testować wykrywanie** ustawiając preferencje językowe przeglądarki
4. **Polegać na fallbacku `deepmerge`** — częściowo przetłumaczone pliki są obsługiwane
