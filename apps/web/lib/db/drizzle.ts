import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getDatabaseUrl, getNodeEnv } from './config';

const globalForDb = globalThis as unknown as {
	conn: postgres.Sql | undefined;
	db: ReturnType<typeof drizzle> | undefined;
};

const getPoolSize = (): number => {
	const envPoolSize = process.env.DB_POOL_SIZE;
	if (envPoolSize) {
		const parsed = parseInt(envPoolSize, 10);
		return isNaN(parsed) ? 20 : Math.max(1, Math.min(parsed, 50)); // Clamp between 1-50
	}
	return getNodeEnv() === 'production' ? 20 : 10;
};

// Lazy database initialization
function initializeDatabase(): ReturnType<typeof drizzle> {
	if (!getDatabaseUrl()) {
		throw new Error('DATABASE_URL environment variable is required');
	}

	if (globalForDb.db) {
		return globalForDb.db;
	}

	try {
		const poolSize = getPoolSize();
		const reusing = Boolean(globalForDb.conn);
		const conn = reusing
			? globalForDb.conn!
			: postgres(getDatabaseUrl()!, {
					max: poolSize,
					idle_timeout: 20,
					connect_timeout: 30, // Increased from 10 to 30 seconds
					prepare: false,
					onnotice: getNodeEnv() === 'development' ? console.log : undefined,
				});
		globalForDb.conn = conn;
		globalForDb.db = drizzle(conn, { schema });

		if (getNodeEnv() === 'development') {
			console.log(
				reusing
					? 'Reusing existing database connection; pool size is unchanged from the initial value (restart to apply DB_POOL_SIZE changes).'
					: `Database connection established successfully with pool size: ${poolSize}`
			);
		}

		return globalForDb.db;
	} catch (error) {
		console.error('Failed to initialize database connection:', error);
		throw error;
	}
}

// Export a getter that initializes on first use
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
	get(target, prop) {
		const database = initializeDatabase();
		return database[prop as keyof typeof database];
	},
});

// Export actual database instance for Auth.js adapter (needed for type compatibility)
export function getDrizzleInstance(): ReturnType<typeof drizzle> {
	return initializeDatabase();
}
