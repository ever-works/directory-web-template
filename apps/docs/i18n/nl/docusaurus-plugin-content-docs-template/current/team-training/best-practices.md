---
id: best-practices
title: Best Practices
sidebar_label: Best Practices
sidebar_position: 4
---

# Best Practices

Leer de codeerstandaarden, patronen en best practices die worden gebruikt in Ever Works.

## 🎯 Leerdoelen

Aan het einde van deze module zult u:

- ✅ TypeScript-best-practices begrijpen
- ✅ React-patronen en optimalisatietechnieken volgen
- ✅ Database-best-practices toepassen
- ✅ Beveiligingsrichtlijnen implementeren
- ✅ Optimaliseren voor prestaties
- ✅ Schone, onderhoudbare code schrijven

**Geschatte tijd**: 1–2 dagen

---

## TypeScript Best Practices

### Expliciete typen gebruiken

```typescript
// ❌ Impliciete any vermijden
function processData(data) {
  return data.map(item => item.value);
}

// ✅ Expliciete typen gebruiken
function processData(data: Array<{ value: number }>): number[] {
  return data.map(item => item.value);
}
```

### `any` vermijden

```typescript
// ✅ Correcte typen definiëren
interface UserData {
  id: string;
  name: string;
  email: string;
}

const fetchData = async (): Promise<UserData> => {
  // ...
};
```

### Typebewakers gebruiken

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

[Meer over TypeScript →](https://www.typescriptlang.org/docs/)

---

## React Best Practices

### Memoïsatie gebruiken

```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

### Aangepaste hooks maken

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

[Meer over React →](/architecture/tech-stack#frontend)

---

## Database Best Practices

### Transacties gebruiken

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values(newUser);
  await tx.insert(profiles).values(newProfile);
  await tx.insert(settings).values(defaultSettings);
});
```

### Goede indexering toevoegen

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
}));
```

[Meer over Drizzle ORM →](https://orm.drizzle.team)

---

## Beveiligings Best Practices

### Alle invoer valideren

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

### Geparameteriseerde zoekopdrachten gebruiken

```typescript
// ✅ Drizzle ORM voorkomt SQL-injectie
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, userEmail));
```

### Rate limiting implementeren

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

[Meer over beveiliging →](/deployment/production-checklist#security)

---

## Prestatie-optimalisatie

### Code-splitting

```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});
```

### Afbeeldingsoptimalisatie

```typescript
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority
  placeholder="blur"
/>
```

### Caching-strategieën

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});
```
