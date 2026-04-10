---
id: locale-detection
title: Rilevamento Locale e Routing
sidebar_label: Rilevamento Locale
sidebar_position: 3
---

# Rilevamento Locale e Routing

Il template utilizza `next-intl` per il rilevamento della localizzazione con corrispondenza automatica della lingua del browser, routing basato su URL, persistenza dei cookie e sistema di fallback dei messaggi.

## Flusso di Rilevamento

Quando arriva una richiesta, la localizzazione viene determinata attraverso questa sequenza:

1. **Prefisso URL** -- Se l'URL contiene un prefisso di localizzazione (es. `/fr/about`), quella localizzazione viene usata direttamente
2. **Cookie** -- Se non c'è prefisso URL, il sistema verifica un cookie di localizzazione impostato dal LanguageSwitcher
3. **Intestazione Accept-Language** -- Se non esiste un cookie, viene letta l'intestazione delle preferenze linguistiche del browser
4. **Fallback predefinito** -- Se non viene trovata una corrispondenza, viene usata la localizzazione predefinita (`en`)

## File Sorgente

| File | Ruolo nel rilevamento |
|------|-------------------|
| `i18n/routing.ts` | Definisce le localizzazioni supportate, la strategia del prefisso |
| `i18n/request.ts` | Valida la localizzazione risolta, carica i messaggi |
| `i18n/navigation.ts` | Fornisce Link, router, redirect compatibili con la localizzazione |
| `lib/constants.ts` | Fonte di verità per l'array LOCALES e RTL_LOCALES |
| `components/language-switcher.tsx` | Imposta il cookie di localizzazione via router.replace |
| `app/[locale]/layout.tsx` | Valida la localizzazione, rifiuta quelle non valide con notFound() |

## Configurazione del Routing

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

### Strategia del Prefisso

| Richiesta | Localizzazione risolta | URL mostrato |
|---------|-----------------|-----------|
| `/about` | `en` | `/about` (nessun prefisso per predefinita) |
| `/fr/about` | `fr` | `/fr/about` (prefisso per non predefinita) |
| `/en/about` | `en` | Reindirizzato a `/about` |

## Logica di Fallback dei Messaggi

- I messaggi inglesi servono come livello base con tutte le chiavi presenti
- I messaggi specifici della localizzazione sovrascrivono solo le chiavi che definiscono
- Qualsiasi chiave mancante nel file di localizzazione mantiene il suo valore inglese
- Gli oggetti annidati vengono uniti ricorsivamente

## Persistenza Cookie

Quando un utente seleziona una localizzazione tramite il LanguageSwitcher, `next-intl` imposta un cookie che memorizza la preferenza:

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

## Rilevamento Accept-Language

```
Accept-Language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7
```

Il sistema trova corrispondenza con l'array `LOCALES` supportato. La prima localizzazione corrispondente vince.

## Validazione a Livello di Layout

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
        {/* Provider dell'applicazione e figli */}
      </NextIntlClientProvider>
    </>
  );
}
```

## Risoluzione dei Problemi di Localizzazione

| Sintomo | Causa probabile | Soluzione |
|---------|-------------|----------|
| Chiavi di traduzione mostrate invece del testo | Chiave mancante nel file di localizzazione | Aggiungere la chiave a `messages/en.json` (fallback) |
| Localizzazione sbagliata visualizzata | Cookie sovrascrive l'URL | Cancellare i cookie del browser o usare la modalità incognito |
| 404 sugli URL di localizzazione | Localizzazione non nell'array LOCALES | Aggiungere il codice a `lib/constants.ts` |
| Layout RTL non applicato | Localizzazione non in RTL_LOCALES | Aggiungere a `RTL_LOCALES` in `lib/constants.ts` |

## Best Practice

1. **Usare sempre `Link` da `@/i18n/navigation`** invece di `next/link`
2. **Aggiungere tutte le nuove chiavi prima a `en.json`** poiché funge da fallback per ogni localizzazione
3. **Testare il rilevamento** impostando le preferenze linguistiche del browser
4. **Affidarsi al fallback `deepmerge`** — i file parzialmente tradotti sono previsti e gestiti
