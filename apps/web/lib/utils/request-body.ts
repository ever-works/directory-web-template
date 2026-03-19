import { NextRequest } from 'next/server';

/**
 * Options for reading request body with size limit
 */
export interface ReadBodyOptions {
	/** Maximum size in bytes */
	maxSize: number;
	/** Whether to parse as JSON (default: true) */
	parseJson?: boolean;
}

/**
 * Result of reading request body
 */
export interface ReadBodyResult<T = unknown> {
	/** Parsed body data (if parseJson is true) */
	data: T | null;
	/** Raw body text */
	text: string;
	/** Actual size in bytes */
	size: number;
}

/**
 * Error thrown when body size exceeds limit
 */
export class BodySizeLimitError extends Error {
	constructor(
		public readonly maxSize: number,
		public readonly actualSize: number
	) {
		super(`Request body too large. Maximum size is ${maxSize} bytes, received ${actualSize} bytes.`);
		this.name = 'BodySizeLimitError';
	}
}

/**
 * Reads request body with size limit control.
 * 
 * This function uses ReadableStream to read the body incrementally,
 * allowing us to check size before Next.js's automatic parsing kicks in.
 * 
 * @param request - Next.js request object
 * @param options - Configuration options
 * @returns Promise resolving to body data and metadata
 * @throws BodySizeLimitError if body exceeds maxSize
 * 
 * @example
 * ```ts
 * const { data } = await readBodyWithLimit(request, { maxSize: 1024 });
 * ```
 */
export async function readBodyWithLimit<T = unknown>(
	request: NextRequest,
	options: ReadBodyOptions
): Promise<ReadBodyResult<T>> {
	const { maxSize, parseJson = true } = options;

	// First, check Content-Length header if available (fast path)
	const contentLength = request.headers.get('content-length');
	if (contentLength) {
		const sizeInBytes = parseInt(contentLength, 10);
		if (!isNaN(sizeInBytes) && sizeInBytes > maxSize) {
			throw new BodySizeLimitError(maxSize, sizeInBytes);
		}
	}

	// Get the body stream
	const body = request.body;
	if (!body) {
		return { data: null, text: '', size: 0 };
	}

	// Read body using ReadableStream with incremental size checking
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let bodyText = '';
	let totalBytes = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			totalBytes += value.length;

			// Check size limit incrementally
			if (totalBytes > maxSize) {
				reader.cancel();
				throw new BodySizeLimitError(maxSize, totalBytes);
			}

			// Decode chunk (stream mode to handle multi-byte characters)
			bodyText += decoder.decode(value, { stream: true });
		}

		// Decode any remaining bytes in the decoder's buffer
		bodyText += decoder.decode();
	} finally {
		reader.releaseLock();
	}

	// Parse JSON if requested
	let data: T | null = null;
	if (parseJson && bodyText.trim()) {
		try {
			data = JSON.parse(bodyText) as T;
		} catch (parseError) {
			// If JSON parsing fails, return null data but keep the text
			// This allows callers to handle invalid JSON gracefully
			if (parseError instanceof SyntaxError) {
				data = null;
			} else {
				throw parseError;
			}
		}
	} else if (bodyText.trim()) {
		// If not parsing JSON, return text as data
		data = bodyText as unknown as T;
	}

	return {
		data,
		text: bodyText,
		size: totalBytes,
	};
}

/**
 * Validates Content-Length header without reading the body.
 * Useful for early rejection of oversized requests.
 * 
 * @param request - Next.js request object
 * @param maxSize - Maximum allowed size in bytes
 * @returns true if size is valid or Content-Length is not present
 * @throws BodySizeLimitError if Content-Length exceeds maxSize
 */
export function validateContentLength(
	request: NextRequest,
	maxSize: number
): boolean {
	const contentLength = request.headers.get('content-length');
	if (!contentLength) {
		return true; // No Content-Length header, can't validate early
	}

	const sizeInBytes = parseInt(contentLength, 10);
	if (isNaN(sizeInBytes) || sizeInBytes < 0) {
		return true; // Invalid header, let readBodyWithLimit handle it
	}

	if (sizeInBytes > maxSize) {
		throw new BodySizeLimitError(maxSize, sizeInBytes);
	}

	return true;
}
