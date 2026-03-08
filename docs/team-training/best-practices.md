---
id: best-practices
title: Best Practices
sidebar_label: Best Practices
sidebar_position: 4
---

# Best Practices

Learn the coding standards, patterns, and best practices used in Ever Works.

## 🎯 Objectives

By the end of this module, you will:

- ✅ Understand TypeScript best practices
- ✅ Follow React patterns and optimization techniques
- ✅ Apply database best practices
- ✅ Implement security guidelines
- ✅ Optimize for performance
- ✅ Write clean, maintainable code

**Estimated time**: 1-2 days

---

## TypeScript Best Practices

### Use Explicit Types

```typescript
// ❌ Avoid implicit any
function processData(data) {
  return data.map(item => item.value);
}

// ✅ Use explicit types
function processData(data: Array<{ value: number }>): number[] {
  return data.map(item => item.value);
}
```

### Avoid `any`

```typescript
// ❌ Don't use any
const fetchData = async (): Promise<any> => {
  // ...
};

// ✅ Define proper types
interface UserData {
  id: string;
  name: string;
  email: string;
}

const fetchData = async (): Promise<UserData> => {
  // ...
};
```

### Use Type Guards

```typescript
// ✅ Type guards for runtime safety
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  );
}

if (isUser(data)) {
  // TypeScript knows data is User here
  console.log(data.email);
}
```

### Use Discriminated Unions

```typescript
// ✅ Discriminated unions for state management
type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: string };

function handleState(state: RequestState) {
  switch (state.status) {
    case 'idle':
      return 'Not started';
    case 'loading':
      return 'Loading...';
    case 'success':
      return state.data.name; // TypeScript knows data exists
    case 'error':
      return state.error; // TypeScript knows error exists
  }
}
```

[Learn more about TypeScript →](https://www.typescriptlang.org/docs/)

---

## React Best Practices

### Use Memoization

```typescript
// ✅ Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

// ✅ Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);

// ✅ Memoize components
const MemoizedComponent = memo(({ data }) => {
  return <div>{data}</div>;
});
```

### Create Custom Hooks

```typescript
// ✅ Extract reusable logic into custom hooks
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

// Usage
function UserProfile({ userId }: { userId: string }) {
  const { user, loading, error } = useUser(userId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>{user?.name}</div>;
}
```

### Avoid Unnecessary Re-renders

```typescript
// ❌ Creates new object on every render
<Component style={{ margin: 10 }} />

// ✅ Define outside component or use useMemo
const style = { margin: 10 };
<Component style={style} />

// ❌ Inline function creates new reference
<button onClick={() => handleClick(id)}>Click</button>

// ✅ Use useCallback
const handleButtonClick = useCallback(() => {
  handleClick(id);
}, [id]);
<button onClick={handleButtonClick}>Click</button>
```

### Component Structure

```typescript
// ✅ Consistent component structure
export function UserCard({ user }: { user: User }) {
  // 1. Hooks
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useTheme();

  // 2. Derived state
  const displayName = user.name || user.email;

  // 3. Event handlers
  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // 4. Effects
  useEffect(() => {
    // Side effects
  }, []);

  // 5. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

[Learn more about React →](/docs/architecture/tech-stack#frontend)

---

## Database Best Practices

### Use Transactions

```typescript
// ✅ Use transactions for related operations
await db.transaction(async (tx) => {
  await tx.insert(users).values(newUser);
  await tx.insert(profiles).values(newProfile);
  await tx.insert(settings).values(defaultSettings);
});
```

### Use Prepared Statements

```typescript
// ✅ Drizzle ORM uses prepared statements automatically
const user = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### Add Proper Indexing

```typescript
// ✅ Add indexes for frequently queried fields
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(), // Automatically indexed
  createdAt: timestamp('created_at').notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}));
```

### Validate Data

```typescript
// ✅ Validate before insertion
const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(50),
  age: z.number().min(18).max(120),
});

const validatedData = userSchema.parse(userData);
await db.insert(users).values(validatedData);
```

[Learn more about Drizzle ORM →](https://orm.drizzle.team)

---

## Security Best Practices

### Validate All Input

```typescript
// ✅ Always validate user input
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

### Use Parameterized Queries

```typescript
// ✅ Drizzle ORM prevents SQL injection
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, userEmail)); // Safe

// ❌ Never use raw SQL with user input
// const user = await db.execute(`SELECT * FROM users WHERE email = '${userEmail}'`);
```

### Sanitize Output

```typescript
// ✅ Sanitize HTML content
import DOMPurify from 'isomorphic-dompurify';

const sanitizedContent = DOMPurify.sanitize(userContent);
```

### Implement Rate Limiting

```typescript
// ✅ Rate limit sensitive endpoints
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

  // Process request
}
```

[Learn more about security →](/docs/deployment/production-checklist#security)

---

## Performance Optimization

### Code Splitting

```typescript
// ✅ Dynamic imports for code splitting
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false, // Disable SSR if not needed
});
```

### Image Optimization

```typescript
// ✅ Use Next.js Image component
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority // For above-the-fold images
  placeholder="blur"
/>
```

### Virtualization

```typescript
// ✅ Virtualize long lists
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      {virtualizer.getVirtualItems().map(virtualItem => (
        <div key={virtualItem.index}>
          {items[virtualItem.index].name}
        </div>
      ))}
    </div>
  );
}
```

### Caching Strategies

```typescript
// ✅ Use React Query for server state
const { data, isLoading } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

[Learn more about performance →](/docs/deployment/production-checklist#performance)

---

## Code Quality

### DRY (Don't Repeat Yourself)

```typescript
// ❌ Repetitive code
function getUserEmail(userId: string) {
  const user = await db.select().from(users).where(eq(users.id, userId));
  return user?.email;
}

function getUserName(userId: string) {
  const user = await db.select().from(users).where(eq(users.id, userId));
  return user?.name;
}

// ✅ Extract common logic
async function getUser(userId: string) {
  return await db.select().from(users).where(eq(users.id, userId)).limit(1);
}

function getUserEmail(userId: string) {
  const user = await getUser(userId);
  return user?.email;
}

function getUserName(userId: string) {
  const user = await getUser(userId);
  return user?.name;
}
```

### SOLID Principles

Follow SOLID principles for maintainable code:

- **S**ingle Responsibility: Each function/component does one thing
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable for their base types
- **I**nterface Segregation: Many specific interfaces better than one general
- **D**ependency Inversion: Depend on abstractions, not concretions

[Learn more about SOLID in React →](https://medium.com/@ignatovich.dm/applying-solid-principles-in-react-applications-44eda5e4b664)

### Consistent Naming

```typescript
// ✅ Consistent naming conventions
// Components: PascalCase
export function UserProfile() {}

// Hooks: camelCase with 'use' prefix
export function useUser() {}

// Constants: UPPER_SNAKE_CASE
export const MAX_RETRIES = 3;

// Functions: camelCase
export function fetchUserData() {}

// Types/Interfaces: PascalCase
export interface User {}
export type UserRole = 'admin' | 'user';
```

---

## Additional Resources

### Internal Documentation

- [Tech Stack](/docs/architecture/tech-stack) - Technologies and versions
- [Testing Guide](/docs/development/testing) - Testing strategies
- [Production Checklist](/docs/deployment/production-checklist) - Production readiness

### External Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [SOLID Principles in React](https://medium.com/@ignatovich.dm/applying-solid-principles-in-react-applications-44eda5e4b664)

---

## Next Steps

After learning best practices:

1. [Exercises](/docs/team-training/exercises) - Practice with real tasks
2. Apply these practices in your daily work
3. Share knowledge with the team

:::tip Code Reviews
The best way to learn and enforce best practices is through code reviews. Always request reviews and learn from feedback.
:::

Ready to practice? Move on to [Exercises](/docs/team-training/exercises)! 🚀

