---
id: performance
title: Leistungsoptimierung
sidebar_label: Leistung
sidebar_position: 5
---

# Leistungsoptimierung

Dieser Leitfaden behandelt die in die Ever Works-Vorlage integrierten Leistungsoptimierungen und Techniken zur Aufrechterhaltung schneller Ladezeiten, wenn Ihre Anwendung wächst.

## Next.js-Konfiguration

Die Vorlage `next.config.ts` umfasst mehrere leistungsorientierte Einstellungen:

### Eigenständige Ausgabe

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  // ...
};
```

Der `standalone` -Ausgabemodus erstellt einen eigenständigen Build, der nur die Dateien enthält, die zum Ausführen der Anwendung erforderlich sind. Dies reduziert die Behältergröße und die Anlaufzeit in der Produktion.

### Optimierung des Paketimports

```typescript
experimental: {
  optimizePackageImports: ["@heroui/react", "lucide-react"],
},
```

Diese Einstellung ermöglicht Tree-Shaking für Pakete mit vielen Barrel-Dateien. Anstatt die gesamte `@heroui/react` - oder `lucide-react` -Bibliothek zu importieren, sind nur die tatsächlich verwendeten Komponenten im Bundle enthalten.

### Webpack Watch-Optimierung

```typescript
if (dev) {
  config.watchOptions = {
    ...config.watchOptions,
    ignored: ['**/node_modules/**', '**/.git/**', '**/.content/**']
  };
}
```

Das Verzeichnis `.content/` (Git-basiertes CMS mit mehr als 220 Markdown-Dateien) ist in der Entwicklung vom Datei-Watcher des Webpacks ausgeschlossen. Dies verhindert unnötige Neuerstellungen bei Änderungen von Inhaltsdateien und reduziert die CPU-Auslastung während der Entwicklung erheblich.

### Unterdrückte Warnungen

Die ausführliche Infrastrukturprotokollierung wird in CI- und Vercel-Umgebungen unterdrückt:

```typescript
if (process.env.CI || process.env.VERCEL) {
  config.infrastructureLogging = { level: 'error' };
}
```

## Bildoptimierung

### Remote-Muster

Die Vorlage generiert mithilfe von `generateImageRemotePatterns()` dynamisch zulässige Remote-Bildmuster. Dadurch wird sichergestellt, dass Bilder von konfigurierten CDNs und externen Quellen durch die integrierte Image-Pipeline von Next.js optimiert werden.

### SVG-Handhabung

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

SVG-Bilder sind zulässig, jedoch in einer Sandbox mit einer strengen Inhaltssicherheitsrichtlinie, die die Skriptausführung deaktiviert. Dies ermöglicht SVG-Logos und -Symbole und verhindert gleichzeitig XSS durch SVG-Injection.

### Best Practices für Bilder

| Technik | Umsetzung | Auswirkungen |
|---|---|---|
| Verwenden Sie `next/image` | Integrierte Komponente mit Lazy Loading | Automatisches WebP/AVIF, reaktionsfähige Größen |
| Explizite Dimensionen festlegen | `width` und `height` Requisiten | Verhindert kumulative Layoutverschiebung (CLS) |
| Verwenden Sie `priority` für LCP | `<Image priority />` für Heldenbilder | Lädt das größte Contentful Paint-Bild vor |
| Benutze `sizes` prop | `sizes="(max-width: 768px) 100vw, 50vw"` | Verhindert das Herunterladen übergroßer Bilder |
| Platzhalter verwischen | `placeholder="blur"` mit `blurDataURL` | Verbessert die wahrgenommene Ladegeschwindigkeit |

## Caching-Strategien

### HTTP-Header

Die Vorlage legt Cache-bezogene Header in `next.config.ts` fest:

```typescript
headers: [
  { key: "X-DNS-Prefetch-Control", value: "on" },
]
```

DNS-Prefetching ist global aktiviert, um die Latenz bei der DNS-Suche für externe Ressourcen zu reduzieren.

### Statische Generierung

Die Vorlage verwendet ein großzügiges Timeout für die statische Seitengenerierung:

```typescript
staticPageGenerationTimeout: 180, // 3 minutes
```

Dies ermöglicht Seiten, die während der Erstellungszeit Daten von externen APIs oder dem Git-basierten CMS abrufen.

### ETag-Konfiguration

```typescript
generateEtags: false,
```

ETags sind auf Next.js-Ebene deaktiviert, da der CDN/Reverse-Proxy (Vercel Edge Network oder Cloudflare) die Cache-Validierung effizienter handhabt.

### Caching auf Anwendungsebene

Der Analytics-Hintergrundprozessor erwärmt Caches in regelmäßigen Abständen vor:

| Cache-Typ | Aktualisierungsintervall | Daten |
|---|---|---|
| Nutzerwachstumstrends | 10 Minuten | Monatliches Nutzerwachstum für 6, 12, 24 Monate |
| Aktivitätstrends | 5 Minuten | Aktivitätsdaten für 7-, 14- und 30-Tage-Fenster |
| Top-Artikel-Ranking | 15 Minuten | Top 10, 20, 50 Artikel |
| Letzte Aktivität | 2 Minuten | Neueste 10 und 20 Aktivitätseinträge |
| Leistungskennzahlen | 30 Sekunden | Statistiken zur Abfrageleistung |
| Cache-Bereinigung | 1 Stunde | Entfernung des abgelaufenen Cache-Eintrags |

## Lazy Loading

### Lazy Loading auf Komponentenebene

Verwenden Sie `next/dynamic` für schwere Bauteile, die beim ersten Putz nicht benötigt werden:

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // disable SSR for client-only components
});
```

### Codeaufteilung auf Routenebene

Der Next.js App Router teilt den Code automatisch nach Route auf. Jede Seite in `app/[locale]/` erhält ihr eigenes Paket, sodass Benutzer nur das JavaScript herunterladen, das für die aktuelle Seite benötigt wird.

### Dynamische Importe in Hintergrundjobs

Die Vorlage verwendet dynamische Importe innerhalb von Jobrückrufen, um zu verhindern, dass Webpack nur Servermodule in das Client-Bundle zieht:

```typescript
manager.scheduleJob('repository-sync', 'Repository Synchronization', async () => {
  const { syncManager } = await import('@/lib/services/sync-service');
  await syncManager.performSync();
}, 5 * 60 * 1000);
```

## Optimierung der Bündelgröße

### Analyse des Bundles

Führen Sie Folgendes aus, um die Bundle-Zusammensetzung zu überprüfen:

```bash
ANALYZE=true pnpm build
```

Wenn `@next/bundle-analyzer` konfiguriert ist, wird eine interaktive Baumkarte erstellt, die zeigt, welche Module zur Bundle-Größe beitragen.

### Gängige Optimierungstechniken

| Technik | Beispiel | Einsparungen |
|---|---|---|
| Barrel-Dateioptimierung | `optimizePackageImports` in der Konfiguration | Verhindert den Import ganzer Symbol-/UI-Bibliotheken |
| Nur-Server-Module | `import 'server-only'` in lib-Dateien | Verhindert versehentliche Client-Bündelung |
| Dynamische Importe | `await import('@/lib/services/...')` | Verschiebt das Laden, bis es benötigt wird |
| Externe Pakete | `serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']` | Ausgenommen von der Webpack-Bündelung |

Besonders wichtig ist die `serverExternalPackages` -Konfiguration:

```typescript
serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
```

Diese Pakete sind von der Webpack-Bündelung ausgeschlossen und werden nativ zur Laufzeit geladen, wodurch die Erstellungszeit verkürzt und Kompatibilitätsprobleme mit nativen Modulen vermieden werden.

## Tipps zur Leuchtturmoptimierung

### Kernziele von Web Vitals

| Metrisch | Ziel | Schlüsselfaktoren |
|---|---|---|
| **LCP** (Größte Contentful Paint) | < 2,5s | Bildoptimierung, Priorität beim Laden, Server-Reaktionszeit |
| **FID** (First Input Delay) | < 100ms | Codeaufteilung, minimale Haupt-Thread-Blockierung |
| **CLS** (Cumulative Layout Shift) | < 0,1 | Explizite Bildabmessungen, Strategie zum Laden von Schriftarten |
| **TTFB** (Zeit bis zum ersten Byte) | < 800ms | CDN-Caching, Edge-Funktionen, Optimierung von Datenbankabfragen |

### Praktische Checkliste

1. **Bilder**: Verwenden Sie `next/image` mit expliziten `width` -, `height` - und `sizes` -Requisiten. Markieren Sie Bilder über dem Falz mit `priority` .
2. **Schriftarten**: Verwenden Sie `next/font` , um Schriftarten mit `display: swap` selbst zu hosten und wichtige Schriftartdateien vorab zu laden.
3. **JavaScript**: Überprüfen Sie `optimizePackageImports` und fügen Sie alle großen Bibliotheken hinzu, die Barrel-Dateien verwenden.
4. **CSS**: Die Vorlage verwendet Tailwind CSS, das in Produktions-Builds bereits gelöscht wurde. Vermeiden Sie den Import ungenutzter CSS-Module.
5. **Skripte von Drittanbietern**: Nicht kritische Skripte mithilfe von `next/script` mit `strategy="lazyOnload"` zurückstellen.
6. **Serverkomponenten**: Reagiert standardmäßig auf Serverkomponenten (RSC) und verwendet `"use client"` nur, wenn Interaktivität erforderlich ist.

### Leuchtturm laufen lassen

Die Vorlage enthält eine `lighthouse-test.json` -Konfiguration. Führen Sie automatisierte Lighthouse-Tests durch:

```bash
npx lhci autorun --config=lighthouse-test.json
```

Oder verwenden Sie das Chrome DevTools Lighthouse-Panel für manuelle Audits.

## Datenbankabfrageleistung

### Verbindungspooling

Verwenden Sie Verbindungspooling, um zu vermeiden, dass pro Anfrage eine neue Datenbankverbindung geöffnet wird. Einzelheiten zur Konfiguration finden Sie im [Skalierungsleitfaden](/deployment/scaling).

### Abfrageoptimierung

- Verwenden Sie das Repository-Muster ( `lib/repositories/` ), um Abfragen zu zentralisieren und zu optimieren.
– Das Analyse-Repository umfasst integrierte Cache-Ebenen mit konfigurierbarer TTL.
- Überwachen Sie langsame Abfragen über den Hintergrundjob für Leistungsmetriken.

### Indexierungsstrategie

Überprüfen Sie `lib/db/schema.ts` auf vorhandene Indizes. Fügen Sie Indizes hinzu für:
- In `WHERE` -Klauseln verwendete Spalten
- Fremdschlüsselspalten
- In `ORDER BY` -Klauseln verwendete Spalten
- Zusammengesetzte Indizes für mehrspaltige Suchvorgänge

## Überwachung der Leistung

### Sentry-Integration

Die Vorlage integriert Sentry zur Leistungsüberwachung in `instrumentation.ts` :

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Spuren werden zu 10 % in der Produktion und zu 100 % in der Entwicklung erfasst. Passen Sie `tracesSampleRate` basierend auf Ihrem Verkehrsaufkommen und den Grenzen des Sentry-Plans an.

### Benutzerdefinierte Leistungsmarker

Verwenden Sie die Web Performance API für benutzerdefiniertes Timing:

```typescript
performance.mark('data-fetch-start');
const data = await fetchData();
performance.mark('data-fetch-end');
performance.measure('data-fetch', 'data-fetch-start', 'data-fetch-end');
```

## Zusammenfassung

| Bereich | Integrierte Optimierung | Zusätzliche Schritte |
|---|---|---|
| Bilder | Automatische WebP/AVIF, SVG-Sandbox | Fügen Sie `priority` zu LCP-Bildern hinzu, verwenden Sie `sizes` |
| JavaScript | Paketoptimierung, Codeaufteilung | Bibliotheken zu `optimizePackageImports` hinzufügen |
| Caching | Hintergrund-Cache-Erwärmung, DNS-Prefetch | CDN-Cache-Regeln konfigurieren |
| Datenbank | Verbindungspooling, Repository-Muster | Indizes hinzufügen, langsame Abfragen überwachen |
| Bauen | Standalone-Ausgabe, externe Pakete | Bundle-Analyse aktivieren |
| Überwachung | Sentry-Traces, Leistungsmetrik-Job | Benachrichtigungen für verschlechterte Metriken einrichten |
