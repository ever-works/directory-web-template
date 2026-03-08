---
id: onboarding
title: Onboarding Guide
sidebar_label: Onboarding
sidebar_position: 2
---

# Onboarding Guide

Welcome to Ever Works! This guide will help you set up your development environment and make your first contribution.

## 🎯 Objectives

By the end of this module, you will:

- ✅ Have a fully configured development environment
- ✅ Understand the project structure
- ✅ Run the application locally
- ✅ Make your first code change
- ✅ Understand the development workflow

**Estimated time**: 1-2 days

---

## Step 1: Environment Setup

### 1.1 Install Required Tools

Follow the detailed [Installation Guide](/template/getting-started/installation) to install:

- Node.js 20.19.0+
- PostgreSQL 14+
- Git
- VS Code (recommended)

### 1.2 Clone the Repository

```bash
# Clone the repository
git clone https://github.com/ever-co/ever-works.git
cd ever-works

# Install dependencies
yarn install
```

### 1.3 Configure Environment Variables

Follow the [Environment Setup Guide](/template/getting-started/environment-setup) to configure your `.env.local` file.

**Quick checklist**:
- [ ] Database connection configured
- [ ] Authentication secrets set
- [ ] Payment provider keys added (optional for development)
- [ ] Email service configured (optional for development)

---

## Step 2: Database Setup

### 2.1 Start PostgreSQL

```bash
# Using Docker (recommended)
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=everworks \
  -p 5432:5432 \
  -d postgres:14

# Or use your local PostgreSQL installation
```

### 2.2 Run Migrations

```bash
# Push schema to database
npx drizzle-kit push

# (Optional) Seed with sample data
npm run db:seed
```

### 2.3 Verify Database Connection

```bash
# Open Drizzle Studio to inspect database
npx drizzle-kit studio

# Access at http://localhost:4983
```

---

## Step 3: Start Development Server

### 3.1 Run the Application

```bash
# Start development server
npm run dev

# Server will start at http://localhost:3000
```

### 3.2 Verify Installation

Open your browser and verify:

- [ ] Homepage loads at `http://localhost:3000`
- [ ] Can create an account
- [ ] Can login/logout
- [ ] API documentation accessible at `http://localhost:3000/api/reference`
- [ ] No console errors in browser DevTools

:::tip First Time Setup
If you encounter issues, check the [Troubleshooting Guide](/template/getting-started/installation#troubleshooting) or ask your mentor.
:::

---

## Step 4: Understand Project Structure

### 4.1 Key Directories

```
ever-works/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── [locale]/          # Internationalized pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # UI components (HeroUI)
│   └── ...
├── lib/                   # Utilities and libraries
│   ├── db/               # Database (Drizzle ORM)
│   ├── auth/             # Authentication
│   └── ...
├── public/               # Static assets
├── .content/             # Git-based CMS content
└── messages/             # i18n translations
```

### 4.2 Important Files

- `app/api/**/route.ts` - API endpoints
- `lib/db/schema/` - Database schemas
- `components/` - React components
- `messages/` - Translation files
- `.env.local` - Environment variables

[Learn more about the architecture →](/template/architecture/overview)

---

## Step 5: Development Workflow

### 5.1 Create a Feature Branch

```bash
# Always create a branch from main
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### 5.2 Make Changes

1. **Identify the files to modify**
2. **Make your changes**
3. **Test locally**
4. **Generate API docs** (if you modified API routes)

```bash
# If you modified API routes
yarn generate-docs
```

### 5.3 Commit and Push

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add user notification system"

# Push to remote
git push origin feature/your-feature-name
```

### 5.4 Create Pull Request

1. Go to GitHub repository
2. Create Pull Request from your branch
3. Fill in PR template
4. Request code review
5. Address feedback
6. Merge when approved

:::tip Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
:::

---

## Step 6: Your First Task

### 6.1 Practice Task

Try this simple task to get familiar with the workflow:

**Task**: Add a new API endpoint that returns server information

1. Create `app/api/server-info/route.ts`
2. Add Swagger documentation
3. Generate docs with `yarn generate-docs`
4. Test in Scalar UI
5. Create a PR

[See detailed exercise →](/template/team-training/exercises#exercise-1-simple-get-route)

---

## ✅ Onboarding Checklist

Before moving to the next module, ensure you have:

- [ ] Development environment fully set up
- [ ] Application running locally
- [ ] Database connected and seeded
- [ ] Understand project structure
- [ ] Know the development workflow
- [ ] Created your first branch
- [ ] Made your first commit
- [ ] Completed the practice task

---

## Next Steps

Great job! You're ready to move on to:

1. [API Documentation](/template/team-training/api-documentation) - Learn the documentation system
2. [Best Practices](/template/team-training/best-practices) - Learn coding standards
3. [Exercises](/template/team-training/exercises) - Practice with real tasks

---

## Additional Resources

- [Quick Reference](/template/getting-started/quick-reference) - Essential commands and patterns
- [Tech Stack](/template/architecture/tech-stack) - Technologies used
- [Testing Guide](/template/development/testing) - How to write tests

Need help? Ask your mentor or check the team Slack channel! 🚀

