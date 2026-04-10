---
id: testing
title: Guida ai Test Responsivi
sidebar_label: Test
sidebar_position: 4
---

# Guida ai Test Responsivi

Questa guida copre le best practice per testare il design responsivo su diversi dispositivi e dimensioni dello schermo.

## Dispositivi di test

### Mobile (320px – 768px)

| Dispositivo | Risoluzione | Note |
|--------|------------|-------|
| iPhone SE | 375x667 | iPhone moderno più piccolo |
| iPhone 12/13/14 | 390x844 | Dimensione iPhone standard |
| Samsung Galaxy S20 | 360x800 | Dispositivo Android popolare |
| iPad Mini Verticale | 768x1024 | Tablet piccolo |

### Tablet (768px – 1024px)

| Dispositivo | Risoluzione | Note |
|--------|------------|-------|
| iPad Air | 820x1180 | iPad standard |
| iPad Pro 11" | 834x1194 | Tablet professionale |
| Surface Pro 7 | 912x1368 | Tablet Windows |

### Desktop (1024px+)

| Dispositivo | Risoluzione | Note |
|--------|------------|-------|
| Laptop | 1366x768 | Risoluzione laptop comune |
| Desktop HD | 1920x1080 | Desktop standard |
| Monitor 4K | 3840x2160 | Display ad alta risoluzione |

## Checklist di test

### 1. Navigazione

- [ ] **Mobile**: Menu hamburger visibile e funzionante
- [ ] **Desktop**: Barra di navigazione orizzontale corretta
- [ ] **Tutti i dispositivi**: Tutti i link di navigazione accessibili
- [ ] **Target touch**: Minimo 44x44px su mobile

### 2. Contenuto

- [ ] **Leggibilità del testo**: Nessuno zoom necessario
- [ ] **Immagini**: Responsive e dimensionate correttamente
- [ ] **Nessuno scroll orizzontale**: Il contenuto si adatta al viewport

### 3. Prestazioni

- [ ] **Tempo di caricamento**: < 3 secondi su connessione 3G
- [ ] **Core Web Vitals**: Soddisfano le soglie di Google

## Metriche target

### Punteggi Lighthouse

| Metrica | Obiettivo | Critico |
|--------|--------|----------|
| Prestazioni | > 90 | > 50 |
| Accessibilità | > 95 | > 80 |
| Best Practice | > 95 | > 80 |
| SEO | > 95 | > 80 |

### Core Web Vitals

| Metrica | Buono | Da migliorare | Scarso |
|--------|------|-------------------|------|
| **LCP** | < 2,5s | 2,5s – 4,0s | > 4,0s |
| **FID** | < 100ms | 100ms – 300ms | > 300ms |
| **CLS** | < 0,1 | 0,1 – 0,25 | > 0,25 |

## Workflow di test

```bash
npm run dev
npm run lighthouse
npm run test:a11y
npm run test:visual
```

## Problemi comuni e soluzioni

### Problema: Scroll orizzontale su mobile

```css
/* ❌ Sbagliato */
.container { width: 1200px; }

/* ✅ Giusto */
.container {
  max-width: 1200px;
  width: 100%;
  padding: 0 1rem;
}
```

### Problema: Testo troppo piccolo su mobile

```css
/* ✅ Giusto */
body { font-size: 16px; }
```
