---
id: ci-cd
title: CI/CD Pipeline
sidebar_label: CI/CD Pipeline
sidebar_position: 3
---

# CI/CD Pipeline

The Ever Works Template includes a complete CI/CD pipeline built with GitHub Actions. This guide covers the workflow structure, security scanning, branch protection strategy, and the deployment promotion flow.

## Workflow Overview

The pipeline consists of six workflow files in `.github/workflows/`:

| Workflow | File | Trigger | Purpose |
|---|---|---|---|
| CI | `ci.yml` | Push/PR to `main`, `develop` | Lint, type check, build |
| CodeQL | `codeql.yml` | Push/PR to `main`, `develop` + weekly schedule | Security vulnerability scanning |
| Dev Deploy | `deploy_dev.yaml` | Push to `develop` | Deploy to preview environment |
| Prod Deploy | `deploy_prod.yaml` | Push to `main` | Deploy to production environment |
| Vercel Deploy | `deploy_vercel.yaml` | Called by dev/prod workflows | Shared Vercel deployment logic |
| Disable CodeQL | `disable-default-codeql.yml` | Manual only | Utility to resolve CodeQL conflicts |

### Pipeline Flow

```
Feature Branch --> PR to develop --> CI runs
                                     |
                                     v
                               Merge to develop --> Dev Deploy (preview)
                                     |
                                     v
                               PR to main --> CI runs
                                     |
                                     v
                               Merge to main --> Prod Deploy (production)
```

## CI Workflow (ci.yml)

The CI workflow runs on every push and pull request to `main` and `develop`. It validates code quality and ensures the project builds successfully.

### Jobs

The workflow contains a single job `lint-and-build` that runs on `ubuntu-latest`:

**Steps**:

1. **Checkout code** -- Clones the repository
2. **Detect package manager** -- Auto-detects pnpm, yarn, or npm from lockfiles
3. **Setup pnpm** -- Installs pnpm v9 if detected
4. **Setup Node.js** -- Installs Node 20 with package manager caching
5. **Install dependencies** -- Runs `pnpm install`
6. **Run lint** -- Executes `pnpm lint` (continues on error for PRs)
7. **Type check** -- Runs `pnpm typecheck` or `pnpm check:types`
8. **Create content directories** -- Creates `.content/data` for build
9. **Build project** -- Runs `pnpm build` with all required environment variables
10. **Check build success** -- Verifies `.next` directory was created

### Concurrency Control

```yaml
concurrency:
  group: ${{ github.ref }}-${{ github.workflow }}
  cancel-in-progress: true
```

If a new push occurs on the same branch while CI is still running, the previous run is automatically cancelled. This saves CI minutes and ensures only the latest commit is validated.

### Environment Variables

The CI workflow uses a combination of hardcoded defaults and GitHub secrets:

| Variable | Source | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Hardcoded | Application URL for build |
| `DATABASE_URL` | Secret or default | Database connection for build |
| `AUTH_SECRET` | Hardcoded CI value | Auth token signing (not for production) |
| `DATA_REPOSITORY` | Secret or default | Content repository URL |
| `CONTENT_WARNINGS_SILENT` | Hardcoded `true` | Suppress content warnings in CI |
| `CI` | Hardcoded `true` | Indicates CI environment |
| OAuth secrets | GitHub secrets | Google, GitHub, Facebook, Twitter credentials |
| `RESEND_API_KEY` | GitHub secret | Email service for build-time checks |

### Permissions

The workflow requests minimal permissions:

```yaml
permissions:
  contents: read
```

Only read access to repository contents is needed for the CI job.

## CodeQL Security Analysis (codeql.yml)

### What It Does

CodeQL performs semantic code analysis to detect security vulnerabilities in JavaScript/TypeScript code. It runs:

- On every push and PR to `main` and `develop`
- Weekly on Monday at 6:00 AM UTC (scheduled scan)
- On manual dispatch

### Analysis Steps

1. **Checkout** and **setup** Node.js + pnpm
2. **Initialize CodeQL** with `javascript-typescript` language
3. **Setup CodeQL environment** via `scripts/codeql-setup.js`
4. **Install dependencies** for analysis context
5. **Autobuild** -- CodeQL's automatic build detection
6. **Analyze with upload** -- Uploads results to GitHub Security tab
7. **Fallback analysis** -- If upload fails, runs analysis without upload

### Permissions

CodeQL requires broader permissions for security event reporting:

```yaml
permissions:
  actions: read
  contents: read
  security-events: write
  pull-requests: read
```

### Viewing Results

After a successful run with upload:
1. Go to your repository on GitHub
2. Navigate to **Security** > **Code scanning**
3. Review findings, filter by severity, and manage alerts

### Resolving CodeQL Conflicts

If you encounter SARIF processing conflicts with GitHub's default CodeQL configuration, use the `disable-default-codeql.yml` workflow:

```bash
# Trigger manually from GitHub Actions tab
# This disables the default configuration that may conflict with your custom setup
```

## Deployment Workflows

### Branch-to-Environment Mapping

| Branch | Workflow | Environment | Domain |
|---|---|---|---|
| `develop` | `deploy_dev.yaml` | `preview` | Preview URL from Vercel |
| `main` | `deploy_prod.yaml` | `production` | Production domain |

### Deploy Provider Gate

Both deployment workflows check a repository variable before proceeding:

```yaml
jobs:
  Vercel:
    if: ${{ vars.DEPLOY_PROVIDER == 'vercel' }}
```

Set `DEPLOY_PROVIDER=vercel` in your repository's **Settings > Variables** to enable Vercel deployments. This allows switching deployment providers without modifying workflow files.

### Vercel Deployment (deploy_vercel.yaml)

The shared Vercel deployment workflow handles both preview and production deployments.

**Deployment Strategy**: The workflow uses a two-phase approach:

1. **API deployment** (primary): Triggers deployment via Vercel API for faster builds
2. **CLI fallback**: If the API call fails, falls back to `vercel build` + `vercel deploy --prebuilt`

**Steps**:

1. **Checkout** code
2. **Detect package manager** and setup pnpm
3. **Install Vercel CLI** globally
4. **Link Vercel project** using `VERCEL_TOKEN` and optional team scope
5. **Set environment variables** (DATA_REPOSITORY, GH_TOKEN, CRON_SECRET) via Vercel CLI
6. **Pull Vercel settings** for the target environment
7. **Trigger API deployment** or fall back to CLI build/deploy
8. **Update cron schedule** via `scripts/update-cron.ts`

### Required Secrets

Configure these in your GitHub repository secrets:

| Secret | Required | Purpose |
|---|---|---|
| `VERCEL_TOKEN` | Yes | Vercel API authentication |
| `VERCEL_TEAM_SCOPE` | If using teams | Vercel team slug |
| `DATA_REPOSITORY` | Yes | Content repository name |
| `GH_TOKEN` | Yes | GitHub token for content cloning |
| `CRON_SECRET` | Recommended | Authenticates cron endpoint calls |
| `DATABASE_URL` | For build | Database connection string |
| OAuth secrets | If using OAuth | Provider credentials |

### Cron Schedule Updates

After successful deployment, the workflow runs `scripts/update-cron.ts` to synchronize cron schedules with the deployment:

```yaml
- name: Update cron schedule
  if: success() && steps.trigger_deployment.outputs.deployment_id != ''
  run: npx tsx scripts/update-cron.ts
```

## Branch Protection Rules

### Recommended Settings for `main`

| Setting | Value | Purpose |
|---|---|---|
| Require pull request | Yes | No direct pushes to production |
| Required reviews | 1+ | Code review before merge |
| Require status checks | CI (lint-and-build) | Ensure CI passes before merge |
| Require CodeQL | CodeQL Analysis | Security scan must pass |
| Require branches up-to-date | Yes | PR must be rebased on latest main |
| Include administrators | Yes | Rules apply to everyone |

### Recommended Settings for `develop`

| Setting | Value | Purpose |
|---|---|---|
| Require pull request | Optional | Direct pushes allowed for rapid iteration |
| Required status checks | CI (lint-and-build) | Basic quality gate |
| Require branches up-to-date | No | Allows faster iteration |

### Setting Up Branch Protection

1. Go to repository **Settings** > **Branches**
2. Click **Add branch protection rule**
3. Enter branch name pattern (e.g., `main`)
4. Configure the settings from the tables above
5. Save changes

## Promotion Flow

The template follows a standard promotion flow:

### Development Cycle

```
1. Create feature branch from develop
2. Implement changes
3. Open PR to develop
4. CI validates (lint, type check, build)
5. CodeQL scans for vulnerabilities
6. Code review and approval
7. Merge to develop --> automatic preview deployment
```

### Production Release

```
1. Open PR from develop to main
2. CI validates against main
3. CodeQL security scan
4. Final code review
5. Merge to main --> automatic production deployment
```

### Hotfix Process

```
1. Create hotfix branch from main
2. Implement fix
3. Open PR directly to main
4. CI + CodeQL validation
5. Emergency review and merge
6. Backport to develop
```

## Customization

### Adding New CI Steps

To add tests or additional validation, add steps to the `ci.yml` job:

```yaml
- name: Run unit tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test

- name: Run E2E tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test:e2e
```

### Adding Deployment Notifications

Add a notification step at the end of the deployment workflow:

```yaml
- name: Notify Slack
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    payload: '{"text": "Deployed to ${{ inputs.environment }}"}'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Environment-Specific Variables

Use GitHub **Environments** to scope secrets to specific deployment targets:

1. Go to **Settings** > **Environments**
2. Create `production` and `preview` environments
3. Add environment-specific secrets
4. Reference them in workflows with `environment:` configuration
