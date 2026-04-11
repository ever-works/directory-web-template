# הגדרת סביבת פיתוח מקומית

מדריך זה יוביל אותך בהגדרת סביבת פיתוח מקומית מלאה עבור Ever Works.

## דרישות מוקדמות

ודא שהתקנת את הדברים הבאים:

- **Node.js 20.x ומעלה** - [הורדה](https://nodejs.org/)
- **pnpm** - [התקנה](https://pnpm.io/installation) (מנהל חבילות ה-monorepo)
- **Git** - [הורדה](https://git-scm.com/)
- **PostgreSQL** (אופציונלי) - [הורדה](https://postgresql.org/)
- **Docker** (אופציונלי) - [הורדה](https://docker.com/)

## הגדרת סביבת הפיתוח

### 1. שיבוט והתקנה

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Install all dependencies from the monorepo root
pnpm install
```

### 2. הגדרת סביבה

העתק את קובץ הסביבה לדוגמה לתיקיית אפליקציית הווב:

```bash
cp apps/web/.env.example apps/web/.env.local
```

הגדר את קובץ `apps/web/.env.local` שלך:

```bash
# Basic Development Configuration
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Authentication
AUTH_SECRET="generate-a-secure-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# GitHub Integration (Required)
GH_TOKEN="your-github-personal-access-token"
DATA_REPOSITORY="https://github.com/your-username/awesome-data"

# Database (Optional)
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. הגדרת מסד נתונים (אופציונלי)

#### אפשרות א: PostgreSQL מקומי

```bash
# Create database
createdb everworks_dev

# Run database commands from the web app directory
cd apps/web

# Run migrations
pnpm run db:generate
pnpm run db:migrate

# Seed with sample data
pnpm run db:seed
```

#### אפשרות ב: Docker PostgreSQL

```bash
# Start PostgreSQL container
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_DB=your_database_name \
  -p 5432:5432 \
  -d postgres:15

# Run migrations (from apps/web/)
pnpm run db:migrate
pnpm run db:seed
```

#### אפשרות ג: Supabase

1. צור פרויקט ב-[Supabase](https://supabase.com)
2. קבל את מחרוזת החיבור מהגדרות → מסד נתונים
3. עדכן את `DATABASE_URL` ב-`apps/web/.env.local`
4. הרץ migrations מ-`apps/web/`: `pnpm run db:migrate`

### 4. הגדרת מאגר תוכן

#### העברת מאגר הנתונים ל-Fork

1. עבור ל-[awesome-data](https://github.com/ever-works/awesome-data)
2. לחץ על "Fork" ליצירת העתק שלך
3. עדכן את `DATA_REPOSITORY` ב-`apps/web/.env.local`

#### יצירת GitHub Token

1. עבור ל-GitHub Settings → Developer settings → Personal access tokens
2. צור token חדש (קלאסי)
3. בחר היקפים: `repo`, `read:user`, `user:email`
4. העתק את ה-token שנוצר והוסף אותו ל-`GH_TOKEN` ב-`apps/web/.env.local`
5. **חשוב**: לעולם אל תבצע commit ל-token לניהול גרסאות

### 5. הפעלת שרת הפיתוח

```bash
# From the monorepo root — starts all apps (web, docs, etc.)
pnpm run dev

# Or start only the web app
pnpm run dev:web
```

האפליקציה שלך תהיה זמינה בכתובת [http://localhost:3000](http://localhost:3000).

## סקריפטים לפיתוח

### סקריפטים מרכזיים (מתיקיית שורש ה-monorepo)

```bash
# Start all dev servers (web, docs, etc.)
pnpm run dev

# Start only the web app
pnpm run dev:web

# Build all apps
pnpm run build

# Type checking
pnpm run type-check

# Linting
pnpm run lint
pnpm run lint:fix

# Code formatting
pnpm run format
pnpm run format:check
```

### סקריפטי מסד נתונים (מריצים בתוך `apps/web/`)

```bash
cd apps/web

# Generate database schema
pnpm run db:generate

# Run migrations
pnpm run db:migrate

# Reset database
pnpm run db:reset

# Seed database
pnpm run db:seed

# Open database studio
pnpm run db:studio
```

### סקריפטי תוכן (מריצים בתוך `apps/web/`)

```bash
cd apps/web

# Sync content from Git
pnpm run content:sync

# Validate content files
pnpm run content:validate

# Generate content types
pnpm run content:types
```

## כלי פיתוח

### הגדרת VS Code

התקן את התוספים המומלצים:

```json
{
	"recommendations": [
		"bradlc.vscode-tailwindcss",
		"esbenp.prettier-vscode",
		"dbaeumer.vscode-eslint",
		"ms-vscode.vscode-typescript-next",
		"formulahendry.auto-rename-tag",
		"christian-kohler.path-intellisense"
	]
}
```

הגדר את הגדרות VS Code (`.vscode/settings.json`):

```json
{
	"editor.formatOnSave": true,
	"editor.defaultFormatter": "esbenp.prettier-vscode",
	"editor.codeActionsOnSave": {
		"source.fixAll.eslint": true
	},
	"typescript.preferences.importModuleSpecifier": "relative",
	"tailwindCSS.experimental.classRegex": [
		["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
		["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
	]
}
```

### כלי דפדפן

#### React Developer Tools

- התקן את [React DevTools](https://react.dev/learn/react-developer-tools)
- בדוק עץ רכיבים ו-props
- נתח ביצועי רכיבים

#### Redux DevTools (עבור Zustand)

- התקן את [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- עקוב אחר שינויי מצב
- ניפוי שגיאות ע"י מסע בזמן

### כלי מסד נתונים

#### Drizzle Studio

```bash
cd apps/web && pnpm run db:studio
```

- דפדפן מסד נתונים ויזואלי
- ממשק בניית שאילתות
- ויזואליזציה של סכמות

#### pgAdmin (עבור PostgreSQL)

- התקן את [pgAdmin](https://www.pgadmin.org/)
- התחבר למסד הנתונים המקומי
- כלי שאילתות מתקדמים

## טעינה חמה מחדש

שרת הפיתוח תומך בטעינה חמה מחדש עבור:

- **רכיבי React** - עדכונים מיידיים
- **מסלולי API** - הפעלה מחדש אוטומטית
- **Tailwind CSS** - עדכוני סגנון חיים
- **TypeScript** - בדיקת טיפוסים בזמן אמת

### פתרון בעיות טעינה חמה מחדש

אם הטעינה החמה מחדש מפסיקה לעבוד:

```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Restart development server
pnpm run dev
```

## משתני סביבה

### פיתוח מול ייצור

צור קבצי סביבה שונים בתוך `apps/web/`:

```bash
apps/web/.env.local          # Local development
apps/web/.env.development    # Development environment
apps/web/.env.staging        # Staging environment
apps/web/.env.production     # Production environment
```

### אימות משתני סביבה

האפליקציה מאמתת משתני סביבה בהפעלה:

```typescript
// apps/web/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']),
	AUTH_SECRET: z.string().min(32),
	GH_TOKEN: z.string().startsWith('ghp_'),
	DATABASE_URL: z.string().url().optional()
});

export const env = envSchema.parse(process.env);
```

## הגדרת בדיקות

### בדיקות יחידה

```bash
# Run tests (from monorepo root)
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

### בדיקות E2E

בדיקות E2E נמצאות בחבילת ה-workspace הייעודית `apps/web-e2e/` (`@ever-works/web-e2e`).

```bash
# From the monorepo root
pnpm run --filter @ever-works/web-e2e test:e2e

# Or from the E2E directory
cd apps/web-e2e
pnpm exec playwright test

# Run tests in UI mode
pnpm exec playwright test --ui
```

## ניפוי שגיאות

### ניפוי שגיאות בצד השרת

הוסף ל-`package.json`:

```json
{
	"scripts": {
		"dev:debug": "NODE_OPTIONS='--inspect' next dev"
	}
}
```

לאחר מכן צרף את ה-debugger ב-VS Code או Chrome DevTools.

### ניפוי שגיאות בצד הלקוח

השתמש בכלי הדפדפן או הוסף נקודות עצירה:

```typescript
// Add debugger statement
debugger;

// Or use console methods
console.log('Debug info:', data);
console.table(items);
console.group('API Response');
```

### ניפוי שגיאות API

הפעל רישום API:

```bash
# In apps/web/.env.local
DEBUG=api:*
LOG_LEVEL=debug
```

## ניטור ביצועים

### ניתוח Bundle

```bash
# Analyze bundle size (from apps/web/)
cd apps/web && pnpm run analyze
```

### פרופיילינג ביצועים

```bash
# Enable React profiling
NEXT_PUBLIC_REACT_PROFILING=true pnpm run dev:web
```

## בעיות פיתוח נפוצות

### הפורט כבר תפוס

```bash
# Use different port
pnpm run dev:web -- -p 3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### בעיות פתרון מודולים

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules pnpm-lock.yaml
pnpm install
```

### שגיאות TypeScript

```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or check types manually
pnpm run type-check
```

### בעיות חיבור למסד נתונים

```bash
# Check database is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -p 5432 -U postgres -d everworks_dev
```

## תהליך עבודת פיתוח

### 1. פיתוח תכונה

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test
pnpm run dev
pnpm run test

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### 2. בדיקת איכות קוד

```bash
# Run all checks
pnpm run check

# Individual checks
pnpm run lint
pnpm run type-check
pnpm run test
pnpm run format:check
```

### 3. שינויי מסד נתונים

```bash
# Run from apps/web/
cd apps/web

# Create migration
pnpm run db:generate

# Apply migration
pnpm run db:migrate

# Test with seed data
pnpm run db:seed
```

## הצעדים הבאים

סביבת הפיתוח המקומית שלך מוכנה! כעת תוכל להתחיל לפתח את אפליקציית Ever Works שלך.
