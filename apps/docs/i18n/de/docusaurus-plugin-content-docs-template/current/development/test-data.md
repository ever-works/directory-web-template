---
id: test-data
title: Testdaten & Fixtures
sidebar_label: Testdaten & Fixtures
sidebar_position: 6
---

# Testdaten & Fixtures

Die Ever Works-Vorlage bietet mehrere Mechanismen zum Generieren und Verwalten von Testdaten in Entwicklungs-, Seeding- und E2E-Test-Kontexten. Diese Seite behandelt Dummy-Daten, Datenbank-Seeds, E2E-Fixtures und Strategien zur Aufrechterhaltung der Datenkonsistenz.

## E2E-Testdaten (`e2e/helpers/test-data.ts`)

Die E2E-Test-Suite definiert ihre Testdaten über ein zentralisiertes Hilfsmodul:

```typescript
export const TEST_DATA = {
  get ADMIN_EMAIL()    { return requireEnv('SEED_ADMIN_EMAIL'); },
  get ADMIN_PASSWORD() { return requireEnv('SEED_ADMIN_PASSWORD'); },
  CLIENT_PASSWORD: 'TestClient123!',
  generateClientEmail: () =>
    `e2e-client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
  generateItemName: () =>
    `E2E Test Item ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  generateItemUrl: () =>
    `https://e2e-test-${Date.now()}.example.com`,
};
```

### Wichtige Designentscheidungen

- **Admin-Anmeldedaten aus Umgebung** – Admin-E-Mail und Passwort werden aus den Umgebungsvariablen `SEED_ADMIN_EMAIL` und `SEED_ADMIN_PASSWORD` gelesen, um sicherzustellen, dass Tests dieselben Anmeldedaten wie der gesäte Admin-Benutzer verwenden.
- **Einzigartige Client-Daten** – Client-E-Mails und Elementnamen enthalten Zeitstempel und zufällige Suffixe, um Kollisionen bei parallelen Test-Runs zu vermeiden.
- **Lazy Evaluation** – Admin-Anmeldedaten verwenden Getter-Funktionen, die sofort werfen, wenn Umgebungsvariablen fehlen, um Konfigurationsfehler früh zu erkennen.

### Öffentliche Routen-Registrierung

Das Testdatenmodul definiert auch alle öffentlichen Routen für Navigationstests:

```typescript
export const PUBLIC_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/discover/1', name: 'Discover Page 1' },
  { path: '/categories', name: 'Categories' },
  { path: '/tags', name: 'Tags' },
  { path: '/collections', name: 'Collections' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/about', name: 'About' },
  { path: '/help', name: 'Help' },
  { path: '/privacy-policy', name: 'Privacy Policy' },
  { path: '/terms-of-service', name: 'Terms of Service' },
  { path: '/cookies', name: 'Cookies' },
  { path: '/auth/signin', name: 'Sign In' },
  { path: '/auth/register', name: 'Register' },
];
```

## E2E-Auth-State-Fixtures

Der Authentifizierungszustand wird über Playwright-Storage-State-Dateien verwaltet:

```
e2e/auth-states/
  admin.json    # Serialisierter Admin-Session (Cookies, localStorage)
  client.json   # Serialisierter Client-Session
```

Diese Dateien werden während `global-setup.ts` generiert, indem programmatisch mit Admin- und Client-Anmeldedaten angemeldet wird. Das Auth-Fixture (`e2e/fixtures/auth.fixture.ts`) stellt vorauthentifizierte Browser-Kontexte bereit:

- `adminContext` / `adminPage` – Browser-Kontext mit geladenem Admin-Session
- `clientContext` / `clientPage` – Browser-Kontext mit geladenem Client-Session

Testdateien importieren das benutzerdefinierte `test`-Objekt anstelle von Playwrights Standard:

```typescript
import { test, expect } from '@/e2e/fixtures';

test('admin can view dashboard', async ({ adminPage }) => {
  await adminPage.goto('/admin');
  await expect(adminPage.getByRole('heading')).toContainText('Dashboard');
});
```

## Datenbank-Seeding

### Seed-Skript (`lib/db/seed.ts`)

Das Datenbank-Seed-Skript wird über `pnpm db:seed` ausgeführt und befüllt die Datenbank mit Anfangsdaten, die für den Betrieb der Anwendung erforderlich sind:

- **Admin-Benutzer** – Erstellt aus den Umgebungsvariablen `SEED_ADMIN_EMAIL` und `SEED_ADMIN_PASSWORD`
- **Fake-Benutzer** – Generiert basierend auf `SEED_FAKE_USER_COUNT` (Standard: 10)
- **Demo-Daten** – Wenn `NEXT_PUBLIC_DEMO=true`, werden umfassende Demo-Daten für alle Funktionen gesät

Das Seed-Skript ist idempotent – es prüft auf vorhandene Daten, bevor es einfügt, um Duplikate bei erneuten Ausführungen zu vermeiden.

### Demo-Modus

Wenn `NEXT_PUBLIC_DEMO=true`, generiert das Seed-Skript:

- Mehrere Benutzer mit verschiedenen Rollen und Profilen
- Beispielelemente in verschiedenen Kategorien und Status
- Kommentare, Abstimmungen und Engagement-Daten
- Sponsor-Anzeigeneinreichungen in verschiedenen Zuständen
- Umfragedefinitionen mit Beispielantworten

## Datenkonsistenzstrategien

### Isolation zwischen Test-Runs

E2E-Tests verwenden mehrere Strategien, um Dateninterferenz zu vermeiden:

1. **Eindeutige Kennungen** – Alle generierten Testdaten enthalten Zeitstempel, um Namenskollisionen zu verhindern
2. **Pro-Test-Bereinigung** – Tests, die Daten erstellen, sollten diese anschließend bereinigen
3. **Separate Auth-Kontexte** – Admin- und Client-Tests laufen in isolierten Browser-Kontexten
4. **Globale Einrichtung/Abbau** – `global-setup.ts` bereitet den Auth-Zustand vor, `global-teardown.ts` führt die Bereinigung durch

### Entwicklung vs. Testing vs. Produktion

| Bereich | Entwicklung | Testing (E2E) | Produktion |
|---------|------------|---------------|------------|
| Datenbank | SQLite (`file:./dev.db`) oder Postgres | Gleich wie Entwicklung (Server wiederverwendet) | Postgres |
| Inhalte | Geklont von `DATA_REPOSITORY` | Vorhandene Inhalte aus Entwicklung | Git-basiertes CMS |
| Benutzer | Gesäter Admin + Fake-Benutzer | Gleich wie Entwicklung + E2E-generierte Benutzer | Echte Benutzer |
| Demo-Daten | Wenn `NEXT_PUBLIC_DEMO=true` | Verlässt sich auf gesäte Demo-Daten | `NEXT_PUBLIC_DEMO=false` |

### Best Practices

1. **Immer vor dem Testen säen** – `pnpm db:seed` vor E2E-Tests ausführen, um sicherzustellen, dass der Admin-Benutzer existiert
2. **Eindeutige Datengeneratoren verwenden** – Niemals Elementnamen oder E-Mails in Tests hart codieren
3. **Umgebungsvariablen prüfen** – Das `requireEnv()`-Hilfsmittel liefert klare Fehlermeldungen, wenn erforderliche Variablen fehlen
4. **Fixtures minimal halten** – Auth-State-Dateien enthalten nur die notwendigen Cookies und Storage-Einträge
5. **Cross-Test-Abhängigkeiten vermeiden** – Jede Spec-Datei sollte unabhängig ausführbar sein

## Umgebungsvariablen für Tests

```bash
# Erforderlich für E2E-Tests
SEED_ADMIN_EMAIL=admin@changeme.com
SEED_ADMIN_PASSWORD=changeme_password

# Optional
BASE_URL=http://localhost:3000
SEED_FAKE_USER_COUNT=10
NEXT_PUBLIC_DEMO=true
```

## Verwandte Dateien

- `e2e/helpers/test-data.ts` – Testdatengeneratoren und Konstanten
- `e2e/fixtures/auth.fixture.ts` – Authentifizierungs-Fixtures für Playwright
- `e2e/global-setup.ts` – Vor-Test-Authentifizierungseinrichtung
- `e2e/global-teardown.ts` – Nach-Test-Bereinigung
- `lib/db/seed.ts` – Datenbank-Seeding-Skript
- `.env.example` – Vollständige Umgebungsvariablen-Referenz
