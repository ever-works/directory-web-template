---
id: performance
title: Optymalizacja wydajności
sidebar_label: Wydajność
sidebar_position: 5
---

# Optymalizacja wydajności

W tym przewodniku opisano optymalizacje wydajności wbudowane w szablon Ever Works oraz techniki utrzymywania szybkiego czasu ładowania w miarę rozwoju aplikacji.

## Konfiguracja Next.js `next.config.ts` szablonu zawiera kilka ustawień ukierunkowanych na wydajność:

### Samodzielne wyjście

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  // ...
};
```

Tryb wyjściowy `standalone` tworzy samodzielną kompilację zawierającą tylko pliki potrzebne do uruchomienia aplikacji. Zmniejsza to rozmiar pojemnika i czas uruchamiania produkcji.

### Optymalizacja importu pakietów

```typescript
experimental: {
  optimizePackageImports: ["@heroui/react", "lucide-react"],
},
```

To ustawienie umożliwia potrząsanie drzewem w przypadku pakietów zawierających duże ilości plików beczkowych. Zamiast importować całą bibliotekę `@heroui/react` lub `lucide-react` , w pakiecie znajdują się tylko faktycznie używane komponenty.

### Optymalizacja oglądania w pakiecie internetowym

```typescript
if (dev) {
  config.watchOptions = {
    ...config.watchOptions,
    ignored: ['**/node_modules/**', '**/.git/**', '**/.content/**']
  };
}
```

Katalog `.content/` (CMS oparty na Git z ponad 220 plikami przecen) jest wykluczony z modułu śledzenia plików pakietu internetowego w fazie rozwoju. Zapobiega to niepotrzebnym przebudowom w przypadku zmiany plików zawartości i znacznie zmniejsza użycie procesora podczas programowania.

### Pominięte ostrzeżenia

Pełne rejestrowanie infrastruktury jest pomijane w środowiskach CI i Vercel:

```typescript
if (process.env.CI || process.env.VERCEL) {
  config.infrastructureLogging = { level: 'error' };
}
```

## Optymalizacja obrazu

### Zdalne wzorce

Szablon dynamicznie generuje dozwolone wzorce obrazów zdalnych przy użyciu `generateImageRemotePatterns()` . Zapewnia to optymalizację obrazów ze skonfigurowanych sieci CDN i źródeł zewnętrznych za pomocą wbudowanego potoku obrazów Next.js.

### Obsługa plików SVG

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

Obrazy SVG są dozwolone, ale podlegają ścisłej polityce bezpieczeństwa treści, która uniemożliwia wykonywanie skryptów. Pozwala to na logo i ikony SVG, jednocześnie zapobiegając wstrzyknięciu XSS poprzez SVG.

### Najlepsze praktyki dotyczące obrazów

| Technika | Wdrożenie | Wpływ |
|---|---|---|
| Użyj `next/image` | Wbudowany komponent z leniwym ładowaniem | Automatyczny WebP/AVIF, responsywne rozmiary |
| Ustaw wyraźne wymiary | rekwizyty `width` i `height` | Zapobiega skumulowanemu przesunięciu układu (CLS) |
| Użyj `priority` dla LCP | `<Image priority />` dla obrazów bohaterów | Wstępnie ładuje największy, treściwy obraz Paint |
| Użyj `sizes` prop | `sizes="(max-width: 768px) 100vw, 50vw"` | Zapobiega pobieraniu zbyt dużych obrazów |
| Rozmycie symboli zastępczych | `placeholder="blur"` z `blurDataURL` | Poprawia postrzeganą prędkość ładowania |

## Strategie buforowania

### Nagłówki HTTP

Szablon ustawia nagłówki związane z pamięcią podręczną w `next.config.ts` :

```typescript
headers: [
  { key: "X-DNS-Prefetch-Control", value: "on" },
]
```

Pobieranie z wyprzedzeniem DNS jest włączone globalnie, aby zmniejszyć opóźnienia wyszukiwania DNS dla zasobów zewnętrznych.

### Generacja statyczna

Szablon wykorzystuje duży limit czasu na generowanie strony statycznej:

```typescript
staticPageGenerationTimeout: 180, // 3 minutes
```

Dotyczy to stron, które podczas kompilacji pobierają dane z zewnętrznych interfejsów API lub systemu CMS opartego na Git.

### Konfiguracja ETag

```typescript
generateEtags: false,
```

Tagi ETag są wyłączone na poziomie Next.js, ponieważ CDN/reverse proxy (Vercel Edge Network lub Cloudflare) skuteczniej obsługuje weryfikację pamięci podręcznej.

### Buforowanie na poziomie aplikacji

Procesor analityczny działający w tle wstępnie podgrzewa pamięć podręczną w regularnych odstępach czasu:

| Typ pamięci podręcznej | Interwał odświeżania | Dane |
|---|---|---|
| Trendy wzrostu liczby użytkowników | 10 minut | Miesięczny wzrost liczby użytkowników przez 6, 12, 24 miesiące |
| Trendy aktywności | 5 minut | Dane aktywności dla okien 7, 14, 30 dni |
| Ranking najlepszych pozycji | 15 minut | Top 10, 20, 50 pozycji |
| Ostatnia aktywność | 2 minuty | Ostatnie 10 i 20 wpisów dotyczących aktywności |
| Wskaźniki wydajności | 30 sekund | Statystyki wydajności zapytań |
| Czyszczenie pamięci podręcznej | 1 godzina | Wygasłe usunięcie wpisu z pamięci podręcznej |

## Leniwe ładowanie

### Leniwe ładowanie na poziomie komponentu

Użyj `next/dynamic` dla ciężkich komponentów, które nie są potrzebne podczas wstępnego renderowania:

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // disable SSR for client-only components
});
```

### Podział kodu na poziomie trasy

Next.js App Router automatycznie dzieli kod według tras. Każda strona w `app/[locale]/` ma swój własny pakiet, więc użytkownicy pobierają tylko JavaScript potrzebny dla bieżącej strony.

### Dynamiczny import w zadaniach w tle

Szablon korzysta z importu dynamicznego w wywołaniach zwrotnych zadań, aby zapobiec pobieraniu przez pakiet internetowy modułów tylko z serwera do pakietu klienta:

```typescript
manager.scheduleJob('repository-sync', 'Repository Synchronization', async () => {
  const { syncManager } = await import('@/lib/services/sync-service');
  await syncManager.performSync();
}, 5 * 60 * 1000);
```

## Optymalizacja rozmiaru pakietu

### Analizowanie pakietu

Uruchom następujące polecenie, aby sprawdzić skład pakietu:

```bash
ANALYZE=true pnpm build
```

Jeśli skonfigurowano `@next/bundle-analyzer` , powstaje interaktywna mapa drzewa pokazująca, które moduły przyczyniają się do rozmiaru pakietu.

### Typowe techniki optymalizacji

| Technika | Przykład | Oszczędności |
|---|---|---|
| Optymalizacja pliku beczki | `optimizePackageImports` w konfiguracji | Zapobiega importowaniu całych bibliotek ikon/UI |
| Moduły tylko serwerowe | `import 'server-only'` w plikach lib | Zapobiega przypadkowemu wiązaniu klientów |
| Import dynamiczny | `await import('@/lib/services/...')` | Odracza ładowanie do czasu, aż będzie potrzebne |
| Pakiety zewnętrzne | `serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']` | Wyklucza z pakietu internetowego |

Szczególnie ważna jest konfiguracja `serverExternalPackages` :

```typescript
serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
```

Pakiety te są wyłączone z pakietu webpack i ładowane natywnie w czasie wykonywania, co skraca czas kompilacji i pozwala uniknąć problemów ze zgodnością z modułami natywnymi.

## Wskazówki dotyczące optymalizacji latarni morskiej

### Podstawowe cele dotyczące wskaźników internetowych

| Metryczne | Cel | Kluczowe czynniki |
|---|---|---|
| **LCP** (największa farba zawierająca treści) | < 2,5 s | Optymalizacja obrazu, priorytet ładowania, czas odpowiedzi serwera |
| **FID** (Opóźnienie pierwszego wejścia) | < 100 ms | Podział kodu, minimalne blokowanie głównego wątku |
| **CLS** (skumulowane przesunięcie układu) | < 0,1 | Jawne wymiary obrazu, strategia ładowania czcionek |
| **TTFB** (Czas do pierwszego bajtu) | < 800 ms | Buforowanie CDN, funkcje brzegowe, optymalizacja zapytań do baz danych |

### Praktyczna lista kontrolna

1. **Obrazy**: Użyj `next/image` z wyraźnymi rekwizytami `width` , `height` i `sizes` . Oznacz obrazy znajdujące się nad zakładką za pomocą `priority` .
2. **Czcionki**: Użyj `next/font` , aby samodzielnie hostować czcionki z `display: swap` i wstępnie załadować krytyczne pliki czcionek.
3. **JavaScript**: Przejrzyj `optimizePackageImports` i dodaj duże biblioteki korzystające z plików baryłkowych.
4. **CSS**: Szablon wykorzystuje CSS Tailwind, który został już usunięty w kompilacjach produkcyjnych. Unikaj importowania nieużywanych modułów CSS.
5. **Skrypty innych firm**: Odłóż niekrytyczne skrypty za pomocą `next/script` z `strategy="lazyOnload"` .
6. **Składniki serwera**: domyślnie React Server Components (RSC) i używaj tylko `"use client"` , gdy wymagana jest interaktywność.

### Działająca latarnia morska

Szablon zawiera konfigurację `lighthouse-test.json` . Uruchom automatyczne testy Lighthouse:

```bash
npx lhci autorun --config=lighthouse-test.json
```

Możesz też użyć panelu Lighthouse Chrome DevTools do ręcznych audytów.

## Wydajność zapytań do bazy danych

### Pula połączeń

Użyj puli połączeń, aby uniknąć otwierania nowego połączenia z bazą danych na żądanie. Szczegóły konfiguracji znajdziesz w [Przewodniku po skalowaniu](/deployment/scaling).

### Optymalizacja zapytań

- Użyj wzorca repozytorium ( `lib/repositories/` ), aby scentralizować i zoptymalizować zapytania.
- Repozytorium analityczne zawiera wbudowane warstwy pamięci podręcznej z konfigurowalnym TTL.
- Monitoruj powolne zapytania za pośrednictwem zadania w tle dotyczącego metryk wydajności.

### Strategia indeksowania

Przejrzyj `lib/db/schema.ts` pod kątem istniejących indeksów. Dodaj indeksy dla:
- Kolumny używane w klauzulach `WHERE` - Kolumny klucza obcego
- Kolumny używane w klauzulach `ORDER BY` - Indeksy złożone do wyszukiwań wielokolumnowych

## Monitorowanie wydajności

### Integracja Wartownika

Szablon integruje Sentry do monitorowania wydajności w `instrumentation.ts` :

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Próbki śladów są pobierane w 10% w fazie produkcji i 100% w fazie rozwoju. Dostosuj `tracesSampleRate` w oparciu o natężenie ruchu i limity planu Sentry.

### Niestandardowe znaczniki wydajności

Użyj interfejsu Web Performance API do niestandardowego chronometrażu:

```typescript
performance.mark('data-fetch-start');
const data = await fetchData();
performance.mark('data-fetch-end');
performance.measure('data-fetch', 'data-fetch-start', 'data-fetch-end');
```

## Podsumowanie

| Powierzchnia | Wbudowana optymalizacja | Dodatkowe kroki |
|---|---|---|
| Obrazy | Automatyczna piaskownica WebP/AVIF, SVG | Dodaj `priority` do obrazów LCP, użyj `sizes` |
| JavaScript | Optymalizacja pakietów, dzielenie kodu | Dodaj biblioteki do `optimizePackageImports` |
| Buforowanie | Ogrzewanie pamięci podręcznej w tle, wstępne pobieranie DNS | Skonfiguruj reguły pamięci podręcznej CDN |
| Baza danych | Pule połączeń, wzór repozytorium | Dodaj indeksy, monitoruj wolne zapytania |
| Zbuduj | Samodzielne wyjście, pakiety zewnętrzne | Włącz analizator pakietów |
| Monitorowanie | Ślady wartownicze, zadanie pomiaru wydajności | Skonfiguruj alerty dotyczące pogorszonych metryk |
