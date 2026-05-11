import { NextResponse } from "next/server";

/**
 * Creates a safe error response that prevents information leakage.
 *
 * In production, always returns the generic `fallbackMessage`.
 * In development, returns `error.message` for debugging convenience.
 * Full error details are always logged server-side regardless of environment.
 */
export function safeErrorResponse(
	error: unknown,
	fallbackMessage: string,
	status: number = 500
): NextResponse {
	const detail = error instanceof Error ? error.message : String(error);

	// Always log full details server-side
	console.error(`[API Error] ${fallbackMessage}:`, detail);

	const message = process.env.NODE_ENV === "development" ? detail : fallbackMessage;

	return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * Extracts a safe error message string (without creating a Response).
 *
 * Use this when you need the message for logging or custom response shapes
 * but still want to prevent leaking internals in production.
 */
export function safeErrorMessage(error: unknown, fallbackMessage: string): string {
	if (process.env.NODE_ENV === "development") {
		return error instanceof Error ? error.message : String(error);
	}
	return fallbackMessage;
}

/**
 * Map a known typed business error thrown by a service / repository to its
 * HTTP response. Returns `null` if the error is not a known type — caller
 * should then fall through to `safeErrorResponse(error, ...)`.
 *
 * The heuristics here are deliberately conservative: only well-known phrases
 * (`"already exists"`, `"not found"`, validation phrases) map to user-visible
 * messages. Anything else falls through to the generic fallback so that
 * accidental leaks of raw ORM / DB messages stay server-side.
 */
export function mapTypedError(error: unknown): NextResponse | null {
	if (!(error instanceof Error)) return null;
	const msg = error.message;
	const lower = msg.toLowerCase();

	if (lower.includes('already exists') || lower.includes('already in use') || lower.includes('duplicate key')) {
		return NextResponse.json({ success: false, error: msg }, { status: 409 });
	}
	if (lower.includes('not found')) {
		return NextResponse.json({ success: false, error: msg }, { status: 404 });
	}
	if (
		lower.includes('must be') ||
		lower.startsWith('invalid ') ||
		lower.includes(' is required') ||
		lower.startsWith('cannot ')
	) {
		return NextResponse.json({ success: false, error: msg }, { status: 400 });
	}

	return null;
}
