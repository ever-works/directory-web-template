---
id: locale-detection
title: Spracherkennung und Routing
sidebar_label: Spracherkennung
sidebar_position: 3
---

# Spracherkennung und Routing

Das Template verwendet `next-intl` für die Spracherkennung mit automatischem Browser-Sprachmatching, URL-basiertem Sprachregions-Routing, Cookie-Persistenz und einem Nachrichten-Fallback-System. Diese Seite behandelt den vollständigen Spracherkennungsablauf von der eingehenden Anfrage bis zur gerenderten Seite.

## Erkennungsablauf

Wenn eine Anfrage eintrifft, wird die Sprachregion durch folgende Reihenfolge bestimmt:

1. **URL-Präfix** -- Wenn die URL ein Sprachregionspräfix enthält (z.B. `/fr/about`), wird diese Sprachregion direkt verwendet
2. **Cookie** -- Wenn kein URL-Präfix vorhanden ist, prüft das System einen vom LanguageSwitcher gesetzten Sprachregions-Cookie
3. **Accept-Language-Header** -- Wenn kein Cookie vorhanden ist, wird der Sprachpräferenz-Header des Browsers gelesen
4. **Standard-Fallback** -- Wenn keine Übereinstimmung gefunden wird, wird die Standard-Sprachregion (`en`) verwendet

Diese Reihenfolge wird durch die Einstellung `localeDetection: true` in der Routing-Konfiguration gesteuert.

## Quelldateien

| Datei | Rolle bei der Erkennung |
|------|-------------------|
| `i18n/routing.ts` | Definiert unterstützte Sprachregionen, Präfix-Strategie, Erkennungs-Schalter |
| `i18n/request.ts` | Validiert aufgelöste Sprachregion, lädt und kombiniert Nachrichten |
| `i18n/navigation.ts` | Bietet sprachregions-bewusste Link-, Router-, Redirect-Exporte |
| `lib/constants.ts` | Quelle der Wahrheit für LOCALES-Array und RTL_LOCALES |
| `components/language-switcher.tsx` | Setzt Sprachregions-Cookie über router.replace |
| `app/[locale]/layout.tsx` | Validiert Sprachregion, lehnt ungültige mit notFound() ab |

## Routing-Konfiguration

Das Routing-Modul in `i18n/routing.ts` steuert das Spracherkennungsverhalten:

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

### Konfigurationsoptionen

| Option | Wert | Auswirkung |
|--------|-------|--------|
| `locales` | 21 Sprachregionscodes | Definiert, welche Sprachregionen erkannt werden |
| `defaultLocale` | `'en'` | Fallback, wenn keine Sprachregion erkannt wird |
| `localeDetection` | `true` | Aktiviert Cookie- und Accept-Language-Erkennung |
| `localePrefix` | `"as-needed"` | Standard-Sprachregion hat kein URL-Präfix |

### Sprachregions-Präfix-Strategie

Die `"as-needed"`-Präfix-Strategie bestimmt, wie Sprachregionen in URLs erscheinen:

| Anfrage | Aufgelöste Sprache | Angezeigte URL |
|---------|-----------------|-----------|
| `/about` | `en` | `/about` (kein Präfix für Standard) |
| `/fr/about` | `fr` | `/fr/about` (Präfix für Nicht-Standard) |
| `/en/about` | `en` | Weiterleitung zu `/about` (Standard-Präfix entfernen) |

Dies hält URLs für die Standard-Sprachregion sauber und bietet gleichzeitig explizite Sprachregionspräfixe für alle anderen.

## Anfragespezifische Sprachregionsauflösung

Das Modul `i18n/request.ts` läuft bei jeder Serveranfrage. Es validiert die aufgelöste Sprachregion und lädt die korrekten Übersetzungsnachrichten:

```typescript
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Gegen unterstützte Sprachregionsliste validieren
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  // Sprachregionsnachrichten und englischen Fallback laden
  const userMessages = (await import(`../messages/${locale}.json`)).default;
  const defaultMessages = (await import(`../messages/en.json`)).default;
  const messages = deepmerge(defaultMessages, userMessages);

  return { locale, messages };
});
```

### Validierungsschritte

1. `requestLocale` löst die durch die Routing-Schicht bestimmte Sprachregion auf (URL-Präfix, Cookie oder Header)
2. Wenn die aufgelöste Sprachregion `null`, `undefined` oder nicht im `LOCALES`-Array ist, wird die Standard-Sprachregion (`en`) verwendet
3. Die sprachregionsspezifische Nachrichtendatei wird dynamisch importiert
4. Die englische Nachrichtendatei wird immer als Fallback-Basis importiert
5. `deepmerge` kombiniert sie, sodass fehlende Schlüssel in der Sprachregionsdatei auf Englisch zurückfallen

## Nachrichten-Fallback-Logik

Die `deepmerge`-Strategie ist der Schlüsselmechanismus, der verhindert, dass nicht übersetzte Schlüssel als rohe Schlüsselnamen erscheinen:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

**Funktionsweise**:

- Englische Nachrichten dienen als Basisschicht mit allen vorhandenen Schlüsseln
- Sprachregionsspezifische Nachrichten überschreiben nur die Schlüssel, die sie definieren
- Jeder in der Sprachregionsdatei fehlende Schlüssel behält seinen englischen Wert
- Verschachtelte Objekte werden rekursiv zusammengeführt

**Beispiel**: Wenn `fr.json` `auth.SIGN_IN` übersetzt, aber nicht `auth.FORGOT_PASSWORD`, enthält das zusammengeführte Ergebnis den französischen Wert für `SIGN_IN` und den englischen Wert für `FORGOT_PASSWORD`.

## Cookie-Persistenz

Wenn ein Benutzer über den LanguageSwitcher eine Sprachregion auswählt, setzt `next-intl` einen Cookie, der die Präferenz speichert. Bei nachfolgenden Besuchen ohne Sprachregionspräfix in der URL hat dieser Cookie Vorrang vor dem Accept-Language-Header.

Der LanguageSwitcher löst Sprachregionsänderungen über den sprachregions-bewussten Router aus:

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

## Accept-Language-Erkennung

Wenn kein URL-Präfix und kein Cookie vorhanden sind, liest `next-intl` den `Accept-Language`-Header des Browsers. Der Header enthält typischerweise eine Prioritätsliste wie:

```
Accept-Language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7
```

Das System gleicht dies mit dem unterstützten `LOCALES`-Array ab. Die erste passende Sprachregion gewinnt. Wenn keine unterstützte Sprachregion mit einem Eintrag im Header übereinstimmt, wird die Standard-Sprachregion (`en`) verwendet.

## Layout-Level-Sprachregionsvalidierung

Das Root-Layout in `app/[locale]/layout.tsx` führt eine abschließende Validierungsprüfung durch:

```typescript
export default async function RootLayout({ children, params }) {
  const { locale } = await params;

  // Nicht in der unterstützten Liste enthaltene Sprachregionen ablehnen
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Sprachregion für serverseitige i18n-Hilfsmittel setzen
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <>
      <NextIntlClientProvider messages={messages}>
        {/* Anwendungsanbieter und Kinder */}
      </NextIntlClientProvider>
    </>
  );
}
```

Wenn jemand manuell zu `/zz/about` navigiert (wo `zz` keine unterstützte Sprachregion ist), löst das Layout eine 404-Seite aus.

## RTL-Unterstützung

Zwei Sprachregionen (Arabisch und Hebräisch) verwenden Rechts-nach-Links-Textrichtung. Die Konstante `RTL_LOCALES` definiert sie:

```typescript
export const RTL_LOCALES: readonly Locale[] = ['ar', 'he'] as const;
```

Das Root-Layout setzt das `dir`-Attribut am HTML-Element basierend auf der aktiven Sprachregion. Komponenten können die aktuelle Richtung prüfen, um Layouts entsprechend anzupassen.

## SEO: Hreflang-Generierung

Das Modul `lib/seo/hreflang.ts` generiert lokalisierte URL-Alternativen für Suchmaschinen-Crawler:

```typescript
export function getLocalizedUrl(path: string, locale: Locale): string {
  const baseUrl = getBaseUrl().replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (locale === DEFAULT_LOCALE) {
    return `${baseUrl}${cleanPath}`;
  }
  return `${baseUrl}/${locale}${cleanPath}`;
}
```

## Navigations-Hilfsmittel

Das Modul `i18n/navigation.ts` exportiert sprachregions-bewusste Ersetzungen für Standard-Next.js-Navigation:

```typescript
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

| Export | Ersetzt | Verhalten |
|--------|----------|----------|
| `Link` | `next/link` | Fügt automatisch Sprachregionspräfix zu `href` hinzu |
| `redirect` | `next/navigation` redirect | Leitet innerhalb der aktuellen Sprachregion weiter |
| `usePathname` | `next/navigation` usePathname | Gibt Pfad ohne Sprachregionspräfix zurück |
| `useRouter` | `next/navigation` useRouter | push/replace bewahren die aktuelle Sprachregion |
| `getPathname` | N/A | Serverseitige Pfadauflösung mit Sprachregion |

Importieren Sie diese immer aus `@/i18n/navigation` anstelle von `next/link` oder `next/navigation`.

## Fehlersuche bei Sprachregionsproblemen

| Symptom | Wahrscheinliche Ursache | Lösung |
|---------|-------------|----------|
| Übersetzungsschlüssel statt Text angezeigt | Fehlender Schlüssel in der Sprachregionsdatei | Schlüssel zu `messages/en.json` hinzufügen (Fallback) |
| Falsche Sprachregion gerendert | Cookie überschreibt URL | Browser-Cookies löschen oder Inkognito-Modus verwenden |
| 404 bei Sprachregions-URLs | Sprachregion nicht im LOCALES-Array | Sprachregionscode zu `lib/constants.ts` hinzufügen |
| RTL-Layout nicht angewendet | Sprachregion nicht in RTL_LOCALES | Zu `RTL_LOCALES` in `lib/constants.ts` hinzufügen |
| Hreflang-Tags fehlen | Kein `generateMetadata`-Aufruf | `alternates.languages` mit `generateHreflangAlternates` hinzufügen |

## Best Practices

1. **Immer `Link` aus `@/i18n/navigation` verwenden** anstelle von `next/link`
2. **Alle neuen Übersetzungsschlüssel zuerst zu `en.json` hinzufügen**, da es als Fallback für jede Sprachregion dient
3. **Spracherkennung testen**, indem Browser-Sprachpräferenzen gesetzt oder der LanguageSwitcher verwendet wird
4. **Auf `deepmerge`-Fallback vertrauen** – teilweise übersetzte Sprachregionsdateien werden erwartet und verarbeitet
5. **Die `localePrefix: "as-needed"`-Strategie beibehalten** für saubere Standard-Sprachregions-URLs
6. **Hreflang-Alternativen in `generateMetadata`** für jede öffentliche Seite einschließen
