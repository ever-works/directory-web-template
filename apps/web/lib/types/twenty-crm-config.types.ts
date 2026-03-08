/**
 * Twenty CRM Configuration Types
 * Types for Twenty CRM integration configuration
 */

import type { TwentyCrmError } from './twenty-crm-errors.types';

/**
 * Sync mode options for Twenty CRM integration
 */
export type TwentyCrmSyncMode = 'disabled' | 'platform' | 'direct_crm';

/**
 * Twenty CRM configuration data structure
 */
export interface TwentyCrmConfig {
  id: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  syncMode: TwentyCrmSyncMode;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Twenty CRM configuration with masked API key for responses
 */
export interface TwentyCrmConfigResponse {
  id: string;
  baseUrl: string;
  apiKey: string; // Masked value (e.g., "****key123")
  enabled: boolean;
  syncMode: TwentyCrmSyncMode;
  updatedBy: string | null;
  updatedAt: Date;
}

/**
 * Request payload for creating/updating Twenty CRM config
 */
export interface UpdateTwentyCrmConfigRequest {
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  syncMode: TwentyCrmSyncMode;
}

/**
 * Response from environment variables (defaults)
 */
export interface TwentyCrmEnvConfig {
  baseUrl?: string;
  apiKey?: string;
  enabled: boolean;
  syncMode: TwentyCrmSyncMode;
}

/**
 * Result from testing Twenty CRM connection
 */
export interface TwentyCrmTestConnectionResult {
  ok: boolean;
  latencyMs: number;
  message: string;
  details?: {
    status?: number;
    error?: string;
  };
}

/**
 * Configuration for Twenty CRM REST client
 */
export interface TwentyCrmClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
}

/**
 * Successful response from Twenty CRM API
 */
export interface TwentyCrmSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Error response from Twenty CRM API
 */
export interface TwentyCrmErrorResponse {
  success: false;
  error: TwentyCrmError;
}

/**
 * Generic response envelope for Twenty CRM API calls
 */
export type TwentyCrmResponse<T> = TwentyCrmSuccessResponse<T> | TwentyCrmErrorResponse;
