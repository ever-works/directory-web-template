import { NextRequest, NextResponse } from 'next/server';
import { configManager } from '@/lib/config-manager';
import { getCachedApiSession } from '@/lib/auth/cached-session';

/**
 * Validates that a navigation path is safe to use as a link href
 * Only allows paths starting with /, http://, or https://
 * This prevents XSS attacks via dangerous URL schemes like javascript:, data:, etc.
 * Also prevents protocol-relative URLs (//evil.com) which browsers interpret as external URLs.
 */
function isValidNavigationPath(path: string): boolean {
	const trimmed = path.trim();
	if (trimmed.length === 0) {
		return false;
	}

	// Reject protocol-relative URLs (//evil.com) - browsers interpret these as external URLs
	if (trimmed.startsWith('//')) {
		return false;
	}

	// Allow internal routes (starting with /)
	if (trimmed.startsWith('/')) {
		return true;
	}

	// Allow external URLs (starting with http:// or https://)
	// URL schemes are case-insensitive per RFC 3986
	const lowerPath = trimmed.toLowerCase();
	if (lowerPath.startsWith('http://') || lowerPath.startsWith('https://')) {
		return true;
	}

	// Reject all other schemes (javascript:, data:, vbscript:, etc.)
	return false;
}

/**
 * @swagger
 * /api/admin/navigation:
 *   get:
 *     summary: Get custom navigation configuration
 *     description: Retrieves custom_header and custom_footer navigation items from config.yml. Admin access required.
 *     tags:
 *       - Admin - Navigation
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Navigation configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 custom_header:
 *                   type: array
 *                   description: Custom header navigation items
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         description: Display label (plain text or translation key)
 *                         example: "About"
 *                       path:
 *                         type: string
 *                         description: URL path (must start with /, http://, or https://)
 *                         example: "/about"
 *                     required: ["label", "path"]
 *                 custom_footer:
 *                   type: array
 *                   description: Custom footer navigation items
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         description: Display label (plain text or translation key)
 *                         example: "GitHub"
 *                       path:
 *                         type: string
 *                         description: URL path (must start with /, http://, or https://)
 *                         example: "https://github.com/example"
 *                     required: ["label", "path"]
 *             examples:
 *               with_items:
 *                 summary: Navigation with custom items
 *                 value:
 *                   custom_header:
 *                     - label: "About"
 *                       path: "/about"
 *                     - label: "Documentation"
 *                       path: "/pages/docs"
 *                   custom_footer:
 *                     - label: "GitHub"
 *                       path: "https://github.com/example"
 *               empty:
 *                 summary: Empty navigation (default)
 *                 value:
 *                   custom_header: []
 *                   custom_footer: []
 *       401:
 *         description: Unauthorized - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch navigation"
 */
export async function GET(req: NextRequest) {
	try {
		// Check admin authentication
		const session = await getCachedApiSession(req);
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get navigation config
		const config = configManager.getConfig();
		const custom_header = config.custom_header || [];
		const custom_footer = config.custom_footer || [];

		return NextResponse.json(
			{
				custom_header,
				custom_footer
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error fetching navigation:', error);
		return NextResponse.json({ error: 'Failed to fetch navigation' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/admin/navigation:
 *   patch:
 *     summary: Update custom navigation configuration
 *     description: Updates custom_header or custom_footer navigation items in config.yml. Validates path format to prevent XSS attacks. Only paths starting with /, http://, or https:// are allowed. Admin access required.
 *     tags:
 *       - Admin - Navigation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["type", "items"]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: ["header", "footer"]
 *                 description: Type of navigation to update
 *                 example: "header"
 *               items:
 *                 type: array
 *                 description: Array of navigation items
 *                 items:
 *                   type: object
 *                   required: ["label", "path"]
 *                   properties:
 *                     label:
 *                       type: string
 *                       description: Display label (plain text or i18n translation key like "footer.PRIVACY_POLICY")
 *                       minLength: 1
 *                       example: "About"
 *                     path:
 *                       type: string
 *                       description: URL path (must start with / for internal routes, or "http://" or "https://" for external URLs)
 *                       minLength: 1
 *                       example: "/about"
 *           examples:
 *             header_navigation:
 *               summary: Update header navigation
 *               value:
 *                 type: "header"
 *                 items:
 *                   - label: "About"
 *                     path: "/about"
 *                   - label: "Documentation"
 *                     path: "/pages/docs"
 *                   - label: "Blog"
 *                     path: "https://blog.example.com"
 *             footer_navigation:
 *               summary: Update footer navigation
 *               value:
 *                 type: "footer"
 *                 items:
 *                   - label: "GitHub"
 *                     path: "https://github.com/example"
 *                   - label: "footer.PRIVACY_POLICY"
 *                     path: "/pages/privacy-policy"
 *             empty_navigation:
 *               summary: Clear navigation (empty array)
 *               value:
 *                 type: "header"
 *                 items: []
 *     responses:
 *       200:
 *         description: Navigation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 type:
 *                   type: string
 *                   enum: ["header", "footer"]
 *                   example: "header"
 *                 items:
 *                   type: array
 *                   description: Updated navigation items
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                       path:
 *                         type: string
 *             example:
 *               success: true
 *               type: "header"
 *               items:
 *                 - label: "About"
 *                   path: "/about"
 *                 - label: "Documentation"
 *                   path: "/pages/docs"
 *       400:
 *         description: Bad request - Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               invalid_type:
 *                 value:
 *                   error: 'Type must be "header" or "footer"'
 *               invalid_items:
 *                 value:
 *                   error: "Items must be an array"
 *               invalid_item_structure:
 *                 value:
 *                   error: 'Each item must have non-empty "label" and "path" string fields'
 *               invalid_path_format:
 *                 value:
 *                   error: 'Invalid path format. Paths must start with "/" for internal routes or "http://"/"https://" for external URLs.'
 *       401:
 *         description: Unauthorized - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to update navigation"
 */
export async function PATCH(req: NextRequest) {
	try {
		// Check admin authentication
		const session = await getCachedApiSession(req);
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await req.json();
		const { type, items } = body;

		if (!type || (type !== 'header' && type !== 'footer')) {
			return NextResponse.json({ error: 'Type must be "header" or "footer"' }, { status: 400 });
		}

		if (!Array.isArray(items)) {
			return NextResponse.json({ error: 'Items must be an array' }, { status: 400 });
		}

		// Validate items structure
		for (const item of items) {
			if (
				!item ||
				typeof item !== 'object' ||
				Array.isArray(item) ||
				typeof item.label !== 'string' ||
				typeof item.path !== 'string' ||
				!item.label.trim() ||
				!item.path.trim()
			) {
				return NextResponse.json(
					{ error: 'Each item must have non-empty "label" and "path" string fields' },
					{ status: 400 }
				);
			}

			// Validate path format to prevent XSS attacks
			if (!isValidNavigationPath(item.path)) {
				return NextResponse.json(
					{
						error: 'Invalid path format. Paths must start with "/" for internal routes or "http://"/"https://" for external URLs.'
					},
					{ status: 400 }
				);
			}
		}

		// Update the navigation config
		const key = type === 'header' ? 'custom_header' : 'custom_footer';
		const success = await configManager.updateNestedKey(key, items);

		if (!success) {
			return NextResponse.json({ error: 'Failed to update navigation' }, { status: 500 });
		}

		return NextResponse.json({ success: true, type, items }, { status: 200 });
	} catch (error) {
		console.error('Error updating navigation:', error);
		return NextResponse.json({ error: 'Failed to update navigation' }, { status: 500 });
	}
}
