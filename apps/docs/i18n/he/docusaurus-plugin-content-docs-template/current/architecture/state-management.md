---
id: state-management
title: "הנהלת המדינה"
sidebar_label: "הנהלת המדינה"
sidebar_position: 26
---

# הנהלת המדינה

התבנית משתמשת בגישת ניהול מצב שכבות: **React Query** (TanStack Query) עבור מצב שרת, **React Context** עבור הגדרות ממשק משתמש גלובליות, ו**מצב רכיב מקומי** עבור בעיות UI ארעיות. דף זה מכסה כל שכבה, תצורת לקוח השאילתה ותבניות בשימוש בכל בסיס הקוד.

## קטגוריות מדינה

|קטגוריה|כלי|דוגמאות|
|----------|------|----------|
|מצב שרת|תגובה לשאילתה|נתוני משתמש, פריטים, קטגוריות, סטטיסטיקות מנהל|
|מצב ממשק משתמש גלובלי|ההקשר של תגובה|ערכת נושא, פריסה, סוג עימוד, רוחב מיכל|
|מצב ממשק משתמש מקומי|`useState` / `useReducer`|פתיחה/סגירה מודאלית, כניסות טפסים, נראות של תפריט נפתח|
|העדפות נמשכות|`localStorage` באמצעות הקשר|מפתח ערכת נושא, מפתח פריסה, פריטים לכל עמוד|

## תצורת שאילתה תגובה

לקוח השאילתה נוצר ב-`lib/query-client.ts` באמצעות פונקציית יצרן המטפלת הן בסביבות השרת והן בסביבות הדפדפן:

```tsx
// lib/query-client.ts
import { isServer, QueryClient } from '@tanstack/react-query';

export function createQueryClientInstance(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,      // 5 minutes
        gcTime: 10 * 60 * 1000,         // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
        retry: (failureCount) => failureCount < 2,
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
        onError: (error) => {
          toast.error(`Mutation Error: ${error.message}`);
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export const getQueryClient = () => {
  if (isServer) {
    return createQueryClientInstance();
  } else {
    if (!browserQueryClient) browserQueryClient = createQueryClientInstance();
    return browserQueryClient;
  }
};
```

החלטות עיצוב מפתח:
- **בידוד שרת**: נוצר `QueryClient` חדש לכל בקשת שרת כדי למנוע דליפת נתונים בין משתמשים
- **Singleton של דפדפן**: נעשה שימוש חוזר במופע בודד במהלך הפעלת הדפדפן
- **אחזור שמרני**: `refetchOnWindowFocus` ו-`refetchOnMount` מושבתים כברירת מחדל כדי למזער את תעבורת הרשת
- **גיבוי אקספוננציאלי**: עיכובים בניסיון חוזר כפולים עם כל ניסיון, מוגבל ל-30 שניות

## מפעל מפתח שאילתות

קובץ `react-query-config.ts` ייעודי מגדיר מפעלי מפתח שאילתות לניהול עקבי של מטמון:

```tsx
// lib/react-query-config.ts
export const queryKeys = {
  billing: {
    all: ['billing'] as const,
    subscription: () => [...queryKeys.billing.all, 'subscription'] as const,
    payments: () => [...queryKeys.billing.all, 'payments'] as const,
    user: (userId: string) => [...queryKeys.billing.all, 'user', userId] as const,
  },
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    settings: () => [...queryKeys.user.all, 'settings'] as const,
  },
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
    subscriptions: () => [...queryKeys.admin.all, 'subscriptions'] as const,
  },
};
```

דפוס היצרן הזה מאפשר ביטול מטמון ממוקד. לדוגמה, `invalidateQueries({ queryKey: queryKeys.billing.all })` מנקה את כל השאילתות הקשורות לחיוב בבת אחת.

## כלי עזר לאי תוקף מטמון

```tsx
// lib/react-query-config.ts
export const cacheUtils = {
  invalidateBilling: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
  },
  invalidateSubscription: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription() });
  },
  resetCache: () => {
    queryClient.clear();
  },
};
```

## אסטרטגיות אחזור מראש

```tsx
export const prefetchStrategies = {
  billing: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.billing.subscription(),
      queryFn: async () => { /* API call */ },
      staleTime: 5 * 60 * 1000,
    });
  },
  userProfile: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.user.profile(),
      queryFn: async () => { /* API call */ },
      staleTime: 10 * 60 * 1000,
    });
  },
};
```

אלה נקראים באופן יזום כאשר משתמשים מנווטים לדפים שיזדקקו לנתונים אלה.

## דפוס Hook: useCurrentUser

הוו `hooks/use-current-user.ts` מדגים את תבנית הוו הסטנדרטית לאיסוף הנתונים:

```tsx
// hooks/use-current-user.ts
export const CURRENT_USER_QUERY_KEY = ['auth-session'] as const;

export function useCurrentUser() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError, error, refetch } =
    useQuery<User, UseCurrentUserError>({
      queryKey: CURRENT_USER_QUERY_KEY,
      queryFn: fetchCurrentUser,
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: (failureCount, error) => {
        if (error.status === 401 || error.status === 403) return false;
        return failureCount < 2;
      },
    });

  const invalidateUserCache = () => {
    queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
  };

  return { user, isLoading, isError, error, refetch, invalidateUserCache };
}
```

דפוסי הדגשה:
- **מפתח שאילתה מיוצא**: מאפשר ל-hooks אחרים לבטל או לקרוא את המטמון הזה
- **ניסיון חוזר חכם**: שגיאות אימות לעולם אינן נוסעות שוב
- **עוזרים מטמון**: `invalidateUserCache`, `prefetchUser`, ו-`setUserData` נחשפים לשימוש חיצוני

## עדכונים אופטימיים: השתמש במועדפים

הוו `hooks/use-favorites.ts` מדגים דפוסי עדכון אופטימיים:

```tsx
// hooks/use-favorites.ts (simplified)
const addFavoriteMutation = useMutation({
  mutationFn: addFavorite,
  onMutate: async (newFavorite) => {
    await queryClient.cancelQueries({ queryKey: ['favorites'] });
    const previousFavorites =
      queryClient.getQueryData<Favorite[]>(['favorites']) ?? [];

    // Optimistically add the item
    queryClient.setQueryData<Favorite[]>(['favorites'], (old = []) => [
      ...old,
      { id: `temp-${Date.now()}`, ...newFavorite },
    ]);

    return { previousFavorites };
  },
  onError: (err, _newFavorite, context) => {
    // Rollback on failure
    if (context) {
      queryClient.setQueryData(['favorites'], context.previousFavorites);
    }
    toast.error(err.message || 'Failed to add to favorites');
  },
  onSuccess: (realFavorite) => {
    // Replace temp item with server response
    queryClient.setQueryData<Favorite[]>(['favorites'], (old = []) =>
      old.map((fav) =>
        fav.id.startsWith('temp-') && fav.itemSlug === realFavorite.itemSlug
          ? realFavorite
          : fav
      )
    );
  },
});
```

התבנית עוקבת אחר שלושה שלבים:
1. **onMutate**: בטל שאילתות בטיסה, מצב תמונת מצב, החל עדכון אופטימי
2. **onError**: חזרה לתמונת המצב
3. **onSuccess**: החלף את הנתונים האופטימיים בתגובת השרת האמיתית

## מצב ממשק משתמש גלובלי: LayoutThemeContext

ה-`components/context/LayoutThemeContext.tsx` מספק ה-React Context לכל העדפות הממשק הגלובלי:

```tsx
// components/context/LayoutThemeContext.tsx
interface LayoutThemeContextType {
  layoutKey: LayoutKey;
  setLayoutKey: (key: LayoutKey) => void;
  themeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
  currentTheme: ThemeConfig;
  paginationType: PaginationType;
  setPaginationType: (type: PaginationType) => void;
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
  containerWidth: ContainerWidth;
  setContainerWidth: (width: ContainerWidth) => void;
  // ... more settings
}
```

כל הגדרה עוקבת אחר אותה דפוס פנימי באמצעות ווי מנהל ייעודי:

```tsx
const useThemeManager = () => {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>(DEFAULT_THEME);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = safeLocalStorage.getItem('themeKey');
    if (saved && isValidThemeKey(saved)) {
      setThemeKeyState(saved);
    }
  }, []);

  const setThemeKey = useCallback((key: ThemeKey) => {
    setThemeKeyState(key);
    safeLocalStorage.setItem('themeKey', key);
    applyThemeWithPalettes(key);
  }, []);

  return { themeKey, setThemeKey, currentTheme };
};
```

עקרונות עיצוב:
- **בטיחות הידרציה**: המצב תמיד מאתחל עם ברירות מחדל; localStorage נקרא רק ב-`useEffect` לאחר הטעינה
- **אימות**: כל מגדיר מאמת קלט לפני היישום
- **התמדה**: כל ההעדפות מסונכרנות ל-`localStorage` באופן אוטומטי
- **סנכרון משתני CSS**: שינויים בערכת הנושא עדכנו מיד את מאפייני ה-CSS המותאמים אישית ב-`document.documentElement`

## מפתחות שאילתה לכל הוק ב-Admin Hooks

כל הוק CRUD מנהל מגדיר את מרחב השמות של מפתח השאילתה שלו:

```tsx
// hooks/use-admin-categories.ts
const QUERY_KEYS = {
  categories: ['admin', 'categories'] as const,
  categoriesList: (params) =>
    [...QUERY_KEYS.categories, 'list', params] as const,
  allCategories: () =>
    [...QUERY_KEYS.categories, 'all'] as const,
  category: (id: string) =>
    [...QUERY_KEYS.categories, 'detail', id] as const,
};
```

מוטציות מתבטלות ברמת מרחב השמות כדי להבטיח שכל השאילתות הקשורות מתרעננות:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
},
```

## הפניה לקובץ

|קובץ|מטרה|
|------|---------|
|`lib/query-client.ts`|מפעל לקוח שאילתה (שרת לעומת דפדפן)|
|`lib/react-query-config.ts`|שאילתות במפעלי מפתח, כלי עזר למטמון, אסטרטגיות שליפה מראש|
|`lib/api/constants.ts`|זמני ברירת מחדל מיושנים וקבועים של תצורת שאילתה|
|`components/context/LayoutThemeContext.tsx`|הקשר גלובלי של הגדרות ממשק משתמש עם התמדה של LocalStorage|
|`hooks/use-current-user.ts`|וו שליפת נתונים לדוגמה עם ניהול מטמון|
|`hooks/use-favorites.ts`|דוגמה לדפוס עדכון אופטימי|
|`hooks/use-admin-categories.ts`|דוגמה ל-CRUD של מנהל מערכת עם ריווח שמות של מפתח שאילתה|
