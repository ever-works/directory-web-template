---
id: production-checklist
title: Produktionsbereitschafts-Checkliste
sidebar_label: Produktions-Checkliste
sidebar_position: 7
---

# Produktionsbereitschafts-Checkliste

Eine umfassende Checkliste, um sicherzustellen, dass Ihr Ever Works-Deployment produktionsbereit ist.

## Checkliste vor der Bereitstellung

### 1. Umgebungskonfiguration

#### Erforderliche Umgebungsvariablen

- [ ] **Datenbank**
  - `DATABASE_URL` mit PostgreSQL für Produktion konfiguriert
  - Datenbank-Connection-Pooling aktiviert
  - SSL-Modus für Produktion aktiviert

- [ ] **Authentifizierung**
  - `NEXTAUTH_URL` auf die Produktionsdomain gesetzt
  - `NEXTAUTH_SECRET` generiert (mind. 32 Zeichen)
  - OAuth-Anbieter konfiguriert (Google, GitHub, etc.)
  - Supabase Auth-Zugangsdaten (falls verwendet)

- [ ] **Zahlungsanbieter**
  - Stripe-Produktionsschlüssel (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
  - LemonSqueezy-Produktionsschlüssel (falls verwendet)
  - Webhook-Secrets konfiguriert
  - Testmodus deaktiviert

- [ ] **E-Mail-Dienste**
  - Resend API-Schlüssel konfiguriert
  - Novu-Zugangsdaten gesetzt (falls verwendet)
  - E-Mail-Vorlagen getestet
  - Absender-Domain verifiziert

- [ ] **Analysen & Überwachung**
  - PostHog-Produktionsschlüssel
  - Sentry DSN konfiguriert
  - Exception-Tracking-Anbieter gesetzt
  - Vercel Analytics aktiviert (falls auf Vercel)

- [ ] **CRM-Integration**
  - Twenty CRM-Zugangsdaten (falls verwendet)
  - Webhook-Endpunkte konfiguriert

- [ ] **Sicherheit**
  - `NODE_ENV=production`
  - Rate Limiting konfiguriert
  - CORS-Einstellungen überprüft
  - CSP-Header konfiguriert

### 2. Datenbank

- [ ] **Schema & Migrationen**
  - Alle Migrationen angewendet
  - Datenbankschema stimmt mit Code überein
  - Indizes für Performance erstellt
  - Fremdschlüsselbeschränkungen validiert

- [ ] **Datenintegrität**
  - Seed-Daten geladen (falls benötigt)
  - Testdaten entfernt
  - Datenvalidierungsregeln vorhanden

- [ ] **Backup & Wiederherstellung**
  - Automatische Backups konfiguriert
  - Backup-Wiederherstellung getestet
  - Point-in-Time-Recovery aktiviert
  - Backup-Aufbewahrungsrichtlinie festgelegt

- [ ] **Performance**
  - Connection-Pooling konfiguriert
  - Abfrageperformance optimiert
  - Langsame-Abfrage-Protokollierung aktiviert
  - Datenbanküberwachung aktiv

### 3. Sicherheit

- [ ] **Authentifizierung & Autorisierung**
  - Passwort-Hashing verifiziert (bcrypt)
  - Session-Management sicher
  - JWT-Tokens ordnungsgemäß signiert
  - Rollenbasierte Zugriffskontrolle getestet

- [ ] **Datenschutz**
  - Personenbezogene Daten verschlüsselt (at rest)
  - Bereinigung sensibler Daten konfiguriert
  - HTTPS erzwungen
  - Sichere Cookies aktiviert

- [ ] **API-Sicherheit**
  - Rate Limiting aktiv
  - API-Authentifizierung erforderlich
  - Eingabevalidierung auf allen Endpunkten
  - SQL-Injection-Prävention verifiziert

- [ ] **Abhängigkeiten**
  - Alle Abhängigkeiten aktualisiert
  - Sicherheitslücken gescannt (`npm audit`)
  - Keine kritischen Sicherheitslücken
  - Abhängigkeits-Lockfile committet

### 4. Performance

- [ ] **Frontend-Optimierung**
  - Bilder optimiert (Next.js Image-Komponente)
  - Code-Splitting implementiert
  - Lazy Loading für schwere Komponenten
  - Bundle-Größe analysiert

- [ ] **Caching**
  - Statische Assets gecacht
  - API-Antworten gecacht (wo angemessen)
  - CDN konfiguriert
  - Cache-Invalidierungsstrategie vorhanden

- [ ] **Core Web Vitals**
  - LCP < 2,5s
  - FID < 100ms
  - CLS < 0,1
  - Performance-Monitoring aktiv

- [ ] **Datenbankabfragen**
  - N+1-Abfragen eliminiert
  - Richtige Indizes erstellt
  - Abfrage-Caching aktiviert
  - Connection-Pooling optimiert

### 5. Überwachung & Protokollierung

- [ ] **Fehlerverfolgung**
  - Sentry/PostHog konfiguriert
  - Fehler-Alerts eingerichtet
  - Source-Maps hochgeladen
  - Fehlergruppierung konfiguriert

- [ ] **Anwendungsüberwachung**
  - Health-Check-Endpunkt (`/api/health`)
  - Uptime-Monitoring konfiguriert
  - Performance-Metriken verfolgt
  - Benutzerdefinierte Metriken definiert

- [ ] **Protokollierung**
  - Strukturierte Protokollierung implementiert
  - Log-Level konfiguriert
  - Log-Aggregation eingerichtet
  - Log-Aufbewahrungsrichtlinie definiert

- [ ] **Alerting**
  - Kritische Fehler-Alerts
  - Performance-Degradierungs-Alerts
  - Uptime-Alerts
  - Zahlungsfehlschlag-Alerts

### 6. Inhalte & Daten

- [ ] **Git-basiertes CMS**
  - `.content`-Repository konfiguriert
  - Inhaltssynchronisierung funktioniert
  - Git-Zugangsdaten gesichert
  - Inhalts-Backup-Strategie

- [ ] **Medien-Assets**
  - Bilder optimiert
  - CDN für Medien konfiguriert
  - Upload-Limits konfiguriert
  - Speicherkontingent überwacht

- [ ] **Internationalisierung**
  - Alle Übersetzungen vollständig
  - RTL-Unterstützung getestet (Arabisch)
  - Locale-Erkennung funktioniert
  - Datums-/Zahlenformatierung verifiziert

### 7. API-Dokumentation

- [ ] **Dokumentationssystem**
  - OpenAPI-Spec generiert (`yarn generate-docs`)
  - Scalar UI erreichbar unter `/api/reference`
  - Alle Endpunkte dokumentiert
  - Beispiele getestet

- [ ] **API-Standards**
  - Konsistente Namenskonventionen
  - Korrekte HTTP-Statuscodes
  - Fehlerantworten standardisiert
  - Rate Limiting dokumentiert

### 8. Zahlungssystem

- [ ] **Stripe-Konfiguration**
  - Produktionsmodus aktiviert
  - Webhooks konfiguriert und getestet
  - Kundenportal aktiviert
  - Rechnungseinstellungen konfiguriert

- [ ] **LemonSqueezy-Konfiguration** (falls verwendet)
  - Produktionszugangsdaten gesetzt
  - Webhooks konfiguriert
  - Steuer-Compliance verifiziert

- [ ] **Abonnementverwaltung**
  - Plan-Erstellung getestet
  - Upgrade/Downgrade-Flows getestet
  - Kündigungsflow getestet
  - Rückerstattungsprozess dokumentiert

### 9. E-Mail-System

- [ ] **Transaktionale E-Mails**
  - Willkommens-E-Mail getestet
  - Passwortzurücksetzen getestet
  - E-Mail-Verifizierung getestet
  - Abonnement-E-Mails getestet

- [ ] **E-Mail-Vorlagen**
  - Alle Vorlagen überprüft
  - Branding konsistent
  - Mobile-responsiv
  - Abbestell-Links funktionieren

- [ ] **Zustellbarkeit**
  - SPF-Einträge konfiguriert
  - DKIM konfiguriert
  - DMARC-Richtlinie gesetzt
  - Absender-Reputation überwacht

### 10. Testen

- [ ] **Funktionales Testen**
  - Benutzerregistrierungsflow
  - Anmelde-/Abmeldeflow
  - Passwortzurücksetzen-Flow
  - Artikel-Einreichungsflow
  - Zahlungsflow
  - Admin-Funktionen

- [ ] **Cross-Browser-Testing**
  - Chrome getestet
  - Firefox getestet
  - Safari getestet
  - Edge getestet
  - Mobile Browser getestet

- [ ] **Responsives Testen**
  - Mobil (320px – 480px)
  - Tablet (768px – 1024px)
  - Desktop (1280px+)
  - Große Bildschirme (1920px+)

- [ ] **Lasttests**
  - Erwarteter Traffic simuliert
  - Datenbankperformance unter Last
  - API-Antwortzeiten akzeptabel
  - Keine Speicherlecks

### 11. Compliance & Recht

- [ ] **Datenschutz**
  - Datenschutzerklärung veröffentlicht
  - Cookie-Zustimmung implementiert
  - DSGVO-Konformität (falls EU-Nutzer)
  - Datenexport-Funktionalität

- [ ] **Nutzungsbedingungen**
  - Nutzungsbedingungen veröffentlicht
  - Benutzerakzeptanz-Flow
  - Versionsverfolgung der Bedingungen

- [ ] **Barrierefreiheit**
  - WCAG 2.1 AA-Konformität
  - Tastaturnavigation funktioniert
  - Screenreader getestet
  - Alt-Text für Bilder

### 12. DevOps & Infrastruktur

- [ ] **Deployment**
  - CI/CD-Pipeline konfiguriert
  - Automatisierte Tests in der Pipeline
  - Deployment-Rollback-Plan
  - Zero-Downtime-Deployment

- [ ] **Skalierung**
  - Auto-Scaling konfiguriert
  - Load Balancer eingerichtet
  - Datenbank-Read-Replicas (falls benötigt)
  - CDN für statische Assets

- [ ] **Disaster Recovery**
  - Backup-Wiederherstellung getestet
  - Failover-Plan dokumentiert
  - Incident-Response-Plan
  - On-Call-Rotation definiert

- [ ] **Dokumentation**
  - Deployment-Leitfaden aktualisiert
  - Runbook erstellt
  - Architekturdiagramme aktuell
  - Team-Schulung abgeschlossen

---

## Verifikationsbefehle

Führen Sie diese Befehle aus, um Ihre Produktionsbereitschaft zu verifizieren:

### Sicherheitsaudit

```bash
# Auf Sicherheitslücken prüfen
npm audit --production

# Sicherheitslücken beheben
npm audit fix

# Veraltete Abhängigkeiten prüfen
npm outdated
```

### Build-Verifizierung

```bash
# Produktions-Build
npm run build

# Build-Ausgabe prüfen
ls -lh .next/

# Bundle-Größe analysieren
npm run analyze
```

### Datenbank-Verifizierung

```bash
# Migrationsstatus prüfen
npx drizzle-kit check

# Migration generieren falls benötigt
npx drizzle-kit generate

# Migrationen anwenden
npx drizzle-kit push
```

### API-Dokumentation

```bash
# OpenAPI-Spec generieren
yarn generate-docs

# Dokumentation validieren
yarn docs:validate

# Prüfen ob Dokumentation aktuell ist
git diff --exit-code public/openapi.json
```

### Umgebungsvariablen

```bash
# Prüfen ob alle erforderlichen Variablen gesetzt sind
node scripts/check-env.js

# Umgebungskonfiguration testen
npm run test:env
```

---

## Deployment-Workflow

### Vor dem Deployment

1. **Code-Review**
   - Alle PRs geprüft und genehmigt
   - Keine Merge-Konflikte
   - CI/CD-Pipeline erfolgreich

2. **Testen**
   - Alle Tests bestanden
   - Manuelles QA abgeschlossen
   - Staging-Umgebung getestet

3. **Dokumentation**
   - Changelog aktualisiert
   - API-Docs neu generiert
   - Deployment-Notizen vorbereitet

### Deployment-Schritte

1. **Backup**

   ```bash
   # Datenbank sichern
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

2. **Deployment**

   ```bash
   # In Produktion deployen
   git push production main

   # Oder mit Vercel
   vercel --prod
   ```

3. **Verifikation**

   ```bash
   # Health-Endpunkt prüfen
   curl https://your-domain.com/api/health

   # Fehler-Logs prüfen
   tail -f logs/error.log
   ```

4. **Überwachung**
   - Fehlerraten in Sentry beobachten
   - Performance in PostHog überwachen
   - Uptime-Monitoring prüfen

### Nach dem Deployment

1. **Smoke-Tests**
   - Startseite lädt
   - Benutzer kann sich anmelden
   - Zahlungsflow funktioniert
   - Admin-Panel zugänglich

2. **Überwachung**
   - Fehlerraten normal
   - Antwortzeiten akzeptabel
   - Keine Speicherlecks
   - Datenbankperformance stabil

3. **Kommunikation**
   - Team über Deployment informieren
   - Statusseite aktualisieren
   - Neue Funktionen ankündigen (falls vorhanden)

---

## Rollback-Plan

Falls nach dem Deployment Probleme erkannt werden:

### Schnelles Rollback

```bash
# Zum vorherigen Deployment zurückkehren
git revert HEAD
git push production main

# Oder mit Vercel
vercel rollback
```

### Datenbank-Rollback

```bash
# Aus Backup wiederherstellen
psql $DATABASE_URL < backup-YYYYMMDD.sql

# Oder Point-in-Time-Recovery verwenden
# (falls vom Hosting-Anbieter unterstützt)
```

### Kommunikation

1. Team sofort benachrichtigen
2. Statusseite aktualisieren
3. Betroffene Benutzer informieren
4. Vorfall für Post-Mortem dokumentieren

---

## Erfolgsmetriken

Verfolgen Sie diese Metriken, um die Produktionsgesundheit sicherzustellen:

### Performance

- **Antwortzeit**: < 200ms (p95)
- **Verfügbarkeit**: > 99,9%
- **Fehlerrate**: < 0,1%
- **Core Web Vitals**: Alle grün

### Geschäft

- **Benutzerregistrierung**: Tracking funktioniert
- **Zahlungserfolgsrate**: > 95%
- **E-Mail-Zustellung**: > 98%
- **API-Verfügbarkeit**: > 99,9%

### Sicherheit

- **Fehlgeschlagene Anmeldeversuche**: Überwacht
- **API-Rate-Limit-Treffer**: < 1%
- **Sicherheitslücken**: 0 kritische
- **SSL-Zertifikat**: Gültig und automatisch erneuert

---

## Nächste Schritte

Nach erfolgreichem Deployment:

- [Überwachung & Analysen](./monitoring) – Umfassendes Monitoring einrichten
- [Umgebungsvariablen](./environment-variables) – Produktions-Secrets verwalten
- [Docker-Deployment](./docker) – Anwendung containerisieren
- [Support](../advanced-guide/support) – Hilfe erhalten, wenn nötig

## Ressourcen

### Interne Dokumentation

- [Architekturübersicht](../architecture/overview)
- [Tech-Stack](../architecture/tech-stack)
- [API-Dokumentation](../development/api-documentation)
- [Überwachung](./monitoring)

### Externe Ressourcen

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Production Checklist](https://vercel.com/docs/concepts/deployments/overview)
- [PostgreSQL Produktions-Best-Practices](https://www.postgresql.org/docs/current/runtime-config.html)
- [Stripe Production Checklist](https://stripe.com/docs/keys#test-live-modes)

---

## Checklisten-Zusammenfassung

Verwenden Sie diese Kurzübersicht, um den Gesamtfortschritt zu verfolgen:

- [ ] **Umgebung**: Alle Variablen konfiguriert
- [ ] **Datenbank**: Migrationen angewendet, Backups konfiguriert
- [ ] **Sicherheit**: Authentifizierung, Verschlüsselung, Rate Limiting
- [ ] **Performance**: Optimiert, gecacht, überwacht
- [ ] **Überwachung**: Fehlerverfolgung, Protokollierung, Alerts
- [ ] **Inhalte**: CMS konfiguriert, Medien optimiert, i18n vollständig
- [ ] **API**: Dokumentation generiert, Standards eingehalten
- [ ] **Zahlung**: Stripe/LS konfiguriert, Webhooks getestet
