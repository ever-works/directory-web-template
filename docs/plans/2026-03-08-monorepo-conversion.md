# Monorepo Conversion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the Next.js app in `template/` into a Turborepo + PNPM monorepo with apps/web, apps/web-e2e, apps/docs, and shared config packages.

**Architecture:** Turborepo orchestrates builds across a PNPM workspace. The Next.js app moves to `apps/web`, Playwright tests to `apps/web-e2e`, Docusaurus docs (template-only) to `apps/docs`. Shared TypeScript and ESLint configs live in `packages/`. GitHub Actions updated for Turbo pipeline.

**Tech Stack:** Turborepo, PNPM workspaces, Next.js 16, Playwright, Docusaurus v3, ESLint 9 flat config, TypeScript 5

---

### Task 1: Create monorepo directory skeleton

**Files:**
- Create: `apps/` directory
- Create: `packages/` directory

**Step 1: Create directory structure**

```bash
cd template
mkdir -p apps packages/tsconfig packages/eslint-config
```

**Step 2: Verify**

```bash
ls -d apps packages packages/tsconfig packages/eslint-config
```

Expected: All four directories exist.

---

### Task 2: Create root monorepo config files

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create new root: `package.json` (the current one will move to apps/web)

**Step 1: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "build/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "cache": false
    },
    "clean": {
      "cache": false
    }
  }
}
```

**Step 3: Create root package.json**

The root package.json is a minimal workspace root. All Next.js deps stay in apps/web.

```json
{
  "name": "ever-works-monorepo",
  "version": "0.1.0",
  "private": true,
  "license": "AGPL-3.0",
  "packageManager": "pnpm@9.15.4",
  "engines": {
    "node": ">=20.19.0"
  },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test:e2e": "turbo run test:e2e",
    "clean": "turbo run clean",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,md,json}\""
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "prettier": "^3.5.3"
  },
  "prettier": {
    "printWidth": 120,
    "singleQuote": true,
    "semi": true,
    "useTabs": true,
    "tabWidth": 4,
    "arrowParens": "always",
    "trailingComma": "none",
    "quoteProps": "as-needed",
    "trimTrailingWhitespace": true,
    "overrides": [
      {
        "files": "*.scss",
        "options": {
          "useTabs": false,
          "tabWidth": 2
        }
      },
      {
        "files": "*.yml",
        "options": {
          "useTabs": false,
          "tabWidth": 2
        }
      }
    ]
  }
}
```

**Step 4: Commit**

```bash
git add pnpm-workspace.yaml turbo.json package.json
git commit -m "chore: add monorepo root config (turbo + pnpm workspace)"
```

---

### Task 3: Create packages/tsconfig

**Files:**
- Create: `packages/tsconfig/package.json`
- Create: `packages/tsconfig/base.json`
- Create: `packages/tsconfig/nextjs.json`
- Create: `packages/tsconfig/playwright.json`

**Step 1: Create package.json**

```json
{
  "name": "@ever-works/tsconfig",
  "version": "0.0.0",
  "private": true,
  "license": "AGPL-3.0",
  "files": ["base.json", "nextjs.json", "playwright.json"]
}
```

**Step 2: Create base.json**

Extracted from the current `tsconfig.json`, minus Next.js specifics:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true
  },
  "exclude": ["node_modules"]
}
```

**Step 3: Create nextjs.json**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

**Step 4: Create playwright.json**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "extends": "./base.json",
  "compilerOptions": {
    "types": ["node"],
    "noEmit": true
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 5: Commit**

```bash
git add packages/tsconfig/
git commit -m "chore: add shared tsconfig package"
```

---

### Task 4: Create packages/eslint-config

**Files:**
- Create: `packages/eslint-config/package.json`
- Create: `packages/eslint-config/nextjs.mjs`

**Step 1: Create package.json**

```json
{
  "name": "@ever-works/eslint-config",
  "version": "0.0.0",
  "private": true,
  "license": "AGPL-3.0",
  "exports": {
    "./nextjs": "./nextjs.mjs"
  },
  "dependencies": {
    "@typescript-eslint/eslint-plugin": "^8.48.0",
    "@typescript-eslint/parser": "^8.48.0",
    "eslint-plugin-react": "^7.37.5",
    "eslint-plugin-react-hooks": "^7.0.1"
  },
  "peerDependencies": {
    "eslint": "^9"
  }
}
```

**Step 2: Create nextjs.mjs**

This is the current `eslint.config.mjs` content, but exported as a function that takes a `tsconfigPath` param:

```javascript
// Shared ESLint 9 flat config for Next.js apps
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default function nextjsConfig(tsconfigPath = "./tsconfig.json") {
  return [
    {
      ignores: [
        "**/node_modules/**",
        "**/.next/**",
        "**/out/**",
        "**/build/**",
        "**/dist/**",
        "**/*.config.js",
        "**/*.config.ts",
        "**/*.config.mjs",
      ],
    },
    {
      files: ["**/*.{js,jsx,ts,tsx}"],
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      plugins: {
        react,
        "react-hooks": reactHooks,
      },
      settings: {
        react: {
          version: "detect",
        },
      },
      rules: {
        "no-unused-vars": "off",
        "no-console": "off",
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
    {
      files: ["**/*.{ts,tsx}"],
      languageOptions: {
        parser: typescriptParser,
        ecmaVersion: "latest",
        sourceType: "module",
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
          project: tsconfigPath,
        },
      },
      plugins: {
        "@typescript-eslint": typescriptEslint,
      },
      rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
        ],
        "no-console": "off",
      },
    },
  ];
}
```

**Step 3: Commit**

```bash
git add packages/eslint-config/
git commit -m "chore: add shared eslint-config package"
```

---

### Task 5: Move Next.js app to apps/web

This is the big move. We move ALL files from the template root into `apps/web/`, EXCEPT for the monorepo root files we already created, `.github/`, and `e2e/`.

**Files:**
- Move: everything except `.github/`, `e2e/`, `pnpm-workspace.yaml`, `turbo.json`, root `package.json`, `docs/plans/`, `packages/`, `apps/`
- Keep in root: `.github/`, `.gitignore`, `pnpm-workspace.yaml`, `turbo.json`, root `package.json`

**Step 1: Move all app files into apps/web**

Move all files and directories that belong to the Next.js app. This includes: `app/`, `components/`, `lib/`, `hooks/`, `public/`, `scripts/`, `types/`, `utils/`, `i18n/`, `messages/`, `constants/`, `templates/`, `.content/`, `docs/` (the internal docs like code-review, NOT our plans), and all config files (`next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `drizzle.config.ts`, `auth.config.ts`, `sentry.config.ts`, `instrumentation.ts`, `vercel.json`, `.env.example`, `middleware.ts`, etc.).

**IMPORTANT:** Do NOT move: `.github/`, `e2e/`, `pnpm-workspace.yaml`, `turbo.json`, the NEW root `package.json`, `packages/`, `apps/`, `.git/`, `.gitignore`, `.npmrc`

Use `git mv` for all moves to preserve history.

The approach:
1. List everything in root that should move
2. `git mv` each item to `apps/web/`

```bash
# Move all app directories
for dir in app components lib hooks public scripts types utils i18n messages constants templates .content; do
  [ -d "$dir" ] && git mv "$dir" apps/web/
done

# Move all app config files
for file in next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs eslint.config.mjs drizzle.config.ts auth.config.ts sentry.config.ts instrumentation.ts vercel.json .env.example middleware.ts sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts; do
  [ -f "$file" ] && git mv "$file" apps/web/
done

# Move the current package.json as apps/web/package.json
git mv package.json apps/web/package.json
```

Wait - we already created a root package.json. So we need to:
1. Rename the current package.json to a temp name first, OR
2. Move it differently

Better approach: Since we already wrote the root package.json, we should have saved the original first. The correct sequence is:

```bash
# 1. Temporarily rename the original package.json
mv package.json apps/web/package.json

# 2. The root package.json was already created in Task 2
# If it was overwritten, recreate it
```

Actually, since this is a plan for execution, the executing agent should:
1. First save/backup the original package.json content
2. Write the new root package.json
3. Move the original to apps/web/package.json

**Step 2: Move remaining loose files**

```bash
# Check for any remaining files that should move
for file in $(ls -A | grep -v -E '^(\.git|\.github|\.gitignore|\.npmrc|apps|packages|pnpm-workspace\.yaml|turbo\.json|package\.json|node_modules|pnpm-lock\.yaml|e2e|docs)$'); do
  git mv "$file" apps/web/ 2>/dev/null || mv "$file" apps/web/
done
```

Note: `docs/plans/` can stay at root level OR move into apps/web. Since it's project-level docs, keep at root. The internal `docs/` folder (code-review-2026-02.md) should move to apps/web.

**Step 3: Update apps/web/package.json**

The moved package.json needs these changes:
- Remove the `prettier` config (moved to root)
- Remove devDependencies that are now in shared packages (`eslint`, `@typescript-eslint/*`, `eslint-plugin-react`, `eslint-plugin-react-hooks`)
- Add workspace dependencies: `"@ever-works/tsconfig": "workspace:*"`, `"@ever-works/eslint-config": "workspace:*"`
- Update `test:e2e` scripts to remove `--config=e2e/playwright.config.ts` (e2e is now a separate app)
- Remove e2e-related scripts entirely (they live in apps/web-e2e now)
- Keep the `pnpm` section (overrides, publicHoistPattern, onlyBuiltDependencies)

**Step 4: Update apps/web/tsconfig.json**

Replace the content to extend the shared config:

```json
{
  "extends": "@ever-works/tsconfig/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    "scripts/generate-openapi.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

**Step 5: Update apps/web/eslint.config.mjs**

Replace with:

```javascript
import nextjsConfig from "@ever-works/eslint-config/nextjs";

export default nextjsConfig("./tsconfig.json");
```

**Step 6: Verify the apps/web structure**

```bash
ls apps/web/package.json apps/web/next.config.ts apps/web/tsconfig.json apps/web/app/
```

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: move Next.js app to apps/web"
```

---

### Task 6: Move E2E tests to apps/web-e2e

**Files:**
- Move: `e2e/` contents → `apps/web-e2e/`
- Create: `apps/web-e2e/package.json`
- Update: `apps/web-e2e/tsconfig.json`
- Update: `apps/web-e2e/playwright.config.ts`

**Step 1: Move e2e folder**

```bash
git mv e2e apps/web-e2e
```

**Step 2: Create apps/web-e2e/package.json**

```json
{
  "name": "@ever-works/web-e2e",
  "version": "0.0.0",
  "private": true,
  "license": "AGPL-3.0",
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:chromium": "playwright test --project=chromium",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug"
  },
  "devDependencies": {
    "@ever-works/tsconfig": "workspace:*",
    "@playwright/test": "^1.58.2",
    "@faker-js/faker": "^10.1.0",
    "dotenv": "^16.4.7",
    "typescript": "^5"
  }
}
```

**Step 3: Update apps/web-e2e/tsconfig.json**

Replace the content (it currently extends `../tsconfig.json` which is no longer valid):

```json
{
  "extends": "@ever-works/tsconfig/playwright.json",
  "include": ["./**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 4: Update apps/web-e2e/playwright.config.ts**

The dotenv path changes from `../.env.local` to `../web/.env.local` (since we're now in apps/web-e2e, sibling to apps/web):

```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',

  fullyParallel: true,
  workers: isCI ? 2 : 1,

  retries: isCI ? 2 : 0,

  reporter: isCI
    ? [['html', { open: 'never', outputFolder: './playwright-report' }], ['github'], ['list']]
    : [['html', { open: 'on-failure', outputFolder: './playwright-report' }], ['list']],

  timeout: 60_000,
  expect: { timeout: 30_000 },

  globalSetup: path.resolve(__dirname, './global-setup.ts'),
  globalTeardown: path.resolve(__dirname, './global-teardown.ts'),

  use: {
    baseURL,
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: isCI ? 'on-first-retry' : 'off',
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: isCI ? 'pnpm --filter @ever-works/web build && pnpm --filter @ever-works/web start' : 'pnpm --filter @ever-works/web dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: isCI ? 300_000 : 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
```

Key changes:
- dotenv path: `../web/.env.local` instead of `../.env.local`
- webServer command: uses `pnpm --filter @ever-works/web` to run the web app

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: move e2e tests to apps/web-e2e"
```

---

### Task 7: Copy Docusaurus to apps/docs

**Files:**
- Copy: entire `../../docs/website/` → `apps/docs/`
- Delete: `apps/docs/docs/platform/` directory
- Delete: `apps/docs/sidebarsPlatform.ts`
- Delete: `apps/docs/node_modules/` (will be reinstalled)
- Delete: `apps/docs/build/` (generated output)
- Delete: `apps/docs/.docusaurus/` (cache)
- Update: `apps/docs/docusaurus.config.ts` (remove platform plugin + navbar/footer references)
- Update: `apps/docs/package.json` (change name)

**Step 1: Copy the full docs/website directory**

```bash
cp -r "../../docs/website" apps/docs
```

Note: The path is relative from `template/`. The actual absolute path is `E:/Coding/Ever Works/Code/docs/website`.

**Step 2: Remove platform-specific content**

```bash
rm -rf apps/docs/docs/platform
rm -f apps/docs/sidebarsPlatform.ts
rm -rf apps/docs/node_modules
rm -rf apps/docs/build
rm -rf apps/docs/.docusaurus
rm -rf apps/docs/.yarn
rm -f apps/docs/.yarnrc.yml
rm -f apps/docs/yarn.lock
rm -f apps/docs/pnpm-lock.yaml
```

**Step 3: Update apps/docs/docusaurus.config.ts**

Remove the platform plugin entry and platform navbar/footer items:

1. Remove the `platform` plugin block:
```typescript
// REMOVE THIS:
[
  "@docusaurus/plugin-content-docs",
  {
    id: "platform",
    path: "./docs/platform/",
    routeBasePath: "platform",
    sidebarPath: "./sidebarsPlatform.ts",
    editUrl: "https://github.com/ever-works/ever-works-docs/tree/main/",
  },
],
```

2. Remove platform from search plugin `docsRouteBasePath` and `docsDir`:
```typescript
// Change from:
docsRouteBasePath: ["docs", "template", "platform"],
docsDir: ["docs/intro", "docs/template", "docs/platform"],
// To:
docsRouteBasePath: ["docs", "template"],
docsDir: ["docs/intro", "docs/template"],
```

3. Remove platform navbar item:
```typescript
// REMOVE THIS:
{
  type: "docSidebar",
  sidebarId: "platformSidebar",
  docsPluginId: "platform",
  position: "left",
  label: "Platform",
},
```

4. Remove platform footer link:
```typescript
// REMOVE THIS from footer links:
{
  label: "Platform",
  to: "/platform",
},
```

**Step 4: Update apps/docs/package.json**

Change the name:
```json
"name": "@ever-works/docs"
```

Remove the `resolutions` field (that's Yarn-specific, we use PNPM).

Add a `lint` script (even if it's a no-op, Turbo needs it):
```json
"scripts": {
  ...existing scripts...,
  "lint": "echo 'No lint configured for docs'"
}
```

**Step 5: Commit**

```bash
git add apps/docs/
git commit -m "chore: add template docs (Docusaurus) to apps/docs"
```

---

### Task 8: Update root .gitignore for monorepo

**Files:**
- Update: `.gitignore`

**Step 1: Update .gitignore**

Replace with a monorepo-aware gitignore:

```gitignore
# dependencies
node_modules
.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions
.pnp.js

# turbo
.turbo

# testing
coverage
**/auth-states/
**/test-results/
**/playwright-report/
**/.playwright/

# next.js
.next/
out/

# docusaurus
apps/docs/build/
apps/docs/.docusaurus/

# production
build
dist

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files
.env*
!.env.example

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# content
.content
analyze/

# vscode
.github/instructions/codacy.instructions.md

# cache
.cache
.pnpm-debug.log

# OpenAPI
public/openapi.backup.json
**/*.backup.openapi.json
**/openapi.backup.json

# claude
.claude
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: update .gitignore for monorepo"
```

---

### Task 9: Update root .npmrc

**Files:**
- Update: `.npmrc`

**Step 1: Update .npmrc**

```
public-hoist-pattern[]=*@heroui/*
shamefully-hoist=true
```

The `shamefully-hoist=true` helps with Docusaurus and some packages that expect hoisted node_modules.

**Step 2: Commit**

```bash
git add .npmrc
git commit -m "chore: update .npmrc for monorepo"
```

---

### Task 10: Update GitHub Actions for monorepo

**Files:**
- Update: `.github/workflows/ci.yml`
- Update: `.github/workflows/deploy_vercel.yaml`
- Update: `.github/workflows/codeql.yml`
- Keep as-is: `.github/workflows/deploy_dev.yaml`, `.github/workflows/deploy_prod.yaml`, `.github/workflows/disable-default-codeql.yml`

**Step 1: Update ci.yml**

Replace the package manager detection with explicit PNPM setup, and use Turbo for orchestration:

```yaml
name: CI
permissions:
  contents: read
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

concurrency:
  group: ${{ github.ref }}-${{ github.workflow }}
  cancel-in-progress: true

jobs:
  lint-and-build:
    name: Lint and Build
    runs-on: ubuntu-latest

    env:
      NEXT_PUBLIC_APP_URL: http://localhost:3000
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
      AUTH_SECRET: "ci-test-secret-not-for-production"
      DATA_REPOSITORY: "ci-test-repo-not-used"
      CONTENT_WARNINGS_SILENT: "true"
      CI: "true"
      TURBO_TELEMETRY_DISABLED: 1

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run lint
        run: pnpm run lint
        continue-on-error: ${{ github.event_name == 'pull_request' }}

      - name: Create content directories
        run: |
          mkdir -p apps/web/.content/data
          echo "Created content directories for build"

      - name: Build project
        run: pnpm run build
        env:
          NEXT_PUBLIC_APP_URL: ${{ env.NEXT_PUBLIC_APP_URL }}
          AUTH_SECRET: ${{ env.AUTH_SECRET }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL || env.DATABASE_URL }}
          GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID || '' }}
          GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET || '' }}
          GITHUB_CLIENT_ID: ${{ secrets.GITHUB_CLIENT_ID || '' }}
          GITHUB_CLIENT_SECRET: ${{ secrets.GITHUB_CLIENT_SECRET || '' }}
          FB_CLIENT_ID: ${{ secrets.FACEBOOK_CLIENT_ID || '' }}
          FB_CLIENT_SECRET: ${{ secrets.FACEBOOK_CLIENT_SECRET || '' }}
          TWITTER_CLIENT_ID: ${{ secrets.TWITTER_CLIENT_ID || '' }}
          TWITTER_CLIENT_SECRET: ${{ secrets.TWITTER_CLIENT_SECRET || '' }}
          DATA_REPOSITORY: ${{ secrets.DATA_REPOSITORY || '' }}
          GH_TOKEN: ${{ secrets.GH_TOKEN || '' }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY || '' }}
          EMAIL_FROM: ${{ secrets.EMAIL_FROM || 'info@ever.works' }}

      - name: Check for build success
        run: |
          if [ -d "apps/web/.next" ]; then
            echo "Build successful"
          else
            echo "Build failed"
            exit 1
          fi
```

**Step 2: Update deploy_vercel.yaml**

The key change: Vercel deployment is scoped to `apps/web`. Add working directory context:

Changes needed:
- Add `pnpm install` before build steps
- The Vercel link/build should work from root since Vercel detects monorepo structure
- Update the cron script path to `apps/web/scripts/update-cron.ts`

```yaml
# In the "Build project artifacts (CLI fallback)" step, change:
      - name: Build project artifacts (CLI fallback)
        if: steps.trigger_deployment.outcome == 'failure'
        run: |
          SCOPE_FLAG=""
          [ -n "${{ secrets.VERCEL_TEAM_SCOPE }}" ] && SCOPE_FLAG="--scope ${{ secrets.VERCEL_TEAM_SCOPE }}"
          PROD_FLAG=""
          [ "${{ inputs.environment }}" = "production" ] && PROD_FLAG="--prod"
          vercel build $SCOPE_FLAG $PROD_FLAG --token=$VERCEL_TOKEN

# In the "Update cron schedule" step, change the script path:
      - name: Update cron schedule
        if: success() && steps.trigger_deployment.outputs.deployment_id != ''
        env:
          VERCEL_PROJECT_ID: ${{ github.event.repository.name }}
          VERCEL_DEPLOYMENT_ID: ${{ steps.trigger_deployment.outputs.deployment_id }}
          VERCEL_PLAN: ${{ secrets.VERCEL_PLAN }}
        run: npx tsx apps/web/scripts/update-cron.ts
```

Also replace the package manager detection with explicit PNPM:
- Remove the "Detect package manager" step
- Change "Setup pnpm" to always run (remove the `if` condition)
- Change `${{ steps.detect-pm.outputs.global-cmd }}` to `pnpm add --global`

**Step 3: Update codeql.yml**

Similar changes - replace package manager detection with explicit PNPM, update content directory path:

- Remove "Detect package manager" step
- Always setup PNPM
- Change install command to `pnpm install`
- Update autobuild env to work with monorepo
- Change CodeQL setup script path to `apps/web/scripts/codeql-setup.js` (if it exists there)

**Step 4: Commit**

```bash
git add .github/workflows/
git commit -m "chore: update GitHub Actions for monorepo (pnpm + turbo)"
```

---

### Task 11: Install dependencies and verify

**Step 1: Clean old artifacts**

```bash
# Remove old node_modules and lock file from root
rm -rf node_modules
rm -f pnpm-lock.yaml
```

**Step 2: Install all workspace dependencies**

```bash
pnpm install
```

This should:
- Create a single `pnpm-lock.yaml` at root
- Install deps for all workspace packages
- Link workspace packages (`@ever-works/tsconfig`, `@ever-works/eslint-config`)

**Step 3: Verify lint works**

```bash
pnpm run lint
```

Expected: ESLint runs across all apps via Turbo.

**Step 4: Verify web app builds**

```bash
pnpm run build --filter @ever-works/web
```

Note: This may require env variables. In CI it uses defaults, locally it needs `.env.local`.

**Step 5: Verify docs builds**

```bash
pnpm run build --filter @ever-works/docs
```

**Step 6: Commit lock file**

```bash
git add pnpm-lock.yaml
git commit -m "chore: add pnpm lockfile for monorepo"
```

---

### Task 12: Final cleanup and verification

**Step 1: Remove stale files from root**

Check for any files that should have been moved but weren't:

```bash
ls -la
# Should only see: .git, .github, .gitignore, .npmrc, apps/, packages/, docs/,
# pnpm-workspace.yaml, turbo.json, package.json, pnpm-lock.yaml, node_modules/
```

If there are leftover files (like `postcss.config.mjs`, `tailwind.config.ts`, etc.), move them to `apps/web/`.

**Step 2: Verify dev server starts**

```bash
pnpm --filter @ever-works/web dev
```

Expected: Next.js dev server starts on localhost:3000.

**Step 3: Verify Turbo pipeline**

```bash
pnpm turbo run build --dry
```

Expected: Shows the build order: packages first, then apps.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: complete monorepo conversion (turbo + pnpm)"
```

---

## Post-Migration Notes

- **Vercel**: May need to set "Root Directory" to `apps/web` in Vercel project settings, OR configure `vercel.json` at root level
- **IDE**: VSCode should pick up the workspace via `pnpm-workspace.yaml`. May need to reload window.
- **Import paths**: All `@/*` imports within apps/web continue to work unchanged
- **Adding new packages**: Use `pnpm --filter @ever-works/web add <package>` to add deps to specific apps
- **Running scripts in specific apps**: `pnpm --filter @ever-works/web dev`
