# إعداد بيئة التطوير المحلية

يوجهك هذا الدليل خلال إعداد بيئة تطوير محلية كاملة لـ Ever Works.

## المتطلبات المسبقة

تأكد من تثبيت ما يلي:

- **Node.js 20.x أو أعلى** - [تنزيل](https://nodejs.org/)
- **pnpm** - [تثبيت](https://pnpm.io/installation) (مدير حزم الـ monorepo)
- **Git** - [تنزيل](https://git-scm.com/)
- **PostgreSQL** (اختياري) - [تنزيل](https://postgresql.org/)
- **Docker** (اختياري) - [تنزيل](https://docker.com/)

## إعداد بيئة التطوير

### 1. الاستنساخ والتثبيت

```bash
# Clone the repository
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Install all dependencies from the monorepo root
pnpm install
```

### 2. تهيئة البيئة

انسخ ملف البيئة النموذجي إلى دليل تطبيق الويب:

```bash
cp apps/web/.env.example apps/web/.env.local
```

قم بتهيئة ملف `apps/web/.env.local` الخاص بك:

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

### 3. إعداد قاعدة البيانات (اختياري)

#### الخيار أ: PostgreSQL المحلية

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

#### الخيار ب: Docker PostgreSQL

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

#### الخيار ج: Supabase

1. أنشئ مشروعاً على [Supabase](https://supabase.com)
2. احصل على سلسلة الاتصال من الإعدادات → قاعدة البيانات
3. حدّث `DATABASE_URL` في `apps/web/.env.local`
4. شغّل الهجرات من `apps/web/`: `pnpm run db:migrate`

### 4. إعداد مستودع المحتوى

#### استنساخ مستودع البيانات

1. انتقل إلى [awesome-data](https://github.com/ever-works/awesome-data)
2. انقر على "Fork" لإنشاء نسختك الخاصة
3. حدّث `DATA_REPOSITORY` في `apps/web/.env.local`

#### إنشاء رمز GitHub

1. انتقل إلى GitHub Settings → Developer settings → Personal access tokens
2. أنشئ رمزاً جديداً (كلاسيك)
3. حدد النطاقات: `repo` و`read:user` و`user:email`
4. انسخ الرمز المُنشأ وأضفه إلى `GH_TOKEN` في `apps/web/.env.local`
5. **مهم**: لا تقم أبداً بإضافة الرمز إلى نظام التحكم في الإصدارات

### 5. تشغيل خادم التطوير

```bash
# From the monorepo root — starts all apps (web, docs, etc.)
pnpm run dev

# Or start only the web app
pnpm run dev:web
```

سيكون تطبيقك متاحاً على [http://localhost:3000](http://localhost:3000).

## سكريبتات التطوير

### السكريبتات الأساسية (من جذر الـ monorepo)

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

### سكريبتات قاعدة البيانات (تُشغَّل داخل `apps/web/`)

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

### سكريبتات المحتوى (تُشغَّل داخل `apps/web/`)

```bash
cd apps/web

# Sync content from Git
pnpm run content:sync

# Validate content files
pnpm run content:validate

# Generate content types
pnpm run content:types
```

## أدوات التطوير

### إعداد VS Code

ثبّت الإضافات الموصى بها:

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

قم بتهيئة إعدادات VS Code (`.vscode/settings.json`):

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

### أدوات المتصفح

#### React Developer Tools

- ثبّت [React DevTools](https://react.dev/learn/react-developer-tools)
- افحص شجرة المكونات والخصائص
- حلّل أداء المكونات

#### Redux DevTools (لـ Zustand)

- ثبّت [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- راقب تغييرات الحالة
- تصحيح الأخطاء بالتنقل عبر الزمن

### أدوات قاعدة البيانات

#### Drizzle Studio

```bash
cd apps/web && pnpm run db:studio
```

- متصفح قاعدة بيانات مرئي
- واجهة منشئ الاستعلامات
- تصوير المخطط

#### pgAdmin (لـ PostgreSQL)

- ثبّت [pgAdmin](https://www.pgadmin.org/)
- اتصل بقاعدة البيانات المحلية
- أدوات استعلام متقدمة

## إعادة التحميل الساخن

يدعم خادم التطوير إعادة التحميل الساخن لـ:

- **مكونات React** - تحديثات فورية
- **مسارات API** - إعادة تشغيل تلقائية
- **Tailwind CSS** - تحديثات أنماط مباشرة
- **TypeScript** - فحص أنواع في الوقت الفعلي

### استكشاف أخطاء إعادة التحميل الساخن

إذا توقفت إعادة التحميل الساخن عن العمل:

```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Restart development server
pnpm run dev
```

## متغيرات البيئة

### التطوير مقابل الإنتاج

أنشئ ملفات بيئة مختلفة داخل `apps/web/`:

```bash
apps/web/.env.local          # Local development
apps/web/.env.development    # Development environment
apps/web/.env.staging        # Staging environment
apps/web/.env.production     # Production environment
```

### التحقق من صحة متغيرات البيئة

يتحقق التطبيق من متغيرات البيئة عند بدء التشغيل:

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

## إعداد الاختبارات

### اختبارات الوحدة

```bash
# Run tests (from monorepo root)
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

### اختبارات E2E

اختبارات E2E موجودة في حزمة workspace الخاصة بها `apps/web-e2e/` (`@ever-works/web-e2e`).

```bash
# From the monorepo root
pnpm run --filter @ever-works/web-e2e test:e2e

# Or from the E2E directory
cd apps/web-e2e
pnpm exec playwright test

# Run tests in UI mode
pnpm exec playwright test --ui
```

## التصحيح

### تصحيح جانب الخادم

أضف إلى `package.json`:

```json
{
	"scripts": {
		"dev:debug": "NODE_OPTIONS='--inspect' next dev"
	}
}
```

ثم الصق المصحح في VS Code أو Chrome DevTools.

### تصحيح جانب العميل

استخدم أدوات المتصفح أو أضف نقاط توقف:

```typescript
// Add debugger statement
debugger;

// Or use console methods
console.log('Debug info:', data);
console.table(items);
console.group('API Response');
```

### تصحيح API

تفعيل تسجيل API:

```bash
# In apps/web/.env.local
DEBUG=api:*
LOG_LEVEL=debug
```

## مراقبة الأداء

### تحليل الحزمة

```bash
# Analyze bundle size (from apps/web/)
cd apps/web && pnpm run analyze
```

### تحليل الأداء

```bash
# Enable React profiling
NEXT_PUBLIC_REACT_PROFILING=true pnpm run dev:web
```

## مشكلات التطوير الشائعة

### المنفذ مشغول بالفعل

```bash
# Use different port
pnpm run dev:web -- -p 3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### مشكلات تحليل الوحدات

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules pnpm-lock.yaml
pnpm install
```

### أخطاء TypeScript

```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Or check types manually
pnpm run type-check
```

### مشكلات الاتصال بقاعدة البيانات

```bash
# Check database is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -p 5432 -U postgres -d everworks_dev
```

## سير عمل التطوير

### 1. تطوير ميزة

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

### 2. فحص جودة الكود

```bash
# Run all checks
pnpm run check

# Individual checks
pnpm run lint
pnpm run type-check
pnpm run test
pnpm run format:check
```

### 3. تغييرات قاعدة البيانات

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

## الخطوات التالية

بيئة التطوير المحلية الخاصة بك جاهزة الآن! يمكنك البدء في تطوير تطبيق Ever Works الخاص بك.
