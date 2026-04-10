---
id: multi-tenancy
title: Multi-Tenancy Configuratie
sidebar_label: Multi-Tenancy
sidebar_position: 13
---

# Multi-Tenancy Configuratie

Dit document legt uit hoe multi-tenant-ondersteuning werkt in de Directory Web Template.

## Overzicht

De template gebruikt een **gedeelde database met rij-niveau isolatie**-aanpak:

- Eén enkele PostgreSQL-database bedient meerdere **tenants** (directory-websites).
- Elke tabel heeft een `tenant_id`-kolom die gegevens aan een specifieke tenant koppelt.
- Alle queries filteren automatisch op de huidige tenant — geen gegevenslekken tussen tenants.

## Snelle Installatie

### 1. De Omgevingsvariabele Instellen

In uw deploymentplatform (Vercel, Docker, enz.) of `.env.local`:

```bash
TENANT_ID="your-unique-tenant-id"
```

Dit kan elke unieke string zijn (bijv. een UUID of een leesbare slug zoals `"my-directory"`).

### 2. Deployen

Bij de eerste start zal de applicatie:

1. Databasemigraties uitvoeren (voegt `tenant_id`-kolom toe indien niet aanwezig)
2. Een tenant-rij aanmaken die overeenkomt met uw `TENANT_ID`-waarde
3. Bestaande NULL-`tenant_id`-gegevens naar uw tenant migreren
4. Standaardgegevens seeden (admin-gebruiker, rollen, rechten)

Geen handmatige SQL nodig — alles is automatisch.

### 3. Verifiëren

Controleer de serverlogboeken op:

```
[DB Init] Ensured environment tenant 'your-unique-tenant-id' exists
[Tenant Migration] ✓ users: updated 3 rows
[Tenant Migration] ✅ Migration complete: 15 total rows updated across all tables.
```

## Hoe Tenantresolutie Werkt

Wanneer de applicatie de huidige tenant moet bepalen, gebruikt het een **watervalstrategie**:

| Prioriteit | Bron             | Beschrijving                                                     |
| ---------- | ---------------- | ---------------------------------------------------------------- |
| 1          | **Sessie**       | `user.tenantId` uit het JWT-token (geauthenticeerde gebruikers)  |
| 2          | **Omgevingsvar** | `TENANT_ID`-omgevingsvariabele                                   |
| 3          | **HTTP-header**  | `x-tenant-domain`-header (voor subdomein-routering)              |
| 4          | **Database**     | Eerste actieve tenant-rij (ultieme fallback)                     |

De functie `getTenantId()` uit `lib/auth/tenant.ts` implementeert deze keten en wordt aangeroepen door elke databasequery.

## Architectuur

### Belangrijke Bestanden

| Bestand                                  | Doel                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `lib/auth/tenant.ts`                     | `getTenantId()` — serversijde tenantresolutie met caching                 |
| `lib/config/env.ts`                      | `TENANT_ID`-omgevingsvariabele validatie                                  |
| `lib/db/schema.ts`                       | Tenanttabel + `tenant_id`-FK op alle tabellen                             |
| `lib/db/initialize.ts`                   | Maakt automatisch omgevingstenant aan + voert gegevensmigratie uit bij start |
| `lib/db/migrate-tenant-data.ts`          | Wijst NULL-`tenant_id`-rijen toe aan de huidige tenant                    |
| `lib/auth/index.ts`                      | JWT/sessie-callbacks injecteren `tenantId`                                |
| `components/context/tenant-provider.tsx` | React-context voor clientzijdige tenanttoegang                            |
| `app/api/tenant/route.ts`                | `GET /api/tenant` — geeft huidige tenantinformatie terug                  |

### Gegevensstroom

```
Gebruikersverzoek → getTenantId() → Resolveert vanuit sessie/omgeving/headers/DB
                                             ↓
                              Alle DB-queries filteren op deze tenant_id
                                             ↓
                              Alleen gegevens voor deze tenant worden teruggestuurd
```

### Authenticatie-integratie

- **Credentials-login**: Admin- en clientgebruikers krijgen hun `tenantId` uit hun `users.tenant_id`-kolom.
- **OAuth-login**: De Drizzle-adapter is omhulsd om `tenantId` te injecteren bij aanmaken van gebruikers.
- **JWT-callback**: Leest `tenantId` uit de gebruikersrecord en slaat het op in het token.
- **Sessie-callback**: Geeft `tenantId` door aan `session.user.tenantId`.
- **Clientcomponenten**: Gebruiken de `useTenant()`-hook van `TenantProvider` voor tenantinformatie.

## Meerdere Directory's (Multi-Tenant)

Om meerdere directory-websites op één database te draaien:

1. **Elke website** stelt een andere `TENANT_ID` in zijn omgeving in:
    - Website A: `TENANT_ID="directory-a-uuid"`
    - Website B: `TENANT_ID="directory-b-uuid"`

2. **Alle websites** verbinden met de **zelfde database** (`DATABASE_URL`).

3. **Gegevensisolatie** is automatisch — Website A ziet alleen rijen waar `tenant_id = 'directory-a-uuid'`.

4. **Gebruikers, rollen, opmerkingen, abonnementen** en alle andere gegevens zijn volledig geïsoleerd per tenant.

## Bestaande Gegevens Verwerken

Bij het upgraden van een niet-tenant-versie:

- De `tenant_id`-kolom wordt toegevoegd als **nullable** (breekt bestaande gegevens niet)
- Bij de eerste start wijst `migrateNullTenantIds()` automatisch NULL-rijen toe aan de opgeloste tenant
- Deze migratie is **idempotent** — veilig meerdere keren uit te voeren
- Na migratie zijn alle bestaande gegevens zichtbaar onder de huidige tenant

## Subdomein-routering (Geavanceerd)

Voor subdomein-gebaseerde tenantrouting (bijv. `tenant-a.example.com`):

1. Configureer uw reverse proxy om de `x-tenant-domain`-header toe te voegen
2. Maak tenantrecords aan met de velden `domain` of `slug`:
    ```sql
    INSERT INTO tenant (id, name, domain, slug, status)
    VALUES ('uuid', 'Tenant A', 'tenant-a.example.com', 'tenant-a', 'active');
    ```
3. De `resolveFromHeaders()`-strategie zal het domein matchen en de tenant oplossen

## Tenanttabel Schema

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
