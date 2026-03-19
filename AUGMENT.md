# AUGMENT.md  Repo instructions for Augment Code

This is the **Ever Works Turborepo monorepo** (main web app at `apps/web/`). It uses **`.augment/rules/workspace.md`** as the primary rules file for Augment Code / Augment Agent.

Most operational details (environment, build/run/test commands, architecture, docs) are shared with `CLAUDE.md`. Treat `CLAUDE.md` as the detailed source of truth.

## How Augment should use these files

- Read `.augment/rules/workspace.md` for concise, always-on workspace rules (safe commands, editing guidelines, etc.).
- Use the root `CLAUDE.md` for full project instructions and `README.md` for monorepo-level information.

If you update scripts, env vars, or major conventions, please keep:

- `.augment/rules/workspace.md`, and
- `CLAUDE.md`

in sync.
