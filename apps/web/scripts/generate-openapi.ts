#!/usr/bin/env tsx

import swaggerJSDoc from 'swagger-jsdoc';
import fs from 'fs';
import path from 'path';

/**
 * Automatic OpenAPI documentation generation script
 * Compatible with Next.js 15 + App Router
 *
 * This script:
 * 1. Reads the existing openapi.json file (preserved)
 * 2. Scans @swagger annotations in routes
 * 3. Merges both sources without conflicts
 * 4. Generates a complete new openapi.json file
 */

const OPENAPI_FILE_PATH = path.join(process.cwd(), 'public/openapi.json');
const BACKUP_FILE_PATH = path.join(process.cwd(), 'public/openapi.backup.json');

// Configuration swagger-jsdoc pour Next.js 15 App Router
const swaggerOptions = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Ever Works API',
			version: '1.0.0',
			description: 'Comprehensive API documentation for Directory Web Template',
			contact: {
				name: 'Ever Works Team',
				url: 'https://ever.works'
			}
		},
		servers: [
			{
				url: '/',
				description: 'Current Environment'
			}
		],
		components: {
			securitySchemes: {
				sessionAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
					description: 'JWT Bearer token'
				},
				session: {
					type: 'apiKey',
					in: 'cookie',
					name: 'session_token',
					description: 'Session cookie'
				},
				cronSecret: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'Secret',
					description: 'Cron Job Secret Key'
				}
			},
			schemas: {
				ErrorResponse: {
					type: 'object',
					properties: {
						success: {
							type: 'boolean',
							example: false
						},
						error: {
							type: 'string',
							example: 'Error message'
						}
					},
					required: ['success', 'error']
				},
				PaginationMeta: {
					type: 'object',
					properties: {
						page: {
							type: 'integer',
							description: 'Current page number',
							example: 1
						},
						pageSize: {
							type: 'integer',
							description: 'Number of items per page',
							example: 20
						},
						total: {
							type: 'integer',
							description: 'Total number of responses',
							example: 150
						},
						totalPages: {
							type: 'integer',
							description: 'Total number of pages',
							example: 8
						}
					},
					required: ['page', 'pageSize', 'total', 'totalPages']
				},
				Pagination: {
					type: 'object',
					properties: {
						items: {
							type: 'array',
							items: {},
							description: 'List of items on the current page'
						},
						pagination: {
							$ref: '#/components/schemas/PaginationMeta'
						}
					},
					required: ['items', 'pagination']
				}
			}
		}
	},
	// Scan tous les fichiers route.ts dans app/api
	apis: [
		'./app/api/**/route.ts',
		'./app/api/**/*.ts',
		'./lib/types/**/*.ts' // For TypeScript schemas
	]
};

// Check if we're in CI or should suppress output
const isCI = Boolean(
	process.env.CI ||
	process.env.GITHUB_ACTIONS ||
	process.env.GITLAB_CI ||
	process.env.CIRCLECI ||
	process.env.JENKINS_URL ||
	process.env.BUILDKITE ||
	process.env.TF_BUILD ||
	process.env.VERCEL
);
const isSilent = process.argv.includes('--silent') || isCI;

function log(...args: any[]) {
	if (!isSilent) {
		console.log(...args);
	}
}

function logError(...args: any[]) {
	// Always log errors
	console.error(...args);
}

async function generateOpenAPI() {
	try {
		log('🚀 Starting OpenAPI generation...');

		// 1. Backup du fichier existant
		if (fs.existsSync(OPENAPI_FILE_PATH)) {
			log('📋 Creating backup of existing openapi.json...');
			fs.copyFileSync(OPENAPI_FILE_PATH, BACKUP_FILE_PATH);
		}

		// 2. Lire le fichier openapi.json existant
		let existingSpec = {};
		if (fs.existsSync(OPENAPI_FILE_PATH)) {
			log('📖 Reading existing openapi.json...');
			const existingContent = fs.readFileSync(OPENAPI_FILE_PATH, 'utf8');
			existingSpec = JSON.parse(existingContent);
		}

		// 3. Generate documentation from annotations
		log('🔍 Scanning route annotations...');
		const generatedSpec = swaggerJSDoc(swaggerOptions);

		// 4. Merge both sources (existing + generated)
		log('🔄 Merging existing and generated documentation...');
		const mergedSpec = mergeOpenAPISpecs(existingSpec, generatedSpec);

		// 5. Write the final file
		log('💾 Writing merged openapi.json...');
		fs.writeFileSync(OPENAPI_FILE_PATH, JSON.stringify(mergedSpec, null, 2), 'utf8');

		log('✅ OpenAPI documentation generated successfully!');
		if (!isSilent) {
			log(`📄 File: ${OPENAPI_FILE_PATH}`);
			log(`📦 Backup: ${BACKUP_FILE_PATH}`);
		}
	} catch (error) {
		logError('❌ Error generating OpenAPI documentation:', error);

		// Restaurer le backup en cas d'erreur
		if (fs.existsSync(BACKUP_FILE_PATH)) {
			log('🔄 Restoring backup...');
			fs.copyFileSync(BACKUP_FILE_PATH, OPENAPI_FILE_PATH);
		}

		process.exit(1);
	}
}

/**
 * Merge two OpenAPI specifications with intelligent priority
 * Priority: code annotations > existing (for routes with annotations)
 *          existing > generated (for routes without annotations)
 */
function mergeOpenAPISpecs(existing: any, generated: any): any {
	const merged = { ...generated };

	// Preserve existing information
	if (existing.info) {
		merged.info = { ...generated.info, ...existing.info };
	}

	// Always use generated servers configuration to ensure environment awareness
	if (generated.servers) {
		merged.servers = generated.servers;
	} else if (existing.servers) {
		merged.servers = existing.servers;
	}

	// Merge paths (routes) with intelligent logic
	if (existing.paths && generated.paths) {
		merged.paths = { ...existing.paths };

		// For each generated route (with annotations in code)
		Object.keys(generated.paths).forEach((path) => {
			const generatedRoute = generated.paths[path];
			const existingRoute = existing.paths[path];

			if (existingRoute) {
				// If route already exists, compare documentation quality
				const generatedHasDetailedDocs = hasDetailedDocumentation(generatedRoute);
				const existingHasDetailedDocs = hasDetailedDocumentation(existingRoute);

				if (generatedHasDetailedDocs && !existingHasDetailedDocs) {
					// Replace with generated version (more detailed)
					merged.paths[path] = generatedRoute;
					log(`🔄 Updated route ${path} with detailed annotations`);
				} else if (generatedHasDetailedDocs && existingHasDetailedDocs) {
					// Merge both versions (keep the best of both)
					merged.paths[path] = mergeRouteDetails(existingRoute, generatedRoute);
					log(`🔀 Merged route ${path} with existing documentation`);
				}
				// Otherwise, keep existing (existingHasDetailedDocs && !generatedHasDetailedDocs)
			} else {
				// New route, add directly
				merged.paths[path] = generatedRoute;
				log(`✨ Added new route ${path}`);
			}
		});
	} else if (existing.paths) {
		merged.paths = existing.paths;
	}

	// Merge components/schemas
	if (existing.components) {
		merged.components = {
			...generated.components,
			...existing.components,
			schemas: {
				...generated.components?.schemas,
				...existing.components?.schemas
			},
			responses: {
				...generated.components?.responses,
				...existing.components?.responses
			},
			securitySchemes: {
				...generated.components?.securitySchemes,
				...existing.components?.securitySchemes
			}
		};
	}

	// Preserve existing tags
	if (existing.tags) {
		const existingTagNames = existing.tags.map((tag: any) => tag.name);
		const generatedTags = generated.tags?.filter((tag: any) => !existingTagNames.includes(tag.name)) || [];
		merged.tags = [...existing.tags, ...generatedTags];
	}

	return merged;
}

/**
 * Checks if a route has detailed documentation
 */
function hasDetailedDocumentation(route: any): boolean {
	if (!route || typeof route !== 'object') return false;

	// Check each HTTP method
	const methods = ['get', 'post', 'put', 'delete', 'patch'];

	for (const method of methods) {
		if (route[method]) {
			const methodDoc = route[method];

			// Criteria for detailed documentation:
			// 1. Long description (more than 50 characters)
			// 2. Examples in responses
			// 3. Parameters with descriptions
			// 4. Detailed response schemas

			const hasLongDescription = methodDoc.description && methodDoc.description.length > 50;
			const hasExamples =
				methodDoc.responses &&
				Object.values(methodDoc.responses).some(
					(response: any) =>
						response.content &&
						Object.values(response.content).some((content: any) => content.example || content.examples)
				);
			const hasDetailedParams =
				methodDoc.parameters &&
				methodDoc.parameters.some((param: any) => param.description && param.example !== undefined);

			// If at least 2 criteria are met, consider as detailed
			const detailedCriteria = [hasLongDescription, hasExamples, hasDetailedParams].filter(Boolean).length;
			if (detailedCriteria >= 2) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Merge details of two routes keeping the best
 */
function mergeRouteDetails(existing: any, generated: any): any {
	const merged = { ...existing };

	// For each HTTP method
	const methods = ['get', 'post', 'put', 'delete', 'patch'];

	methods.forEach((method) => {
		if (generated[method] && existing[method]) {
			const generatedMethod = generated[method];
			const existingMethod = existing[method];

			// Keep the most detailed description
			if (
				generatedMethod.description &&
				generatedMethod.description.length > (existingMethod.description?.length || 0)
			) {
				merged[method].description = generatedMethod.description;
			}

			// Merge parameters (keep the most detailed)
			if (generatedMethod.parameters && generatedMethod.parameters.length > 0) {
				merged[method].parameters = generatedMethod.parameters;
			}

			// Merge responses intelligently (preserve examples)
			if (generatedMethod.responses) {
				merged[method].responses = mergeResponses(existingMethod.responses || {}, generatedMethod.responses);
			}

			// Keep the most detailed requestBody
			if (
				generatedMethod.requestBody &&
				(!existingMethod.requestBody ||
					JSON.stringify(generatedMethod.requestBody).length >
						JSON.stringify(existingMethod.requestBody).length)
			) {
				merged[method].requestBody = generatedMethod.requestBody;
			}
		} else if (generated[method]) {
			// New method, add it
			merged[method] = generated[method];
		}
	});

	return merged;
}

/**
 * Intelligently merge responses while preserving examples
 */
function mergeResponses(existing: any, generated: any): any {
	const merged = { ...existing };

	// For each response code (200, 400, 404, etc.)
	Object.keys(generated).forEach((statusCode) => {
		const generatedResponse = generated[statusCode];
		const existingResponse = existing[statusCode];

		if (existingResponse) {
			// Merge existing response with generated
			merged[statusCode] = {
				...existingResponse,
				...generatedResponse,
				content: mergeResponseContent(existingResponse.content, generatedResponse.content)
			};
		} else {
			// New response, add directly
			merged[statusCode] = generatedResponse;
		}
	});

	return merged;
}

/**
 * Merge response content while preserving examples
 */
function mergeResponseContent(existing: any, generated: any): any {
	if (!existing) return generated;
	if (!generated) return existing;

	const merged = { ...existing };

	// For each content type (application/json, etc.)
	Object.keys(generated).forEach((contentType) => {
		const generatedContent = generated[contentType];
		const existingContent = existing[contentType];

		if (existingContent) {
			merged[contentType] = {
				...existingContent,
				...generatedContent,
				// Preserve existing examples if they are more detailed
				example: preserveBestExample(existingContent.example, generatedContent.example),
				examples: preserveBestExamples(existingContent.examples, generatedContent.examples)
			};

			// Clean up undefined properties
			if (!merged[contentType].example) delete merged[contentType].example;
			if (!merged[contentType].examples) delete merged[contentType].examples;
		} else {
			merged[contentType] = generatedContent;
		}
	});

	return merged;
}

/**
 * Preserve the best example (the most detailed)
 */
function preserveBestExample(existing: any, generated: any): any {
	if (!existing) return generated;
	if (!generated) return existing;

	// Compare size/complexity of examples
	const existingSize = JSON.stringify(existing).length;
	const generatedSize = JSON.stringify(generated).length;

	// Keep the most detailed (longer)
	return existingSize >= generatedSize ? existing : generated;
}

/**
 * Preserve the best examples (merge both)
 */
function preserveBestExamples(existing: any, generated: any): any {
	if (!existing) return generated;
	if (!generated) return existing;

	// Merge examples keeping unique keys
	return { ...existing, ...generated };
}

// Execute the script
if (require.main === module) {
	generateOpenAPI();
}

export {
	generateOpenAPI,
	mergeOpenAPISpecs,
	hasDetailedDocumentation,
	mergeRouteDetails,
	mergeResponses,
	mergeResponseContent,
	preserveBestExample,
	preserveBestExamples
};
