---
id: best-practices
title: שיטות עבודה מומלצות
sidebar_label: שיטות עבודה מומלצות
sidebar_position: 4
---

# שיטות עבודה מומלצות

למד את תקני כתיבת קוד, דפוסים ושיטות עבודה מומלצות המשמשים ב-Ever Works.

## 🎯 מטרות

- ✅ להבין שיטות עבודה מומלצות ב-TypeScript
- ✅ לעקוב אחר דפוסי React ושיטות אופטימיזציה
- ✅ ליישם שיטות עבודה מומלצות עם מסדי נתונים
- ✅ לממש המלצות אבטחה
- ✅ לאופטמז ביצועים
- ✅ לכתוב קוד נקי וניתן לתחזוקה

**זמן משוער**: 1–2 ימים

---

## שיטות עבודה מומלצות ב-TypeScript

### השתמש בטיפוסים מפורשים

```typescript
// ❌ הימנע מ-any מרומז
function processData(data) {
  return data.map(item => item.value);
}

// ✅ השתמש בטיפוסים מפורשים
function processData(data: Array<{ value: number }>): number[] {
  return data.map(item => item.value);
}
```

### השתמש ב-Type Guards

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

[למד עוד על TypeScript →](https://www.typescriptlang.org/docs/)

---

## שיטות עבודה מומלצות ב-React

### השתמש ב-Memoization

```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

### צור Hooks מותאמים אישית

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

[למד עוד על React →](/architecture/tech-stack#frontend)

---

## שיטות עבודה מומלצות עם מסדי נתונים

### השתמש בטרנזקציות

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values(newUser);
  await tx.insert(profiles).values(newProfile);
  await tx.insert(settings).values(defaultSettings);
});
```

### הוסף אינדקסים מתאימים

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
}));
```

[למד עוד על Drizzle ORM →](https://orm.drizzle.team)

---

## שיטות עבודה מומלצות לאבטחה

### אמת את כל הקלטים

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

### ממש הגבלת קצב

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

[למד עוד על אבטחה →](/deployment/production-checklist#security)

---

## אופטימיזציית ביצועים

### פיצול קוד

```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});
```

### אופטימיזציית תמונות

```typescript
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="תמונה ראשית"
  width={1200}
  height={600}
  priority
  placeholder="blur"
/>
```
