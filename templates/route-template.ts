import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * @swagger
 * /api/your-route:
 *   get:
 *     tags: ["Your Tag"]
 *     summary: "Your GET summary"
 *     description: "Detailed description of what this GET endpoint does"
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "exampleParam"
 *         in: "query"
 *         required: false
 *         schema:
 *           type: "string"
 *         description: "Example query parameter"
 *         example: "example-value"
 *     responses:
 *       200:
 *         description: "Success response"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: "Response data"
 *                 message:
 *                   type: string
 *                   example: "Operation completed successfully"
 *               required: ["success"]
 *       401:
 *         description: "Unauthorized"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
export async function GET(_request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Your GET logic here
    const data = {}; // Replace with actual logic

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/your-route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/your-route:
 *   post:
 *     tags: ["Your Tag"]
 *     summary: "Your POST summary"
 *     description: "Detailed description of what this POST endpoint does"
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field1:
 *                 type: string
 *                 description: "Description of field1"
 *                 example: "example-value"
 *               field2:
 *                 type: string
 *                 description: "Description of field2"
 *                 example: "another-example"
 *             required: ["field1"]
 *     responses:
 *       201:
 *         description: "Resource created successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: "Created resource data"
 *                 message:
 *                   type: string
 *                   example: "Resource created successfully"
 *               required: ["success", "data", "message"]
 *       400:
 *         description: "Bad request - validation error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Validation error message"
 *       401:
 *         description: "Unauthorized"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.field1) {
      return NextResponse.json(
        { success: false, error: 'field1 is required' },
        { status: 400 }
      );
    }

    // Your POST logic here
    const data = {}; // Replace with actual logic

    return NextResponse.json(
      { success: true, data, message: 'Resource created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/your-route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
