---
title: "פריסה ראשונה"
sidebar_label: "פריסה ראשונה"
sidebar_position: 4
---

# פריסה ראשונה

## אפשרות 1: Vercel (מומלץ)

1. דחוף את הקוד ל-GitHub
2. התחבר ל-[vercel.com](https://vercel.com) ויבא את הפרויקט
3. הוסף את משתני הסביבה הנדרשים
4. לחץ על "Deploy"

## אפשרות 2: Docker

```bash
docker build -t directory-web-template .
docker run -p 3000:3000 directory-web-template
```

## אפשרות 3: פריסה ידנית

```bash
pnpm build
pnpm start
```

ודא שכל משתני הסביבה מוגדרים בסביבת הייצור.
