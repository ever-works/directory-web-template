# `@ever-works/plugin-demo`

> Reference / demo plugin used by the Directory Web Template plugin
> system as a known-good fixture in tests and a teaching example.

The plugin contributes a small badge in the public header's
`header.right` slot. Disabling it via the admin UI removes the badge.

## What it demonstrates

- A minimal `defineDirectoryPlugin({...})` call.
- A Zod-validated `ConfigSchema`.
- A single React slot component that reads `ctx.config`.
- The default `defaultEnabled: true` + `adminToggleable: true`
  posture used by most simple plugins.

## Layout

```
packages/plugin-demo/
├── README.md
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts        ← Zod schema + inferred type
    ├── Header.tsx       ← <DemoHeaderBadge />
    └── index.tsx        ← defineDirectoryPlugin({...})
```

## Status

This plugin lands together with the v0.1 plugin SDK + runtime
scaffold (per [Spec 002 / T-003](../../docs/spec/002-plugin-architecture/tasks.md)).
End-to-end coverage will follow when the host app boot
integration is wired up under `Spec 002 / T-004`.
