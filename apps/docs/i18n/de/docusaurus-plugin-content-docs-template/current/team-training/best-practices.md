---
id: best-practices
title: Best Practices
sidebar_label: Best Practices
sidebar_position: 4
---

# Best Practices

Lernen Sie die Codierungsstandards, Muster und Best Practices, die in Ever Works verwendet werden.

## 🎯 Lernziele

Am Ende dieses Moduls werden Sie:

- ✅ TypeScript-Best-Practices verstehen
- ✅ React-Muster und Optimierungstechniken befolgen
- ✅ Datenbank-Best-Practices anwenden
- ✅ Sicherheitsrichtlinien implementieren
- ✅ Für Performance optimieren
- ✅ Sauberen, wartbaren Code schreiben

**Geschätzte Zeit**: 1–2 Tage

---

## TypeScript-Best-Practices

### Explizite Typen verwenden

```typescript
// ❌ Implizites any vermeiden
function processData(data) {
  return data.map(item => item.value);
}

// ✅ Explizite Typen verwenden
function processData(data: Array<{ value: number }>): number[] {
  return data.map(item => item.value);
}
```

### `any` vermeiden

```typescript
// ❌ any nicht verwenden
const fetchData = async (): Promise<any> => {
  // ...
};

// ✅ Richtige Typen definieren
interface UserData {
  id: string;
  name: string;
  email: string;
}

const fetchData = async (): Promise<UserData> => {
  // ...
};
```

### Typwächter verwenden

```typescript
// ✅ Typwächter für Laufzeitsicherheit
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  );
}

if (isUser(data)) {
  // TypeScript weiß hier, dass data ein User ist
  console.log(data.email);
}
```

### Diskriminierte Unions verwenden

```typescript
// ✅ Diskriminierte Unions für State-Management
type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: string };
```

[Mehr über TypeScript →](https://www.typescriptlang.org/docs/)

---

## React-Best-Practices

### Memoization verwenden

```typescript
// ✅ Teure Berechnungen memoifizieren
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

// ✅ Callbacks memoifizieren
const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);

// ✅ Komponenten memoifizieren
const MemoizedComponent = memo(({ data }) => {
  return <div>{data}</div>;
});
```

### Benutzerdefinierte Hooks erstellen

```typescript
// ✅ Wiederverwendbare Logik in benutzerdefinierte Hooks auslagern
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

### Unnötige Neu-Renders vermeiden

```typescript
// ❌ Erstellt bei jedem Render ein neues Objekt
<Component style={{ margin: 10 }} />

// ✅ Außerhalb der Komponente definieren oder useMemo verwenden
const style = { margin: 10 };
<Component style={style} />
```

[Mehr über React →](/architecture/tech-stack#frontend)

---

## Datenbank-Best-Practices

### Transaktionen verwenden

```typescript
// ✅ Transaktionen für verwandte Operationen verwenden
await db.transaction(async (tx) => {
  await tx.insert(users).values(newUser);
  await tx.insert(profiles).values(newProfile);
  await tx.insert(settings).values(defaultSettings);
});
```

### Vorbereitete Anweisungen verwenden

```typescript
// ✅ Drizzle ORM verwendet automatisch vorbereitete Anweisungen
const user = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### Ordnungsgemäße Indizierung hinzufügen

```typescript
// ✅ Indizes für häufig abgefragte Felder hinzufügen
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}));
```

[Mehr über Drizzle ORM →](https://orm.drizzle.team)

---

## Sicherheits-Best-Practices

### Alle Eingaben validieren

```typescript
// ✅ Benutzereingaben immer validieren
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

### Parametrisierte Abfragen verwenden

```typescript
// ✅ Drizzle ORM verhindert SQL-Injection
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, userEmail)); // Sicher

// ❌ Niemals rohes SQL mit Benutzereingaben verwenden
// const user = await db.execute(`SELECT * FROM users WHERE email = '${userEmail}'`);
```

### Ausgabe bereinigen

```typescript
// ✅ HTML-Inhalt bereinigen
import DOMPurify from 'isomorphic-dompurify';

const sanitizedContent = DOMPurify.sanitize(userContent);
```

### Rate-Limiting implementieren

```typescript
// ✅ Sensible Endpunkte mit Rate-Limiting versehen
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
  // Anfrage verarbeiten
}
```

[Mehr über Sicherheit →](/deployment/production-checklist#security)

---

## Performance-Optimierung

### Code-Splitting

```typescript
// ✅ Dynamische Imports für Code-Splitting
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});
```

### Bildoptimierung

```typescript
// ✅ Next.js Image-Komponente verwenden
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

### Virtualisierung

```typescript
// ✅ Lange Listen virtualisieren
import { useVirtualizer } from '@tanstack/react-virtual';
```

### Caching-Strategien

```typescript
// ✅ React Query für Server-State verwenden
const { data, isLoading } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});
```
