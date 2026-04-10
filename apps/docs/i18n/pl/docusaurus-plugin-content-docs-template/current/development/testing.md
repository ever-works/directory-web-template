---
id: testing
title: Przewodnik Testów Responsywnych
sidebar_label: Testy
sidebar_position: 4
---

# Przewodnik Testów Responsywnych

Ten przewodnik obejmuje najlepsze praktyki testowania responsywnego projektu na różnych urządzeniach i rozmiarach ekranu.

## Urządzenia Testowe

### Mobile (320px - 768px)

| Urządzenie           | Rozdzielczość | Uwagi                          |
|----------------------|---------------|--------------------------------|
| iPhone SE            | 375x667       | Najmniejszy nowoczesny iPhone  |
| iPhone 12/13/14      | 390x844       | Standardowy rozmiar iPhone     |
| Samsung Galaxy S20   | 360x800       | Popularny telefon Android      |
| iPad Mini Pionowo    | 768x1024      | Mały tablet                    |

### Tablet (768px - 1024px)

| Urządzenie           | Rozdzielczość | Uwagi                     |
|----------------------|---------------|---------------------------|
| iPad Air             | 820x1180      | Standardowy iPad          |
| iPad Pro 11"         | 834x1194      | Tablet profesjonalny      |
| Surface Pro 7        | 912x1368      | Tablet Windows            |

### Desktop (1024px+)

| Urządzenie           | Rozdzielczość | Uwagi                          |
|----------------------|---------------|--------------------------------|
| Laptop               | 1366x768      | Typowa rozdzielczość laptopa   |
| Desktop HD           | 1920x1080     | Standardowy desktop            |
| Monitor 4K           | 3840x2160     | Wyświetlacz wysokiej rozdziel. |

## Lista Kontrolna Testów

### 1. Nawigacja

- [ ] **Mobile**: Menu hamburger widoczne i funkcjonalne
- [ ] **Desktop**: Poziomy pasek nawigacji wyświetlany poprawnie
- [ ] **Wszystkie urządzenia**: Wszystkie linki nawigacyjne są dostępne
- [ ] **Cele dotykowe**: Minimum 44x44px na mobile
- [ ] **Nawigacja klawiaturą**: Kolejność tabulacji jest logiczna

### 2. Treść

- [ ] **Czytelność tekstu**: Bez potrzeby powiększania do czytania
- [ ] **Obrazy**: Responsywne i właściwie dobrane dla każdego breakpointa
- [ ] **Brak poziomego przewijania**: Treść mieści się w obszarze widoku
- [ ] **Długość linii**: Optymalna szerokość czytania (45-75 znaków)
- [ ] **Rozmiary czcionek**: Odpowiednie dla każdego rozmiaru urządzenia

### 3. Interakcje

- [ ] **Cele dotykowe**: Minimum 44x44px dla mobile
- [ ] **Odstępy**: Wystarczająca przestrzeń między klikalnymi elementami
- [ ] **Stany hover**: Tylko na urządzeniach z możliwością hover
- [ ] **Stany focus**: Widoczne wskaźniki focus klawiatury
- [ ] **Formularze**: Łatwe do wypełnienia na urządzeniach mobilnych

### 4. Wydajność

- [ ] **Czas ładowania**: < 3 sekundy na połączeniu 3G
- [ ] **Obrazy**: Zoptymalizowane dla każdego rozmiaru ekranu
- [ ] **Animacje**: Płynna wydajność 60 FPS
- [ ] **Core Web Vitals**: Spełniają progi Google
- [ ] **Rozmiar bundle**: Zoptymalizowany JavaScript i CSS

### 5. Układ

- [ ] **System siatki**: Poprawnie dostosowuje się przy breakpointach
- [ ] **Flexbox/Grid**: Bez przerw układu
- [ ] **Odstępy**: Spójne wypełnienie i marginesy
- [ ] **Wyrównanie**: Właściwe wyrównanie przy wszystkich rozmiarach
- [ ] **Overflow**: Brak problemów z przepełnieniem treści

## Narzędzia Testowe

### DevTools Przeglądarki

#### Chrome DevTools
1. Otwórz DevTools (F12 lub Cmd+Option+I)
2. Kliknij ikonę paska narzędzi urządzeń (Cmd+Shift+M)
3. Wybierz urządzenie lub wprowadź niestandardowe wymiary
4. Testuj różne prędkości sieci

#### Firefox Developer Tools
1. Otwórz DevTools (F12)
2. Kliknij Tryb Responsywnego Projektu (Cmd+Option+M)
3. Wybierz predefiniowane urządzenia
4. Testuj zdarzenia dotykowe

### Usługi Testowania Online

- **[BrowserStack](https://www.browserstack.com/)** - Testowanie na prawdziwych urządzeniach
- **[LambdaTest](https://www.lambdatest.com/)** - Testowanie między przeglądarkami
- **[Sauce Labs](https://saucelabs.com/)** - Platforma testów automatycznych

### Testowanie Wydajności

- **[Lighthouse](https://developers.google.com/web/tools/lighthouse)** - Audyt wydajności
- **[WebPageTest](https://www.webpagetest.org/)** - Szczegółowa analiza wydajności
- **[PageSpeed Insights](https://pagespeed.web.dev/)** - Narzędzie wydajności Google

## Docelowe Metryki

### Wyniki Lighthouse

| Metryka         | Cel   | Krytyczny |
|-----------------|-------|-----------|
| Wydajność       | > 90  | > 50      |
| Dostępność      | > 95  | > 80      |
| Najlepsze Praktyki | > 95 | > 80   |
| SEO             | > 95  | > 80      |

### Core Web Vitals

| Metryka | Dobry | Wymaga Poprawy | Zły |
|---------|-------|----------------|-----|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5s - 4.0s | > 4.0s |
| **FID** (First Input Delay) | < 100ms | 100ms - 300ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1 - 0.25 | > 0.25 |

### Metryki Specyficzne dla Mobile

- **First Contentful Paint**: < 1.8s
- **Time to Interactive**: < 3.8s
- **Rozmiar Celu Dotykowego**: >= 48x48px
- **Opóźnienie Dotyku**: < 300ms

## Przepływ Pracy Testowania

### 1. Testowanie Lokalne

```bash
# Uruchom serwer deweloperski
npm run dev

# Otwórz w przeglądarce
http://localhost:3000
```

### 2. Testowanie na Urządzeniach

1. **Używaj trybu responsywnego DevTools**
2. **Testuj na fizycznych urządzeniach** gdy to możliwe
3. **Używaj zdalnego debugowania** dla urządzeń mobilnych
4. **Testuj różne orientacje** (pionową/poziomą)

### 3. Testowanie Automatyczne

```bash
# Uruchom audyt Lighthouse
npm run lighthouse

# Uruchom testy dostępności
npm run test:a11y

# Uruchom testy regresji wizualnej
npm run test:visual
```

## Typowe Problemy i Rozwiązania

### Problem: Poziome Przewijanie na Mobile

**Rozwiązanie**: Sprawdź elementy o stałej szerokości

```css
/* ❌ Źle */
.container {
  width: 1200px;
}

/* ✅ Dobrze */
.container {
  max-width: 1200px;
  width: 100%;
  padding: 0 1rem;
}
```

### Problem: Zbyt Mały Tekst na Mobile

**Rozwiązanie**: Używaj responsywnych rozmiarów czcionek

```css
/* ❌ Źle */
body {
  font-size: 12px;
}

/* ✅ Dobrze */
body {
  font-size: 16px; /* Bazowy rozmiar dla mobile */
}

@media (min-width: 768px) {
  body {
    font-size: 18px;
  }
}
```

### Problem: Zbyt Małe Cele Dotykowe

**Rozwiązanie**: Zapewnij minimalny rozmiar 44x44px

```css
/* ✅ Dobrze */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
}
```

### Problem: Nieresponsywne Obrazy

**Rozwiązanie**: Używaj technik responsywnych obrazów

```jsx
// ✅ Dobrze - komponent Image Next.js
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority
/>
```

## Najlepsze Praktyki

### 1. Podejście Mobile-First
- Projektuj najpierw dla mobile, potem rozszerzaj dla większych ekranów
- Używaj zapytań medialnych `min-width` zamiast `max-width`

### 2. Progresywne Wzmocnienie
- Zapewnij działanie podstawowej funkcjonalności bez JavaScript
- Dodawaj ulepszenia dla zdolnych przeglądarek

### 3. Projekt Przyjazny Dotykowemu
- Minimalne cele dotykowe 44x44px
- Odpowiednie odstępy między elementami interaktywnymi
- Unikaj interakcji tylko przez hover

### 4. Optymalizacja Wydajności
- Leniwe ładowanie obrazów i komponentów
- Minimalizuj rozmiar bundle JavaScript
- Używaj podziału kodu
- Optymalizuj czcionki i zasoby

### 5. Dostępność
- Testuj z czytnikami ekranu
- Upewnij się, że nawigacja klawiaturą działa
- Utrzymuj wystarczający kontrast kolorów
- Zapewnij alternatywy tekstowe dla obrazów

## Następne Kroki

- [Konfiguracja Lokalna](./local-setup) - Skonfiguruj środowisko deweloperskie
- [Dokumentacja API](./api-documentation) - Dowiedz się o dokumentacji API
- [Wdrożenie](/docs/deployment) - Wdróż swoją aplikację

## Zasoby

- [Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)
- [Mobile-First CSS](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Responsive/Mobile_first)
- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Web.dev Performance](https://web.dev/performance/)
