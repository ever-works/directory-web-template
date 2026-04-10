---
id: docker
title: פריסת Docker
sidebar_label: Docker
sidebar_position: 2
---

# פריסת Docker

פרוס את אתר הדירקטוריון Ever Works שלך באמצעות מיכלי Docker.

## דרישות מוקדמות

- Docker מותקן במערכת שלך
- Docker Compose (אופציונלי אך מומלץ)

## התחלה מהירה עם Docker

### 1. בניית תמונת Docker

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Build the Docker image
docker build -t ever-works-website .
```

### 2. הפעלת המיכל

```bash
# Run the container
docker run -p 3000:3000 ever-works-website
```

האתר שלך יהיה נגיש דרך `http://localhost:3000`.

## תצורת Docker Compose

צור קובץ `docker-compose.yml`:

```yaml
version: '3.8'

services:
    app:
        build: .
        ports:
            - '3000:3000'
        environment:
            - NODE_ENV=production
            - NEXT_PUBLIC_API_BASE_URL=https://your-api.com
        volumes:
            - ./.content:/app/.content
        restart: unless-stopped

    # Optional: Add a database service
    postgres:
        image: postgres:15
        environment:
            POSTGRES_DB: everworks
            POSTGRES_USER: user
            POSTGRES_PASSWORD: password
        volumes:
            - postgres_data:/var/lib/postgresql/data
        restart: unless-stopped

volumes:
    postgres_data:
```

### הפעלה עם Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## משתני סביבה

הגדר את הפריסה שלך עם משתני סביבה:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=postgresql://user:password@postgres:5432/everworks

# Optional
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## שיקולי ייצור

### אבטחה

- השתמש בניהול סודות לנתונים רגישים
- אפשר HTTPS עם reverse proxy (nginx, Traefik)
- עדכוני אבטחה קבועים

### ביצועים

- השתמש ב-multi-stage builds לצמצום גודל התמונה
- הגדר מגבלות משאבים מתאימות
- אפשר שמירת מטמון לשכבות

### ניטור

- הוסף בדיקות בריאות
- הגדר רישום
- הגדר ניטור והתראות

## הצעדים הבאים

- [משתני סביבה](/docs/deployment/environment-variables) - הגדר את הפריסה
- [ניטור](/docs/deployment/monitoring) - נטר את האפליקציה
- [תמיכה](/docs/advanced-guide/support) - קבל עזרה
