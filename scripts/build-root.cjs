#!/usr/bin/env node
// In GitHub Actions we only build the web app via build:ci to keep PR checks fast.
// Local root builds still run the full monorepo build, and build:all remains available explicitly.
const { spawnSync } = require('node:child_process');

const command = process.env.GITHUB_ACTIONS === 'true'
  ? ['pnpm', ['--filter', '@ever-works/web', 'run', 'build:ci']]
  : ['pnpm', ['exec', 'turbo', 'run', 'build']];

const result = spawnSync(command[0], command[1], {
  stdio: 'inherit',
  shell: false,
  env: process.env
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
