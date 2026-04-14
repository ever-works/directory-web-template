---
id: state-management
title: "إدارة الدولة"
sidebar_label: "إدارة الدولة"
sidebar_position: 26
---

# إدارة الدولة

يستخدم القالب أسلوب إدارة الحالة متعدد الطبقات: **React Query** (TanStack Query) لحالة الخادم، و**React context** لإعدادات واجهة المستخدم العامة، و**حالة المكون المحلي** لاهتمامات واجهة المستخدم المؤقتة. تغطي هذه الصفحة كل طبقة وتكوين عميل الاستعلام والأنماط المستخدمة في قاعدة التعليمات البرمجية.

## فئات الدولة

|الفئة|أداة|أمثلة|
|----------|------|----------|
|حالة الخادم|رد الاستعلام|بيانات المستخدم والعناصر والفئات وإحصائيات المسؤول|
|حالة واجهة المستخدم العالمية|رد الفعل السياق|السمة والتخطيط ونوع ترقيم الصفحات وعرض الحاوية|
|حالة واجهة المستخدم المحلية|`useState` / `useReducer`|فتح/إغلاق مشروط، مدخلات النموذج، رؤية القائمة المنسدلة|
|التفضيلات المستمرة|`localStorage` عبر السياق|مفتاح السمة، مفتاح التخطيط، العناصر في كل صفحة|

## رد تكوين الاستعلام

يتم إنشاء عميل الاستعلام في `lib/query-client.ts` باستخدام وظيفة المصنع التي تتعامل مع بيئات الخادم والمتصفح:

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

قرارات التصميم الرئيسية:
- **عزل الخادم**: يتم إنشاء `QueryClient` جديد لكل طلب خادم لمنع تسرب البيانات بين المستخدمين
- **المتصفح الفردي**: يتم إعادة استخدام مثيل واحد عبر جلسة المتصفح
- **إعادة الجلب المحافظة**: يتم تعطيل `refetchOnWindowFocus` و`refetchOnMount` افتراضيًا لتقليل حركة مرور الشبكة
- **التراجع الأسي**: إعادة المحاولة يتضاعف التأخير مع كل محاولة، بحد أقصى 30 ثانية

## مصنع مفتاح الاستعلام

يحدد ملف `react-query-config.ts` المخصص مصانع مفاتيح الاستعلام لإدارة ذاكرة التخزين المؤقت بشكل متسق:

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

يتيح نمط المصنع هذا إبطال ذاكرة التخزين المؤقت المستهدفة. على سبيل المثال، `invalidateQueries({ queryKey: queryKeys.billing.all })` يقوم بمسح كافة الاستعلامات المتعلقة بالفواتير مرة واحدة.

## الأدوات المساعدة لإبطال ذاكرة التخزين المؤقت

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

## استراتيجيات الجلب المسبق

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

يتم استدعاؤها بشكل استباقي عندما ينتقل المستخدمون إلى الصفحات التي ستحتاج إلى هذه البيانات.

## نمط الخطاف: useCurrentUser

يوضح الخطاف `hooks/use-current-user.ts` نمط الخطاف القياسي لجلب البيانات:

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

يسلط الضوء على النمط:
- **مفتاح الاستعلام المُصدَّر**: يسمح للخطافات الأخرى بإبطال ذاكرة التخزين المؤقت هذه أو قراءتها
- **إعادة المحاولة الذكية**: لا تتم إعادة محاولة أخطاء المصادقة مطلقًا
- **مساعدي ذاكرة التخزين المؤقت**: `invalidateUserCache`، `prefetchUser`، و`setUserData` معرضون للاستخدام الخارجي

## التحديثات المتفائلة: استخدم المفضلة

يوضح الخطاف `hooks/use-favorites.ts` أنماط التحديث المتفائلة:

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

يتبع النمط ثلاث خطوات:
1. **onMutate**: إلغاء الاستعلامات أثناء الرحلة، وحالة اللقطة، وتطبيق التحديث المتفائل
2. **onError**: الرجوع إلى اللقطة
3. **onSuccess**: استبدل البيانات المتفائلة باستجابة الخادم الحقيقية

## حالة واجهة المستخدم العالمية: LayoutThemeContext

يوفر `components/context/LayoutThemeContext.tsx` سياق رد فعل لجميع تفضيلات واجهة المستخدم العامة:

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

يتبع كل إعداد نفس النمط الداخلي باستخدام خطافات مدير مخصصة:

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

مبادئ التصميم:
- **سلامة الترطيب**: تتم تهيئة الحالة دائمًا بالإعدادات الافتراضية؛ تتم قراءة localStorage فقط في `useEffect` بعد التثبيت
- **التحقق من الصحة**: يقوم كل واضع بالتحقق من صحة الإدخال قبل التقديم
- **الثبات**: تتم مزامنة كافة التفضيلات مع `localStorage` تلقائيًا
- **مزامنة متغيرات CSS**: تعمل تغييرات السمة على تحديث خصائص CSS المخصصة على `document.documentElement` على الفور

## مفاتيح استعلام لكل خطاف في خطافات الإدارة

يحدد كل ربط CRUD للمشرف مساحة اسم مفتاح الاستعلام الخاصة به:

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

يتم إبطال الطفرات على مستوى مساحة الاسم لضمان تحديث جميع الاستعلامات ذات الصلة:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
},
```

## مرجع الملف

|ملف|الغرض|
|------|---------|
|`lib/query-client.ts`|مصنع عميل الاستعلام (الخادم مقابل المتصفح)|
|`lib/react-query-config.ts`|الاستعلام عن المصانع الرئيسية وأدوات ذاكرة التخزين المؤقت واستراتيجيات الجلب المسبق|
|`lib/api/constants.ts`|الأوقات الافتراضية وثوابت تكوين الاستعلام|
|`components/context/LayoutThemeContext.tsx`|سياق إعدادات واجهة المستخدم العامة مع استمرارية التخزين المحلي|
|`hooks/use-current-user.ts`|مثال على ربط جلب البيانات مع إدارة ذاكرة التخزين المؤقت|
|`hooks/use-favorites.ts`|مثال على نمط التحديث المتفائل|
|`hooks/use-admin-categories.ts`|مثال على ربط CRUD للمشرف مع مسافة اسم مفتاح الاستعلام|
