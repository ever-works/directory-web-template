/**
 * Background Jobs Initialization Module
 * 
 * This module provides a singleton initialization for background jobs.
 * It ensures that initialization (and logging) happens only ONCE per process,
 * even when called from layout.tsx which renders on every request.
 * 
 * Uses globalThis to persist state across module reloads in serverless environments.
 * 
 * Usage:
 *   import { ensureBackgroundJobsInitialized } from '@/app/api/cron/jobs/background-jobs-init';
 *   ensureBackgroundJobsInitialized();
 */

import { getSchedulingMode } from '@/lib/background-jobs/config';
import type { SchedulingMode } from '@/lib/background-jobs/types';

// Use globalThis for singleton state to persist across module reloads in serverless
// This is the standard pattern for Next.js/Vercel serverless functions
const GLOBAL_KEY = '__BACKGROUND_JOBS_INIT__' as const;

interface BackgroundJobsGlobalState {
	initializationState: 'pending' | 'initializing' | 'completed';
	initializationPromise: Promise<void> | null;
	loggedMode: SchedulingMode | null;
}

// Initialize global state if not exists
function getGlobalState(): BackgroundJobsGlobalState {
	const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: BackgroundJobsGlobalState };
	if (!g[GLOBAL_KEY]) {
		g[GLOBAL_KEY] = {
			initializationState: 'pending',
			initializationPromise: null,
			loggedMode: null
		};
	}
	return g[GLOBAL_KEY];
}

/**
 * Ensures background jobs are initialized exactly once.
 * Safe to call multiple times - subsequent calls are no-ops.
 * 
 * @returns Promise that resolves when initialization is complete
 */
export async function ensureBackgroundJobsInitialized(): Promise<void> {
	// Skip during tests
	if (process.env.NODE_ENV === 'test') {
		return;
	}

	// Skip during build
	if (process.env.NEXT_PHASE === 'phase-production-build') {
		return;
	}

	const state = getGlobalState();

	// Already completed - fast path
	if (state.initializationState === 'completed') {
		return;
	}

	// Already in progress - wait for completion
	if (state.initializationState === 'initializing' && state.initializationPromise) {
		return state.initializationPromise;
	}

	// Start initialization
	state.initializationState = 'initializing';
	state.initializationPromise = doInitialize();
	
	try {
		await state.initializationPromise;
		state.initializationState = 'completed';
	} catch (error) {
		// Reset state to allow retry on next call
		state.initializationState = 'pending';
		state.initializationPromise = null;
		throw error;
	}
}

/**
 * Internal initialization logic - called only once
 */
async function doInitialize(): Promise<void> {
	const state = getGlobalState();
	const schedulingMode = getSchedulingMode();

	// Log only once per mode (prevents duplicate logs even if state resets)
	if (state.loggedMode !== schedulingMode) {
		state.loggedMode = schedulingMode;
		
		switch (schedulingMode) {
			case 'vercel':
				console.log('[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint');
				break;
			case 'disabled':
				console.log('[BackgroundJobs] Disabled (DISABLE_AUTO_SYNC=true)');
				break;
			case 'trigger-dev':
				console.log('[BackgroundJobs] Trigger.dev mode - initializing...');
				break;
			case 'local':
				console.log('[BackgroundJobs] Local mode - initializing internal scheduler...');
				break;
		}
	}

	// Only initialize for modes that need internal scheduling
	if (schedulingMode === 'trigger-dev' || schedulingMode === 'local') {
		const { initializeBackgroundJobs } = await import('@/lib/background-jobs/initialize-jobs');
		await initializeBackgroundJobs();
	}
}

/**
 * Get current initialization state (for debugging)
 */
export function getInitializationState(): {
	state: 'pending' | 'initializing' | 'completed';
	mode: SchedulingMode | null;
} {
	const state = getGlobalState();
	return {
		state: state.initializationState,
		mode: state.loggedMode
	};
}

