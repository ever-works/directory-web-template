---
title: "התחלה מהירה"
sidebar_label: "התחלה מהירה"
sidebar_position: 2
---

# התחלה מהירה

## שלב 1: הגדרת config.yml

ערוך את קובץ `config.yml` להגדרת הפרמטרים הבסיסיים של הספרייה שלך.

## שלב 2: Fork מאגר הנתונים

1. בצע Fork למאגר הנתונים ב-GitHub
2. הגדר את משתני הסביבה הבאים:
   - `DATA_REPOSITORY` – כתובת ה-URL של המאגר שעשית לו Fork
   - `GH_TOKEN` – GitHub access token שלך

## שלב 3: הפעל שרת פיתוח

```bash
pnpm run dev
```

פתח את [http://localhost:3000](http://localhost:3000) בדפדפן.

## שלב 4: הוסף את הפריט הראשון

צור קובץ YAML חדש בתיקיית הנתונים:

```yaml
name: "הכלי שלי"
description: "תיאור הכלי"
url: "https://example.com"
category: "כלים"
```
