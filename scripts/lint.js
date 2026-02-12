#!/usr/bin/env node
/**
 * Lint script that works around Next.js 16 + ESLint 9 compatibility issues
 * Uses ESLint directly with flat config instead of next lint
 */
const { execSync } = require('child_process');

const projectRoot = process.cwd();

try {
	// Use eslint directly with the flat config
	// This avoids the next lint directory parsing bug
	console.log('Running ESLint...');
	execSync('npx eslint . --max-warnings=132', {
		cwd: projectRoot,
		stdio: 'inherit',
	});
} catch (error) {
	console.error('Linting failed');
	process.exit(1);
}
