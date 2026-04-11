---
id: best-practices
title: Best Practices
sidebar_label: Best Practices
sidebar_position: 4
---

# Best Practices

Impara gli standard di codifica, i modelli e le best practice utilizzati in Ever Works.

## 🎯 Obiettivi

- ✅ Comprendere le best practice di TypeScript
- ✅ Seguire pattern React e tecniche di ottimizzazione
- ✅ Applicare best practice per il database
- ✅ Implementare linee guida di sicurezza
- ✅ Ottimizzare per le prestazioni
- ✅ Scrivere codice pulito e manutenibile

**Tempo stimato**: 1–2 giorni

---

## Best Practice TypeScript

### Usa Tipi Espliciti

```typescript
// ❌ Evita any implicito
function processData(data) {
  return data.map(item => item.value);
}

// ✅ Usa tipi espliciti
function processData(data: Array<{ value: number }>): number[] {
  return data.map(item => item.value);
}
```

### Usa Type Guard

```typescript
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  );
}
```

[Scopri di più su TypeScript →](https://www.typescriptlang.org/docs/)

---

## Best Practice React

### Usa la Memoizzazione

```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

### Crea Hook Personalizzati

```typescript
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  return { user, loading, error };
}
```

[Scopri di più su React →](/architecture/tech-stack#frontend)

---

## Best Practice Database

### Usa le Transazioni

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values(newUser);
  await tx.insert(profiles).values(newProfile);
  await tx.insert(settings).values(defaultSettings);
});
```

### Aggiungi Indici Appropriati

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
}));
```

[Scopri di più su Drizzle ORM →](https://orm.drizzle.team)

---

## Best Practice di Sicurezza

### Valida Tutti gli Input

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const result = schema.safeParse(req.body);
if (!result.success) {
  return NextResponse.json(
    { error: 'Validation failed', details: result.error },
    { status: 400 }
  );
}
```

### Implementa Rate Limiting

```typescript
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const identifier = request.ip ?? 'anonymous';
  const { success } = await rateLimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
}
```

[Scopri di più sulla sicurezza →](/deployment/production-checklist#security)

---

## Ottimizzazione delle Prestazioni

### Code Splitting

```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});
```

### Ottimizzazione delle Immagini

```typescript
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Immagine principale"
  width={1200}
  height={600}
  priority
  placeholder="blur"
/>
```
