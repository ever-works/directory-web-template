import { NextResponse } from 'next/server';
import { logError, ErrorType, createAppError } from '../utils/error-handler';

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
    status: number;
  };
}

/**
 * HTTP status codes mapped to common error scenarios
 */
export enum HttpStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Creates a standardized API error response
 */
export function createApiErrorResponse(
  message: string,
  status: number = HttpStatus.INTERNAL_SERVER_ERROR,
  code?: string
): NextResponse<ApiErrorResponse> {
  // Ensure status is within valid range
  if (status < 100 || status > 599) {
    status = HttpStatus.INTERNAL_SERVER_ERROR;
  }
  return NextResponse.json(
    {
      error: {
        message,
        code,
        status,
      },
    },
    { status }
  );
}

/**
 * Handles API route errors with appropriate logging and response formatting
 */
export function handleApiError(
  error: unknown,
  context = 'API'
): NextResponse<ApiErrorResponse> {
  // Log the error with context
  if (error instanceof Error) {
    logError(error, context);
  } else {
    logError(createAppError('Unknown error', ErrorType.UNKNOWN, undefined, error), context);
  }

  // Determine appropriate status code and message
  let status = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected error occurred';
  let code: string | undefined;

  if (error instanceof Error) {
    message = error.message;

    // Handle specific error types
    if ('status' in error && typeof (error as any).status === 'number') {
      status = (error as any).status;
    }
    
    if ('code' in error && typeof (error as any).code === 'string') {
      code = (error as any).code;
    }
    
    // Handle authentication errors
    if (message.includes('authentication') || message.includes('unauthorized')) {
      status = HttpStatus.UNAUTHORIZED;
    }
    
    // Handle validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    }
    
    // Handle not found errors
    if (message.includes('not found') || message.includes('missing')) {
      status = HttpStatus.NOT_FOUND;
    }
  }

  // In production, don't expose internal error details
  if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
    message = 'An unexpected error occurred';
  }

  return createApiErrorResponse(message, status, code);
}

/**
 * Wraps an API route handler with error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context));
}
