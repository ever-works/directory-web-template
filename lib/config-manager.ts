import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getContentPath, ensureContentAvailable } from '@/lib/lib';

/**
 * Git module dependencies with lazy loading
 * Uses singleton pattern to avoid bundling issues and prevent duplicate imports
 */
type GitModule = typeof import('isomorphic-git').default;
type HttpModule = typeof import('isomorphic-git/http/node').default;
type FsModule = typeof import('node:fs/promises');

interface GitDependencies {
	git: GitModule;
	http: HttpModule;
	fs: FsModule;
}

// Singleton instance cache
let gitDependencies: GitDependencies | null = null;
let gitLoadPromise: Promise<GitDependencies> | null = null;

/**
 * Lazy loads isomorphic-git modules (singleton pattern)
 * Prevents duplicate imports and handles concurrent access safely
 * @returns Promise resolving to git dependencies
 * @throws Error if modules fail to load
 */
async function getGit(): Promise<GitDependencies> {
	// Return cached instance if already loaded
	if (gitDependencies) {
		return gitDependencies;
	}

	// If loading is in progress, wait for the existing promise
	if (gitLoadPromise) {
		return gitLoadPromise;
	}

	// Start loading modules
	gitLoadPromise = (async (): Promise<GitDependencies> => {
		try {
			const [gitModule, httpModule, fsModule] = await Promise.all([
				import('isomorphic-git').then((m) => m.default),
				import('isomorphic-git/http/node').then((m) => m.default),
				import('node:fs/promises')
			]);

			gitDependencies = {
				git: gitModule,
				http: httpModule,
				fs: fsModule
			};

			return gitDependencies;
		} catch (error) {
			// Reset promise on error to allow retry
			gitLoadPromise = null;
			throw new Error(
				`Failed to load isomorphic-git modules: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	})();

	return gitLoadPromise;
}

export interface PaginationConfig {
	type: 'standard' | 'infinite';
	itemsPerPage: number;
}

export interface AppConfig {
	pagination: PaginationConfig;
	[key: string]: any;
}

/**
 * Configuration manager for config.yml file
 * Provides type-safe methods to read and write configuration
 */
export class ConfigManager {
	private configPath: string;
	private gitOperationInProgress: Promise<void> = Promise.resolve();
	private isProcessingGitQueue = false;
	private gitOperationQueue: Array<{ message?: string; resolve: () => void; reject: (error: unknown) => void }> = [];

	constructor() {
		// Use dynamic content path (local: .content, Vercel: /tmp/.content)
		this.configPath = path.join(getContentPath(), 'config.yml');
	}

	private isPrototypePollutingKey(key: string): boolean {
		return key === '__proto__' || key === 'constructor' || key === 'prototype';
	}
	/**
	 * Check if we're in an environment where warnings should be suppressed
	 */
	private shouldSuppressWarnings(): boolean {
		// Suppress warnings during CI, linting, or when DATA_REPOSITORY is not set
		const isCI = Boolean(
			process.env.CI ||
			process.env.GITHUB_ACTIONS ||
			process.env.GITLAB_CI ||
			process.env.CIRCLECI ||
			process.env.JENKINS_URL ||
			process.env.BUILDKITE ||
			process.env.TF_BUILD
		);

		// On Vercel runtime, config file won't exist until content is cloned
		// This is expected behavior during cold start - suppress warning
		const isVercelRuntime = Boolean(process.env.VERCEL) && process.env.NEXT_PHASE !== 'phase-production-build';

		return (
			isCI ||
			isVercelRuntime ||
			process.env.NODE_ENV === 'test' ||
			!process.env.DATA_REPOSITORY ||
			process.argv.some((arg) => /(?:^|[/\\])(eslint|lint(?:-staged)?)(?:\.[jt]s)?$/.test(arg))
		);
	}

	/**
	 * Read the current config file
	 */
	private readConfig(): AppConfig {
		try {
			// Always recalculate path to avoid stale singleton issues
			const currentPath = path.join(getContentPath(), 'config.yml');
			this.configPath = currentPath;

			if (!fs.existsSync(currentPath)) {
				// Only warn in development when DATA_REPOSITORY is configured
				// Suppress warnings during CI/linting since the code handles missing files gracefully
				if (!this.shouldSuppressWarnings()) {
					console.warn('Config file not found at:', currentPath);
				}
				return this.getDefaultConfig();
			}

			const fileContents = fs.readFileSync(currentPath, 'utf8');
			const config = yaml.load(fileContents) as AppConfig;
			return { ...this.getDefaultConfig(), ...config };
		} catch (error) {
			// Always log errors - they indicate real problems (read failures, parse errors, etc.)
			console.error('Error reading config file:', error);
			return this.getDefaultConfig();
		}
	}

	/**
	 * Write the config back to file
	 */
	private async writeConfig(config: AppConfig, commitMessage?: string): Promise<boolean> {
		try {
			// Ensure content repository is available (handles cold start on Vercel)
			await ensureContentAvailable();

			// Always recalculate path to avoid stale singleton issues
			const currentPath = path.join(getContentPath(), 'config.yml');
			this.configPath = currentPath;

			const yamlString = yaml.dump(config, {
				indent: 2,
				lineWidth: -1,
				noRefs: true,
				sortKeys: false
			});

			await fs.promises.writeFile(currentPath, yamlString, 'utf8');

			// Queue Git operation to prevent concurrent writes
			// Operations are serialized to avoid conflicts
			this.queueGitOperation(commitMessage).catch((error) => {
				console.error('⚠️ Git operations failed for config.yml, but file was saved:', error);
			});

			return true;
		} catch (error) {
			console.error('Error writing config file:', error);
			return false;
		}
	}

	/**
	 * Queue a Git operation to prevent concurrent writes
	 * Operations are serialized to avoid conflicts
	 */
	private async queueGitOperation(customMessage?: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.gitOperationQueue.push({ message: customMessage, resolve, reject });
			this.processGitQueue();
		});
	}

	/**
	 * Process the Git operation queue serially
	 * Uses a mutex pattern to prevent concurrent Git operations
	 */
	private async processGitQueue(): Promise<void> {
		// If already processing, skip (will be called again when current operation completes)
		if (this.isProcessingGitQueue) {
			return;
		}

		// If queue is empty, nothing to do
		if (this.gitOperationQueue.length === 0) {
			return;
		}

		this.isProcessingGitQueue = true;

		try {
			// Wait for any in-flight operation to complete
			await this.gitOperationInProgress;

			// Process all queued operations serially
			while (this.gitOperationQueue.length > 0) {
				const operation = this.gitOperationQueue.shift();
				if (!operation) {
					break;
				}

				// Create a new promise for this operation
				this.gitOperationInProgress = (async () => {
					try {
						await this.commitAndPush(operation.message);
						operation.resolve();
					} catch (error) {
						operation.reject(error);
					}
				})();

				await this.gitOperationInProgress;
			}
		} finally {
			this.isProcessingGitQueue = false;
		}
	}

	/**
	 * Commit and push config.yml changes to Git
	 * Similar to how other git services handle commits
	 * This method is called serially via queueGitOperation to prevent concurrent writes
	 */
	private async commitAndPush(customMessage?: string): Promise<void> {
		// Skip Git operations if DATA_REPOSITORY is not configured
		if (!process.env.DATA_REPOSITORY || !process.env.GH_TOKEN) {
			return;
		}

		try {
			const { git, http, fs: gitFs } = await getGit();
			const contentPath = getContentPath();

			// Check if .git exists (repository is initialized)
			const gitDir = path.join(contentPath, '.git');
			if (!fs.existsSync(gitDir)) {
				// Repository not initialized, skip Git operations
				return;
			}

			// Get branch from environment or default to 'main'
			const branch = process.env.GITHUB_BRANCH || 'main';

			// Get auth credentials
			const auth = {
				username: 'x-access-token',
				password: process.env.GH_TOKEN
			};

			// Get committer info
			const committer = {
				name: process.env.GIT_NAME || 'Website Bot',
				email: process.env.GIT_EMAIL || 'website@ever.works'
			};

			// Ensure we're on the correct branch BEFORE committing
			// Fail fast if checkout fails to prevent committing to wrong branch
			const currentBranch = await git.currentBranch({
				fs: gitFs,
				dir: contentPath
			});
			if (currentBranch !== branch) {
				// Switch to the configured branch if we're not already on it
				try {
					await git.checkout({
						fs: gitFs,
						dir: contentPath,
						ref: branch
					});
				} catch (checkoutError) {
					throw new Error(
						`Failed to checkout branch '${branch}' before commit. Cannot safely commit to ensure correct branch. ` +
							`Current branch: ${currentBranch || 'unknown'}. Error: ${checkoutError instanceof Error ? checkoutError.message : String(checkoutError)}`
					);
				}
			}

			// Add config.yml to git
			await git.add({
				fs: gitFs,
				dir: contentPath,
				filepath: 'config.yml'
			});

			// Create commit message
			const commitMessage = customMessage || `Update config.yml - ${new Date().toISOString()}`;

			// Commit changes (now on the correct branch)
			await git.commit({
				fs: gitFs,
				dir: contentPath,
				message: commitMessage,
				author: committer,
				committer
			});

			// Push to GitHub (pushes the current branch, which is now ensured to be the configured branch)
			await git.push({
				onAuth: () => auth,
				fs: gitFs,
				http,
				dir: contentPath
			});

			console.log(`✅ config.yml committed and pushed to GitHub successfully (branch: ${branch})`);
		} catch (error) {
			// Log error but don't throw - file was already saved successfully
			// This allows the writeConfig to succeed even if Git operations fail
			console.error('⚠️ Git operations failed for config.yml, but file was saved:', error);
		}
	}

	/**
	 * Get default configuration
	 */
	private getDefaultConfig(): AppConfig {
		return {
			pagination: {
				type: 'standard',
				itemsPerPage: 12
			}
		};
	}

	/**
	 * Get the entire configuration
	 */
	getConfig(): AppConfig {
		return this.readConfig();
	}

	/**
	 * Update a specific key in the config
	 */
	async updateKey<K extends keyof AppConfig>(key: K, value: AppConfig[K]): Promise<boolean> {
		const config = this.readConfig();
		config[key] = value;
		const commitMessage = this.generateCommitMessage(key as string, value);
		return await this.writeConfig(config, commitMessage);
	}

	/**
	 * Update nested key (e.g., 'pagination.type')
	 */
	async updateNestedKey(keyPath: string, value: any): Promise<boolean> {
		const config = this.readConfig();
		const keys = keyPath.split('.');

		let current: any = config;
		for (let i = 0; i < keys.length - 1; i++) {
			if (this.isPrototypePollutingKey(keys[i])) {
				return false;
			}
			if (keys[i] === 'constructor' && keys[i + 1] === 'prototype') {
				return false;
			}
			if (
				!Object.prototype.hasOwnProperty.call(current, keys[i]) ||
				typeof current[keys[i]] !== 'object' ||
				current[keys[i]] === null
			) {
				current[keys[i]] = {};
			}
			current = current[keys[i]];
		}

		const lastKey = keys[keys.length - 1];
		if (this.isPrototypePollutingKey(lastKey)) {
			return false;
		}

		if (keys.length >= 2 && keys[keys.length - 2] === 'constructor' && keys[keys.length - 1] === 'prototype') {
			return false;
		}
		current[lastKey] = value;

		// Generate descriptive commit message based on the key being updated
		const commitMessage = this.generateCommitMessage(keyPath, value);
		return await this.writeConfig(config, commitMessage);
	}

	/**
	 * Generate a descriptive commit message based on the key being updated
	 */
	private generateCommitMessage(keyPath: string, value: any): string {
		const timestamp = new Date().toISOString();

		// Generate messages for specific keys
		if (keyPath === 'custom_header') {
			const itemCount = Array.isArray(value) ? value.length : 0;
			return `Update custom header navigation (${itemCount} items) - ${timestamp}`;
		}

		if (keyPath === 'custom_footer') {
			const itemCount = Array.isArray(value) ? value.length : 0;
			return `Update custom footer navigation (${itemCount} items) - ${timestamp}`;
		}

		if (keyPath.startsWith('pagination')) {
			return `Update pagination configuration - ${timestamp}`;
		}

		if (keyPath.startsWith('auth')) {
			return `Update authentication settings - ${timestamp}`;
		}

		if (keyPath.startsWith('headerSettings')) {
			return `Update header settings - ${timestamp}`;
		}

		// Generic message for other keys
		return `Update config.yml: ${keyPath} - ${timestamp}`;
	}

	/**
	 * Update pagination configuration
	 */
	async updatePagination(type: 'standard' | 'infinite', itemsPerPage?: number): Promise<boolean> {
		const config = this.readConfig();

		config.pagination.type = type;
		if (itemsPerPage !== undefined) {
			config.pagination.itemsPerPage = itemsPerPage;
		}

		const commitMessage = `Update pagination configuration (type: ${type}${itemsPerPage ? `, itemsPerPage: ${itemsPerPage}` : ''}) - ${new Date().toISOString()}`;
		return await this.writeConfig(config, commitMessage);
	}

	/**
	 * Get pagination configuration
	 */
	getPaginationConfig(): PaginationConfig {
		const config = this.readConfig();
		return config.pagination;
	}

	/**
	 * Get a specific config value
	 */
	getValue<K extends keyof AppConfig>(key: K): AppConfig[K] {
		const config = this.readConfig();
		return config[key];
	}

	/**
	 * Get nested config value
	 */
	getNestedValue(keyPath: string): any {
		const config = this.readConfig();
		const keys = keyPath.split('.');

		let current: any = config;
		for (const key of keys) {
			if (current && typeof current === 'object' && key in current) {
				current = current[key];
			} else {
				return undefined;
			}
		}

		return current;
	}
}

// Export a singleton instance
export const configManager = new ConfigManager();
