import { PricingPlanConfig } from '../content';
import { defaultPricingConfig } from '../types';
import { FileService } from './file.service';

interface SettingsTheme {
	type: 'everworks' | 'corporate' | 'material' | 'funny';
	primary: string;
	secondary: string;
	accent: string;
	background: string;
	surface: string;
	text: string;
	textSecondary: string;
}

const logger = {
  warn: (message: string, context?: Record<string, any>) =>
    console.warn(`[FileService] ${message}`, context || ''),
  error: (message: string, context?: Record<string, any>) =>
    console.error(`[FileService] ${message}`, context || ''),
};

export enum LayoutKey {
	CLASSIC = 'classic',
	GRID = 'grid',
	CARDS = 'cards',
	MASONRY = 'masonry'
}

export enum LayoutHome {
	HOME_ONE = 'Home_One',
	HOME_TWO = 'Home_Two',
	HOME_THREE = 'Home_Three'
}

interface SettingsPagination {
	type: 'standard' | 'infinite';
	itemsPerPage: number;
}

export interface Settings {
	layoutHome: LayoutHome;
	theme: SettingsTheme;
	pagination: SettingsPagination;
	layoutKey: LayoutKey;
	pricing: PricingPlanConfig;
}

export class SettingsService {
	private settings: FileService<Settings & { id: string }>;
  private initPromise: Promise<void> | null = null;


	constructor() {
		this.settings = new FileService<Settings & { id: string }>('settings');
	}

	private getSettingsTheme(): SettingsTheme {
		return {
			type: 'everworks',
			primary: '#0070f3',
			secondary: '#00c853',
			accent: '#0056b3',
			background: '#ffffff',
			surface: '#f8f9fa',
			text: '#1a1a1a',
			textSecondary: '#6c757d'
		};
	}

	private getSettingsLayoutKey(): LayoutKey {
		return LayoutKey.CLASSIC;
	}

	private getSettingsPagination(): SettingsPagination {
		return {
			type: 'standard',
			itemsPerPage: 12
		};
	}
	private getSettingsPricingConfig(): PricingPlanConfig {
		return defaultPricingConfig;
	}
	private getSettingsLayoutHome(): LayoutHome {
		return LayoutHome.HOME_ONE;
	}

	async getSettings(): Promise<Settings> {
		const settings = await this.settings.findById('settings');
		if (!settings) {
			const defaultSettings = {
				id: 'settings',
				theme: this.getSettingsTheme(),
				pagination: this.getSettingsPagination(),
				layoutHome: this.getSettingsLayoutHome(),
				layoutKey: this.getSettingsLayoutKey(),
				pricing: this.getSettingsPricingConfig()
			};
			await this.settings.addItem(defaultSettings);
			return defaultSettings;
		}
		return settings;
	}

	private async ensureInitialized(): Promise<void> {
		if (this.initPromise) return this.initPromise;
		this.initPromise = (async () => {
			try {
				await this.getSettings();
			} catch (err) {
				logger.error('Failed to ensure settings initialization', { err });
				throw err;
			} finally {
				this.initPromise = null;
			}
		})();
		return this.initPromise;
	}


	async updateSettings(settings: Settings): Promise<void> {
		await this.ensureInitialized();
		await this.settings.updateById('settings', settings);
	}

	async updateSettingsLayoutHome(layoutHome: LayoutHome): Promise<void> {
		await this.ensureInitialized();
		await this.settings.updateById('settings', { layoutHome });
	}

	async deleteSettings(): Promise<boolean> {
		await this.ensureInitialized();

		return this.settings.deleteById('settings');
	}

	async updateSettingsPagination(pagination: SettingsPagination): Promise<void> {
		await this.ensureInitialized();
		const safeIpp = Math.max(1, pagination.itemsPerPage);
		await this.settings.updateById('settings', { pagination: { ...pagination, itemsPerPage: safeIpp } });
	}

	async updateSettingsLayoutKey(layoutKey: LayoutKey): Promise<void> {
		await this.ensureInitialized();
		await this.settings.updateById('settings', { layoutKey });
	}

	async updateSettingsTheme(theme: SettingsTheme): Promise<void> {
		await this.ensureInitialized();
		await this.settings.updateById('settings', { theme });
	}
}
class SettingsServiceSingleton {
	private static instance: SettingsService | null = null;

	static getInstance(): SettingsService {
		if (!SettingsServiceSingleton.instance) {
			SettingsServiceSingleton.instance = new SettingsService();
		}
		return SettingsServiceSingleton.instance;
	}
}

export const settingsService = SettingsServiceSingleton.getInstance();
