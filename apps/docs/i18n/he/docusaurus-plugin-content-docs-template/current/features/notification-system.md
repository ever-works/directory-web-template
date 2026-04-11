---
id: notification-system
title: מערכת הודעות צלילת עומק
sidebar_label: מערכת הודעות
sidebar_position: 34
---

# צלילה עמוקה של מערכת התראות

התבנית מספקת מערכת התראות בתוך האפליקציה המגובה על ידי PostgreSQL. הודעות נוצרות על ידי שירותים בצד השרת ונצרכות באמצעות REST API, בעיקר על ידי לוח המחוונים של המנהל. המערכת תומכת במספר סוגי התראות, פעולות אצווה והגדרות סוגים הניתנות להרחבה.

## סקירה כללית של אדריכלות

```
lib/db/schema.ts                    # notifications table definition
lib/services/notification.service.ts # NotificationService with convenience methods

app/api/admin/notifications/
  route.ts                           # GET (list) and POST (create) endpoints
  mark-all-read/route.ts             # POST mark all as read
  [id]/read/route.ts                 # PATCH mark single as read

components/admin/
  admin-notifications.tsx            # Notification dropdown UI
  admin-notification-stats.tsx       # Notification count badges
```

## סכימת מסד נתונים

התראות מאוחסנות בטבלה `notifications` :

```ts
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data'),              // JSON string for extra payload
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIndex: index('notifications_user_idx').on(table.userId),
  typeIndex: index('notifications_type_idx').on(table.type),
  isReadIndex: index('notifications_is_read_idx').on(table.isRead),
  createdAtIndex: index('notifications_created_at_idx').on(table.createdAt),
}));
```

### עיצוב סכימה

- ** `type` עמודה** -- מחרוזת צורה חופשית המקטגת את ההודעה. לא נאכף על ידי מנה, מה שמאפשר סוגים חדשים ללא העברות.
- ** `data` עמודה** -- מאחסן הקשר נוסף כמחרוזת JSON. מנותח בקריאה כדי לגשת למזהי פריט, לתוכן הערות או למידע ספציפי לאירוע.
- ** `isRead` / `readAt` ** -- דגל בוליאני לספירה מהירה שלא נקראה בתוספת חותמת זמן לביקורת.
- **ארבעה אינדקסים** - מכסים חיפוש משתמשים, סינון סוגים, סינון שלא נקרא ורישום כרונולוגי.

## סוגי הודעות

המערכת משתמשת במזהי סוג מבוססי מחרוזת. סוגים מובנים כוללים:

| הקלד | טריגר | נמען טיפוסי |
|------|--------|----------------|
| `item_approved` | מנהל המערכת מאשר פריט שנשלח | מגיש הפריטים |
| `item_rejected` | מנהל המערכת דוחה פריט שנשלח | מגיש הפריטים |
| `comment_received` | מישהו מגיב על פריט של משתמש | בעל פריט |
| `comment_reported` | תגובה מסומנת לבדיקה | אדמין |
| `item_reported` | פריט מסומן לבדיקה | אדמין |
| `user_registered` | משתמש חדש נרשם | אדמין |
| `payment_failed` | ניסיון תשלום נכשל | משתמש מושפע |
| `system_alert` | אזהרה או הודעה ברמת המערכת | אדמין |

### הוספת סוגים מותאמים אישית

1. בחר מחרוזת סוג תיאורית (למשל `survey_response_received` ).
2. הוסף שיטת נוחות ל- `NotificationService` שבונה את המטען הנכון.
3. קרא לשיטה ממסלול ה-API הרלוונטי או השירות.
4. עדכן אופציונלי את התפריט הנפתח של הודעות מנהל כדי להציג סמל מותאם אישית.

אין צורך בהעברת מסד נתונים מכיוון ש- `type` היא עמודת טקסט חופשית.

## שירות הודעות

השירות נמצא בכתובת `lib/services/notification.service.ts` , ומספק שיטות נוחות ליצירת הודעות מקוד בצד השרת:

```ts
class NotificationService {
  static async create(data: CreateNotificationData);
  static async createItemSubmissionNotification(adminUserId, itemId, itemName, submittedBy);
  static async createCommentReportedNotification(adminUserId, commentId, content, reportedBy);
  static async createItemReportedNotification(adminUserId, itemId, itemName, reportedBy);
  static async createUserRegisteredNotification(adminUserId, userName, userEmail);
  static async createPaymentFailedNotification(userId, subscriptionId, errorMessage);
  static async createSystemAlertNotification(adminUserId, title, message);
}
```

כל שיטת נוחות בונה את המטען הנכון `type` , `title` , `message` ו- `data` לפני האצלה לשיטה הגנרית `create` .

### שימוש

```ts
import { NotificationService } from '@/lib/services/notification.service';

// After approving an item
await NotificationService.createItemSubmissionNotification(
  adminUserId, item.id, item.name, item.submittedBy
);

// System-level alert
await NotificationService.createSystemAlertNotification(
  adminUserId, 'Database Warning', 'Connection pool reaching capacity'
);
```

## נקודות קצה של ממשק API

כל נקודות הקצה להודעות דורשות אימות מנהל.

### קבל /api/admin/הודעות

מאחזר את 50 ההתראות העדכניות ביותר עבור המנהל המאומת, ממוינות החדשות ביותר. מחזיר התראות וספירה שלא נקראה בתגובה אחת.

```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 3
  }
}
```

הספירה שלא נקראה משתמשת ב- `SELECT count(*)` נפרד עם `isRead = false` לצורך יעילות.

### POST /api/admin/notifications

יוצר הודעה חדשה עבור משתמש ספציפי.

| שדה | חובה | תיאור |
|-------|--------|--------|
| `type` | כן | מזהה קטגוריית הודעות |
| `title` | כן | טקסט כותרת קצר |
| `message` | כן | טקסט גוף |
| `userId` | כן | מזהה משתמש של הנמען |
| `data` | לא | מטען נוסף (מחרוזת אוטומטית) |

### POST /api/admin/notifications/mark-all-read

מסמן את כל ההתראות שלא נקראו עבור המנהל הנוכחי כנקראו. מגדיר את `isRead = true` ו `readAt` לחותמת הזמן הנוכחית בעדכון אצווה בודד.

### PATCH /api/admin/notifications/[id]/read

מסמן הודעה בודדת כקריאה על ידי תעודת זהות.

## שילוב לוח המחוונים של מנהל מערכת

כותרת המנהל מציגה סמל פעמון עם תג ספירה שלא נקראה. רכיב התפריט הנפתח:

1. מביא הודעות מנקודת הקצה של GET.
2. מציג כל הודעה עם סמלים ספציפיים לסוג וקידוד צבע.
3. מסמן הודעות בודדות כנקראו בלחיצה.
4. מספק פעולה בכמות גדולה של "סמן הכל כנקראו".
5. סקרים על טיימר או רענון בניווט מנהל.

## שיקולים בזמן אמת

היישום הנוכחי משתמש ברענון מבוסס סקרים. עבור עדכונים בזמן אמת, הארכיטקטורה תומכת בנקודות הרחבה:

- **אירועים שנשלחו מהשרת** - הוסף נקודת קצה SSE שמזרימה התראות חדשות.
- **WebSocket** - השתלב עם ספק WebSocket לתקשורת דו-כיוונית.
- **מרווח סקרים** - ניתן להתאמה באמצעות טיימר הרענון של רכיב ההתראות של מנהל המערכת.

## שילוב דוא"ל

מערכת ההתראות מתמקדת בהתראות בתוך האפליקציה. הודעות דוא"ל יוצאות מטופלות בנפרד דרך שירות הדוא"ל (שליחה מחדש/נובו), אך חולקות את אותן נקודות טריגר. כאשר נוצרת התראה באמצעות `NotificationService` , קוד החיוג יכול להפעיל דוא"ל באופן אופציונלי באותה פעולה.

## מבנה מטען נתונים

העמודה `data` מאחסנת מחרוזות JSON עם הקשר ספציפי לאירוע:

```ts
// Item-related notification
{ "itemId": "item_789", "itemName": "Awesome Tool", "itemSlug": "awesome-tool" }

// Comment-related notification
{ "commentId": "comment_123", "content": "Great tool!", "itemId": "item_789" }

// Payment-related notification
{ "subscriptionId": "sub_456", "errorMessage": "Card declined" }
```

סכימה גמישה זו מאפשרת למעבדי הודעות לקשר עומק לדפים רלוונטיים ולהציג מידע הקשרי.

## נגישות

- תג סמל הפעמון משתמש ב- `aria-label` כדי להכריז על ספירת לא נקראו לקוראי מסך.
- פריטי הודעות בתפריט הנפתח ניתנים למיקוד וניתנים לניווט במקלדת.
- סמלים ספציפיים לסוג הם דקורטיביים ( `aria-hidden="true"` ) עם תוויות טקסט המספקות הקשר.
- כפתור "סמן הכל כנקראו" מספק משוב ברור באמצעות הודעת טוסט.
- חותמות זמן משתמשות בעיצוב יחסי ("לפני שעתיים") עם תאריך מלא בתכונות `title` .

## תיעוד קשור

- [רכיבי אדמין](/docs/template/components/admin-components) -- ממשק משתמש להודעות מנהל
- [רכיבי לוח מחוונים](/docs/template/components/dashboard-components) -- סטטיסטיקת התראות
- [דוחות וניהול](/docs/template/features/reports-moderation) -- הודעות שהופעלו על ידי דיווח
- [הצבעה והערות](/docs/template/features/voting-comments) -- התראות המופעלות על ידי תגובות
