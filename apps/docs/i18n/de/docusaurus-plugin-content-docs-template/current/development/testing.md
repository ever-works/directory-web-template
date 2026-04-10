---
id: testing
title: Responsives Test-Leitfaden
sidebar_label: Tests
sidebar_position: 4
---

# Responsiver Test-Leitfaden

Dieser Leitfaden behandelt Best Practices für das Testen von responsivem Design auf verschiedenen Geräten und Bildschirmgrößen.

## Testgeräte

### Mobil (320px – 768px)

| Gerät | Auflösung | Hinweise |
|--------|------------|-------|
| iPhone SE | 375x667 | Kleinstes modernes iPhone |
| iPhone 12/13/14 | 390x844 | Standard-iPhone-Größe |
| Samsung Galaxy S20 | 360x800 | Beliebtes Android-Gerät |
| iPad Mini Hochformat | 768x1024 | Kleines Tablet |

### Tablet (768px – 1024px)

| Gerät | Auflösung | Hinweise |
|--------|------------|-------|
| iPad Air | 820x1180 | Standard-iPad |
| iPad Pro 11" | 834x1194 | Professionelles Tablet |
| Surface Pro 7 | 912x1368 | Windows-Tablet |

### Desktop (1024px+)

| Gerät | Auflösung | Hinweise |
|--------|------------|-------|
| Laptop | 1366x768 | Gängige Laptop-Auflösung |
| Desktop HD | 1920x1080 | Standard-Desktop |
| 4K-Monitor | 3840x2160 | Hochauflösendes Display |

## Test-Checkliste

### 1. Navigation

- [ ] **Mobil**: Hamburger-Menü sichtbar und funktionsfähig
- [ ] **Desktop**: Horizontale Navigationsleiste wird korrekt angezeigt
- [ ] **Alle Geräte**: Alle Navigationslinks sind zugänglich
- [ ] **Touch-Ziele**: Mindestens 44x44px auf Mobilgeräten
- [ ] **Tastatur-Navigation**: Tab-Reihenfolge ist logisch

### 2. Inhalt

- [ ] **Textlesbarkeit**: Kein Zoomen zum Lesen von Inhalten erforderlich
- [ ] **Bilder**: Responsiv und für jeden Breakpoint korrekt dimensioniert
- [ ] **Kein horizontales Scrollen**: Inhalt passt in den Viewport
- [ ] **Zeilenlänge**: Optimale Lesebreite (45–75 Zeichen)
- [ ] **Schriftgrößen**: Angemessen für jede Gerätegröße

### 3. Interaktionen

- [ ] **Touch-Ziele**: Mindestens 44x44px für Mobilgeräte
- [ ] **Abstände**: Ausreichend Platz zwischen anklickbaren Elementen
- [ ] **Hover-Zustände**: Nur auf Geräten mit Hover-Fähigkeit
- [ ] **Fokuszustände**: Sichtbare Tastatur-Fokusindikatoren
- [ ] **Formulare**: Einfach auf Mobilgeräten auszufüllen

### 4. Leistung

- [ ] **Ladezeit**: < 3 Sekunden bei 3G-Verbindung
- [ ] **Bilder**: Optimiert für jede Bildschirmgröße
- [ ] **Animationen**: Flüssige 60-FPS-Leistung
- [ ] **Core Web Vitals**: Googles Schwellenwerte erfüllen
- [ ] **Bundle-Größe**: Optimiertes JavaScript und CSS

### 5. Layout

- [ ] **Grid-System**: Passt sich bei Breakpoints korrekt an
- [ ] **Flexbox/Grid**: Keine Layout-Brüche
- [ ] **Abstände**: Konsistenter Innen- und Außenabstand
- [ ] **Ausrichtung**: Korrekte Ausrichtung bei allen Größen
- [ ] **Overflow**: Keine Inhalt-Overflow-Probleme

## Testwerkzeuge

### Browser-DevTools

#### Chrome DevTools
1. DevTools öffnen (F12 oder Cmd+Option+I)
2. Gerätesymbolleiste-Symbol anklicken (Cmd+Shift+M)
3. Gerät auswählen oder benutzerdefinierte Abmessungen eingeben
4. Verschiedene Netzwerkgeschwindigkeiten testen

#### Firefox Developer Tools
1. DevTools öffnen (F12)
2. Responsive Design Mode anklicken (Cmd+Option+M)
3. Geräte-Presets auswählen
4. Touch-Events testen

### Online-Testdienste

- **[BrowserStack](https://www.browserstack.com/)** – Auf echten Geräten testen
- **[LambdaTest](https://www.lambdatest.com/)** – Browserübergreifendes Testen
- **[Sauce Labs](https://saucelabs.com/)** – Automatisierte Testplattform

### Leistungstests

- **[Lighthouse](https://developers.google.com/web/tools/lighthouse)** – Leistungs-Audit
- **[WebPageTest](https://www.webpagetest.org/)** – Detaillierte Leistungsanalyse
- **[PageSpeed Insights](https://pagespeed.web.dev/)** – Googles Leistungswerkzeug

## Zielmetriken

### Lighthouse-Bewertungen

| Metrik | Ziel | Kritisch |
|--------|--------|----------|
| Leistung | > 90 | > 50 |
| Zugänglichkeit | > 95 | > 80 |
| Best Practices | > 95 | > 80 |
| SEO | > 95 | > 80 |

### Core Web Vitals

| Metrik | Gut | Verbesserungsbedarf | Schlecht |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | < 2,5s | 2,5s – 4,0s | > 4,0s |
| **FID** (First Input Delay) | < 100ms | 100ms – 300ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | < 0,1 | 0,1 – 0,25 | > 0,25 |

### Mobil-spezifische Metriken

- **First Contentful Paint**: < 1,8s
- **Time to Interactive**: < 3,8s
- **Touch-Zielgröße**: >= 48x48px
- **Tap-Verzögerung**: < 300ms

## Test-Workflow

### 1. Lokales Testen

```bash
# Entwicklungsserver starten
npm run dev

# Im Browser öffnen
http://localhost:3000
```

### 2. Gerätetests

1. **DevTools-Responsive-Modus verwenden**
2. **Auf physischen Geräten testen**, wenn möglich
3. **Remote-Debugging für Mobilgeräte verwenden**
4. **Verschiedene Ausrichtungen testen** (Hoch-/Querformat)

### 3. Automatisierte Tests

```bash
# Lighthouse-Audit ausführen
npm run lighthouse

# Zugänglichkeitstests ausführen
npm run test:a11y

# Visuelle Regressionstests ausführen
npm run test:visual
```

## Häufige Probleme und Lösungen

### Problem: Horizontales Scrollen auf Mobilgeräten

**Lösung**: Nach Elementen mit fester Breite suchen

```css
/* ❌ Schlecht */
.container {
  width: 1200px;
}

/* ✅ Gut */
.container {
  max-width: 1200px;
  width: 100%;
  padding: 0 1rem;
}
```

### Problem: Text zu klein auf Mobilgeräten

**Lösung**: Responsive Schriftgrößen verwenden

```css
/* ❌ Schlecht */
body {
  font-size: 12px;
}

/* ✅ Gut */
body {
  font-size: 16px; /* Basisgröße für Mobilgeräte */
}
```
