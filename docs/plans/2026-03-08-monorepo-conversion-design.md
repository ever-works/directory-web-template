# Monorepo Conversion Design

## Goal
Convert the Next.js app in `template/` into a Turborepo + PNPM monorepo.

## Final Structure
```
template/
├── apps/
│   ├── web/              # Next.js app (moved from root)
│   ├── web-e2e/          # Playwright tests (from e2e/)
│   └── docs/             # Docusaurus (copied from ../docs/website, platform docs removed)
├── packages/
│   ├── tsconfig/         # Shared TypeScript configs
│   └── eslint-config/    # Shared ESLint flat config
├── turbo.json
├── pnpm-workspace.yaml
├── package.json          # Root workspace scripts
├── .npmrc
├── .github/workflows/    # Updated CI
└── .gitignore
```

## Key Decisions

1. **web app**: All internal structure unchanged, just moved one directory deeper. Path alias `@/*` updated to still work.
2. **web-e2e**: Own package.json, references web's dev server. Playwright config paths adjusted.
3. **docs**: Full copy of `../docs/website/`, then remove `docs/platform/` folder, platform sidebar, and platform plugin from docusaurus.config.ts.
4. **packages/tsconfig**: Exports base TS configs that apps extend.
5. **packages/eslint-config**: Exports shared ESLint 9 flat config.
6. **GitHub Actions**: Updated for PNPM + Turbo. Runs `turbo build lint`.
7. **Turbo pipeline**: build (topological), lint (independent), dev (persistent), test:e2e (depends on web build).

## Migration Notes
- `.env.example` stays in apps/web
- `vercel.json` stays in apps/web
- Root `.gitignore` updated for monorepo (node_modules in all packages, .turbo cache)
- All imports using `@/` alias continue to work within apps/web
