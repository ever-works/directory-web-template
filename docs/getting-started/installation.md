# Installation

This guide will walk you through setting up the Ever Works on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20.x or higher** - [Download here](https://nodejs.org/)
- **npm, yarn, or pnpm** - Package manager
- **Git** - For version control
- **PostgreSQL** (optional) - For database

## System Requirements

- **Operating System**: Windows, macOS, or Linux
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Internet connection for dependencies

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/ever-works/ever-works-website-template.git
cd ever-works-website-template
```

### 2. Install Dependencies

Using npm:

```bash
npm install
```

Using yarn:

```bash
yarn install
```

Using pnpm:

```bash
pnpm install
```

### 3. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

### 4. Configure Environment Variables

Edit `.env.local` with your configuration:

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

Copy the output and set it as your `AUTH_SECRET` in `.env.local`.

### 6. Database Setup (Optional)

If you want to use a database:

```bash
# Generate database schema
npm run db:generate

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 7. Start Development Server

```bash
npm run dev
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
npm run dev -- -p 3001
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
rm -rf node_modules package-lock.json
npm install
```

**Database connection errors**

- Verify PostgreSQL is running
- Check your `.env.local` database credentials
- Ensure the database exists

## Next Steps

Now that you have the template installed:

1. [Configure your environment](./environment-setup) properly
2. Follow the [Quick Start Guide](./quick-start) to customize your site

## Getting Help

If you encounter issues:

- Search [existing issues](https://github.com/ever-works/ever-works-website-template/issues)
- Join our [Discord community](https://discord.gg/ever)
- Create a [new issue](https://github.com/ever-works/ever-works-website-template/issues/new)
