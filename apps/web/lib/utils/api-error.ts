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
