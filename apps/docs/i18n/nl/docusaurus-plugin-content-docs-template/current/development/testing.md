---
id: testing
title: Responsieve Testgids
sidebar_label: Testen
sidebar_position: 4
---

# Responsieve Testgids

Deze gids behandelt best practices voor het testen van responsief ontwerp op verschillende apparaten en schermformaten.

## Testapparaten

### Mobiel (320px – 768px)

| Apparaat | Resolutie | Opmerkingen |
|--------|------------|-------|
| iPhone SE | 375x667 | Kleinste moderne iPhone |
| iPhone 12/13/14 | 390x844 | Standaard iPhone-formaat |
| Samsung Galaxy S20 | 360x800 | Populair Android-apparaat |
| iPad Mini Staand | 768x1024 | Klein tablet |

### Tablet (768px – 1024px)

| Apparaat | Resolutie | Opmerkingen |
|--------|------------|-------|
| iPad Air | 820x1180 | Standaard iPad |
| iPad Pro 11" | 834x1194 | Professioneel tablet |
| Surface Pro 7 | 912x1368 | Windows tablet |

### Desktop (1024px+)

| Apparaat | Resolutie | Opmerkingen |
|--------|------------|-------|
| Laptop | 1366x768 | Gangbare laptopresolutie |
| Desktop HD | 1920x1080 | Standaard desktop |
| 4K Monitor | 3840x2160 | Hoge resolutie display |

## Testchecklist

### 1. Navigatie

- [ ] **Mobiel**: Hamburgermenu zichtbaar en functioneel
- [ ] **Desktop**: Horizontale navigatiebalk correct weergegeven
- [ ] **Alle apparaten**: Alle navigatielinks toegankelijk
- [ ] **Aanraakdoelen**: Minimaal 44x44px op mobiel

### 2. Inhoud

- [ ] **Tekstleesbaarheid**: Geen zoom nodig voor inhoud
- [ ] **Afbeeldingen**: Responsief en correct op elk breekpunt
- [ ] **Geen horizontaal scrollen**: Inhoud past in viewport

### 3. Prestaties

- [ ] **Laadtijd**: < 3 seconden bij 3G-verbinding
- [ ] **Core Web Vitals**: Voldoen aan Google-drempelwaarden

## Doelmetrieken

### Lighthouse-scores

| Metriek | Doel | Kritisch |
|--------|--------|----------|
| Prestaties | > 90 | > 50 |
| Toegankelijkheid | > 95 | > 80 |
| Best Practices | > 95 | > 80 |
| SEO | > 95 | > 80 |

### Core Web Vitals

| Metriek | Goed | Verbetering nodig | Slecht |
|--------|------|-------------------|------|
| **LCP** | < 2,5s | 2,5s – 4,0s | > 4,0s |
| **FID** | < 100ms | 100ms – 300ms | > 300ms |
| **CLS** | < 0,1 | 0,1 – 0,25 | > 0,25 |

## Testworkflow

```bash
# Ontwikkelingsserver starten
npm run dev

# Lighthouse audit uitvoeren
npm run lighthouse

# Toegankelijkheidstests uitvoeren
npm run test:a11y
```

## Veelvoorkomende problemen en oplossingen

### Probleem: Horizontaal scrollen op mobiel

```css
/* ❌ Slecht */
.container { width: 1200px; }

/* ✅ Goed */
.container {
  max-width: 1200px;
  width: 100%;
  padding: 0 1rem;
}
```

### Probleem: Tekst te klein op mobiel

```css
/* ✅ Goed */
body { font-size: 16px; }
```
