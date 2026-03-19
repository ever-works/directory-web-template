/**
 * Utilities for Swagger annotations in Next.js 15 App Router
 *
 * This file contains helpers to standardize annotations
 * and avoid code duplication in routes.
 */

// Types for standardized annotations
export interface SwaggerRouteConfig {
  tags: string[];
  summary: string;
  description: string;
  security?: Array<Record<string, string[]>>;
  parameters?: SwaggerParameter[];
  requestBody?: SwaggerRequestBody;
  responses: Record<string, SwaggerResponse>;
}

export interface SwaggerParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required?: boolean;
  schema: {
    type: string;
    format?: string;
    minimum?: number;
    maximum?: number;
    default?: any;
    enum?: string[];
  };
  description?: string;
  example?: any;
}

export interface SwaggerRequestBody {
  required: boolean;
  content: {
    'application/json': {
      schema: {
        $ref?: string;
        type?: string;
        properties?: Record<string, any>;
      };
      example?: any;
    };
  };
}

export interface SwaggerResponse {
  description: string;
  content?: {
    'application/json': {
      schema: {
        $ref?: string;
        type?: string;
        properties?: Record<string, any>;
      };
      example?: any;
      examples?: Record<string, any>;
    };
  };
}

/**
 * Generates a standardized Swagger annotation for a route
 */
export function createSwaggerAnnotation(
  path: string,
  method: string,
  config: SwaggerRouteConfig
): string {
  const annotation = `
/**
 * @swagger
 * ${path}:
 *   ${method.toLowerCase()}:
 *     tags: [${config.tags.map(tag => `"${tag}"`).join(', ')}]
 *     summary: "${config.summary}"
 *     description: "${config.description}"${
       config.security ? `
 *     security:${config.security.map(sec => `
 *       - ${Object.keys(sec)[0]}: []`).join('')}` : ''
     }${
       config.parameters ? `
 *     parameters:${config.parameters.map(param => `
 *       - name: "${param.name}"
 *         in: ${param.in}
 *         required: ${param.required || false}
 *         schema:
 *           type: ${param.schema.type}${param.schema.format ? `
 *           format: ${param.schema.format}` : ''}${param.schema.minimum !== undefined ? `
 *           minimum: ${param.schema.minimum}` : ''}${param.schema.maximum !== undefined ? `
 *           maximum: ${param.schema.maximum}` : ''}${param.schema.default !== undefined ? `
 *           default: ${param.schema.default}` : ''}${param.schema.enum ? `
 *           enum: [${param.schema.enum.map(e => `"${e}"`).join(', ')}]` : ''}
 *         description: "${param.description || ''}"${param.example !== undefined ? `
 *         example: ${JSON.stringify(param.example)}` : ''}`).join('')}` : ''
     }${
       config.requestBody ? `
 *     requestBody:
 *       required: ${config.requestBody.required}
 *       content:
 *         application/json:
 *           schema:${config.requestBody.content['application/json'].schema.$ref ? `
 *             $ref: "${config.requestBody.content['application/json'].schema.$ref}"` : `
 *             type: ${config.requestBody.content['application/json'].schema.type}`}${config.requestBody.content['application/json'].example ? `
 *           example: ${JSON.stringify(config.requestBody.content['application/json'].example, null, 12)}` : ''}` : ''
     }
 *     responses:${Object.entries(config.responses).map(([code, response]) => `
 *       ${code}:
 *         description: "${response.description}"${response.content ? `
 *         content:
 *           application/json:
 *             schema:${response.content['application/json'].schema.$ref ? `
 *               $ref: "${response.content['application/json'].schema.$ref}"` : `
 *               type: ${response.content['application/json'].schema.type}`}${response.content['application/json'].example ? `
 *             example: ${JSON.stringify(response.content['application/json'].example, null, 14)}` : ''}${response.content['application/json'].examples ? `
 *             examples: ${JSON.stringify(response.content['application/json'].examples, null, 14)}` : ''}` : ''}`).join('')}
 */`;

  return annotation;
}

/**
 * Common annotations to avoid duplication
 */
export const CommonAnnotations = {
  // Standard error responses
  responses: {
    unauthorized: {
      description: 'Authentication required',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
          example: { success: false, error: 'Unauthorized' }
        }
      }
    },
    forbidden: {
      description: 'Forbidden - Admin access required',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
          example: { success: false, error: 'Forbidden' }
        }
      }
    },
    notFound: {
      description: 'Resource not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
          example: { success: false, error: 'Not found' }
        }
      }
    },
    serverError: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
          example: { success: false, error: 'Internal server error' }
        }
      }
    }
  },

  // Standard pagination parameters
  paginationParameters: [
    {
      name: 'page',
      in: 'query' as const,
      schema: { type: 'integer', minimum: 1, default: 1 },
      description: 'Page number for pagination',
      example: 1
    },
    {
      name: 'limit',
      in: 'query' as const,
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      description: 'Number of items per page',
      example: 10
    }
  ],

  // Standard admin security
  adminSecurity: [{ sessionAuth: [] }]
};

/**
 * Helper to quickly create a standard admin route
 */
export function createAdminRouteAnnotation(
  path: string,
  method: string,
  config: Omit<SwaggerRouteConfig, 'security'>
): string {
  return createSwaggerAnnotation(path, method, {
    ...config,
    security: CommonAnnotations.adminSecurity
  });
}
