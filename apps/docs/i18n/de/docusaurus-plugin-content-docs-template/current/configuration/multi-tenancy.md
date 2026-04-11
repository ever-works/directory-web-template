---
id: multi-tenancy
title: Multi-Tenancy Konfiguration
sidebar_label: Multi-Tenancy
sidebar_position: 13
---

# Multi-Tenancy Konfiguration

Dieses Dokument erläutert, wie die Multi-Tenant-Unterstützung im Directory Web Template funktioniert.

## Überblick

Das Template verwendet einen **Shared-Database-Ansatz mit Zeilenisolierung**:

- Eine einzelne PostgreSQL-Datenbank dient mehreren **Mandanten** (Verzeichnis-Websites).
- Jede Tabelle hat eine `tenant_id`-Spalte, die Daten auf einen bestimmten Mandanten beschränkt.
- Alle Abfragen filtern automatisch nach dem aktuellen Mandanten — keine mandantenübergreifenden Datenlecks.

## Schnelleinrichtung

### 1. Umgebungsvariable festlegen

In Ihrer Deployment-Plattform (Vercel, Docker usw.) oder `.env.local`:

```bash
TENANT_ID="your-unique-tenant-id"
```

Dies kann eine beliebige eindeutige Zeichenfolge sein (z. B. eine UUID oder ein lesbarer Slug wie `"my-directory"`).

### 2. Deployen

Beim ersten Start wird die Anwendung:

1. Datenbankmigrationen ausführen (fügt `tenant_id`-Spalte hinzu, falls nicht vorhanden)
2. Eine Mandantenzeile passend zu Ihrem `TENANT_ID`-Wert erstellen
3. Bestehende NULL-`tenant_id`-Daten auf Ihren Mandanten migrieren
4. Standarddaten seeden (Admin-Benutzer, Rollen, Berechtigungen)

Kein manuelles SQL erforderlich — alles ist automatisch.

### 3. Verifizieren

Prüfen Sie die Server-Logs auf:

```
[DB Init] Ensured environment tenant 'your-unique-tenant-id' exists
[Tenant Migration] ✓ users: updated 3 rows
[Tenant Migration] ✅ Migration complete: 15 total rows updated across all tables.
```

## Wie die Mandantenauflösung funktioniert

Wenn die Anwendung den aktuellen Mandanten ermitteln muss, verwendet sie eine **Wasserfallstrategie**:

| Priorität | Quelle           | Beschreibung                                                      |
| --------- | ---------------- | ----------------------------------------------------------------- |
| 1         | **Sitzung**      | `user.tenantId` aus dem JWT-Token (authentifizierte Benutzer)     |
| 2         | **Umgebungsvar** | `TENANT_ID`-Umgebungsvariable                                     |
| 3         | **HTTP-Header**  | `x-tenant-domain`-Header (für Subdomain-Routing)                  |
| 4         | **Datenbank**    | Erste aktive Mandantenzeile (ultimativer Fallback)                |

Die Funktion `getTenantId()` aus `lib/auth/tenant.ts` implementiert diese Kette und wird von jeder Datenbankabfrage aufgerufen.

## Architektur

### Wichtige Dateien

| Datei                                    | Zweck                                                                         |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `lib/auth/tenant.ts`                     | `getTenantId()` — serverseitige Mandantenauflösung mit Caching                |
| `lib/config/env.ts`                      | `TENANT_ID`-Umgebungsvariablen-Validierung                                    |
| `lib/db/schema.ts`                       | Mandantentabelle + `tenant_id`-FK für alle Tabellen                           |
| `lib/db/initialize.ts`                   | Erstellt automatisch Umgebungsmandant + führt Datenmigration beim Start durch |
| `lib/db/migrate-tenant-data.ts`          | Weist NULL-`tenant_id`-Zeilen dem aktuellen Mandanten zu                      |
| `lib/auth/index.ts`                      | JWT/Sitzungs-Callbacks injizieren `tenantId`                                  |
| `components/context/tenant-provider.tsx` | React-Kontext für clientseitigen Mandantenzugriff                             |
| `app/api/tenant/route.ts`                | `GET /api/tenant` — gibt aktuelle Mandanteninformationen zurück               |

### Datenfluss

```
Benutzeranfrage → getTenantId() → Auflösung aus Sitzung/Umgebung/Headern/DB
                                           ↓
                             Alle DB-Abfragen filtern nach dieser tenant_id
                                           ↓
                               Nur Daten für diesen Mandanten werden zurückgegeben
```

### Authentifizierungsintegration

- **Credentials-Login**: Admin- und Client-Benutzer erhalten ihre `tenantId` aus ihrer `users.tenant_id`-Spalte.
- **OAuth-Login**: Der Drizzle-Adapter wird umhüllt, um `tenantId` bei der Benutzererstellung einzufügen.
- **JWT-Callback**: Liest `tenantId` aus dem Benutzerdatensatz und bettet es in das Token ein.
- **Sitzungs-Callback**: Überträgt `tenantId` zu `session.user.tenantId`.
- **Client-Komponenten**: Verwenden den `useTenant()`-Hook aus `TenantProvider` für Mandanteninformationen.

## Mehrere Verzeichnisse (Multi-Tenant)

Um mehrere Verzeichnis-Websites auf einer einzigen Datenbank zu betreiben:

1. **Jede Website** setzt eine andere `TENANT_ID` in ihrer Umgebung:
    - Website A: `TENANT_ID="directory-a-uuid"`
    - Website B: `TENANT_ID="directory-b-uuid"`

2. **Alle Websites** verbinden sich mit der **gleichen Datenbank** (`DATABASE_URL`).

3. **Datenisolierung** ist automatisch — Website A sieht nur Zeilen, bei denen `tenant_id = 'directory-a-uuid'`.

4. **Benutzer, Rollen, Kommentare, Abonnements** und alle anderen Daten sind vollständig pro Mandant isoliert.

## Behandlung bestehender Daten

Beim Upgrade von einer Nicht-Mandanten-Version:

- Die `tenant_id`-Spalte wird als **nullable** hinzugefügt (bricht keine bestehenden Daten)
- Beim ersten Start weist `migrateNullTenantIds()` automatisch NULL-Zeilen dem aufgelösten Mandanten zu
- Diese Migration ist **idempotent** — sicher mehrfach ausführbar
- Nach der Migration sind alle vorhandenen Daten unter dem aktuellen Mandanten sichtbar

## Subdomain-Routing (Erweitert)

Für subdomain-basiertes Mandanten-Routing (z. B. `mandant-a.example.com`):

1. Konfigurieren Sie Ihren Reverse-Proxy, um den `x-tenant-domain`-Header hinzuzufügen
2. Erstellen Sie Mandantendatensätze mit den Feldern `domain` oder `slug`:
    ```sql
    INSERT INTO tenant (id, name, domain, slug, status)
    VALUES ('uuid', 'Tenant A', 'tenant-a.example.com', 'tenant-a', 'active');
    ```
3. Die `resolveFromHeaders()`-Strategie wird die Domain abgleichen und den Mandanten auflösen

## Mandantentabellen-Schema

```sql
CREATE TABLE tenant (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  domain TEXT UNIQUE,
  slug TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'inactive'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```
