---
title: "התקנה"
sidebar_label: "התקנה"
sidebar_position: 1
---

# התקנה

## דרישות מוקדמות

- **Node.js >= 20.19.0**
- **pnpm** – מנהל חבילות
- **Git**
- **PostgreSQL** (אופציונלי לפיתוח מקומי)

## דרישות מערכת

- **מערכת הפעלה**: Windows, macOS או Linux
- **זיכרון RAM**: לפחות 4 GB
- **שטח אחסון**: לפחות 2 GB

## שלבי ההתקנה

### 1. שכפול המאגר

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
```

### 2. התקנת תלויות

```bash
pnpm install
```

### 3. הגדרת הסביבה

```bash
cp apps/web/.env.example apps/web/.env.local
```

### 4. הגדרת המשתנים

ערוך את `apps/web/.env.local` והגדר את הערכים הדרושים.

### 5. הפעלת שרת הפיתוח

```bash
pnpm run dev
```
