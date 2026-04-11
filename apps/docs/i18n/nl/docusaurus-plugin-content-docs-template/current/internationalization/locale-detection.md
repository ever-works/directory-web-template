---
id: locale-detection
title: Taaldetectie en Routing
sidebar_label: Taaldetectie
sidebar_position: 3
---

# Taaldetectie en Routing

De template gebruikt `next-intl` voor taaldetectie met automatische browsertaalmatching, URL-gebaseerde taalregio-routing, cookie-persistentie en een berichtenuitwijksysteem. Deze pagina behandelt de volledige taaldetectiestroom van een inkomend verzoek tot de gerenderde pagina.

## Detectiestroom

Wanneer een verzoek binnenkomt, wordt de taalregio bepaald via deze volgorde:

1. **URL-voorvoegsel** -- Als de URL een taalregio-voorvoegsel bevat (bijv. `/fr/about`), wordt die taalregio direct gebruikt
2. **Cookie** -- Als er geen URL-voorvoegsel aanwezig is, controleert het systeem een taalregio-cookie ingesteld door de LanguageSwitcher
3. **Accept-Language-header** -- Als er geen cookie bestaat, wordt de taalvoorkeurheader van de browser gelezen
4. **Standaard uitwijking** -- Als er geen overeenkomst wordt gevonden, wordt de standaard taalregio (`en`) gebruikt

## Bronbestanden

| Bestand | Rol bij detectie |
|------|-------------------|
| `i18n/routing.ts` | Definieert ondersteunde taalregio's, voorvoegsels, detectieschakelaar |
| `i18n/request.ts` | Valideert opgelos taalregio, laadt en voegt berichten samen |
| `i18n/navigation.ts` | Biedt taalregio-bewuste Link, router, redirect |
| `lib/constants.ts` | Bron van waarheid voor LOCALES-array en RTL_LOCALES |
| `components/language-switcher.tsx` | Stelt taalregio-cookie in via router.replace |
| `app/[locale]/layout.tsx` | Valideert taalregio, weigert ongeldige met notFound() |

## Routingconfiguratie

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

### Configuratie-opties

| Optie | Waarde | Effect |
|--------|-------|--------|
| `locales` | 21 taalregio-codes | Definieert welke taalregio's worden herkend |
| `defaultLocale` | `'en'` | Uitwijking wanneer geen taalregio wordt gedetecteerd |
| `localeDetection` | `true` | Activeert cookie- en Accept-Language-detectie |
| `localePrefix` | `"as-needed"` | Standaard taalregio heeft geen URL-voorvoegsel |

### Taalregio-voorvoegsels strategie

| Verzoek | Opgeloste taalregio | Getoonde URL |
|---------|-----------------|-----------|
| `/about` | `en` | `/about` (geen voorvoegsel voor standaard) |
| `/fr/about` | `fr` | `/fr/about` (voorvoegsel voor niet-standaard) |
| `/en/about` | `en` | Doorsturen naar `/about` (standaard voorvoegsel verwijderen) |

## Verzoek-niveau taalregio-oplossing

```typescript
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  const userMessages = (await import(`../messages/${locale}.json`)).default;
  const defaultMessages = (await import(`../messages/en.json`)).default;
  const messages = deepmerge(defaultMessages, userMessages);

  return { locale, messages };
});
```

## Berichten Uitwijklogica

De `deepmerge`-strategie is het sleutelmechanisme dat voorkomt dat niet-vertaalde sleutels als ruwe sleutelnamen verschijnen:

- Engelse berichten dienen als basislaag met alle aanwezige sleutels
- Taalregio-specifieke berichten overschrijven alleen de sleutels die ze definiëren
- Elke sleutel die ontbreekt in het taalregio-bestand behoudt zijn Engelse waarde
- Geneste objecten worden recursief samengevoegd

## Cookie-persistentie

Wanneer een gebruiker een taalregio selecteert via de LanguageSwitcher, stelt `next-intl` een cookie in die de voorkeur opslaat. Bij volgende bezoeken zonder taalregio-voorvoegsel in de URL heeft dit cookie prioriteit boven de Accept-Language-header.

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

## Accept-Language-detectie

Wanneer er geen URL-voorvoegsel en geen cookie aanwezig zijn, leest `next-intl` de `Accept-Language`-header van de browser:

```
Accept-Language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7
```

## Layout-niveau taalregio-validatie

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
        {/* Applicatieaanbieders en kinderen */}
      </NextIntlClientProvider>
    </>
  );
}
```

## Foutoplossing taalregio

| Symptoom | Waarschijnlijke oorzaak | Oplossing |
|---------|-------------|----------|
| Vertaalsleutels getoond in plaats van tekst | Ontbrekende sleutel in taalregio-bestand | Sleutel toevoegen aan `messages/en.json` (uitwijking) |
| Verkeerde taalregio gerenderd | Cookie overschrijft URL | Browsercookies wissen of incognito gebruiken |
| 404 bij taalregio-URL's | Taalregio niet in LOCALES-array | Taalregio-code toevoegen aan `lib/constants.ts` |
| RTL-layout niet toegepast | Taalregio niet in RTL_LOCALES | Toevoegen aan `RTL_LOCALES` in `lib/constants.ts` |

## Best Practices

1. **Gebruik altijd `Link` uit `@/i18n/navigation`** in plaats van `next/link`
2. **Voeg alle nieuwe vertaalsleutels eerst toe aan `en.json`** omdat het als uitwijking dient voor elke taalregio
3. **Test taaldetectie** door browsertaalvoorkeuren in te stellen of de LanguageSwitcher te gebruiken
4. **Vertrouw op de `deepmerge`-uitwijking** — gedeeltelijk vertaalde taalregio-bestanden worden verwacht en verwerkt
