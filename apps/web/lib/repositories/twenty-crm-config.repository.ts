/**
 * Twenty CRM Config Repository
 * Handles business logic for Twenty CRM configuration with env fallback
 */

import { TwentyCrmConfigDbService } from '@/lib/services/twenty-crm-config-db.service';
import {
  type TwentyCrmConfig,
  type TwentyCrmConfigResponse,
  type UpdateTwentyCrmConfigRequest,
  type TwentyCrmEnvConfig,
} from '@/lib/types/twenty-crm-config.types';
import { maskApiKey } from '@/lib/utils/twenty-crm-validation';
import { integrationsConfig } from '@/lib/config/config-service';

export class TwentyCrmConfigRepository {
  private dbService: TwentyCrmConfigDbService;

  constructor() {
    this.dbService = new TwentyCrmConfigDbService();
  }

  /**
   * Gets environment variable configuration as defaults
   */
  private getEnvConfig(): TwentyCrmEnvConfig {
    const twentyCrm = integrationsConfig.twentyCrm;
    const baseUrl = twentyCrm.baseUrl;
    const apiKey = twentyCrm.apiKey;
    const enabled = twentyCrm.enabled;
    const syncMode = twentyCrm.syncMode;

    return {
      baseUrl,
      apiKey,
      enabled,
      syncMode,
    };
  }

  /**
   * Checks if environment config has all required fields
   */
  private hasCompleteEnvConfig(envConfig: TwentyCrmEnvConfig): boolean {
    return Boolean(envConfig.baseUrl && envConfig.apiKey);
  }

  /**
   * Gets the merged configuration (DB overrides env vars)
   * Returns masked API key for safe display
   */
  async getConfig(): Promise<TwentyCrmConfigResponse | null> {
    try {
      const dbConfig = await this.dbService.getConfig();
      const envConfig = this.getEnvConfig();

      // If DB config exists, use it (DB overrides env)
      if (dbConfig) {
        return {
          id: dbConfig.id,
          baseUrl: dbConfig.baseUrl,
          apiKey: maskApiKey(dbConfig.apiKey),
          enabled: dbConfig.enabled,
          syncMode: dbConfig.syncMode,
          updatedBy: dbConfig.updatedBy,
          updatedAt: dbConfig.updatedAt,
        };
      }

      // If no DB config, check if env has complete config
      if (this.hasCompleteEnvConfig(envConfig)) {
        return {
          id: 'env',
          baseUrl: envConfig.baseUrl!,
          apiKey: maskApiKey(envConfig.apiKey!),
          enabled: envConfig.enabled,
          syncMode: envConfig.syncMode,
          updatedBy: null,
          updatedAt: new Date(),
        };
      }

      // No configuration available
      return null;
    } catch (error) {
      console.error('Error getting Twenty CRM config from repository:', error);
      throw new Error('Failed to retrieve Twenty CRM configuration');
    }
  }

  /**
   * Gets the raw configuration without masking (for internal use)
   * Returns DB config if exists, otherwise env config
   */
  async getRawConfig(): Promise<TwentyCrmConfig | null> {
    try {
      const dbConfig = await this.dbService.getConfig();

      if (dbConfig) {
        return dbConfig;
      }

      const envConfig = this.getEnvConfig();

      if (this.hasCompleteEnvConfig(envConfig)) {
        return {
          id: 'env',
          baseUrl: envConfig.baseUrl!,
          apiKey: envConfig.apiKey!,
          enabled: envConfig.enabled,
          syncMode: envConfig.syncMode,
          createdBy: null,
          updatedBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting raw Twenty CRM config:', error);
      throw new Error('Failed to retrieve Twenty CRM configuration');
    }
  }

  /**
   * Creates or updates the Twenty CRM configuration
   * Always saves to database (DB overrides env)
   */
  async saveConfig(
    data: UpdateTwentyCrmConfigRequest,
    userId: string
  ): Promise<TwentyCrmConfigResponse> {
    try {
      const existingConfig = await this.dbService.getConfig();

      let savedConfig: TwentyCrmConfig;

      if (existingConfig) {
        // Update existing config
        savedConfig = await this.dbService.updateConfig(existingConfig.id, data, userId);
      } else {
        // Create new config
        savedConfig = await this.dbService.createConfig(data, userId);
      }

      return {
        id: savedConfig.id,
        baseUrl: savedConfig.baseUrl,
        apiKey: maskApiKey(savedConfig.apiKey),
        enabled: savedConfig.enabled,
        syncMode: savedConfig.syncMode,
        updatedBy: savedConfig.updatedBy,
        updatedAt: savedConfig.updatedAt,
      };
    } catch (error) {
      console.error('Error saving Twenty CRM config:', error);
      throw new Error('Failed to save Twenty CRM configuration');
    }
  }

  /**
   * Checks if any configuration exists (DB or env)
   */
  async hasConfig(): Promise<boolean> {
    try {
      const dbExists = await this.dbService.exists();

      if (dbExists) {
        return true;
      }

      const envConfig = this.getEnvConfig();
      return this.hasCompleteEnvConfig(envConfig);
    } catch (error) {
      console.error('Error checking Twenty CRM config existence:', error);
      return false;
    }
  }
}
