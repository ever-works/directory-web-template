/**
 * CLI entry point for manual database seeding
 * Usage: pnpm db:seed
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { runSeed } from '../lib/db/seed';

// Load environment variables from .env.local first, then .env as fallback
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

// Try to load from .env.local first
if (fs.existsSync(envLocalPath)) {
	config({ path: envLocalPath });
	console.log('Loaded environment variables from .env.local');
} else if (fs.existsSync(envPath)) {
	// Fallback to .env if .env.local doesn't exist
	config({ path: envPath });
	console.log('Loaded environment variables from .env');
} else {
	console.warn('No .env.local or .env file found. Using system environment variables only.');
}

async function main() {
	try {
		await runSeed();
		process.exit(0);
	} catch (err) {
		console.error('Seed failed:', err);
		process.exit(1);
	}
}

main();
