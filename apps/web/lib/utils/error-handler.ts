/**
 * Global error handling utility for the application
 * Provides consistent error handling, logging, and formatting
 */

export enum ErrorType {
  AUTH = 'auth',
  CONFIG = 'config',
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

export interface AppError {
  message: string;
  type: ErrorType;
  code?: string;
  originalError?: unknown;
}

/**
 * Creates a formatted application error
 */
export function createAppError(
  message: string,
  type: ErrorType = ErrorType.UNKNOWN,
  code?: string,
  originalError?: unknown
): AppError {
  return {
    message,
    type,
    code,
    originalError
  };
}

/**
 * Handles environment variable validation
 * @param variables Array of required environment variable names
 * @returns An error object if any variables are missing, undefined otherwise
 */
export function validateEnvVariables(variables: string[]): AppError | undefined {
  if (!variables || variables.length === 0) {
    return createAppError(
      'No environment variables provided for validation',
      ErrorType.CONFIG,
      'ENV_VALIDATION_EMPTY'
    );
  }

  // Filter out invalid variable names
  const invalidVars = variables.filter(varName => !varName || typeof varName !== 'string');
  if (invalidVars.length > 0) {
    return createAppError(
      `Invalid environment variable names: ${invalidVars.join(', ')}`,
      ErrorType.CONFIG,
      'ENV_VALIDATION_INVALID'
    );
  }

  const missingVars = variables.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    return createAppError(
      `Missing required environment variables: ${missingVars.join(', ')}`,
      ErrorType.CONFIG,
      'ENV_MISSING'
    );
  }
  
  return undefined;
}

/**
 * Logs an error with appropriate formatting and detail level
 */
export function logError(error: AppError | Error | unknown, context?: string): void {
  const isAppError = (err: any): err is AppError => 
    err && 
    typeof err === 'object' && 
    'type' in err && 
    Object.values(ErrorType).includes(err.type);
  
  if (isAppError(error)) {
    console.error(`[${error.type.toUpperCase()}]${context ? ` [${context}]` : ''}: ${error.message}`);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    if (error.originalError) {
      console.error('Original error:', error.originalError);
    }
  } else if (error instanceof Error) {
    console.error(`[ERROR]${context ? ` [${context}]` : ''}: ${error.message}`);
    console.error(error.stack);
  } else {
    console.error(`[UNKNOWN ERROR]${context ? ` [${context}]` : ''}: `, error);
  }
}

/**
 * Safely gets an environment variable with validation
 * @param name Environment variable name
 * @param required Whether the variable is required
 * @returns The environment variable value or undefined if not found
 * @throws AppError if the variable is required but not found
 */
export function getEnvVariable(name: string, required = true): string | undefined {
  const value = process.env[name]?.trim();
  
  if (!value && required) {
    const error = validateEnvVariables([name]);
    if (!error) {
      // This should not happen, but we need to handle the case
      const fallbackError = createAppError(
        `Unexpected error validating environment variable: ${name}`,
        ErrorType.CONFIG,
        'ENV_VALIDATION_ERROR'
      );
      logError(fallbackError);
      throw fallbackError;
    }
    logError(error);
    throw error;
  }
  
  return value;
}
