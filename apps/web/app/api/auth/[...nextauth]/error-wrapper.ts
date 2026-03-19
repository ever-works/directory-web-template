import { NextRequest, NextResponse } from 'next/server';
import { logError, ErrorType, createAppError } from '@/lib/utils/error-handler';
import { handlers } from '@/lib/auth';

/**
 * Checks if a specific OAuth provider has all required environment variables
 * @param provider The OAuth provider to check
 * @returns True if the provider is properly configured, false otherwise
 */
function isOAuthProviderConfigured(provider: string): boolean {
  const providerEnvVars: Record<string, string[]> = {
    google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    github: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
    facebook: ['FB_CLIENT_ID', 'FB_CLIENT_SECRET'],
    twitter: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'],
    microsoft: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET']
  };
  
  const vars = providerEnvVars[provider.toLowerCase()];
  if (!vars) return false;
  
  return vars.every(varName => !!process.env[varName]);
}

/**
 * Wrapper for NextAuth handlers with error handling
 */
export async function handleWithErrorHandling(
  req: NextRequest,
  method: 'GET' | 'POST'
): Promise<NextResponse> {
  try {
    // Check if the request is for a specific OAuth provider
    const url = new URL(req.url);
    const provider = url.searchParams.get('providerId');
    
    // If a provider is specified, check if it's properly configured
    if (provider && !isOAuthProviderConfigured(provider)) {
      const error = createAppError(
        `OAuth provider "${provider}" is not properly configured. Check environment variables.`,
        ErrorType.CONFIG,
        'OAUTH_CONFIG_MISSING'
      );
      logError(error, 'NextAuth');
      
      return NextResponse.json(
        {
          error: {
            message: `Authentication provider "${provider}" is not available.`,
            code: 'PROVIDER_NOT_CONFIGURED',
          }
        },
        { status: 400 }
      );
    }
    
    // Call the original handler
    const handler = method === 'GET' ? handlers.GET : handlers.POST;
    const response = await handler(req);
    
    // Ensure we're returning a NextResponse
    if (response instanceof Response && !(response instanceof NextResponse)) {
      // Convert standard Response to NextResponse
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }
    
    return response;
  } catch (error) {
    // Log the error
    const appError = createAppError(
      error instanceof Error ? error.message : 'Unknown NextAuth error',
      ErrorType.AUTH,
      'NEXTAUTH_ERROR',
      error
    );
    logError(appError, 'NextAuth');
    
    // Return an appropriate error response
    return NextResponse.json(
      {
        error: {
          message: 'Authentication service error',
          code: 'AUTH_ERROR',
        }
      },
      { status: 500 }
    );
  }
}
