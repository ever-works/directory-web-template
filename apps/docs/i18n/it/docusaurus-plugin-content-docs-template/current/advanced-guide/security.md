---
id: security
title: Rafforzamento della sicurezza
sidebar_label: Sicurezza
sidebar_position: 6
---

# Rafforzamento della sicurezza

Il modello Ever Works include più livelli di sicurezza per impostazione predefinita. Questa guida documenta le protezioni integrate e fornisce consigli per rafforzare ulteriormente la distribuzione di produzione.

## Intestazioni di sicurezza

Il modello configura le intestazioni di sicurezza globalmente in `next.config.ts` per tutti i percorsi:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: "..." },
      ],
    },
  ];
},
```

### Suddivisione dell'intestazione

| Intestazione | Valore | Scopo |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Previene gli attacchi di sniffing di tipo MIME |
| `X-Frame-Options` | `DENY` | Impedisce al sito di essere incorporato negli iframe (protezione dal clickjacking) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita le informazioni sui referrer inviate a origini esterne |
| `X-DNS-Prefetch-Control` | `on` | Abilita la prelettura DNS per le prestazioni |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Applica HTTPS per circa 2 anni, copre tutti i sottodomini, idonei per l'elenco di precaricamento HSTS |
| `Content-Security-Policy` | Vedi sotto | Limita le origini di caricamento delle risorse |

### Politica sulla sicurezza dei contenuti

Il CSP è configurato come:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https:;
frame-ancestors 'none';
```

| Direttiva | Valore | Note |
|---|---|---|
| `default-src` | `'self'` | Per impostazione predefinita, consenti solo risorse dalla stessa origine |
| `script-src` | `'self' 'unsafe-inline'` + LemonSqueezy | Richiesto per script in linea e widget di pagamento |
| `style-src` | `'self' 'unsafe-inline'` | Obbligatorio per CSS-in-JS e Tailwind |
| `img-src` | `'self' data: https:` | Consente immagini dalla stessa origine, URI di dati e qualsiasi origine HTTPS |
| `font-src` | `'self'` | Solo caratteri ospitati autonomamente |
| `connect-src` | `'self' https:` | Chiamate API alla stessa origine e qualsiasi endpoint HTTPS |
| `frame-ancestors` | `'none'` | Impedisce l'incorporamento in qualsiasi iframe (equivalente a `X-Frame-Options: DENY` ) |

### Sicurezza delle immagini SVG

Le immagini SVG ricevono sandboxing aggiuntivo:

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
},
```

Gli SVG vengono serviti come allegati con script completamente disabilitati e sandbox, impedendo attacchi XSS basati su SVG.

### Rafforzamento aggiuntivo

Il `poweredByHeader` è disabilitato:

```typescript
poweredByHeader: false,
```

Ciò rimuove l'intestazione `X-Powered-By: Next.js` , impedendo il rilevamento delle impronte digitali.

## Sicurezza dell'autenticazione

### Integrazione NextAuth.js

Il modello utilizza NextAuth.js (Auth.js) per l'autenticazione. Le principali funzionalità di sicurezza includono:

- **Sessioni JWT o database** con strategia di sessione configurabile
- **Protezione CSRF** su tutti i moduli inviati
- **Configurazione sicura dei cookie** con i flag `httpOnly` , `secure` e `sameSite` - **Convalida dell'input** con schemi Zod su tutte le azioni del modulo

### Azioni convalidate

Le azioni del server sono protette utilizzando wrapper di azioni convalidate definite in `lib/auth/middleware.ts` :

```typescript
// Validate input with Zod before processing
export function validatedAction<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData);
  };
}

// Validate input AND require authentication
export function validatedActionWithUser<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("User is not authenticated");
    }
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData, session.user);
  };
}
```

**Utilizzare sempre `validatedActionWithUser` ** per le operazioni autenticate. Ciò garantisce che sia la convalida dell'input che la verifica della sessione avvengano prima dell'esecuzione di qualsiasi logica aziendale.

## Applicazione del RBAC

Il modello include un sistema completo di controllo degli accessi basato sui ruoli in `lib/middleware/permission-check.ts` .

### Formato autorizzazione

Le autorizzazioni seguono uno schema `resource:action` :

```
items:read, items:create, items:update, items:delete
users:read, users:create, users:assignRoles
analytics:read, analytics:export
system:settings
```

### Funzioni di controllo dei permessi

| Funzione | Scopo | Esempio |
|---|---|---|
| `hasPermission` | Controlla l'autorizzazione singola | `hasPermission(user, 'items:create')` |
| `hasAnyPermission` | Controlla se l'utente ha almeno un | `hasAnyPermission(user, ['items:review', 'items:approve'])` |
| `hasAllPermissions` | Controlla se l'utente ha tutti elencati | `hasAllPermissions(user, ['users:read', 'users:update'])` |
| `hasResourcePermission` | Controlla per risorsa + stringhe di azioni | `hasResourcePermission(user, 'items', 'delete')` |
| `canManageResource` | Seleziona crea/aggiorna/elimina | `canManageResource(user, 'categories')` |
| `canReviewItems` | Controlla le autorizzazioni di revisione dell'elemento | `canReviewItems(user)` |
| `canManageUsers` | Controlla i permessi di gestione degli utenti | `canManageUsers(user)` |
| `canManageRoles` | Controlla le autorizzazioni di gestione dei ruoli | `canManageRoles(user)` |
| `canViewAnalytics` | Controlla l'accesso all'analisi | `canViewAnalytics(user)` |
| `isSuperAdmin` | Controlla il ruolo di super amministratore o tutte le autorizzazioni | `isSuperAdmin(user)` |

### Utilizzo delle autorizzazioni nelle route API

```typescript
import { hasPermission, UserPermissions } from '@/lib/middleware/permission-check';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userPerms: UserPermissions = {
    userId: session.user.id,
    roles: session.user.roles,
    permissions: session.user.permissions,
  };

  if (!hasPermission(userPerms, 'items:create')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with authorized logic
}
```

### Rilevamento super amministratore

La funzione `isSuperAdmin` utilizza un duplice approccio per la massima sicurezza:

1. **Verifica ruolo**: controlla se l'utente ha il ruolo `super-admin` 2. **Permessi fallback**: verifica che l'utente possieda tutte le autorizzazioni di sistema definite

Ciò garantisce che nessun set di autorizzazioni parziali possa accidentalmente concedere l'accesso come super amministratore.

## Limitazione della velocità

### Protezione del percorso API

Implementare la limitazione della velocità per le rotte API rivolte al pubblico per prevenire abusi:

```typescript
// Example using a simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record || now > record.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;
  record.count++;
  return true;
}
```

Per le distribuzioni di produzione, prendere in considerazione l'utilizzo di:
- **Vercel Edge Middleware** con limitazione della velocità di `@vercel/edge` - **Upstash Redis** per la limitazione della velocità distribuita tra istanze serverless
- **Limitazione della velocità di Cloudflare** a livello CDN

### Protezione endpoint Cron

Gli endpoint API Cron dovrebbero verificare un segreto condiviso per impedire invocazioni non autorizzate:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Execute cron job
}
```

Il `CRON_SECRET` viene impostato tramite variabili di ambiente e configurato durante la distribuzione (vedere il flusso di lavoro di distribuzione Vercel della pipeline CI/CD).

## Convalida dell'input

### Convalida dello schema Zod

Tutti gli input del modulo e i payload API devono essere convalidati con schemi Zod:

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  url: z.string().url(),
  categoryId: z.string().uuid(),
});
```

### Prevenzione dell'iniezione SQL

Il modello utilizza Drizzle ORM per tutte le query del database, che parametrizza automaticamente tutti i valori. Non costruire mai stringhe SQL grezze con l'input dell'utente.

### Prevenzione XSS

- I componenti server eseguono il rendering sul server e non espongono HTML non elaborato al client.
- Tutto il contenuto generato dall'utente deve essere sottoposto a escape utilizzando l'escape integrato di React (JSX esegue automaticamente l'escape delle stringhe).
- L'intestazione CSP blocca gli script in linea provenienti da fonti non attendibili.

## Sicurezza delle variabili d'ambiente

### Segreti obbligatori

| Variabile | Scopo | Generazione |
|---|---|---|
| `AUTH_SECRET` | Segni token JWT e cookie di sessione | `openssl rand -base64 32` |
| `COOKIE_SECRET` | Crittografa i valori dei cookie | `openssl rand -base64 32` |
| `CRON_SECRET` | Autentica le richieste dell'endpoint cron | `openssl rand -base64 32` |
| `DATABASE_URL` | Stringa di connessione al database | Fornito dall'host del database |

### Migliori pratiche

1. **Non impegnare mai segreti** nel controllo della versione. Usa `.env.local` per lo sviluppo e segreti a livello di piattaforma per la produzione.
2. **Ruota regolarmente i segreti**, in particolare `AUTH_SECRET` e `COOKIE_SECRET` .
3. **Utilizza segreti separati per ambiente**: non condividere segreti di produzione con gestione temporanea o sviluppo.
4. **Limita l'accesso** alle variabili dell'ambiente di produzione utilizzando l'RBAC della tua piattaforma (ruoli del team Vercel, regole di protezione dell'ambiente GitHub).

## Lista di controllo della sicurezza per la produzione

| Categoria | Articolo | Stato |
|---|---|---|
| **Intestazioni** | Tutte le intestazioni di sicurezza configurate in `next.config.ts` | Integrato |
| **Intestazioni** | `poweredByHeader` disabilitato | Integrato |
| **Intestazioni** | Precaricamento HSTS abilitato con età massima di 2 anni | Integrato |
| **Aut** | `AUTH_SECRET` è un valore casuale forte | Manuale |
| **Aut** | I cookie di sessione utilizzano `httpOnly` , `secure` , `sameSite` | Integrato |
| **Aut** | Tutte le azioni del server utilizzano `validatedActionWithUser` | Recensione |
| **RBAC** | Autorizzazioni controllate su ogni percorso protetto | Recensione |
| **RBAC** | L'accesso come super amministratore richiede l'assegnazione esplicita del ruolo | Integrato |
| **Inserimento** | Convalida Zod su tutti gli input dei moduli e sui payload API | Recensione |
| **Inserimento** | Nessuna query SQL non elaborata (solo Drizzle ORM) | Recensione |
| **Crono** | Gli endpoint Cron verificano `CRON_SECRET` | Recensione |
| **Segreti** | Tutti i segreti ruotati e specifici dell'ambiente | Manuale |
| **CSP** | Politica di sicurezza dei contenuti rivista per i domini di produzione | Manuale |
| **Deps** | L'analisi CodeQL viene eseguita settimanalmente sulla codebase | Integrato |
| **Deps** | Dipendenze controllate ( `pnpm audit` ) | Manuale |

## Segnalazione di problemi di sicurezza

Se scopri una vulnerabilità nella sicurezza, segnalala in privato:

- **E-mail**: security@ever.co
- **Non** aprire un problema pubblico di GitHub per vulnerabilità di sicurezza.
- Includere fasi di riproduzione e valutazione dell'impatto quando possibile.
