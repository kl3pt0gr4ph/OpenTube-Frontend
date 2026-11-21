/**
 * Shared Test Helpers for API Tests
 *
 * Contains reusable mock functions and utilities for API testing
 */

import { type MockedFunction, vi } from 'vitest';

// =============================================================================
// Mock Fetch Helpers
// =============================================================================

/**
 * Creates a successful mock fetch response
 */
export function createMockResponse<T>(
	data: T,
	options: { status?: number; statusText?: string } = {}
): Response {
	const { status = 200, statusText = 'OK' } = options;
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText,
		json: vi.fn().mockResolvedValue(data),
		headers: new Headers({ 'Content-Type': 'application/json' }),
		text: vi.fn().mockResolvedValue(JSON.stringify(data)),
		blob: vi.fn().mockResolvedValue(new Blob()),
		arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
		bytes: vi.fn().mockResolvedValue(new Uint8Array()),
		formData: vi.fn().mockResolvedValue(new FormData()),
		clone: vi.fn(),
		body: null,
		bodyUsed: false,
		redirected: false,
		type: 'basic',
		url: ''
	} as Response;
}

/**
 * Create successful mock fetch response for manifest XML
 */
function createMockManifestResponse<T>(
	data: T,
	options: { status?: number; statusText?: string } = {}
): Response {
	const { status = 200, statusText = 'OK' } = options;
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText,
		json: vi.fn().mockResolvedValue(data),
		text: vi.fn().mockResolvedValue(data),
		headers: new Headers({ 'Content-Type': 'application/xml' }), // Set content type to XML
		blob: vi.fn().mockResolvedValue(new Blob()),
		arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
		bytes: vi.fn().mockResolvedValue(new Uint8Array()),
		formData: vi.fn().mockResolvedValue(new FormData()),
		clone: vi.fn(),
		body: null,
		bodyUsed: false,
		redirected: false,
		type: 'basic',
		url: ''
	} as Response;
}

/**
 * Creates a failed mock fetch response
 */
export function createErrorResponse(status: number, statusText: string): Response {
	return {
		ok: false,
		status,
		statusText,
		json: vi.fn().mockRejectedValue(new Error('Failed to parse JSON')),
		headers: new Headers(),
		text: vi.fn().mockResolvedValue(statusText),
		blob: vi.fn().mockResolvedValue(new Blob()),
		arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
		bytes: vi.fn().mockResolvedValue(new Uint8Array()),
		formData: vi.fn().mockResolvedValue(new FormData()),
		clone: vi.fn(),
		body: null,
		bodyUsed: false,
		redirected: false,
		type: 'basic',
		url: ''
	} as Response;
}

/**
 * Creates a mock fetch function that succeeds
 */
export function createSuccessfulFetch<T>(
	data: T,
	options: { format?: 'json' | 'xml' } = {}
): MockedFunction<typeof fetch> {
	const { format = 'json' } = options;
	if (format === 'xml') {
		return vi.fn().mockResolvedValue(createMockManifestResponse(data)) as MockedFunction<
			typeof fetch
		>;
	}
	return vi.fn().mockResolvedValue(createMockResponse(data)) as MockedFunction<typeof fetch>;
}

/**
 * Creates a mock fetch function that fails
 */
export function createFailedFetch(status: number, statusText: string): typeof globalThis.fetch {
	return vi.fn().mockResolvedValue(createErrorResponse(status, statusText));
}

/**
 * Creates a mock fetch function that fails the way NewPipeExtractorAPI does:
 * the given status, with its error body
 */
export function createApiErrorFetch(
	status: number,
	errorCode: string,
	message: string = 'Message from the API.'
): MockedFunction<typeof fetch> {
	const body = {
		timestamp: '2026-11-17T10:30:00.123Z',
		status,
		error: 'Error',
		message,
		errorCode,
		path: '/api/v1/test'
	};
	return vi.fn(
		async (): Promise<Response> =>
			new Response(JSON.stringify(body), {
				status,
				headers: { 'content-type': 'application/json' }
			})
	) as MockedFunction<typeof fetch>;
}

/**
 * Creates a mock fetch function that throws a network error
 */
export function createNetworkErrorFetch(
	message: string = 'Network Error'
): typeof globalThis.fetch {
	return vi.fn().mockRejectedValue(new Error(message));
}

/**
 * Creates a mock fetch function that throws an invalid JSON error
 */
export function createInvalidJSONFetch(): typeof globalThis.fetch {
	return vi.fn().mockRejectedValue(new Error('Invalid JSON'));
}

// =============================================================================
// URL Testing Helpers
// =============================================================================

/**
 * Extracts query parameters from a URL string
 */
export function extractQueryParams(url: string): Record<string, string> {
	const urlObj = new URL(url);
	const params: Record<string, string> = {};

	urlObj.searchParams.forEach((value, key) => {
		params[key] = value;
	});

	return params;
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Gets the call count of a mock function
 */
export function getCallCount(mockFn: ReturnType<typeof vi.fn>): number {
	return mockFn.mock.calls.length;
}

// =============================================================================
// Console Mock Helpers
// =============================================================================

/**
 * Creates a mock console.error function
 */
export function createMockConsoleError(): {
	mock: ReturnType<typeof vi.fn>;
	restore: () => void;
} {
	const originalError = console.error;
	const mock = vi.fn();
	console.error = mock;

	return {
		mock,
		restore: () => {
			console.error = originalError;
		}
	};
}

// =============================================================================
// Type Guards and Validators
// =============================================================================
