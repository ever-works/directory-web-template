---
id: best-practices
title: Najlepsze Praktyki
sidebar_label: Najlepsze Praktyki
sidebar_position: 4
---

# Najlepsze Praktyki

Poznaj standardy kodowania, wzorce i najlepsze praktyki stosowane w Ever Works.

## 🎯 Cele

- ✅ Rozumieć najlepsze praktyki TypeScript
- ✅ Stosować wzorce React i techniki optymalizacji
- ✅ Stosować najlepsze praktyki baz danych
- ✅ Wdrażać wytyczne bezpieczeństwa
- ✅ Optymalizować wydajność
- ✅ Pisać czysty i utrzymywalny kod

**Szacowany czas**: 1–2 dni

---

## Najlepsze Praktyki TypeScript

### Używaj Jawnych Typów

```typescript
// ❌ Unikaj niejawnego any
function processData(data) {
  return data.map(item => item.value);
}

// ✅ Używaj jawnych typów
function processData(data: Array<{ value: number }>): number[] {
  return data.map(item => item.value);
}
```

### Używaj Strażników Typów

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

[Dowiedz się więcej o TypeScript →](https://www.typescriptlang.org/docs/)

---

## Najlepsze Praktyki React

### Używaj Memoizacji

```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

### Twórz Własne Hooki

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

[Dowiedz się więcej o React →](/architecture/tech-stack#frontend)

---

## Najlepsze Praktyki Baz Danych

### Używaj Transakcji

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values(newUser);
  await tx.insert(profiles).values(newProfile);
  await tx.insert(settings).values(defaultSettings);
});
```

### Dodawaj Odpowiednie Indeksy

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
}));
```

[Dowiedz się więcej o Drizzle ORM →](https://orm.drizzle.team)

---

## Najlepsze Praktyki Bezpieczeństwa

### Waliduj Wszystkie Wejścia

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

### Implementuj Ograniczenie Żądań

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

[Dowiedz się więcej o bezpieczeństwie →](/deployment/production-checklist#security)

---

## Optymalizacja Wydajności

### Podział Kodu

```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});
```

### Optymalizacja Obrazów

```typescript
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Główne zdjęcie"
  width={1200}
  height={600}
  priority
  placeholder="blur"
/>
```
