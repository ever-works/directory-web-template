---
id: best-practices
title: أفضل الممارسات
sidebar_label: أفضل الممارسات
sidebar_position: 4
---

# أفضل الممارسات

تعلّم معايير كتابة الكود والأنماط وأفضل الممارسات المتّبعة في Ever Works.

## 🎯 الأهداف

- ✅ فهم أفضل ممارسات TypeScript
- ✅ اتباع أنماط React وأساليب التحسين
- ✅ تطبيق أفضل ممارسات قواعد البيانات
- ✅ تنفيذ توصيات الأمان
- ✅ تحسين الأداء
- ✅ كتابة كود نظيف وقابل للصيانة

**الوقت التقديري**: يوم إلى يومين

---

## أفضل ممارسات TypeScript

### استخدام الأنواع الصريحة

```typescript
// ❌ تجنب الـ any الضمني
function processData(data) {
  return data.map(item => item.value);
}

// ✅ استخدام الأنواع الصريحة
function processData(data: Array<{ value: number }>): number[] {
  return data.map(item => item.value);
}
```

### استخدام حراس الأنواع

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

[اعرف المزيد عن TypeScript →](https://www.typescriptlang.org/docs/)

---

## أفضل ممارسات React

### استخدام مذكرة الحساب

```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

### إنشاء خطافات مخصصة

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

[اعرف المزيد عن React →](/architecture/tech-stack#frontend)

---

## أفضل ممارسات قواعد البيانات

### استخدام المعاملات

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values(newUser);
  await tx.insert(profiles).values(newProfile);
  await tx.insert(settings).values(defaultSettings);
});
```

### إضافة فهارس مناسبة

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
}));
```

[اعرف المزيد عن Drizzle ORM →](https://orm.drizzle.team)

---

## أفضل ممارسات الأمان

### التحقق من جميع المدخلات

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

### تنفيذ تحديد معدل الطلبات

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

[اعرف المزيد عن الأمان →](/deployment/production-checklist#security)

---

## تحسين الأداء

### تقسيم الكود

```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});
```

### تحسين الصور

```typescript
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="الصورة الرئيسية"
  width={1200}
  height={600}
  priority
  placeholder="blur"
/>
```
