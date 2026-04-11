---
id: voting-comments-deep-dive
title: הצבעות והערות Deep Dive
sidebar_label: הצבעות והערות Deep Dive
sidebar_position: 36
---

# הצבעות והערות Deep Dive

צלילה עמוקה זו מכסה את המכניקה הפנימית של מערכות ההצבעה וההערות, כולל אלגוריתמי עדכונים אופטימיים, אסטרטגיות ניהול מטמון, צבירת דירוג, תיאום אירועים חוצי רכיבים וזרימות עבודה של ניהול ניהול.

## סקירה כללית של אדריכלות

```
hooks/
  use-item-vote.ts           # Vote hook with optimistic mutations and cache utilities
  use-comments.ts            # Comment CRUD hook with rating integration
  use-admin-comments.ts      # Admin moderation hook with pagination

app/api/items/[id]/
  votes/route.ts             # GET/POST/DELETE vote endpoints
  comments/route.ts          # GET/POST comment endpoints
  comments/[commentId]/route.ts  # PUT/DELETE single comment
  comments/rating/route.ts   # POST/PUT/GET rating endpoints

lib/db/schema.ts             # votes and comments table definitions
```

## פנימיים במערכת ההצבעה

### useItemVote Hook

הקרס מנהל מצב הצבעה עבור פריט בודד עם תמיכה מלאה בעדכון אופטימי:

```ts
interface ItemVoteResponse {
  count: number;
  userVote: 'up' | 'down' | null;
}

function useItemVote(itemId: string) {
  // Returns: voteCount, userVote, isLoading, handleVote, refreshVotes
}
```

### מכונת מצב הצבעה

הפונקציה `handleVote` מיישמת מכונת מצב המבוססת על החלפת מצב:

| מצב נוכחי | פעולה | תוצאה | שינוי נטו |
|-------------|--------|--------|----------------|
| אין הצבעה | לחץ למעלה | הצבעה בעד | +1 |
| אין הצבעה | לחץ למטה | הצבעה כלפי מטה | -1 |
| הצביע בעד | לחץ למעלה | הסר הצבעה (כבה) | -1 |
| הצביע בעד | לחץ למטה | עבור להצבעה מטה | -2 |
| הצביע נגד | לחץ למטה | הסר הצבעה (כבה) | +1 |
| הצביע נגד | לחץ למעלה | עבור להצבעה בעד | +2 |

כאשר ההצבעה הנוכחית של המשתמש תואמת לסוג המבוקש, ה-hook קורא `unvote()` (DELETE). אחרת הוא קורא `vote(type)` (POST).

### חישוב ספירה אופטימית

העדכון האופטימי מחשב את הפרש הספירה מבלי לחכות לשרת:

```ts
onMutate: async (type) => {
  const previousVotes = queryClient.getQueryData(['item-votes', itemId]);
  queryClient.setQueryData(['item-votes', itemId], (old) => {
    if (!old) return { count: type === 'up' ? 1 : -1, userVote: type };
    const countDiff = old.userVote === type ? -1
      : old.userVote === null ? 1
      : 2; // switching direction
    return {
      count: old.count + (type === 'up' ? countDiff : -countDiff),
      userVote: old.userVote === type ? null : type
    };
  });
  return { previousVotes };
},
```

החישוב `countDiff` מטפל בשלושה מקרים: ביטול (הורדת 1), הצבעה חדשה (הוספת 1) ושינוי כיוון (הוסף 2 עבור התנועה המלאה).

### שער אימות

משתמשים לא מאומתים שמנסים להצביע מוצגים שיטת התחברות במקום לקבל שגיאה:

```ts
if (!user) {
  loginModal.onOpen('Please sign in to vote on this item');
  throw new Error('Authentication required');
}
```

השגיאה נתפסת על ידי המטפל `onError` של המוטציה, אשר בודק את הודעת האימות ומדכא את טוסט השגיאה.

### תצורת שאילתה

```ts
staleTime: 1000 * 60 * 5,  // 5 minutes
gcTime: 1000 * 60 * 30,    // 30 minutes garbage collection
retry: (failureCount, error) => {
  if (error.message.includes('sign in')) return false; // No retry for auth errors
  return failureCount < 2;                              // 2 retries for other errors
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
```

### כלי עזר למטמון הצבעה

הוו `useVoteCache` מספק פעולות מטמון חוצות רכיבים:

```ts
function useVoteCache() {
  return {
    invalidateAllVotes,    // Invalidate all vote queries
    invalidateItemVotes,   // Invalidate votes for a specific item
    clearVoteCache,        // Remove all vote data from cache
    prefetchItemVotes,     // Pre-fetch votes for an item (e.g., on hover)
  };
}
```

## הערות פנימיות מערכת

### השתמש ב-Comments Hook

הקרס מספק פעולות CRUD מלאות עם תמיכת דירוג משולבת:

```ts
interface CreateCommentData {
  content: string;
  itemId: string;
  rating: number;
}

interface UpdateCommentData {
  commentId: string;
  content?: string;
  rating?: number;
}
```

### ערך החזרה

| נכס | הקלד | תיאור |
|--------|------|--------|
| `comments` | `CommentWithUser[]` | הערות עם נתוני משתמש מאוכלסים |
| `isPending` | `boolean` | נכון במהלך השליפה הראשונית |
| `createComment` | `(data) => Promise` | צור תגובה חדשה |
| `updateComment` | `(data) => Promise` | ערוך הערה קיימת |
| `deleteComment` | `(id) => Promise` | הסר תגובה |
| `rateComment` | `(data) => void` | דרג תגובה |
| `updateCommentRating` | `(data) => void` | עדכן דירוג קיים |
| `commentRating` | `number` | דירוג מצטבר עבור הפריט |

### מערכת אירועים חוצת רכיבים

מערכת ההערות שולחת אירועי DOM מותאמים אישית לתיאום בין רכיבים שאינם חולקים מפתחות מטמון של React Query:

```ts
const COMMENT_MUTATION_EVENT = "comment:mutated";

const dispatchCommentEvent = (comment: CommentWithUser) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_MUTATION_EVENT, { detail: comment }));
};
```

זה מאפשר לרכיבים כמו כותרת פרטי הפריט (המציגה את ספירת ההערות) להגיב לשינויים בהערות מבלי להיות מחוברים ישירות לשאילתת ההערות.

### צבירת דירוג

הערות ודירוגים משולבים באופן הדוק. לאחר כל מוטציה של הערה (יצירה, עדכון, מחיקה), הקרס מאלץ שליפה מחדש של דירוג הפריט:

```ts
onSuccess: async (newComment) => {
  queryClient.setQueryData(['comments', itemId], (old = []) => {
    // Update cache with new comment...
  });
  dispatchCommentEvent(newComment);
  await queryClient.refetchQueries({ queryKey: ['item-rating', itemId] });
},
```

זה מבטיח שתצוגת דירוג הכוכבים מתעדכנת מיד לאחר שמשתמש שולח או עורך ביקורת.

### יציבות שאילתה

שאילתת ההערות משתמשת בהגדרות רענון שמרניות כדי למנוע הבהוב ממשק המשתמש:

```ts
staleTime: 2 * 60 * 1000,      // 2 minutes
gcTime: 10 * 60 * 1000,        // 10 minutes
refetchOnMount: false,           // Don't refetch if data is fresh
refetchOnWindowFocus: false,     // Prevent flash on tab switch
```

## ניהול מנהל

### useAdminComments Hook

קרס הניהול מספק ניהול תגובות מעומד:

```ts
function useAdminComments({ page, limit, search }) {
  return {
    comments: AdminCommentItem[],
    totalComments: number,
    totalPages: number,
    isDeleting: string | null,  // ID of comment being deleted
    deleteComment: (id: string) => Promise<boolean>,
  };
}
```

### זרימת עבודה של ניהול

1. אדמין מנווט לדף ניהול התגובות.
2. הערות מוצגות עם חיפוש ועימוד.
3. המצב `isDeleting` עוקב אחר איזו תגובה מוסרת, ומשבית את השורה שלה.
4. מחיקה מפעילה הודעה למחבר התגובה באמצעות `NotificationService` .

## נקודות קצה של ממשק API

| שיטה | נקודת קצה | תיאור |
|--------|--------|----------------|
| קבל | `/api/items/:id/votes` | אחזר את ספירת ההצבעות והצבעות של המשתמש |
| פוסט | `/api/items/:id/votes` | להצביע או לשנות הצבעה |
| מחק | `/api/items/:id/votes` | הסר הצבעה |
| קבל | `/api/items/:id/comments` | אחזר הערות עם נתוני משתמש |
| פוסט | `/api/items/:id/comments` | צור תגובה חדשה |
| PUT | `/api/items/:id/comments/:commentId` | עדכן תגובה |
| מחק | `/api/items/:id/comments/:commentId` | מחק תגובה |
| פוסט | `/api/items/:id/comments/rating` | דרג תגובה |
| PUT | `/api/items/:id/comments/rating` | עדכן דירוג תגובה |
| קבל | `/api/items/:id/comments/rating` | קבל דירוג פריט מצטבר |

## שילוב דגל תכונה

גם ההצבעות וגם ההערות מכבדות דגלים:

```ts
const flags = getFeatureFlags();
// flags.ratings -- Controls star rating display
// flags.comments -- Controls comment section visibility
```

כאשר מסד הנתונים אינו מוגדר, תכונות אלו מושבתות אוטומטית.

## נגישות

- לחצני הצבעה השתמשו ב- `aria-pressed` כדי לציין את מצב ההצבעה הנוכחי.
- אופן ההתחברות המופעל על ידי ניסיונות הצבעה לא מאומתים כלוא בפוקוס.
- טפסי הערות משתמשים בשיוכים ובהודעות אימות מתאימים.
- רכיב דירוג הכוכבים תומך בניווט במקלדת עם מקשי החצים.
- טבלאות ניהול מנהלים כוללות מחווני מצב ברמת השורה ופעולות נגישות למקלדת.
- מצבי טעינה ושגיאה מספקים תכונות `aria-busy` ו- `role="alert"` בהתאמה.

## תיעוד קשור

- [סקירה כללית של הצבעות והערות](/docs/template/features/voting-comments) -- סקירת תכונה ברמה גבוהה
- [רכיבי פרטי פריט](/docs/template/components/item-detail-components) -- היכן מוצגות הצבעות והערות
- [מערכת התראות](/docs/template/features/notification-system) -- התראות המופעלות על ידי הערות
- [רכיבי לוח מחוונים](/docs/template/components/dashboard-components) -- ניתוח הצבעות והערות
