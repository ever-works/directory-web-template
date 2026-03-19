---
id: exercises
title: Hands-On Exercises
sidebar_label: Exercises
sidebar_position: 5
---

# Hands-On Exercises

Practice what you've learned with real-world exercises and challenges.

## 🎯 Objectives

By completing these exercises, you will:

- ✅ Practice creating API endpoints
- ✅ Apply Swagger documentation standards
- ✅ Implement validation and error handling
- ✅ Build complete features from scratch
- ✅ Gain confidence in the development workflow

**Estimated time**: 3-5 days

---

## Exercise 1: Simple GET Route

**Difficulty**: ⭐ Beginner  
**Duration**: 15-30 minutes  
**Objective**: Learn basic annotation structure and workflow

### Task

Create a simple GET endpoint that returns server information.

### Steps

1. **Create the file**: `app/api/training/server-info/route.ts`

2. **Implement the route**:

```typescript
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/training/server-info:
 *   get:
 *     tags: ["System"]
 *     summary: "Get server information"
 *     description: "Returns basic server information including version, current timestamp, and uptime. Public endpoint that requires no authentication."
 *     responses:
 *       200:
 *         description: "Server information retrieved successfully"
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
 *                   properties:
 *                     server:
 *                       type: string
 *                       example: "Ever Works API"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *                     uptime:
 *                       type: number
 *                       description: "Server uptime in seconds"
 *                       example: 3600.5
 *                   required: ["server", "version", "timestamp", "uptime"]
 *               required: ["success", "data"]
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      server: "Ever Works API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
}
```

3. **Test the workflow**:

```bash
# Generate documentation
yarn generate-docs

# Check the documentation
open http://localhost:3000/api/reference

# Test the endpoint
curl http://localhost:3000/api/training/server-info
```

### Success Criteria

- [ ] Endpoint appears in Scalar UI under "System" tag
- [ ] All response fields are documented with examples
- [ ] Endpoint works when tested in Scalar UI
- [ ] No generation errors
- [ ] Response matches documentation

---

## Exercise 2: POST Route with Validation

**Difficulty**: ⭐⭐ Intermediate  
**Duration**: 30-45 minutes  
**Objective**: Learn request body documentation and error handling

### Task

Create a POST endpoint for user feedback with validation.

### Steps

1. **Create the file**: `app/api/training/feedback/route.ts`

2. **Implement with validation**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const feedbackSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  category: z.enum(['bug', 'feature', 'general']),
  message: z.string().min(10).max(1000),
  rating: z.number().min(1).max(5).optional()
});

/**
 * @swagger
 * /api/training/feedback:
 *   post:
 *     tags: ["System"]
 *     summary: "Submit user feedback"
 *     description: "Allows users to submit feedback about the platform. Validates input and returns confirmation."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: "User's name"
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: "User's email address"
 *                 example: "john.doe@example.com"
 *               category:
 *                 type: string
 *                 enum: ["bug", "feature", "general"]
 *                 description: "Feedback category"
 *                 example: "feature"
 *               message:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *                 description: "Feedback message"
 *                 example: "I would love to see dark mode support"
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: "Optional rating (1-5)"
 *                 example: 4
 *             required: ["name", "email", "category", "message"]
 *     responses:
 *       201:
 *         description: "Feedback received successfully"
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
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "feedback_1234567890"
 *                     status:
 *                       type: string
 *                       example: "received"
 *                 message:
 *                   type: string
 *                   example: "Feedback received successfully"
 *       400:
 *         description: "Validation failed"
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
 *                   example: "Validation failed"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "email"
 *                       message:
 *                         type: string
 *                         example: "Invalid email format"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = feedbackSchema.parse(body);

    // Simulate processing
    const feedback = {
      id: `feedback_${Date.now()}`,
      ...validatedData,
      createdAt: new Date().toISOString(),
      status: 'received'
    };

    return NextResponse.json({
      success: true,
      data: feedback,
      message: "Feedback received successfully"
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: "Validation failed",
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
}
```

3. **Test with valid and invalid data**:

```bash
# Valid request
curl -X POST http://localhost:3000/api/training/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "category": "feature",
    "message": "Great platform!",
    "rating": 5
  }'

# Invalid request (missing required field)
curl -X POST http://localhost:3000/api/training/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John",
    "email": "invalid-email"
  }'
```

### Success Criteria

- [ ] All request fields documented with validation rules
- [ ] All response codes (201, 400, 500) documented
- [ ] Realistic examples for all fields
- [ ] Error response includes validation details
- [ ] Both valid and invalid requests work as documented
- [ ] Endpoint appears correctly in Scalar UI

---

## Exercise 3: Complete Feature Implementation

**Difficulty**: ⭐⭐⭐ Advanced  
**Duration**: 2-3 days  
**Objective**: Build a complete feature from scratch

### Task

Implement a simple bookmark/favorites system for users.

### Requirements

1. **Database Schema**:
   - Create `bookmarks` table with fields: `id`, `userId`, `itemId`, `createdAt`
   - Add proper indexes

2. **API Endpoints**:
   - `POST /api/bookmarks` - Add bookmark
   - `DELETE /api/bookmarks/:id` - Remove bookmark
   - `GET /api/bookmarks` - List user's bookmarks

3. **Features**:
   - Authentication required
   - Validation (prevent duplicates)
   - Pagination for list endpoint
   - Proper error handling

4. **Documentation**:
   - All endpoints fully documented
   - Use "Favorites" tag
   - Include all error cases

### Steps

1. **Create database schema** in `lib/db/schema/bookmarks.ts`
2. **Run migration** with `npx drizzle-kit push`
3. **Create API routes** in `app/api/bookmarks/`
4. **Add Swagger annotations** for all endpoints
5. **Generate documentation** with `yarn generate-docs`
6. **Test all endpoints** in Scalar UI
7. **Create a PR** with your implementation

### Success Criteria

- [ ] Database schema created and migrated
- [ ] All 3 endpoints implemented and working
- [ ] Authentication enforced
- [ ] Validation prevents duplicates
- [ ] Pagination works correctly
- [ ] All endpoints fully documented
- [ ] No errors in documentation generation
- [ ] Code passes review

---

## Additional Challenges

### Challenge 1: Add Search Functionality

Add search capability to the bookmarks list endpoint:
- Query parameter for search term
- Search in item titles/descriptions
- Document the search parameter

### Challenge 2: Add Bulk Operations

Implement bulk bookmark operations:
- `POST /api/bookmarks/bulk` - Add multiple bookmarks
- `DELETE /api/bookmarks/bulk` - Remove multiple bookmarks
- Proper validation and error handling

### Challenge 3: Add Analytics

Track bookmark statistics:
- `GET /api/bookmarks/stats` - Get user's bookmark statistics
- Return counts by category, most bookmarked items, etc.

---

## Tips for Success

:::tip Start Simple
Begin with the simplest version that works, then add features incrementally. Don't try to build everything at once.
:::

:::tip Test Frequently
Test your endpoints after each change. Use Scalar UI for interactive testing and curl for automated testing.
:::

:::tip Ask for Help
If you're stuck for more than 30 minutes, ask your mentor or team lead. Learning to ask good questions is an important skill.
:::

:::tip Code Review
Request code reviews early and often. Feedback helps you learn faster and prevents bad habits.
:::

---

## Next Steps

After completing these exercises:

1. **Review your code** with a mentor
2. **Get feedback** on your implementation
3. **Refactor** based on feedback
4. **Start working** on real project tasks
5. **Help others** who are going through the training

Congratulations on completing the training! 🎉

---

## Additional Resources

- [Quick Reference](/getting-started/quick-reference) - Templates and commands
- [API Documentation](/team-training/api-documentation) - Documentation guide
- [Best Practices](/team-training/best-practices) - Coding standards
- [Testing Guide](/development/testing) - Testing strategies

Ready to contribute to real projects? Talk to your team lead about your first assignment! 🚀

