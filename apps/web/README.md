# @ever-works/web

The main Next.js 16 directory website application within the Ever Works monorepo.

For full documentation, see the root [`README.md`](../../README.md).

## Quick Reference

```bash
# From monorepo root
pnpm run dev:web          # Start web app dev server
pnpm run --filter @ever-works/web build   # Build web app only

# From this directory (apps/web/)
pnpm dev                  # Start dev server (http://localhost:3000)
pnpm build                # Production build
pnpm start                # Serve production build
pnpm lint                 # ESLint
pnpm tsc --noEmit         # Type-check
pnpm db:generate          # Generate Drizzle migrations
pnpm db:migrate           # Apply migrations
pnpm db:seed              # Seed database
pnpm db:studio            # Open Drizzle Studio GUI
```

## Environment Setup

```bash
cp .env.example .env.local
```

See the root [README.md](../../README.md#environment-configuration) for full environment variable documentation.
