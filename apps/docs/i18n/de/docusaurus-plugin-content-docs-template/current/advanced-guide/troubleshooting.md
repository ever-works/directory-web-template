---
id: troubleshooting
title: Leitfaden zur Fehlerbehebung
sidebar_label: Fehlerbehebung
sidebar_position: 7
---

# Leitfaden zur Fehlerbehebung

Dieses Handbuch behandelt häufige Fehler, Debugging-Techniken, Protokollinterpretation und Umgebungsprobleme für die Ever Works-Vorlage. Probleme werden nach Kategorien mit Symptomen, Ursachen und Lösungen geordnet.

## Build-Probleme

### Modul während der Erstellung nicht gefunden

**Symptome**: Der Build schlägt mit `Module not found: Can't resolve 'postgres'` oder ähnlichen Fehlern des nativen Node.js-Moduls fehl.

**Ursache**: Webpack versucht, reine Servermodule für das Client-Bundle zu bündeln.

**Lösung**: Überprüfen Sie, ob das Modul in `serverExternalPackages` in `next.config.ts` aufgeführt ist:

```typescript
const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']
};
```

Wenn Sie eine neue reine Serverabhängigkeit hinzugefügt haben, fügen Sie sie diesem Array hinzu.

### Zeitüberschreitung bei der Generierung statischer Seiten

**Symptome**: Der Build schlägt während der statischen Generierung mit `Error: Timeout of 180000ms exceeded` fehl.

**Ursache**: Seiten, die während der Erstellungszeit externe Daten abrufen, überschreiten das Zeitlimit.

**Lösung**: Die Vorlage legt ein 3-Minuten-Timeout fest:

```typescript
staticPageGenerationTimeout: 180,
```

Erhöhen Sie diesen Wert für Seiten, die mehr Zeit benötigen. Alternativ können Sie langsame Seiten auf dynamisches Rendering umstellen:

```typescript
export const dynamic = 'force-dynamic';
```

### Inhaltsverzeichnis fehlt während der Erstellung

**Symptome**: Build schlägt fehl, weil `.content/data` nicht vorhanden ist.

**Ursache**: Der Git-basierte CMS-Inhalt wurde nicht geklont. Das `scripts/clone.cjs` -Skript wird während `predev` - und `prebuild` -Hooks ausgeführt.

**Lösung**:

```bash
# Ensure DATA_REPOSITORY is set in .env.local
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Run the clone script manually
node scripts/clone.cjs

# Or create the directory for CI builds without content
mkdir -p .content/data
```

### Webpack-Warnungen von Supabase, bcryptjs, postgres, Stripe

**Symptome**: Build erzeugt Warnungen zu diesen Paketen, wird jedoch erfolgreich abgeschlossen.

**Ursache**: Bekannte Warnungen von Paketen, die auf Node.js-APIs verweisen, die im Browser nicht verfügbar sind.

**Lösung**: Diese sind bereits in `next.config.ts` unterdrückt:

```typescript
config.ignoreWarnings = [
	{ module: /@supabase\/realtime-js/ },
	{ module: /@supabase\/supabase-js/ },
	{ module: /bcryptjs/ },
	{ message: /bcryptjs/ },
	{ module: /postgres/ },
	{ module: /stripe/ }
];
```

Keine Aktion erforderlich – Warnungen haben keinen Einfluss auf die Build-Ausgabe.

### JavaScript-Heap hat nicht genügend Speicher

**Symptome**: Build stürzt mit `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory` ab.

**Lösung**: Die Build-Skripte weisen bereits 8 GB zu:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

Wenn dem Build immer noch nicht genügend Arbeitsspeicher zur Verfügung steht, prüfen Sie Folgendes:

- Übermäßige Generierung statischer Seiten (reduzieren Sie die Seiten, die zur Erstellungszeit erstellt werden)
- Große Abhängigkeiten werden nicht richtig durchgeschüttelt
- Speicherlecks in Build-Time-Skripten

## Datenbankprobleme

### Verbindung zu PostgreSQL abgelehnt

**Symptome**: Die Anwendung schlägt mit `connection refused` , `ECONNREFUSED` oder `connect ETIMEDOUT` fehl.

**Diagnoseschritte**:

1. Überprüfen Sie `DATABASE_URL` in `.env.local` :
    „Bash
    node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.DATABASE_URL ? 'Set' : 'Missing')"
    „
2. Testen Sie die Verbindung direkt: `psql $DATABASE_URL -c "SELECT 1"` 3. Überprüfen Sie, ob PostgreSQL ausgeführt wird: `pg_isready` **Häufige Ursachen und Lösungen**:

| Ursache | Fix |
| ---------------------- | ----------------------------------------------- |
| PostgreSQL läuft nicht | Starten Sie den Dienst |
| Falscher Port | Überprüfen Sie den Port in Ihrer Verbindungszeichenfolge |
| Fehlende Datenbank | `createdb your_database_name` |
| Authentifizierungsfehler | Überprüfen Sie Benutzername/Passwort in `DATABASE_URL` |
| SSL erforderlich | Fügen Sie `?sslmode=require` zur Verbindungszeichenfolge | hinzu

### Migration fehlgeschlagen

**Symptome**: `pnpm db:migrate` schlägt mit Schema- oder SQL-Fehlern fehl.

**Lösung**: Verwenden Sie zum Debuggen das ausführliche CLI-Migrationstool:

```bash
pnpm db:migrate:cli
```

Das zeigt:

1. Aktueller Migrationsstatus (Liste der angewendeten Migrationen)
2. Detaillierte Ausgabe der Migrationsausführung
3. Schemaüberprüfung nach der Migration

Wenn Migrationen beschädigt sind, überprüfen Sie die Drizzle-Tracking-Tabelle:

```sql
SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

### Die Datenbankinitialisierung ist bei der Instrumentierung fehlgeschlagen

**Symptome**: Die Konsole zeigt beim Start `[Instrumentation] Database initialization failed` an.

**Ursache**: Der `instrumentation.ts` -Hook führt Migration und Seeding beim Start aus. Ein Fehler weist auf ein Datenbankkonnektivitäts- oder Schemaproblem hin.

**Verhalten durch die Umgebung**:

| Umwelt | Bei Fehler |
| ----------- | -------------------------------------- |
| Produktion | Löst einen Fehler aus, Bereitstellung liefert 503 |
| Entwicklung | Protokollwarnung, App wird zum Debuggen gestartet |
| Vorschau | Protokollwarnung, App wird zum Debuggen gestartet |

Ab `instrumentation.ts` :

```typescript
if (isProduction) {
	throw error; // Fail fast in production
}
// In development/preview, allow app to start for debugging
console.warn('[Instrumentation] Non-production: Allowing app to start despite DB init failure');
```

### Seed bleibt im Status „Seeding“ hängen

**Symptome**: Die Anwendung protokolliert wiederholt `[DB Init] Another instance is seeding` .

**Ursache**: Ein vorheriger Seed-Vorgang ist abgestürzt, ohne dass der Status aktualisiert wurde.

**Lösung**: Der Initialisierungscode behandelt automatisch veraltete Seeds nach 5 Minuten:

```typescript
const STALE_SEEDING_THRESHOLD = 300000; // 5 minutes
```

Um das Problem sofort zu beheben, aktualisieren Sie den Seed-Status manuell:

```sql
DELETE FROM seed_status WHERE id = 'singleton';
```

Starten Sie dann die Anwendung neu.

## Authentifizierungsprobleme

### AUTH_SECRET nicht gesetzt

**Symptome**: Anwendung stürzt mit `AUTH_SECRET is not set` oder Sitzungsfehlern ab.

**Lösung**:

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
AUTH_SECRET=your_generated_secret_here
```

### OAuth-Rückruf-URL stimmt nicht überein

**Symptome**: Die OAuth-Anmeldung leitet zu einer Fehlerseite mit `redirect_uri_mismatch` weiter.

**Lösung**: Die Rückruf-URL in Ihrer OAuth-Anbieterkonsole muss genau übereinstimmen:

| Anbieter | Rückruf-URL |
| -------- | --------------------------------------------------- |
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

Für die lokale Entwicklung verwenden Sie `http://localhost:3000/api/auth/callback/<provider>` .

### OAuth-Anbieter werden nicht angezeigt

**Symptome**: Es werden nur die Anmeldeinformationen angezeigt, OAuth-Schaltflächen fehlen.

**Ursache**: OAuth-Anbieter greifen auf „Deaktiviert“ zurück, wenn die Konfiguration fehlschlägt. Ab `auth.config.ts` :

```typescript
} catch (error) {
  // Fallback to credentials only
  return createNextAuthProviders({
    credentials: { enabled: true },
    google: { enabled: false },
    github: { enabled: false },
    facebook: { enabled: false },
    twitter: { enabled: false },
  });
}
```

**Lösung**: Überprüfen Sie, ob für jeden Anbieter sowohl `CLIENT_ID` als auch `CLIENT_SECRET` eingestellt sind. Das Umgebungsprüfskript validiert OAuth-Paare:

```
GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
FB_CLIENT_ID + FB_CLIENT_SECRET
```

### Sitzungen laufen unerwartet ab

**Häufige Ursachen**:

| Ursache | Lösung |
| ---------------------- | ---------------------------------------------------- |
| `AUTH_SECRET` geändert | Durch Ändern des Geheimnisses werden alle Sitzungen ungültig |
| Nicht übereinstimmende Cookie-Domäne | Stellen Sie `COOKIE_DOMAIN` entsprechend Ihrer Bereitstellungsdomäne | ein
| HTTPS-Konflikt | Stellen Sie `COOKIE_SECURE=false` für die lokale HTTP-Entwicklung | ein

## Bereitstellungsprobleme

### Vercel-Build schlägt fehl, aber lokaler Build ist erfolgreich

**Checkliste**:

1. Alle erforderlichen Umgebungsvariablen werden im Vercel-Dashboard festgelegt
2. `DATABASE_URL` zugänglich über das Netzwerk von Vercel
3. Node.js-Version kompatibel (erfordert 20.19.0 oder höher)
4. Inhaltsverzeichnis vorhanden (CI erstellt `.content/data` automatisch)
5. Speicherzuordnung ausreichend

### Vercel-Cron-Jobs werden nicht ausgeführt

**Symptome**: Geplante Endpunkte in `vercel.json` werden nicht ausgeführt.

**Diagnoseschritte**:

1. Überprüfen Sie, ob sich `vercel.json` im Projektstammverzeichnis mit den richtigen Pfaden befindet:
    „json
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" }
    „
2. Bestätigen Sie, dass der Vercel-Plan cron unterstützt (Pro oder Enterprise).
3. Überprüfen Sie das Vercel-Dashboard auf der Registerkarte „Cron-Jobs“ auf Ausführungsprotokolle
4. Testen Sie den Endpunkt manuell: `curl https://yourdomain.com/api/cron/sync` ### Build-Time-Migration schlägt auf Vercel fehl

**Symptome**: Das Build-Protokoll zeigt `[Build Migration] Migration error` .

**Verhalten**: Das `scripts/build-migrate.ts` -Skript behandelt verschiedene Szenarien:

- **Produktion**: Alle Fehler führen zu Buildfehlern
- **Vorschau mit Verbindungsfehler**: Der Build wird mit einer Warnung fortgesetzt
- **Vorschau mit Authentifizierungsfehler**: Build schlägt fehl (Fehlkonfiguration)

```typescript
if (isProduction) {
	process.exit(1); // Fail production builds
}
if (isConnectionError && !isAuthError) {
	process.exit(0); // Allow preview deployments to continue
}
```

So überspringen Sie Build-Time-Migrationen vollständig:

```bash
SKIP_BUILD_MIGRATIONS=true
```

## Internationalisierungsprobleme

### Übersetzungsschlüssel werden anstelle von Text angezeigt

**Symptome**: Auf den Seiten wird `common.WELCOME` anstelle von „Willkommen“ angezeigt.

**Lösung**:

1. Überprüfen Sie, ob die Übersetzungsdatei vorhanden ist: `messages/<locale>.json` 2. Überprüfen Sie, ob der Schlüsselpfad mit dem in `useTranslations` verwendeten Namespace übereinstimmt
3. Das Fallback-System verwendet `deepmerge` , um Gebietsschemameldungen mit englischen Standardeinstellungen zusammenzuführen:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Wenn in der Gebietsschemadatei ein Schlüssel fehlt, sollte er vom englischen Fallback bereitgestellt werden.

### Locale Routing gibt 404 zurück

**Symptome**: URLs wie `/fr/discover` geben eine 404-Seite zurück.

**Lösung**: Stellen Sie sicher, dass sich das Gebietsschema im Array `LOCALES` in `lib/constants.ts` befindet:

```typescript
export const LOCALES = [
	'en',
	'fr',
	'es',
	'de',
	'zh',
	'ar',
	'he',
	'ru',
	'uk',
	'pt',
	'it',
	'ja',
	'ko',
	'nl',
	'pl',
	'tr',
	'vi',
	'th',
	'hi',
	'id',
	'bg'
] as const;
```

Und überprüfen Sie die Routing-Konfiguration in `i18n/routing.ts` :

```typescript
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localeDetection: true,
	localePrefix: 'as-needed'
});
```

## Protokollinterpretation

### Protokollpräfixe

| Präfix | Quelle | Standort |
| ------------------- | ----------------------------------- | -------------------------- |
| `[Instrumentation]` | App-Start (DB-Init, Sentry) | `instrumentation.ts` |
| `[Migration]` | Ausführung der Datenbankmigration | `lib/db/migrate.ts` |
| `[DB Init]` | Datenbankinitialisierung und Seeding | `lib/db/initialize.ts` |
| `[Build Migration]` | Migrationsskript zur Build-Zeit | `scripts/build-migrate.ts` |
| `[Layout]` | Fehler beim Abrufen der Root-Layout-Daten | `app/[locale]/layout.tsx` |

### Sentry-Fehlertags

Sentry-Fehler aus der Instrumentierung umfassen diese Tags zum Filtern:

| Tag | Werte |
| ------------- | ----------------------------------------- |
| `component` | `instrumentation` |
| `phase` | `database_init` |
| `environment` | `production` , `preview` oder `development` |

## Diagnosebefehle

| Aufgabe | Befehl |
| ------------------------ | ----------------------------------- |
| Überprüfen Sie TypeScript-Fehler | `pnpm tsc --noEmit` |
| Führen Sie linter | aus `pnpm lint` |
| Umgebung validieren | `node scripts/check-env.js` |
| Schnelle Umgebungsprüfung | `node scripts/check-env.js --quick` |
| Datenbankverbindung testen | `pnpm db:studio` |
| Migrationsstatus anzeigen | `pnpm db:migrate:cli` |
| Neue Migrationen generieren | `pnpm db:generate` |
| Ausstehende Migrationen anwenden | `pnpm db:migrate` |
| Samendatenbank | `pnpm db:seed` |
| Build-Cache bereinigen | `rm -rf .next` |
| Kompletter Umbau | `rm -rf .next && pnpm build` |
| Datenbank zurücksetzen | `node scripts/clean-database.js` |

## Hilfe bekommen

1. Durchsuchen Sie [GitHub-Probleme](https://github.com/ever-works/directory-web-template/issues)
2. Überprüfen Sie die `CLAUDE.md` -Datei auf Richtlinien für KI-gestützte Entwicklung
3. Überprüfen Sie das Sentry-Dashboard auf Fehlerdetails (falls konfiguriert).
4. Bei Sicherheitsproblemen senden Sie eine private E-Mail an security@ever.co
