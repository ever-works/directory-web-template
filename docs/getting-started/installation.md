# Installation

This guide will walk you through setting up the Ever Works on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js >= 20.19.0** - [Download here](https://nodejs.org/)
- **pnpm** - Required package manager (install with `npm install -g pnpm`)
- **Git** - For version control
- **PostgreSQL** (optional) - For database

## System Requirements

- **Operating System**: Windows, macOS, or Linux
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Internet connection for dependencies

## Installation Steps

### 1. Clone the Repository

The template is a **Turborepo monorepo** managed with pnpm workspaces. Cloning gives you the monorepo root, which contains the web app at `apps/web/`, an end-to-end test suite at `apps/web-e2e/`, and a docs site at `apps/docs/`.

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
```

### 2. Install Dependencies

Run the install command from the **monorepo root**. pnpm is the required package manager:

```bash
pnpm install
```

### 3. Environment Setup

Copy the example environment file into the **web app** directory:

```bash
cp apps/web/.env.example apps/web/.env.local
```

### 4. Configure Environment Variables

Edit `apps/web/.env.local` with your configuration:

```bash
# Basic Configuration
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"

# Authentication
AUTH_SECRET="your-secret-key"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Database (Optional)
DATABASE_URL="postgresql://user:password@localhost:5432/everworks"

# GitHub Integration (Required for content sync)
GH_TOKEN="your-github-token"
DATA_REPOSITORY="https://github.com/ever-works/awesome-data"
```

### 5. Generate Auth Secret

Generate a secure secret for authentication:

```bash
openssl rand -base64 32
```

Copy the output and set it as your `AUTH_SECRET` in `apps/web/.env.local`.

### 6. Database Setup (Optional)

If you want to use a database, run the database commands from the `apps/web/` directory:

```bash
cd apps/web

# Generate database schema
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed
```

### 7. Start Development Server

From the monorepo root, start all apps (web, docs, etc.):

```bash
pnpm run dev
```

Or start only the web app:

```bash
pnpm run dev:web
```

Your application will be available at [http://localhost:3000](http://localhost:3000).

## Verification

To verify your installation:

1. **Check the homepage** - Navigate to `http://localhost:3000`
2. **Test content sync** - Items should load from the data repository
3. **Check authentication** - Try signing in (if configured)
4. **Verify API** - Visit `http://localhost:3000/api/version`

## Common Issues

### Port Already in Use

If port 3000 is already in use:

```bash
pnpm run dev:web -- -p 3001
```

### Permission Errors

On macOS/Linux, you might need to use `sudo` for global installations:

```bash
sudo npm install -g <package-name>
```

### Node Version Issues

Use Node Version Manager (nvm) to switch Node versions:

```bash
nvm install 20
nvm use 20
# Verify: node -v should show >= 20.19.0
```

## Troubleshooting {#troubleshooting}

### Common Issues

**Port already in use**

```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

**Module not found errors**

```bash
# Clear cache and reinstall
rm -rf node_modules apps/*/node_modules
pnpm install
```

**Database connection errors**

- Verify PostgreSQL is running
- Check your `apps/web/.env.local` database credentials
- Ensure the database exists

## Next Steps

Now that you have the template installed:

1. [Configure your environment](./environment-setup) properly
2. Follow the [Quick Start Guide](./quick-start) to customize your site

## Getting Help

If you encounter issues:

- Search [existing issues](https://github.com/ever-works/directory-web-template/issues)
- Join our [Discord community](https://discord.gg/ever)
- Create a [new issue](https://github.com/ever-works/directory-web-template/issues/new)
